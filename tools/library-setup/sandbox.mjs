import { spawnSync } from 'node:child_process';
import { lstatSync, realpathSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const CREDENTIAL_PATTERN =
    /(TOKEN|SECRET|PASSWORD|PASSWD|AUTH|COOKIE|SSH|GIT_|NPM_)/i;
const EXTRA_ENV_ALLOWLIST = new Set(['CI', 'NX_NO_CLOUD']);

/**
 * Nx écrit dans trois emplacements distincts, tous dérivés de `os.tmpdir()`
 * par défaut — or le profil d'exécution ne laisse en écriture QUE le candidat.
 * Le troisième est le plus discret : avant de charger son binaire natif, Nx le
 * **recopie** dans `join(tmpdir(), 'nx-native-file-cache-<hash>')` ; quand la
 * copie est refusée il ne lève pas, il rend un module amputé, et l'appelant
 * meurt plus loin sur `TypeError: WorkspaceContext is not a constructor` —
 * symptôme observé le 2026-09-05 à l'étape 5/8 d'add-library.
 *
 * Les trois sont donc redirigés sous `node_modules/`, seule zone à la fois
 * inscriptible et exclue de l'instantané gouverné (filesystem-snapshot.mjs).
 * Les valeurs doivent être **absolues** : mesuré sous le profil réel, une
 * valeur relative laisse `WorkspaceContext` à `undefined` exactement comme si
 * la variable était absente, alors que la même valeur en absolu le rend
 * `function`. La racine diffère selon le backend — le candidat est monté sur
 * `/workspace` dans le conteneur — d'où le paramètre.
 */
const NX_WRITABLE_SUBDIRECTORIES = {
    NX_CACHE_DIRECTORY: 'node_modules/.cmz-nx-cache',
    NX_WORKSPACE_DATA_DIRECTORY: 'node_modules/.cmz-nx-workspace-data',
    NX_NATIVE_FILE_CACHE_DIRECTORY: 'node_modules/.cmz-nx-native-file-cache',
};

/**
 * Nx isole par défaut chaque plugin dans un worker qui dialogue par socket
 * unix, créé dans `os.tmpdir()` (`NX_SOCKET_DIR`) parce qu'un chemin de socket
 * unix tient en 104 octets sur macOS — bien moins que la racine d'un candidat.
 * Sous le profil d'exécution le worker ne peut pas se lier : il sort en code 0
 * et Nx échoue sur « Plugin worker […] exited before the connection was
 * established ».
 *
 * Deux issues ont été mesurées. Ouvrir un répertoire de sockets court hors du
 * candidat **ne suffit pas** (le worker échoue quand même) et élargirait la
 * frontière. Désactiver l'isolation fait tourner les plugins dans le processus
 * principal, déjà confiné : plus aucun socket, aucun processus supplémentaire,
 * aucune zone inscriptible en plus. C'est donc la voie la PLUS restrictive des
 * deux, pas un contournement.
 */
const NX_CONFINEMENT_SWITCHES = {
    NX_DAEMON: 'false',
    NX_ISOLATE_PLUGINS: 'false',
};

export function nxConfinementEnvironment(candidateRoot) {
    if (typeof candidateRoot !== 'string' || !candidateRoot.startsWith('/')) {
        fail('racine absolue requise pour les emplacements Nx');
    }
    return {
        ...NX_CONFINEMENT_SWITCHES,
        ...Object.fromEntries(
            Object.entries(NX_WRITABLE_SUBDIRECTORIES).map(([key, subPath]) => [
                key,
                `${candidateRoot}/${subPath}`,
            ])
        ),
    };
}

function fail(message) {
    throw new Error(`library sandbox: ${message}`);
}

function plainDirectory(path, label) {
    const absolute = resolve(path);
    const stats = lstatSync(absolute);
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
        fail(`${label} n'est pas un vrai répertoire`);
    }
    if (realpathSync(absolute) !== absolute)
        fail(`${label} n'est pas canonique`);
    return absolute;
}

function assertOutside(candidate, forbidden, label) {
    const rel = relative(forbidden, candidate);
    if (rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..')) {
        fail(`${label} contient le candidat`);
    }
}

function assertDisjoint(left, right, label) {
    const leftToRight = relative(left, right);
    const rightToLeft = relative(right, left);
    const inside = (value) =>
        value === '' || (value !== '..' && !value.startsWith(`..${sep}`));
    if (inside(leftToRight) || inside(rightToLeft)) {
        fail(`${label} doivent être disjoints`);
    }
}

function validateInvocation({
    candidate,
    cache,
    home,
    repository,
    argv,
    extraEnv,
    timeoutMs,
}) {
    const paths = {
        candidate: plainDirectory(candidate, 'candidat'),
        cache: plainDirectory(cache, 'cache'),
        home: plainDirectory(home, 'HOME jetable'),
        repository: realpathSync(resolve(repository)),
    };
    assertOutside(paths.candidate, paths.repository, 'dépôt réel');
    assertOutside(paths.cache, paths.repository, 'dépôt réel');
    assertOutside(paths.home, paths.repository, 'dépôt réel');
    assertDisjoint(paths.candidate, paths.cache, 'candidat et cache');
    assertDisjoint(paths.candidate, paths.home, 'candidat et HOME');
    assertDisjoint(paths.cache, paths.home, 'cache et HOME');
    for (const [key, value] of Object.entries(extraEnv ?? {})) {
        if (!EXTRA_ENV_ALLOWLIST.has(key) || CREDENTIAL_PATTERN.test(key)) {
            fail(`variable d'environnement non autorisée : ${key}`);
        }
        if (typeof value !== 'string' || value.includes('\0')) {
            fail(`valeur d'environnement invalide : ${key}`);
        }
    }
    if (
        !Array.isArray(argv) ||
        argv.some((arg) => typeof arg !== 'string' || arg.includes('\0'))
    ) {
        fail('argv invalide');
    }
    if (
        !Number.isInteger(timeoutMs) ||
        timeoutMs < 1_000 ||
        timeoutMs > 15 * 60_000
    ) {
        fail('timeout doit être compris entre 1 s et 15 min');
    }
    return paths;
}

/**
 * Les deux backends n'ont PAS la même arborescence : sur macOS le processus voit
 * les chemins de l'hôte, dans le conteneur il voit `/workspace` et
 * `/cmz-readonly-<n>`. Tout appelant qui écrit un chemin ABSOLU dans `argv`
 * fabrique donc une commande juste sur un backend et fausse sur l'autre —
 * défaut réel : l'oracle navigateur émettait des chemins hôte dans le
 * conteneur, invisible aux tests mockés qui ne vérifiaient que des drapeaux.
 *
 * Les appelants écrivent donc des jetons, et c'est `runConfined` — seul à
 * connaître la correspondance — qui les résout. Les chemins RELATIFS restent le
 * moyen le plus sûr (le cwd est toujours la racine du candidat) : ces jetons ne
 * servent qu'aux cas qui exigent un chemin absolu, comme une URL `file://`.
 */
export function resolveSandboxTokens(value, mapping) {
    if (typeof value !== 'string') return value;
    return value.replaceAll(/\{\{(candidate|readonly:\d+)\}\}/g, (_, token) => {
        const resolved = mapping[token];
        if (resolved === undefined) fail(`jeton de chemin inconnu : ${token}`);
        return resolved;
    });
}

function sandboxTokenMapping(backend, paths, readOnlyPaths) {
    const mapping = {
        candidate: backend === 'docker' ? '/workspace' : paths.candidate,
    };
    readOnlyPaths.forEach((path, index) => {
        mapping[`readonly:${index}`] =
            backend === 'docker'
                ? `/cmz-readonly-${index}`
                : realpathSync(resolve(path));
    });
    return mapping;
}

function escapedSandboxPath(path) {
    if (
        [...path].some((character) => {
            const code = character.codePointAt(0);
            return code <= 31 || code === 127;
        })
    ) {
        fail('caractère de contrôle dans un chemin sandbox');
    }
    return path.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

// Un moteur de rendu n'est pas un script : sans services système, Chromium ne
// démarre pas — mesuré, il meurt en SIGSEGV sous le profil nu. Ces permissions
// couvrent le démarrage du moteur (mach, mémoire partagée, sysctl, IOKit) et
// la lecture des bibliothèques du système. Elles ne rouvrent RIEN de ce que le
// profil protège : le HOME réel, le dépôt, le cache Bun et le réseau restent
// refusés, y compris pour Chromium lui-même — vérifié sur le backend réel dans
// sandbox.integration.test.mjs.
const RENDERER_SYSTEM_RULES = [
    '(allow signal)',
    '(allow sysctl*)',
    '(allow mach*)',
    '(allow ipc-posix-shm*)',
    '(allow iokit-open iokit-get-properties)',
    '(allow file-read-metadata)',
    '(allow file-read* (subpath "/System") (subpath "/Library") (subpath "/private/var/db") (subpath "/dev"))',
];

export function macSandboxProfile({
    profile,
    candidate,
    cache,
    home,
    repository,
    hostExecutable,
    readOnlyPaths = [],
    renderer = false,
}) {
    if (!['resolution', 'execution'].includes(profile))
        fail(`profil inconnu : ${profile}`);
    if (typeof hostExecutable !== 'string' || !hostExecutable.startsWith('/')) {
        fail('exécutable hôte absolu requis pour le profil macOS');
    }
    if (renderer && profile !== 'execution') {
        fail('le moteur de rendu ne tourne que dans le profil d’exécution');
    }
    const readable = [
        ...(profile === 'resolution'
            ? [candidate, cache, home]
            : [candidate, home]),
        ...readOnlyPaths,
    ];
    const writable =
        profile === 'resolution' ? [candidate, cache, home] : [candidate];
    const rules = [
        '(version 1)',
        '(deny default)',
        '(import "bsd.sb")',
        '(allow process*)',
        ...(renderer ? RENDERER_SYSTEM_RULES : []),
        `(allow file-read* (literal "${escapedSandboxPath(hostExecutable)}"))`,
        ...readable.map(
            (path) =>
                `(allow file-read* (subpath "${escapedSandboxPath(path)}"))`
        ),
        ...writable.map(
            (path) =>
                `(allow file-write* (subpath "${escapedSandboxPath(path)}"))`
        ),
    ];
    if (profile === 'resolution') rules.push('(allow network*)');
    rules.push(
        `(deny file-read* (subpath "${escapedSandboxPath(repository)}"))`,
        `(deny file-write* (subpath "${escapedSandboxPath(repository)}"))`
    );
    return rules.join(' ');
}

function cleanEnvironment(paths, profile, extraEnv) {
    return {
        PATH: process.env.PATH,
        HOME: paths.home,
        LANG: 'C',
        LC_ALL: 'C',
        CI: extraEnv?.CI ?? '1',
        NX_NO_CLOUD: extraEnv?.NX_NO_CLOUD ?? 'true',
        ...nxConfinementEnvironment(paths.candidate),
        ...(profile === 'resolution'
            ? {
                  BUN_INSTALL_CACHE_DIR: paths.cache,
                  GIT_CONFIG_NOSYSTEM: '1',
                  GIT_CONFIG_GLOBAL: '/dev/null',
                  GIT_CONFIG_SYSTEM: '/dev/null',
                  GIT_OPTIONAL_LOCKS: '0',
                  GIT_TERMINAL_PROMPT: '0',
              }
            : {}),
    };
}

function checkedSpawn(executable, argv, options, spawn = spawnSync) {
    const result = spawn(executable, argv, {
        ...options,
        shell: false,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
    });
    if (result.error) fail(`exécution impossible (${result.error.message})`);
    return {
        status: result.status,
        signal: result.signal,
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
    };
}

export function sandboxBackendAvailable(backend, { spawn = spawnSync } = {}) {
    const command = backend === 'macos' ? '/usr/bin/sandbox-exec' : 'docker';
    const argv =
        backend === 'macos'
            ? ['-p', '(version 1) (allow default)', '/usr/bin/true']
            : ['info'];
    try {
        return (
            spawn(command, argv, {
                shell: false,
                stdio: 'ignore',
                timeout: 10_000,
            }).status === 0
        );
    } catch {
        return false;
    }
}

export function selectSandboxBackend({
    platform = process.platform,
    spawn = spawnSync,
} = {}) {
    if (platform === 'darwin' && sandboxBackendAvailable('macos', { spawn }))
        return 'macos';
    if (platform === 'linux' && sandboxBackendAvailable('docker', { spawn }))
        return 'docker';
    fail(`aucun backend de confinement opérationnel pour ${platform}`);
}

export function runConfined({
    backend,
    profile,
    candidate,
    cache,
    home,
    repository,
    hostExecutable,
    containerExecutable,
    argv = [],
    policy,
    extraEnv = {},
    readOnlyPaths = [],
    renderer = false,
    timeoutMs = profile === 'resolution' ? 10 * 60_000 : 5 * 60_000,
    spawn = spawnSync,
}) {
    const paths = validateInvocation({
        candidate,
        cache,
        home,
        repository,
        argv,
        extraEnv,
        timeoutMs,
    });
    for (const path of readOnlyPaths) {
        const resolved = plainDirectory(path, 'chemin en lecture seule');
        assertOutside(resolved, paths.repository, 'dépôt réel');
        assertDisjoint(resolved, paths.candidate, 'lecture seule et candidat');
    }
    const selected = backend ?? selectSandboxBackend({ spawn });
    const mapping = sandboxTokenMapping(selected, paths, readOnlyPaths);
    const resolvedArgv = argv.map((argument) =>
        resolveSandboxTokens(argument, mapping)
    );
    const env = cleanEnvironment(paths, profile, extraEnv);
    if (selected === 'macos') {
        if (policy.sandbox?.macos_executable !== '/usr/bin/sandbox-exec') {
            fail('exécutable sandbox macOS non approuvé');
        }
        const executable = resolveSandboxTokens(hostExecutable, mapping);
        if (typeof executable !== 'string' || !executable.startsWith('/')) {
            fail('exécutable hôte absolu requis');
        }
        return checkedSpawn(
            policy.sandbox.macos_executable,
            [
                '-p',
                macSandboxProfile({
                    profile,
                    hostExecutable: executable,
                    readOnlyPaths,
                    renderer,
                    ...paths,
                }),
                executable,
                ...resolvedArgv,
            ],
            { cwd: paths.candidate, env, timeout: timeoutMs },
            spawn
        );
    }
    if (selected !== 'docker') fail(`backend inconnu : ${selected}`);
    // Un moteur de rendu ne tourne pas dans une image quelconque : il lui faut
    // les bibliothèques partagées de Chromium (nss, atk, gbm, alsa…), absentes
    // de l'image `node` du profil d'exécution. Aucune image de rendu n'est
    // encore épinglée ni prouvée côté conteneur : on refuse explicitement
    // plutôt que d'émettre une commande qui échouerait obscurément en CI.
    // L'oracle navigateur est donc, à ce jour, macOS uniquement — et le dire
    // vaut mieux que le laisser croire.
    if (renderer) {
        const rendererImage =
            policy.sandbox?.container_images?.execution_renderer;
        if (!rendererImage) {
            fail(
                "backend docker : aucune image de rendu épinglée (sandbox.container_images.execution_renderer) — l'oracle navigateur n'est pas encore prouvé sur ce backend"
            );
        }
    }
    const image = policy.sandbox?.container_images?.[profile];
    if (!/^[a-z0-9][a-z0-9._/-]*@sha256:[a-f0-9]{64}$/.test(image ?? '')) {
        fail(`image ${profile} absente ou non épinglée par digest`);
    }
    const executable = resolveSandboxTokens(containerExecutable, mapping);
    if (typeof executable !== 'string' || !executable.startsWith('/')) {
        fail('exécutable conteneur absolu requis');
    }
    const uid = typeof process.getuid === 'function' ? process.getuid() : 65534;
    const gid = typeof process.getgid === 'function' ? process.getgid() : 65534;
    const dockerArgs = [
        'run',
        '--rm',
        '--read-only',
        '--cap-drop',
        'ALL',
        '--security-opt',
        'no-new-privileges',
        '--pids-limit',
        '128',
        '--user',
        `${uid}:${gid}`,
        '--network',
        profile === 'execution' ? 'none' : 'bridge',
        '--mount',
        `type=bind,src=${paths.candidate},dst=/workspace,rw`,
        '--mount',
        `type=bind,src=${paths.home},dst=/cmz-home,${profile === 'resolution' ? 'rw' : 'ro'}`,
        // Même frontière que sur macOS : le moteur de rendu est monté en
        // LECTURE SEULE, hors du candidat, et son contenu a déjà été vérifié
        // par empreinte sha256 avant extraction.
        ...readOnlyPaths.flatMap((path, index) => [
            '--mount',
            `type=bind,src=${realpathSync(resolve(path))},dst=/cmz-readonly-${index},ro`,
        ]),
        '--tmpfs',
        '/tmp:rw,noexec,nosuid,nodev,size=128m',
        '--workdir',
        '/workspace',
        '--env',
        'HOME=/cmz-home',
        '--env',
        'CI=1',
        '--env',
        'NX_NO_CLOUD=true',
        // Mêmes réglages que sur macOS : les deux backends doivent offrir la
        // même frontière, sans quoi la suite hostile ne prouve pas la même
        // chose des deux côtés. Le conteneur monte /tmp en tmpfs inscriptible,
        // donc l'omission y serait restée invisible.
        ...Object.entries(nxConfinementEnvironment('/workspace')).flatMap(
            ([key, value]) => ['--env', `${key}=${value}`]
        ),
    ];
    if (profile === 'resolution') {
        dockerArgs.push(
            '--mount',
            `type=bind,src=${paths.cache},dst=/cmz-cache,rw`,
            '--env',
            'BUN_INSTALL_CACHE_DIR=/cmz-cache'
        );
    }
    dockerArgs.push(image, executable, ...resolvedArgv);
    return checkedSpawn(
        'docker',
        dockerArgs,
        { cwd: paths.home, env, timeout: timeoutMs },
        spawn
    );
}

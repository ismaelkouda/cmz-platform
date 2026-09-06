import assert from 'node:assert/strict';
import { mkdir, mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
    nxConfinementEnvironment,
    macSandboxProfile,
    runConfined,
    selectSandboxBackend,
} from './sandbox.mjs';

const policy = {
    sandbox: {
        macos_executable: '/usr/bin/sandbox-exec',
        container_images: {
            resolution: `oven/bun@sha256:${'a'.repeat(64)}`,
            execution: `node@sha256:${'b'.repeat(64)}`,
        },
    },
};

async function paths(t) {
    const root = await realpath(
        await mkdtemp(join(tmpdir(), 'cmz-sandbox-test-'))
    );
    t.after(() => rm(root, { recursive: true, force: true }));
    const result = {
        repository: join(root, 'repo'),
        candidate: join(root, 'candidate'),
        cache: join(root, 'cache'),
        home: join(root, 'home'),
    };
    for (const path of Object.values(result))
        await mkdir(path, { mode: 0o700 });
    return result;
}

test('profil macOS sépare résolution et exécution', async (t) => {
    const value = await paths(t);
    const hostExecutable = '/usr/bin/true';
    const resolution = macSandboxProfile({
        profile: 'resolution',
        hostExecutable,
        ...value,
    });
    const execution = macSandboxProfile({
        profile: 'execution',
        hostExecutable,
        ...value,
    });
    assert.match(resolution, /\(deny default\)/);
    assert.match(resolution, /allow network/);
    assert.match(resolution, new RegExp(value.cache.replaceAll('/', '\\/')));
    assert.match(execution, /\(deny default\)/);
    assert.doesNotMatch(execution, /allow network/);
    assert.match(execution, /deny file-read/);
    const homeWriteRule = `(allow file-write* (subpath "${value.home}"))`;
    assert.match(
        resolution,
        new RegExp(homeWriteRule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    );
    assert.ok(!execution.includes(homeWriteRule));
});

// Régression du 2026-09-05 : seul le candidat est inscriptible sous le profil
// d'exécution, mais Nx recopiait son binaire natif dans os.tmpdir(). La copie
// échouait sans lever, le module natif revenait incomplet, et le schematic
// mourait sur « WorkspaceContext is not a constructor ». Les trois
// emplacements que Nx peut écrire doivent donc être redirigés dans le
// candidat — sur les DEUX backends, sinon la suite hostile ne prouve pas la
// même frontière des deux côtés.
test('les réglages Nx de confinement sont identiques sur les deux backends', async (t) => {
    const value = await paths(t);
    const expected = [
        'NX_DAEMON',
        'NX_ISOLATE_PLUGINS',
        'NX_CACHE_DIRECTORY',
        'NX_WORKSPACE_DATA_DIRECTORY',
        'NX_NATIVE_FILE_CACHE_DIRECTORY',
    ];
    assert.deepEqual(
        Object.keys(nxConfinementEnvironment('/candidat')).sort(),
        [...expected].sort()
    );
    // Les workers de plugins Nx dialoguent par socket unix dans os.tmpdir(),
    // fermé sous le profil d'exécution : sans cet interrupteur ils sortent en
    // code 0 et Nx échoue avant le schematic.
    assert.equal(
        nxConfinementEnvironment('/candidat').NX_ISOLATE_PLUGINS,
        'false'
    );
    // Une valeur relative est aussi inopérante qu'une variable absente :
    // mesuré sous le profil réel, WorkspaceContext reste `undefined`.
    assert.throws(
        () => nxConfinementEnvironment('node_modules'),
        /racine absolue requise/
    );

    for (const profile of ['resolution', 'execution']) {
        let observed;
        const spawn = (executable, argv, options) => {
            observed = { executable, argv, options };
            return { status: 0, stdout: '', stderr: '', signal: null };
        };
        runConfined({
            backend: 'macos',
            profile,
            ...value,
            hostExecutable: '/usr/bin/true',
            containerExecutable: '/usr/local/bin/node',
            argv: [],
            policy,
            spawn,
        });
        const host = nxConfinementEnvironment(value.candidate);
        for (const key of expected) {
            assert.equal(
                observed.options.env[key],
                host[key],
                `${profile}/macos: ${key}`
            );
        }
        for (const key of expected.filter((name) =>
            name.endsWith('DIRECTORY')
        )) {
            assert.ok(
                observed.options.env[key].startsWith(`${value.candidate}/`),
                `${profile}/macos: ${key} doit être absolu dans le candidat`
            );
        }

        runConfined({
            backend: 'docker',
            profile,
            ...value,
            hostExecutable: '/usr/bin/node',
            containerExecutable: '/usr/local/bin/node',
            argv: [],
            policy,
            spawn,
        });
        const container = nxConfinementEnvironment('/workspace');
        for (const key of expected) {
            assert.ok(
                observed.argv.includes(`${key}=${container[key]}`),
                `${profile}/docker: ${key}`
            );
        }
    }
});

test('backend absent échoue avant toute commande métier', () => {
    let calls = 0;
    const spawn = () => {
        calls += 1;
        return { status: 1 };
    };
    assert.throws(
        () => selectSandboxBackend({ platform: 'linux', spawn }),
        /aucun backend/
    );
    assert.equal(calls, 1);
});

test('Docker est sans shell, sans réseau en exécution et utilise une image digérée', async (t) => {
    const value = await paths(t);
    let observed;
    const spawn = (executable, argv, options) => {
        observed = { executable, argv, options };
        return { status: 0, stdout: '', stderr: '', signal: null };
    };
    const result = runConfined({
        backend: 'docker',
        profile: 'execution',
        ...value,
        hostExecutable: '/usr/bin/node',
        containerExecutable: '/usr/local/bin/node',
        argv: ['script.mjs'],
        policy,
        spawn,
    });
    assert.equal(result.status, 0);
    assert.equal(observed.executable, 'docker');
    assert.equal(observed.options.shell, false);
    assert.ok(observed.argv.includes('none'));
    assert.ok(
        observed.argv.includes(policy.sandbox.container_images.execution)
    );
    assert.ok(observed.argv.includes('/usr/local/bin/node'));
    assert.ok(
        observed.argv.includes(`type=bind,src=${value.home},dst=/cmz-home,ro`)
    );
    assert.ok(!observed.argv.some((arg) => arg.includes('dst=/cmz-cache')));
});

test('refuse credentials, argv NUL et image Docker flottante', async (t) => {
    const value = await paths(t);
    const base = {
        backend: 'docker',
        profile: 'execution',
        ...value,
        hostExecutable: '/usr/bin/node',
        containerExecutable: '/usr/local/bin/node',
        policy,
        spawn: () => ({ status: 0, stdout: '', stderr: '' }),
    };
    assert.throws(
        () => runConfined({ ...base, extraEnv: { NPM_TOKEN: 'x' } }),
        /non autorisée/
    );
    assert.throws(
        () => runConfined({ ...base, argv: ['x\0y'] }),
        /argv invalide/
    );
    assert.throws(
        () =>
            runConfined({
                ...base,
                policy: {
                    sandbox: {
                        ...policy.sandbox,
                        container_images: {
                            ...policy.sandbox.container_images,
                            execution: 'node:22',
                        },
                    },
                },
            }),
        /non épinglée/
    );
});

// Défaut réel du 2026-09-06 : l'oracle navigateur écrivait des chemins HÔTE
// dans `argv` et dans l'exécutable conteneur. Sur macOS c'était juste, dans le
// conteneur — où le candidat est monté sur `/workspace` et la lecture seule sur
// `/cmz-readonly-<n>` — c'était faux. Les tests Docker mockés ne voyaient rien :
// ils vérifiaient des drapeaux, jamais la cohérence des chemins.
test('les jetons de chemin sont résolus selon le backend', async (t) => {
    const value = await paths(t);
    const readOnly = join(value.home, '..', 'lecture-seule');
    await mkdir(readOnly, { mode: 0o700 });
    const argv = [
        '--user-data-dir={{candidate}}/node_modules/.profil',
        'file://{{candidate}}/dist/probe.html',
    ];
    const base = {
        profile: 'execution',
        ...value,
        readOnlyPaths: [readOnly],
        argv,
        policy: {
            sandbox: {
                ...policy.sandbox,
                container_images: {
                    ...policy.sandbox.container_images,
                    execution_renderer: `renderer@sha256:${'c'.repeat(64)}`,
                },
            },
        },
    };
    let observed;
    const spawn = (executable, args, options) => {
        observed = { executable, args, options };
        return { status: 0, stdout: '', stderr: '', signal: null };
    };

    runConfined({
        ...base,
        backend: 'macos',
        hostExecutable: '{{readonly:0}}/moteur',
        containerExecutable: '{{readonly:0}}/moteur',
        renderer: true,
        spawn,
    });
    assert.ok(
        observed.args.includes(`${readOnly}/moteur`),
        'macOS : chemin hôte du moteur'
    );
    assert.ok(
        observed.args.includes(
            `--user-data-dir=${value.candidate}/node_modules/.profil`
        ),
        'macOS : candidat en chemin hôte'
    );
    assert.ok(!observed.args.some((argument) => argument.includes('{{')));

    runConfined({
        ...base,
        backend: 'docker',
        hostExecutable: '{{readonly:0}}/moteur',
        containerExecutable: '{{readonly:0}}/moteur',
        renderer: true,
        spawn,
    });
    assert.ok(
        observed.args.includes('/cmz-readonly-0/moteur'),
        'docker : moteur au point de montage'
    );
    assert.ok(
        observed.args.includes(
            '--user-data-dir=/workspace/node_modules/.profil'
        ),
        'docker : candidat sur /workspace'
    );
    assert.ok(
        observed.args.includes('file:///workspace/dist/probe.html'),
        'docker : URL file:// traduite'
    );
    assert.ok(!observed.args.some((argument) => argument.includes('{{')));

    assert.throws(
        () =>
            runConfined({
                ...base,
                backend: 'docker',
                hostExecutable: '/x',
                containerExecutable: '{{readonly:9}}/moteur',
                spawn,
            }),
        /jeton de chemin inconnu/
    );
});

// Sans image de rendu épinglée, une invocation Docker du moteur produirait une
// commande qui échouerait obscurément en CI (l'image `node` n'a pas les
// bibliothèques de Chromium). On refuse en le nommant.
test('le moteur de rendu est refusé sur Docker sans image épinglée', async (t) => {
    const value = await paths(t);
    assert.throws(
        () =>
            runConfined({
                backend: 'docker',
                profile: 'execution',
                ...value,
                hostExecutable: '/usr/bin/node',
                containerExecutable: '/usr/local/bin/node',
                renderer: true,
                policy,
                spawn: () => ({ status: 0, stdout: '', stderr: '' }),
            }),
        /aucune image de rendu épinglée/
    );
});

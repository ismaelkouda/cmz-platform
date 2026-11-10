// X4-sécurité : toute commande lancée dans un produit extérieur (compilateur,
// build, lint, tests, contrôle d'espace) exécute du code que l'atelier n'a pas
// écrit, dont la spec d'un réalisateur. Elle tourne donc dans le même bac à
// sable que les oracles du mode atelier : profil `execution` (refus par
// défaut), aucun réseau, environnement propre, HOME jetable en lecture seule,
// aucune lecture hors du produit et du nœud exécutable.
import { mkdir, mkdtemp, readdir, realpath, rm } from 'node:fs/promises';
import { lstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';

import { loadResolutionPolicy } from '../../library-setup/resolution-policy.mjs';
import {
    runConfined,
    selectSandboxBackend,
} from '../../library-setup/sandbox.mjs';
import { externalFailure } from './external-application-paths.mjs';

// Seuls ces répertoires du produit restent inscriptibles : caches et sorties
// jetables. Tout autre répertoire existant (sources possédées, brouillons,
// paquets installés, outils de l'oracle) est monté en lecture seule. Les
// fichiers de la racine (`package.json`…) sont possédés et relus après chaque
// commande par la primitive de publication.
export const PRODUCT_WRITABLE_DIRECTORIES = Object.freeze([
    '.angular',
    '.nx',
    'coverage',
    'dist',
    'tmp',
]);

function plainDirectory(path) {
    try {
        const metadata = lstatSync(path);
        return metadata.isDirectory() && !metadata.isSymbolicLink();
    } catch {
        return false;
    }
}

// Répertoires en lecture seule, relatifs à la racine du produit : chaque
// répertoire de premier niveau hors caches, et chaque paquet installé. Les
// caches d'outils de `node_modules/.*` (Vite, Vitest, Nx) restent inscriptibles.
export async function protectedProductDirectories(root) {
    const protectedPaths = [];
    for (const entry of await readdir(root, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        if (entry.name === 'node_modules') continue;
        if (PRODUCT_WRITABLE_DIRECTORIES.includes(entry.name)) continue;
        protectedPaths.push(entry.name);
    }
    const modules = join(root, 'node_modules');
    if (plainDirectory(modules))
        for (const entry of await readdir(modules, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            if (entry.name.startsWith('.') && entry.name !== '.bin') continue;
            protectedPaths.push(`node_modules/${entry.name}`);
        }
    return protectedPaths.sort();
}

// Les chemins absolus sous le produit deviennent des jetons : sur Docker le
// produit est monté ailleurs que sur l'hôte.
function tokenized(argument, root) {
    if (argument === root) return '{{candidate}}';
    if (argument.startsWith(root + sep))
        return `{{candidate}}/${relative(root, argument).split(sep).join('/')}`;
    return argument;
}

export async function runConfinedProductCommand(
    command,
    args,
    root,
    {
        workspaceRoot,
        backend,
        run = runConfined,
        output = process.stderr,
        timeoutMs = 10 * 60_000,
    } = {}
) {
    const product = await realpath(root);
    if (product !== root)
        externalFailure('product command root is not canonical');
    if (command !== process.execPath)
        externalFailure('product command must run the qualified node');
    const loaded = loadResolutionPolicy(workspaceRoot);
    if (loaded.errors.length)
        externalFailure('confinement policy of the workshop is invalid');
    const scratch = await realpath(
        await mkdtemp(join(tmpdir(), 'cmz-product-command-'))
    );
    try {
        const home = join(scratch, 'home');
        const cache = join(scratch, 'cache');
        await mkdir(home, { mode: 0o700 });
        await mkdir(cache, { mode: 0o700 });
        const result = run({
            backend: backend ?? selectSandboxBackend(),
            profile: 'execution',
            candidate: product,
            cache,
            home,
            repository: workspaceRoot,
            hostExecutable: command,
            containerExecutable: '/usr/local/bin/node',
            argv: args.map((argument) => tokenized(argument, product)),
            policy: loaded.policy,
            extraEnv: { CI: 'true', NX_NO_CLOUD: 'true' },
            readOnlyCandidatePaths: await protectedProductDirectories(product),
            nxRoot: '.',
            allowLoopback: false,
            allowSignals: true,
            timeoutMs,
        });
        if (result.stdout) output.write(result.stdout);
        if (result.stderr) output.write(result.stderr);
        if (result.status !== 0)
            externalFailure(
                `product command failed under confinement (code ${result.status ?? 'null'}${result.signal ? `, signal ${result.signal}` : ''})`
            );
        return result;
    } finally {
        await rm(scratch, { recursive: true, force: true });
    }
}

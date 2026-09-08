import { spawnSync } from 'node:child_process';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

import {
    createCandidateLease,
    releaseCandidateLease,
} from './candidate-lease.mjs';
import {
    applyDependencyOverlay,
    bunInstallArgv,
    dependencyClosureSha256,
    dependencyProjectionSha256,
    replaceRegularFile,
    updateRootManifest,
    validateLockEvolution,
} from './dependency-resolution.mjs';
import { snapshotFilesystem, snapshotSha256 } from './filesystem-snapshot.mjs';
import { buildLibraryChangeSet } from './library-plan.mjs';
import { verifyRepositoryResolution } from './resolution-policy.mjs';
import { runConfined } from './sandbox.mjs';

function fail(message) {
    throw new Error(`library install protocol: ${message}`);
}

function assertSuccess(result, phase) {
    if (result.status !== 0) {
        const diagnostic = [...`${result.stderr || result.stdout}`]
            .map((character) => {
                const code = character.codePointAt(0);
                return code <= 31 || code === 127 ? ' ' : character;
            })
            .join('')
            .slice(0, 4_000);
        fail(
            `${phase} a échoué (code ${result.status}, signal ${result.signal ?? 'aucun'})${diagnostic ? ` : ${diagnostic}` : ''}`
        );
    }
}

function governedSnapshot(workspace) {
    return snapshotFilesystem(workspace, {
        excludedDirectories: ['node_modules'],
    });
}

function assertSameSnapshot(before, after, phase) {
    if (snapshotSha256(before) !== snapshotSha256(after)) {
        const changes = buildLibraryChangeSet(before, after)
            .changes.map(({ op, path }) => `${op}:${path}`)
            .join(', ');
        fail(
            `${phase} a modifié des fichiers gouvernés inattendus (${changes})`
        );
    }
}

function assertNoResolutionOverrides(workspace) {
    for (const path of ['.npmrc', 'bunfig.toml']) {
        try {
            lstatSync(join(workspace, path));
            fail(`${path} est interdit pendant la résolution`);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }
}

function runBun(context, argv) {
    const result = context.run({
        backend: context.backend,
        profile: 'resolution',
        candidate: context.workspace,
        cache: context.cache,
        home: context.home,
        repository: context.repository,
        hostExecutable: context.bunExecutable,
        containerExecutable: '/usr/local/bin/bun',
        argv,
        policy: context.policy,
    });
    assertSuccess(result, `bun ${argv.join(' ')}`);
    return result;
}

function replayLifecycleScripts(context) {
    for (const entry of context.policy.lifecycle_scripts) {
        if (entry.classification !== 'replay') continue;
        if (entry.runner?.executable !== 'node') {
            fail(`runner lifecycle non pris en charge : ${entry.name}`);
        }
        const result = context.run({
            backend: context.backend,
            profile: 'execution',
            candidate: context.workspace,
            cache: context.cache,
            home: context.home,
            repository: context.repository,
            hostExecutable: process.execPath,
            containerExecutable: '/usr/local/bin/node',
            argv: entry.runner.argv,
            policy: context.policy,
            timeoutMs: 60_000,
        });
        assertSuccess(result, `replay lifecycle ${entry.name}`);
    }
}

function verifyPolicy(workspace, label) {
    const result = verifyRepositoryResolution(workspace);
    if (!result.ok)
        fail(`${label} hors politique : ${result.errors.join(' ; ')}`);
}

/**
 * Synchronise l'état dérivé `node_modules` APRÈS publication. Le code tiers
 * reste désactivé (`--ignore-scripts`) et les deux artefacts gouvernés doivent
 * rester strictement identiques. Une commande `add-library` ne peut donc pas
 * annoncer son succès tout en laissant le workspace local inutilisable.
 */
export function synchronizePublishedDependencies({
    repository,
    track,
    policy,
    cache,
    home,
    bunExecutable,
    spawn = spawnSync,
    verifyResolution = verifyRepositoryResolution,
    verifyPackages = verifyInstalledPackages,
}) {
    const manifestPath = join(repository, 'package.json');
    const lockPath = join(repository, 'bun.lock');
    const manifestBefore = readFileSync(manifestPath);
    const lockBefore = readFileSync(lockPath);
    const argv = bunInstallArgv({
        frozen: true,
        registry: policy.allowed_registries[0],
    });
    const result = spawn(bunExecutable, argv, {
        cwd: repository,
        shell: false,
        encoding: 'utf8',
        timeout: 10 * 60_000,
        maxBuffer: 64 * 1024 * 1024,
        env: {
            PATH: process.env.PATH,
            HOME: home,
            LANG: 'C',
            LC_ALL: 'C',
            BUN_INSTALL_CACHE_DIR: cache,
            GIT_CONFIG_NOSYSTEM: '1',
            GIT_CONFIG_GLOBAL: '/dev/null',
            GIT_CONFIG_SYSTEM: '/dev/null',
            GIT_OPTIONAL_LOCKS: '0',
            GIT_TERMINAL_PROMPT: '0',
        },
    });
    const manifestChanged = !readFileSync(manifestPath).equals(manifestBefore);
    const lockChanged = !readFileSync(lockPath).equals(lockBefore);
    // La vérification doit précéder toute propagation d'erreur du processus :
    // Bun peut échouer ou expirer après une écriture. Laisser ces deux fichiers
    // gouvernés modifiés rendrait précisément la transaction durable impossible
    // à reprendre, car la récupération refuse à juste titre un worktree sale.
    if (manifestChanged) {
        replaceRegularFile(repository, 'package.json', manifestBefore);
    }
    if (lockChanged) {
        replaceRegularFile(repository, 'bun.lock', lockBefore);
    }
    if (result.error) {
        fail(`synchronisation locale impossible (${result.error.message})`);
    }
    assertSuccess(result, `bun ${argv.join(' ')}`);
    if (manifestChanged || lockChanged) {
        fail(
            'synchronisation locale a muté package.json ou bun.lock ; octets restaurés'
        );
    }
    const resolution = verifyResolution(repository);
    if (!resolution.ok) {
        fail(
            `workspace publié hors politique : ${resolution.errors.join(' ; ')}`
        );
    }
    verifyPackages(repository, track);
    return { synchronized: true };
}

export function verifyInstalledPackages(workspace, track) {
    const nodeModules = resolve(workspace, 'node_modules');
    let nodeModulesStats;
    try {
        nodeModulesStats = lstatSync(nodeModules);
    } catch {
        fail('node_modules racine absent, symbolique ou non répertoire');
    }
    if (nodeModulesStats.isSymbolicLink() || !nodeModulesStats.isDirectory()) {
        fail('node_modules racine absent, symbolique ou non répertoire');
    }
    const canonicalNodeModules = realpathSync(nodeModules);
    for (const [name, expectedVersion] of Object.entries(
        track.packages ?? {}
    ).sort()) {
        if (!/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/.test(name)) {
            fail(`nom de paquet direct invalide : ${name}`);
        }
        const manifestPath = join(
            nodeModules,
            ...name.split('/'),
            'package.json'
        );
        let stats;
        let canonicalManifest;
        try {
            stats = lstatSync(manifestPath);
            canonicalManifest = realpathSync(manifestPath);
        } catch {
            fail(`${name}: package.json installé introuvable`);
        }
        const within = relative(canonicalNodeModules, canonicalManifest);
        if (
            stats.isSymbolicLink() ||
            !stats.isFile() ||
            within === '' ||
            within === '..' ||
            within.startsWith(`..${sep}`) ||
            isAbsolute(within)
        ) {
            fail(
                `${name}: package.json installé hors node_modules ou non régulier`
            );
        }
        let manifest;
        try {
            manifest = JSON.parse(readFileSync(canonicalManifest, 'utf8'));
        } catch {
            fail(`${name}: package.json installé illisible`);
        }
        if (manifest.name !== name || manifest.version !== expectedVersion) {
            fail(
                `${name}: paquet installé ${manifest.name ?? '?'}@${manifest.version ?? '?'} au lieu de ${name}@${expectedVersion}`
            );
        }
    }
}

/**
 * Exécute exclusivement les trois temps de résolution. Aucun schematic ni LLM
 * n'est autorisé ici. Le second candidat est toujours libéré par finally.
 */
export async function resolveLibraryDependencies({
    repository,
    candidate,
    track,
    policy,
    backend,
    cache,
    homes,
    bunExecutable,
    createLease = createCandidateLease,
    releaseLease = releaseCandidateLease,
    run = runConfined,
}) {
    const workspace = candidate.workspace;
    if (
        !homes ||
        !['base', 'generation', 'verification', 'execution'].every(
            (key) => typeof homes[key] === 'string'
        )
    ) {
        fail('quatre HOME jetables distincts sont requis');
    }
    const resolutionHomes = [
        'base',
        'generation',
        'verification',
        'execution',
    ].map((key) => homes[key]);
    if (new Set(resolutionHomes).size !== resolutionHomes.length) {
        fail('les HOME de résolution et d’exécution doivent être distincts');
    }
    assertNoResolutionOverrides(workspace);
    verifyPolicy(workspace, 'état initial');
    const initialManifest = await readFile(join(workspace, 'package.json'));
    const initialLock = await readFile(join(workspace, 'bun.lock'));
    const beforeBase = governedSnapshot(workspace);
    const context = {
        repository,
        workspace,
        policy,
        backend,
        cache,
        home: homes.base,
        bunExecutable,
        run,
    };
    replayLifecycleScripts({ ...context, home: homes.execution });
    const version = runBun(context, ['--version']).stdout.trim();
    const declaredBun = JSON.parse(initialManifest).packageManager;
    if (declaredBun !== `bun@${version}`) {
        fail(
            `Bun exécuté ${version} différent du packageManager ${declaredBun}`
        );
    }
    runBun(
        context,
        bunInstallArgv({ frozen: true, registry: policy.allowed_registries[0] })
    );
    assertSameSnapshot(
        beforeBase,
        governedSnapshot(workspace),
        'installation de base'
    );

    const finalManifest = Buffer.from(
        updateRootManifest(initialManifest.toString('utf8'), track)
    );
    replaceRegularFile(workspace, 'package.json', finalManifest);
    context.home = homes.generation;
    runBun(
        context,
        bunInstallArgv({
            frozen: false,
            registry: policy.allowed_registries[0],
        })
    );
    verifyInstalledPackages(workspace, track);
    const finalLock = await readFile(join(workspace, 'bun.lock'));
    validateLockEvolution(
        initialLock.toString('utf8'),
        finalLock.toString('utf8'),
        track
    );
    verifyPolicy(workspace, 'état final');
    const resolutionChanges = buildLibraryChangeSet(
        beforeBase,
        governedSnapshot(workspace)
    );
    const changedPaths = resolutionChanges.changes
        .map(({ path }) => path)
        .sort();
    if (
        resolutionChanges.changes.some(
            ({ op, path }) =>
                op !== 'modify' || !['bun.lock', 'package.json'].includes(path)
        )
    ) {
        fail(
            `résolution a modifié un ensemble inattendu : ${changedPaths.join(', ')}`
        );
    }

    let verification;
    try {
        verification = createLease({
            repository,
            commit: candidate.tree.commit,
        });
        applyDependencyOverlay(verification.tree, verification.workspace, {
            'package.json': finalManifest,
            'bun.lock': finalLock,
        });
        const verificationContext = {
            ...context,
            workspace: verification.workspace,
            home: homes.verification,
        };
        assertNoResolutionOverrides(verification.workspace);
        verifyPolicy(verification.workspace, 'overlay de vérification');
        runBun(
            verificationContext,
            bunInstallArgv({
                frozen: true,
                registry: policy.allowed_registries[0],
            })
        );
        verifyInstalledPackages(verification.workspace, track);
        const manifestAfter = await readFile(
            join(verification.workspace, 'package.json')
        );
        const lockAfter = await readFile(
            join(verification.workspace, 'bun.lock')
        );
        if (
            !manifestAfter.equals(finalManifest) ||
            !lockAfter.equals(finalLock)
        ) {
            fail('installation gelée depuis zéro a muté l’overlay final');
        }
    } finally {
        if (verification) releaseLease(verification);
    }
    return {
        bunVersion: version,
        packageJsonInitial: initialManifest,
        packageJsonFinal: finalManifest,
        bunLockInitial: initialLock,
        bunLockFinal: finalLock,
        dependencyInitialSha256: dependencyProjectionSha256(
            initialManifest,
            initialLock,
            track
        ),
        dependencyFinalSha256: dependencyClosureSha256(
            finalManifest,
            finalLock,
            track
        ),
    };
}

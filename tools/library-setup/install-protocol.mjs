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
    };
}

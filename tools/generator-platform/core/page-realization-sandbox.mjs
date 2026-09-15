import { execFileSync } from 'node:child_process';
import {
    chmodSync,
    copyFileSync,
    lstatSync,
    mkdirSync,
    mkdtempSync,
    readlinkSync,
    realpathSync,
    readdirSync,
    rmSync,
    symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

import { loadResolutionPolicy } from '../../library-setup/resolution-policy.mjs';
import {
    runConfined,
    selectSandboxBackend,
} from '../../library-setup/sandbox.mjs';

const ORACLES = new Set(['compile', 'build', 'lint', 'test']);

function fail(message) {
    throw new Error(`page realization sandbox: ${message}`);
}

function inside(root, path, label) {
    const absolute = resolve(root, path);
    const rel = relative(root, absolute);
    if (
        rel === '' ||
        rel === '..' ||
        rel.startsWith(`..${sep}`) ||
        isAbsolute(rel)
    ) {
        fail(`${label} hors racine`);
    }
    return absolute;
}

function gitVisiblePaths(repository) {
    let visible;
    let deleted;
    const env = {
        PATH: process.env.PATH,
        LANG: 'C',
        LC_ALL: 'C',
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_SYSTEM: '/dev/null',
        GIT_OPTIONAL_LOCKS: '0',
        GIT_TERMINAL_PROMPT: '0',
    };
    try {
        visible = execFileSync(
            'git',
            [
                '-C',
                repository,
                '--no-replace-objects',
                '--no-lazy-fetch',
                'ls-files',
                '-z',
                '--cached',
                '--others',
                '--exclude-standard',
            ],
            { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] }
        );
        deleted = new Set(
            execFileSync(
                'git',
                [
                    '-C',
                    repository,
                    '--no-replace-objects',
                    '--no-lazy-fetch',
                    'ls-files',
                    '-z',
                    '--deleted',
                ],
                { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] }
            )
                .split('\0')
                .filter(Boolean)
        );
    } catch {
        fail('inventaire Git requis pour construire le candidat');
    }
    return visible
        .split('\0')
        .filter((path) => path && !deleted.has(path))
        .sort();
}

function ensureParent(root, path) {
    const parent = dirname(path);
    const rel = relative(root, parent);
    let current = root;
    if (!rel) return;
    for (const segment of rel.split(sep)) {
        current = join(current, segment);
        try {
            const metadata = lstatSync(current);
            if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
                fail('parent candidat non régulier');
            }
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
            mkdirSync(current, { mode: 0o700 });
        }
    }
}

function copyGovernedFiles(repository, candidate) {
    for (const path of gitVisiblePaths(repository)) {
        const source = inside(repository, path, 'source gouvernée');
        const destination = inside(candidate, path, 'destination gouvernée');
        const metadata = lstatSync(source);
        ensureParent(candidate, destination);
        if (metadata.isSymbolicLink()) {
            const target = readlinkSync(source);
            if (isAbsolute(target) || target.includes('\0')) {
                fail(`lien gouverné invalide : ${path}`);
            }
            symlinkSync(target, destination);
        } else if (metadata.isFile()) {
            copyFileSync(source, destination);
            chmodSync(destination, metadata.mode & 0o777);
        } else {
            fail(`entrée Git non régulière : ${path}`);
        }
    }
}

function linkDependencies(source, destination, targetRoot) {
    mkdirSync(destination, { mode: 0o700 });
    for (const entry of readdirSync(source, { withFileTypes: true })) {
        if (entry.name === '.vite-temp') continue;
        symlinkSync(
            join(targetRoot, entry.name),
            join(destination, entry.name)
        );
    }
}

export function createPageRealizationOracle(
    { workspaceRoot, appName },
    dependencies = {}
) {
    if (!/^[a-z][a-z0-9-]*$/.test(appName ?? '')) {
        fail("nom d'application invalide");
    }
    const repository = realpathSync(resolve(workspaceRoot));
    const nodeModules = join(repository, 'node_modules');
    const nodeModulesMetadata = lstatSync(nodeModules);
    if (
        !nodeModulesMetadata.isDirectory() ||
        nodeModulesMetadata.isSymbolicLink()
    ) {
        fail('node_modules doit être un répertoire réel');
    }
    const root = realpathSync(
        mkdtempSync(join(tmpdir(), 'cmz-page-realization-oracle-'))
    );
    const candidate = join(root, 'candidate');
    const cache = join(root, 'cache');
    const home = join(root, 'home');
    let disposed = false;
    try {
        for (const path of [candidate, cache, home]) {
            mkdirSync(path, { mode: 0o700 });
        }
        const backend =
            dependencies.backend ??
            (dependencies.selectBackend ?? selectSandboxBackend)();
        copyGovernedFiles(repository, candidate);
        linkDependencies(
            nodeModules,
            join(candidate, 'node_modules'),
            backend === 'docker' ? '/cmz-repository-0' : nodeModules
        );
        mkdirSync(join(candidate, '.cmz-oracle-runtime'), { mode: 0o700 });
        mkdirSync(join(candidate, '.cmz-oracle-runtime/tmp'), { mode: 0o700 });
        const loaded = (dependencies.loadPolicy ?? loadResolutionPolicy)(
            repository
        );
        if (loaded.errors.length > 0) {
            fail(
                `politique de confinement invalide : ${loaded.errors.join('; ')}`
            );
        }
        const run = dependencies.runConfined ?? runConfined;
        return {
            candidate,
            run(oracle) {
                if (!ORACLES.has(oracle))
                    fail(`oracle non autorisé : ${oracle}`);
                const result = run({
                    backend,
                    profile: 'execution',
                    candidate,
                    cache,
                    home,
                    repository,
                    hostExecutable: process.execPath,
                    containerExecutable: '/usr/local/bin/node',
                    argv: [
                        'tools/generator-platform/page-realization-oracle-runner.mjs',
                        '--oracle',
                        oracle,
                        '--app',
                        appName,
                    ],
                    policy: loaded.policy,
                    repositoryReadOnlyPaths: [nodeModules],
                    nxRoot: '.cmz-oracle-runtime',
                    allowLoopback: true,
                    allowSignals: true,
                    timeoutMs: 10 * 60_000,
                });
                if (result.status !== 0) {
                    const error = new Error(
                        `${oracle} failed in confined oracle (code ${result.status ?? 'null'}${result.signal ? `, signal ${result.signal}` : ''})`
                    );
                    error.stdout = result.stdout;
                    error.stderr = result.stderr;
                    throw error;
                }
                return result.stdout;
            },
            dispose() {
                if (disposed) return;
                disposed = true;
                rmSync(root, { recursive: true, force: true });
            },
        };
    } catch (error) {
        rmSync(root, { recursive: true, force: true });
        throw error;
    }
}

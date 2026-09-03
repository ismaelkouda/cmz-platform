import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import {
    access,
    lstat,
    mkdir,
    open,
    readFile,
    readdir,
    rename,
    rm,
    rmdir,
} from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

import {
    findNxGraphConsumers,
    runNxGraphGate,
} from '../../retire-module-nx.mjs';
import { currentGitIdentity } from '../../retire-module-transaction.mjs';
import { withGenerationLock } from './generation-transaction.mjs';

const TRANSACTION_ROOT = '.cmz/retire-app-transactions';

function fail(message) {
    throw new Error(`application retirement: ${message}`);
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

async function exists(path) {
    try {
        await access(path);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
}

async function syncDirectory(path) {
    const handle = await open(path, 'r');
    try {
        await handle.sync();
    } finally {
        await handle.close();
    }
}

async function treeSnapshot(root) {
    const files = [];
    async function visit(directory) {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
            const absolute = resolve(directory, entry.name);
            const path = relative(root, absolute).split(sep).join('/');
            if (entry.isSymbolicLink())
                fail(`symbolic app entry forbidden: ${path}`);
            if (entry.isDirectory()) await visit(absolute);
            else if (entry.isFile()) {
                const content = await readFile(absolute);
                files.push({
                    path,
                    bytes: content.byteLength,
                    sha256: sha256(content),
                });
            } else fail(`special app entry forbidden: ${path}`);
        }
    }
    await visit(root);
    files.sort((left, right) => left.path.localeCompare(right.path));
    return {
        files,
        tree_sha256: sha256(
            files
                .map(
                    (entry) => `${entry.path}\0${entry.bytes}\0${entry.sha256}`
                )
                .join('\0')
        ),
    };
}

async function readOwnedApp(workspaceRoot, appName) {
    const root = resolve(workspaceRoot, `apps/${appName}`);
    const metadata = await lstat(root);
    if (!metadata.isDirectory() || metadata.isSymbolicLink())
        fail('app root must be a real directory');
    let manifest;
    let project;
    try {
        manifest = JSON.parse(
            await readFile(resolve(root, '.cmz/app-manifest.json'), 'utf8')
        );
        project = JSON.parse(
            await readFile(resolve(root, 'project.json'), 'utf8')
        );
    } catch (error) {
        fail(`app ownership metadata is unreadable (${error.message})`);
    }
    if (
        manifest?.kind !== 'application-shell-manifest' ||
        manifest?.schema_version !== '1.0.0' ||
        manifest?.app_name !== appName ||
        project?.name !== appName
    ) {
        fail('app is not owned by create-app or its identity drifted');
    }
    return { root, manifest, snapshot: await treeSnapshot(root) };
}

function externalReferences(workspaceRoot, appName) {
    let inventory;
    try {
        inventory = execFileSync(
            'git',
            ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
            { cwd: workspaceRoot, encoding: 'utf8' }
        );
    } catch {
        fail('Git inventory is required');
    }
    const tokens = [Buffer.from(`apps/${appName}`), Buffer.from(`${appName}:`)];
    const references = [];
    for (const path of inventory.split('\0').filter(Boolean).sort()) {
        if (path.startsWith(`apps/${appName}/`) || path.startsWith('.cmz/'))
            continue;
        const absolute = resolve(workspaceRoot, path);
        try {
            const metadata = lstatSync(absolute);
            if (!metadata.isFile() || metadata.isSymbolicLink())
                fail(`Git-visible entry is not a regular file: ${path}`);
            const content = readFileSync(absolute);
            if (tokens.some((token) => content.includes(token)))
                references.push(path);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }
    return references;
}

function defaultConsumers(workspaceRoot, appName) {
    return findNxGraphConsumers(workspaceRoot, {
        projects: [{ name: appName }],
    });
}

function tombstoneDocument(plan) {
    return `${JSON.stringify(
        {
            schema_version: '1.0.0',
            kind: 'retired-application',
            app_name: plan.app_name,
            design_ref: plan.design_ref,
            retired_tree_sha256: plan.tree_sha256,
            git_head: plan.git_head,
        },
        null,
        2
    )}\n`;
}

function transactionPaths(root, appName) {
    const transaction = resolve(root, TRANSACTION_ROOT, appName);
    return {
        transaction,
        state: resolve(transaction, 'state.json'),
        backup: resolve(transaction, 'app'),
    };
}

async function writeAtomic(path, content, mode = 0o600) {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const temporary = resolve(
        dirname(path),
        `.tmp-${process.pid}-${randomUUID()}`
    );
    const handle = await open(temporary, 'wx', mode);
    try {
        await handle.writeFile(content);
        await handle.sync();
    } finally {
        await handle.close();
    }
    await rename(temporary, path);
    await syncDirectory(dirname(path));
}

async function writeState(paths, state) {
    await writeAtomic(paths.state, `${JSON.stringify(state, null, 2)}\n`);
}

async function readState(paths, appName) {
    const metadata = await lstat(paths.state);
    if (!metadata.isFile() || metadata.isSymbolicLink())
        fail('invalid transaction state');
    const state = JSON.parse(await readFile(paths.state, 'utf8'));
    const keys = [
        'app_name',
        'output',
        'phase',
        'plan_id',
        'schema_version',
        'tombstone',
        'tombstone_parent_existed',
        'tombstone_sha256',
        'tree_sha256',
    ];
    if (
        Object.keys(state).sort().join('\0') !== keys.sort().join('\0') ||
        state.schema_version !== '1.0.0' ||
        !['prepared', 'moved'].includes(state.phase) ||
        state.app_name !== appName ||
        state.output !== `apps/${appName}` ||
        state.tombstone !== `docs/architecture/retired-apps/${appName}.json` ||
        typeof state.tombstone_parent_existed !== 'boolean' ||
        !/^[a-f0-9]{64}$/.test(state.plan_id ?? '') ||
        !/^[a-f0-9]{64}$/.test(state.tree_sha256 ?? '') ||
        !/^[a-f0-9]{64}$/.test(state.tombstone_sha256 ?? '')
    ) {
        fail('invalid transaction state content');
    }
    return state;
}

function defaultInstall(root) {
    execFileSync('bun', ['install'], { cwd: root, stdio: 'pipe' });
    execFileSync('bun', ['install', '--frozen-lockfile'], {
        cwd: root,
        stdio: 'pipe',
    });
}

function defaultPostGate(root) {
    const result = runNxGraphGate(root, 'post-retrait application');
    if (!result.ok) fail(result.output);
}

function defaultWithLock(root, appName, operation) {
    return withGenerationLock(resolve(root, `apps/${appName}`), operation);
}

function assertStorageIgnored(root) {
    try {
        execFileSync(
            'git',
            ['check-ignore', '--quiet', `${TRANSACTION_ROOT}/.probe`],
            { cwd: root, stdio: 'ignore' }
        );
    } catch {
        fail(`${TRANSACTION_ROOT}/ must be ignored by Git`);
    }
}

export async function planApplicationRetirement(
    { workspaceRoot, appName },
    dependencies = {}
) {
    if (!/^[a-z][a-z0-9-]*$/.test(appName ?? ''))
        fail('app name must be kebab-case');
    const root = resolve(workspaceRoot);
    const app = await readOwnedApp(root, appName);
    const consumers = (dependencies.findConsumers ?? defaultConsumers)(
        root,
        appName
    );
    if (consumers.length > 0)
        fail(`incoming Nx consumers:\n${JSON.stringify(consumers, null, 2)}`);
    const references = (dependencies.findReferences ?? externalReferences)(
        root,
        appName
    );
    if (references.length > 0)
        fail(`external references must be removed:\n${references.join('\n')}`);
    const identity = (dependencies.gitIdentity ?? currentGitIdentity)(root);
    const base = {
        app_name: appName,
        output: `apps/${appName}`,
        tree_sha256: app.snapshot.tree_sha256,
        file_count: app.snapshot.files.length,
        design_ref: app.manifest.design_ref,
        git_head: identity.head,
        tombstone: `docs/architecture/retired-apps/${appName}.json`,
    };
    const planId = sha256(JSON.stringify(base));
    return {
        ...base,
        plan_id: planId,
        root,
        outputAbsolute: app.root,
        tombstoneAbsolute: resolve(root, base.tombstone),
        paths: transactionPaths(root, appName),
    };
}

async function rollback(plan, state) {
    const tombstoneExists = await exists(plan.tombstoneAbsolute);
    if (tombstoneExists) {
        const content = await readFile(plan.tombstoneAbsolute);
        if (sha256(content) !== state.tombstone_sha256)
            fail('tombstone changed; automatic rollback refused');
        await rm(plan.tombstoneAbsolute);
        await syncDirectory(dirname(plan.tombstoneAbsolute));
        if (!state.tombstone_parent_existed) {
            try {
                await rmdir(dirname(plan.tombstoneAbsolute));
                await syncDirectory(dirname(dirname(plan.tombstoneAbsolute)));
            } catch (error) {
                if (!['ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error;
            }
        }
    }
    if (await exists(plan.paths.backup)) {
        if (await exists(plan.outputAbsolute)) fail('ambiguous rollback roots');
        await rename(plan.paths.backup, plan.outputAbsolute);
        await syncDirectory(dirname(plan.outputAbsolute));
    }
    await rm(plan.paths.transaction, { recursive: true, force: true });
    await syncDirectory(dirname(plan.paths.transaction));
}

async function finalizeMoved(plan, state, dependencies) {
    const install = dependencies.install ?? defaultInstall;
    const postGate = dependencies.postGate ?? defaultPostGate;
    try {
        install(plan.root);
        postGate(plan.root);
        await rm(plan.paths.transaction, { recursive: true, force: true });
        await syncDirectory(dirname(plan.paths.transaction));
        return { plan };
    } catch (error) {
        await rollback(plan, state);
        throw error;
    }
}

export async function publishApplicationRetirement(options, dependencies = {}) {
    const plan = await planApplicationRetirement(options, dependencies);
    if (options.planId !== plan.plan_id)
        fail('reviewed plan id is stale or invalid');
    const withLock = dependencies.withLock ?? defaultWithLock;
    return withLock(plan.root, plan.app_name, async () => {
        (dependencies.assertStorage ?? assertStorageIgnored)(plan.root);
        if (await exists(plan.paths.transaction))
            fail('unfinished transaction exists; use --resume or --abort');
        if (await exists(plan.tombstoneAbsolute))
            fail('retirement tombstone already exists');
        const tombstone = tombstoneDocument(plan);
        const tombstoneParentExisted = await exists(
            dirname(plan.tombstoneAbsolute)
        );
        const state = {
            schema_version: '1.0.0',
            phase: 'prepared',
            plan_id: plan.plan_id,
            app_name: plan.app_name,
            output: plan.output,
            tree_sha256: plan.tree_sha256,
            tombstone: plan.tombstone,
            tombstone_parent_existed: tombstoneParentExisted,
            tombstone_sha256: sha256(tombstone),
        };
        await writeState(plan.paths, state);
        try {
            await rename(plan.outputAbsolute, plan.paths.backup);
            await syncDirectory(dirname(plan.outputAbsolute));
            await mkdir(dirname(plan.tombstoneAbsolute), { recursive: true });
            await writeAtomic(plan.tombstoneAbsolute, tombstone, 0o644);
            state.phase = 'moved';
            await writeState(plan.paths, state);
        } catch (error) {
            await rollback(plan, state);
            throw error;
        }
        return finalizeMoved(plan, state, dependencies);
    });
}

export async function recoverApplicationRetirement(options, dependencies = {}) {
    const root = resolve(options.workspaceRoot);
    const paths = transactionPaths(root, options.appName);
    const state = await readState(paths, options.appName);
    const plan = {
        ...state,
        root,
        paths,
        outputAbsolute: resolve(root, state.output),
        tombstoneAbsolute: resolve(root, state.tombstone),
    };
    const withLock = dependencies.withLock ?? defaultWithLock;
    return withLock(root, options.appName, async () => {
        if (options.abort) {
            await rollback(plan, state);
            return { aborted: true, plan };
        }
        if (await exists(plan.outputAbsolute))
            fail('output exists during resume; use --abort after inspection');
        const snapshot = await treeSnapshot(paths.backup);
        if (snapshot.tree_sha256 !== state.tree_sha256)
            fail('backup hash drifted');
        if (!(await exists(plan.tombstoneAbsolute)))
            fail('tombstone missing during resume; use --abort');
        if (
            sha256(await readFile(plan.tombstoneAbsolute)) !==
            state.tombstone_sha256
        )
            fail('tombstone hash drifted');
        return finalizeMoved(plan, state, dependencies);
    });
}

export function publicApplicationRetirementPlan(plan) {
    return {
        plan_id: plan.plan_id,
        app_name: plan.app_name,
        output: plan.output,
        tree_sha256: plan.tree_sha256,
        file_count: plan.file_count,
        design_ref: plan.design_ref,
        git_head: plan.git_head,
        tombstone: plan.tombstone,
    };
}

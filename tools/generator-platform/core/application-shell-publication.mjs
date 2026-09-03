import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
    access,
    lstat,
    mkdir,
    open,
    readFile,
    readdir,
    realpath,
    rename,
    rm,
} from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

import { renderAngularPwaShell } from '../renderers/angular-pwa-shell-renderer.mjs';
import { validateApplicationDesignWithDependencies } from './application-design.mjs';
import {
    syncTreeDirectories,
    withGenerationLock,
} from './generation-transaction.mjs';

function fail(message) {
    throw new Error(`application shell publication: ${message}`);
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

async function entryExists(path) {
    try {
        await lstat(path);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
}

function safeChild(root, path) {
    if (
        typeof path !== 'string' ||
        path.startsWith('/') ||
        path.split('/').includes('..') ||
        !/^[a-zA-Z0-9._/-]+$/.test(path)
    ) {
        fail(`unsafe generated path ${path}`);
    }
    const absolute = resolve(root, path);
    if (!absolute.startsWith(`${resolve(root)}${sep}`))
        fail(`generated path escapes app root: ${path}`);
    return absolute;
}

async function readDesign(root, path) {
    const absolute = resolve(root, path);
    if (absolute === root || !absolute.startsWith(`${root}${sep}`))
        fail('design must be inside workspace');
    const parts = relative(root, absolute).split(sep).filter(Boolean);
    let current = root;
    for (const part of parts) {
        current = resolve(current, part);
        const metadata = await lstat(current);
        if (metadata.isSymbolicLink())
            fail('symbolic design path is forbidden');
    }
    const content = await readFile(absolute);
    let design;
    try {
        design = JSON.parse(content.toString('utf8'));
    } catch (error) {
        fail(`design is not valid JSON (${error.message})`);
    }
    return {
        design,
        content,
        relative: relative(root, absolute).split(sep).join('/'),
    };
}

async function writeFileDurably(path, content) {
    await mkdir(dirname(path), { recursive: true });
    const handle = await open(path, 'wx', 0o644);
    try {
        await handle.writeFile(content);
        await handle.sync();
    } finally {
        await handle.close();
    }
}

async function inventory(root) {
    const result = [];
    async function visit(directory) {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
            const absolute = resolve(directory, entry.name);
            const path = relative(root, absolute).split(sep).join('/');
            if (entry.isSymbolicLink())
                fail(`symbolic generated entry ${path}`);
            if (entry.isDirectory()) await visit(absolute);
            else if (entry.isFile()) result.push(path);
            else fail(`special generated entry ${path}`);
        }
    }
    await visit(root);
    return result.sort();
}

async function verifyTree(root, files) {
    const expected = Object.keys(files).sort();
    const actual = await inventory(root);
    if (JSON.stringify(actual) !== JSON.stringify(expected))
        fail(`generated tree inventory drifted at ${root}`);
    for (const path of expected) {
        const content = await readFile(safeChild(root, path));
        if (sha256(content) !== sha256(files[path]))
            fail(`generated file drifted: ${path}`);
    }
}

async function stageCandidate(candidate, files) {
    if (await exists(candidate)) {
        try {
            await verifyTree(candidate, files);
            return;
        } catch {
            await rm(candidate, { recursive: true, force: true });
        }
    }
    await mkdir(candidate, { recursive: false, mode: 0o700 });
    try {
        for (const path of Object.keys(files).sort())
            await writeFileDurably(safeChild(candidate, path), files[path]);
        await syncTreeDirectories(candidate);
        await verifyTree(candidate, files);
    } catch (error) {
        await rm(candidate, { recursive: true, force: true });
        throw error;
    }
}

function defaultRun(command, args, root) {
    execFileSync(command, args, {
        cwd: root,
        stdio: ['ignore', 'inherit', 'inherit'],
        env: {
            ...process.env,
            CI: 'true',
            NX_DAEMON: 'false',
            NX_TASKS_RUNNER_DYNAMIC_OUTPUT: 'false',
            ...(!process.env.NX_CLOUD_ACCESS_TOKEN
                ? { NX_NO_CLOUD: 'true' }
                : {}),
        },
    });
    return '';
}

async function syncParent(path) {
    const handle = await open(path, 'r');
    try {
        await handle.sync();
    } finally {
        await handle.close();
    }
}

async function verifyPublishedApp({
    root,
    output,
    candidate,
    plan,
    run,
    rollbackOnFailure,
}) {
    try {
        await verifyTree(output, plan.files);
        run(
            'bunx',
            [
                'nx',
                'run',
                `${plan.app_name}:build:production`,
                '--verbose',
                '--outputStyle=stream',
                '--skipNxCache',
            ],
            root
        );
        run(
            'bunx',
            [
                'nx',
                'run',
                `${plan.app_name}:lint`,
                '--verbose',
                '--outputStyle=stream',
                '--skipNxCache',
            ],
            root
        );
        await verifyTree(output, plan.files);
    } catch (error) {
        if (
            rollbackOnFailure &&
            !(await exists(candidate)) &&
            (await exists(output))
        ) {
            await rename(output, candidate);
            await syncParent(dirname(output));
        }
        const details = [
            error.stdout,
            error.stderr,
            error.message,
            `exit_status=${error.status ?? 'unknown'} signal=${error.signal ?? 'none'}`,
        ]
            .filter(Boolean)
            .join('\n');
        fail(`verification failed and app was rolled back:\n${details}`);
    }
}

export async function planApplicationShell({
    workspaceRoot,
    designPath,
    experienceId,
    appName,
    profile = 'angular-pwa',
    applicationDesignSchema,
    backendContractSchema,
}) {
    if (profile !== 'angular-pwa') fail(`unsupported profile ${profile}`);
    if (!/^[a-z][a-z0-9-]*$/.test(appName ?? ''))
        fail('app name must be kebab-case');
    const root = await realpath(resolve(workspaceRoot));
    const tombstone = resolve(
        root,
        `docs/architecture/retired-apps/${appName}.json`
    );
    if (await entryExists(tombstone))
        fail(
            `retired app tombstone forbids implicit recreation: ${relative(root, tombstone)}`
        );
    const source = await readDesign(root, designPath);
    const errors = await validateApplicationDesignWithDependencies({
        design: source.design,
        applicationDesignSchema,
        backendContractSchema,
        workspaceRoot: root,
    });
    if (errors.length > 0) fail(`design rejected:\n${errors.join('\n')}`);
    const designSha256 = sha256(source.content);
    const rendered = renderAngularPwaShell({
        design: source.design,
        experienceId,
        appName,
        designPath: source.relative,
        designSha256,
    });
    const treeSha256 = sha256(
        Object.entries(rendered.files)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([path, content]) => `${path}\0${sha256(content)}`)
            .join('\0')
    );
    const planId = sha256(
        JSON.stringify({
            app_name: appName,
            design: source.relative,
            design_sha256: designSha256,
            experience_id: experienceId,
            profile,
            tree_sha256: treeSha256,
        })
    );
    return {
        plan_id: planId,
        app_name: appName,
        output: `apps/${appName}`,
        design: source.relative,
        design_sha256: designSha256,
        experience_id: experienceId,
        profile,
        tree_sha256: treeSha256,
        files: rendered.files,
        outputAbsolute: resolve(root, `apps/${appName}`),
        candidate: resolve(
            root,
            `apps/.${appName}.create-app-candidate-${planId}`
        ),
        root,
    };
}

export async function publishApplicationShell(options, dependencies = {}) {
    const plan = await planApplicationShell(options);
    if (options.planId !== plan.plan_id)
        fail('reviewed plan id is stale or invalid');
    const run = dependencies.run ?? defaultRun;
    return withGenerationLock(plan.outputAbsolute, async () => {
        if (await exists(plan.outputAbsolute)) {
            // Ne jamais déplacer un arbre préexistant avant d’avoir prouvé
            // octet par octet qu’il appartient exactement à ce plan.
            await verifyTree(plan.outputAbsolute, plan.files);
            await verifyPublishedApp({
                root: plan.root,
                output: plan.outputAbsolute,
                candidate: plan.candidate,
                plan,
                run,
                rollbackOnFailure: true,
            });
            return { plan, recovered: true };
        }
        await stageCandidate(plan.candidate, plan.files);
        run(
            'bunx',
            ['ngc', '-p', `${plan.candidate}/tsconfig.app.json`, '--noEmit'],
            plan.root
        );
        await verifyTree(plan.candidate, plan.files);
        await rename(plan.candidate, plan.outputAbsolute);
        await syncParent(dirname(plan.outputAbsolute));
        await verifyPublishedApp({
            root: plan.root,
            output: plan.outputAbsolute,
            candidate: plan.candidate,
            plan,
            run,
            rollbackOnFailure: true,
        });
        return { plan, recovered: false };
    });
}

export function publicApplicationShellPlan(plan) {
    return {
        plan_id: plan.plan_id,
        app_name: plan.app_name,
        output: plan.output,
        design: plan.design,
        design_sha256: plan.design_sha256,
        experience_id: plan.experience_id,
        profile: plan.profile,
        tree_sha256: plan.tree_sha256,
    };
}

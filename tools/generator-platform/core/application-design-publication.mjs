import { createHash } from 'node:crypto';
import {
    link,
    lstat,
    open,
    readFile,
    realpath,
    unlink,
} from 'node:fs/promises';
import { basename, dirname, relative, resolve, sep } from 'node:path';

import { validateApplicationDesignWithDependencies } from './application-design.mjs';
import { parseStructuredSource } from './source-document.mjs';

function fail(message) {
    throw new Error(`application design publication: ${message}`);
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
        Object.keys(value)
            .sort()
            .map((key) => [key, canonicalize(value[key])])
    );
}

function assertInside(root, absolute, label) {
    if (absolute === root || !absolute.startsWith(`${root}${sep}`))
        fail(`${label} must be a file inside the workspace`);
}

async function assertComponents(root, absolute, includeLeaf) {
    const parts = relative(root, absolute).split(sep).filter(Boolean);
    const limit = includeLeaf ? parts.length : parts.length - 1;
    let current = root;
    for (let index = 0; index < limit; index += 1) {
        current = resolve(current, parts[index]);
        const metadata = await lstat(current);
        if (metadata.isSymbolicLink())
            fail(`symbolic path component forbidden: ${current}`);
        if (index < limit - 1 && !metadata.isDirectory())
            fail(`non-directory path component: ${current}`);
    }
}

async function sourceFile(root, path) {
    const absolute = resolve(root, path);
    assertInside(root, absolute, 'source');
    await assertComponents(root, absolute, true);
    const metadata = await lstat(absolute);
    if (!metadata.isFile() || metadata.isSymbolicLink())
        fail('source must be a regular non-symlink file');
    const content = await readFile(absolute);
    return {
        absolute,
        relative: relative(root, absolute).split(sep).join('/'),
        content,
        design: parseStructuredSource(content, 'application design source'),
    };
}

async function outputFile(root, path) {
    const absolute = resolve(root, path);
    assertInside(root, absolute, 'output');
    await assertComponents(root, absolute, false);
    const parent = dirname(absolute);
    const metadata = await lstat(parent);
    if (!metadata.isDirectory() || metadata.isSymbolicLink())
        fail('output parent must be a regular directory');
    const canonicalParent = await realpath(parent);
    const canonicalOutput = resolve(canonicalParent, basename(absolute));
    assertInside(root, canonicalOutput, 'canonical output');
    return {
        absolute,
        parent,
        relative: relative(root, absolute).split(sep).join('/'),
    };
}

async function exists(path) {
    try {
        await lstat(path);
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

async function assertContent(path, expectedHash, label) {
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink())
        fail(`${label} is not a regular file`);
    if (sha256(await readFile(path)) !== expectedHash)
        fail(`${label} hash does not match the reviewed plan`);
}

export async function planApplicationDesignPublication({
    workspaceRoot,
    sourcePath,
    outputPath,
    applicationDesignSchema,
    backendContractSchema,
}) {
    const root = await realpath(resolve(workspaceRoot));
    const source = await sourceFile(root, sourcePath);
    const output = await outputFile(root, outputPath);
    const errors = await validateApplicationDesignWithDependencies({
        design: source.design,
        applicationDesignSchema,
        backendContractSchema,
        workspaceRoot: root,
    });
    if (errors.length > 0) fail(`design rejected:\n${errors.join('\n')}`);
    const content = Buffer.from(
        `${JSON.stringify(canonicalize(source.design), null, 2)}\n`
    );
    const sourceHash = sha256(source.content);
    const outputHash = sha256(content);
    const planId = sha256(
        JSON.stringify({
            source: source.relative,
            source_sha256: sourceHash,
            output: output.relative,
            output_sha256: outputHash,
        })
    );
    return {
        plan_id: planId,
        source: source.relative,
        source_sha256: sourceHash,
        output: output.relative,
        output_sha256: outputHash,
        candidate: resolve(
            output.parent,
            `.${basename(output.absolute)}.${planId}.candidate`
        ),
        content,
        design: source.design,
        outputAbsolute: output.absolute,
        outputParent: output.parent,
    };
}

export async function publishApplicationDesign(options) {
    const plan = await planApplicationDesignPublication(options);
    if (options.planId !== plan.plan_id)
        fail('reviewed plan id is stale or invalid');
    const outputExists = await exists(plan.outputAbsolute);
    const candidateExists = await exists(plan.candidate);
    if (outputExists) {
        await assertContent(
            plan.outputAbsolute,
            plan.output_sha256,
            'existing output'
        );
        if (candidateExists) {
            await assertContent(
                plan.candidate,
                plan.output_sha256,
                'recovery candidate'
            );
            await unlink(plan.candidate);
            await syncDirectory(plan.outputParent);
        }
        return { plan, already_published: true };
    }
    if (candidateExists) {
        await assertContent(
            plan.candidate,
            plan.output_sha256,
            'recovery candidate'
        );
    } else {
        const handle = await open(plan.candidate, 'wx', 0o644);
        try {
            await handle.writeFile(plan.content);
            await handle.sync();
        } finally {
            await handle.close();
        }
        await syncDirectory(plan.outputParent);
    }
    try {
        await link(plan.candidate, plan.outputAbsolute);
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        await assertContent(
            plan.outputAbsolute,
            plan.output_sha256,
            'concurrent output'
        );
    }
    await syncDirectory(plan.outputParent);
    await assertContent(
        plan.outputAbsolute,
        plan.output_sha256,
        'published output'
    );
    await unlink(plan.candidate);
    await syncDirectory(plan.outputParent);
    return { plan, already_published: false };
}

export function publicApplicationDesignPlan(plan) {
    return {
        plan_id: plan.plan_id,
        source: plan.source,
        source_sha256: plan.source_sha256,
        output: plan.output,
        output_sha256: plan.output_sha256,
    };
}

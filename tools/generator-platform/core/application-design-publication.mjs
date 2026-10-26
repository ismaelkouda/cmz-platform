import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { basename, dirname, relative, resolve, sep } from 'node:path';

import { validateApplicationDesignWithDependencies } from './application-design.mjs';
import { publishDocument } from './document-publication.mjs';
import {
    assertCompilationPaths,
    beginCompilationContext,
    bindCompilationContext,
    publicCompilationContext,
    publishCompilationWithContext,
} from './compilation-context.mjs';
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

export async function planApplicationDesignPublication({
    workspaceRoot,
    targetRoot,
    sourcePath,
    outputPath,
    applicationDesignSchema,
    backendContractSchema,
}) {
    const context = await beginCompilationContext({
        workspaceRoot,
        targetRoot,
    });
    assertCompilationPaths(context, sourcePath, outputPath);
    const root =
        context?.productRoot ?? (await realpath(resolve(workspaceRoot)));
    const source = await sourceFile(root, sourcePath);
    const output = await outputFile(root, outputPath);
    const compilationContext = await bindCompilationContext(context, {
        kind: 'design',
        sourcePath,
        sourceContent: source.content,
        outputPath,
        document: source.design,
        schemas: {
            'application-design': applicationDesignSchema,
            'backend-contract': backendContractSchema,
        },
    });
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
            ...(compilationContext
                ? { compilation_context_sha256: compilationContext.sha256 }
                : {}),
        })
    );
    return {
        plan_id: planId,
        ...(compilationContext
            ? { compilation_context: compilationContext }
            : {}),
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
    return publishCompilationWithContext(
        options,
        plan,
        planApplicationDesignPublication,
        publishDocument,
        fail
    );
}

export function publicApplicationDesignPlan(plan) {
    return {
        ...publicCompilationContext(plan),
        plan_id: plan.plan_id,
        source: plan.source,
        source_sha256: plan.source_sha256,
        output: plan.output,
        output_sha256: plan.output_sha256,
    };
}

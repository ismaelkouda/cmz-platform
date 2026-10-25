import { lstat } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

import { planApplicationWorkspace } from './application-workspace.mjs';
import {
    assertPhysicalPath,
    externalApplicationContext,
    readProductFile,
    safeRelativePath,
} from './external-application-paths.mjs';
import { sha256, stableStringify } from './generation-manifest.mjs';
import { withGenerationLock } from './generation-transaction.mjs';

const MARKER = '.cmz/application-workspace.json';
const COMPILATION_FILES = [
    'tools/compile-backend-contract.mjs',
    'tools/compile-application-design.mjs',
    'tools/generator-platform/core/compilation-context.mjs',
    'tools/generator-platform/core/structured-backend-publication.mjs',
    'tools/generator-platform/core/application-design-publication.mjs',
    'tools/generator-platform/core/structured-backend-adapter.mjs',
    'tools/generator-platform/core/document-publication.mjs',
    'tools/generator-platform/core/source-document.mjs',
    'tools/generator-platform/adapters/openapi-adapter.mjs',
    'tools/generator-platform/adapters/postman-adapter.mjs',
];
const RESERVED_ROOTS = new Set([
    'apps',
    'node_modules',
    '.cmz',
    '.git',
    '.nx',
    '.angular',
    'dist',
    'coverage',
    'tmp',
]);

function fail(message) {
    throw new Error(`external compilation: ${message}`);
}

async function identityChain(path) {
    await assertPhysicalPath(path);
    const identities = [];
    for (let current = resolve(path); ; current = dirname(current)) {
        const metadata = await lstat(current, { bigint: true });
        identities.push({
            path: current,
            device: metadata.dev.toString(),
            inode: metadata.ino.toString(),
        });
        if (current === sep) break;
    }
    return identities.reverse();
}

// Without targetRoot the existing library protocol, hashes and paths are used.
export async function beginCompilationContext({ workspaceRoot, targetRoot }) {
    if (targetRoot === undefined) return undefined;
    const context = await externalApplicationContext({
        workspaceRoot,
        targetRoot,
    });
    const markerBytes = await readProductFile(context.productRoot, MARKER);
    const marker = JSON.parse(markerBytes.toString('utf8'));
    return {
        ...context,
        marker,
        markerSha256: sha256(markerBytes),
        identities: {
            tools: await identityChain(context.toolsRoot),
            product: await identityChain(context.productRoot),
        },
    };
}

function inputPath(context, path) {
    safeRelativePath(path);
    if (
        RESERVED_ROOTS.has(path.split('/')[0]) ||
        (context.marker.files ?? []).some((file) => file.path === path) ||
        path === 'bun.lock'
    )
        fail('document collides with a reserved workspace namespace');
    return path;
}

export function assertCompilationPaths(context, sourcePath, outputPath) {
    if (!context) return;
    inputPath(context, sourcePath);
    inputPath(context, outputPath);
    if (sourcePath === outputPath) fail('output must not replace an input');
}

async function collectInputs(
    context,
    sourcePath,
    sourceContent,
    document,
    kind
) {
    const hashes = new Map([
        [inputPath(context, sourcePath), sha256(sourceContent)],
    ]);
    const add = (reference) => {
        if (reference?.snapshot_uri === undefined) return;
        const path = inputPath(context, reference.snapshot_uri);
        if (!/^[a-f0-9]{64}$/.test(reference.sha256 ?? ''))
            fail('snapshot digest required');
        if (hashes.has(path) && hashes.get(path) !== reference.sha256)
            fail('conflicting snapshot digests');
        hashes.set(path, reference.sha256);
    };
    for (const source of document.sources ?? []) add(source);
    if (kind === 'design') {
        for (const reference of document.backend_contracts ?? []) {
            add(reference);
            const bytes = await readProductFile(
                context.productRoot,
                reference.snapshot_uri
            );
            if (sha256(bytes) !== reference.sha256)
                fail('backend snapshot drift');
            const contract = JSON.parse(bytes.toString('utf8'));
            for (const source of contract.sources ?? []) add(source);
        }
    }
    const inputs = [];
    for (const [path, expected] of [...hashes].sort(([a], [b]) =>
        a.localeCompare(b)
    )) {
        const bytes = await readProductFile(context.productRoot, path);
        if (sha256(bytes) !== expected) fail('input snapshot drift');
        inputs.push({
            path,
            sha256: expected,
            bytes: bytes.length,
            identity: await identityChain(resolve(context.productRoot, path)),
        });
    }
    return inputs;
}

export async function bindCompilationContext(
    context,
    { kind, sourcePath, sourceContent, outputPath, document, schemas }
) {
    if (!context) return undefined;
    assertCompilationPaths(context, sourcePath, outputPath);
    const inputs = await collectInputs(
        context,
        sourcePath,
        sourceContent,
        document,
        kind
    );
    if (inputs.some((input) => input.path === outputPath))
        fail('output must not replace a dependency');
    const outputParent = resolve(context.productRoot, dirname(outputPath));
    await assertPhysicalPath(outputParent);
    if (!(await lstat(outputParent)).isDirectory())
        fail('output parent is not a directory');
    const outputAbsolute = resolve(context.productRoot, outputPath);
    await assertPhysicalPath(outputAbsolute, { missing: true });
    try {
        if (!(await lstat(outputAbsolute)).isFile())
            fail('output is not a regular file');
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
    const workspace = await planApplicationWorkspace({
        workspaceRoot: context.toolsRoot,
        targetRoot: context.productRoot,
        profiles: context.marker.profiles,
        githubRepository: context.marker.github_repository,
        reviewOwner: context.marker.review_owner,
        inputPaths: [...inputs.map((input) => input.path), outputPath],
    });
    if (sha256(workspace.files[MARKER]) !== context.markerSha256)
        fail('workspace marker changed during planning');
    const code = {};
    for (const path of COMPILATION_FILES)
        code[path] = sha256(await readProductFile(context.toolsRoot, path));
    const schemaHashes = {};
    for (const [name, supplied] of Object.entries(schemas)) {
        const path = `tools/generator-platform/schemas/${name}.schema.json`;
        const bytes = await readProductFile(context.toolsRoot, path);
        if (
            stableStringify(JSON.parse(bytes.toString('utf8'))) !==
            stableStringify(supplied)
        )
            fail('schema argument differs from the workshop schema');
        schemaHashes[path] = sha256(bytes);
    }
    const identities = {
        tools: await identityChain(context.toolsRoot),
        product: await identityChain(context.productRoot),
    };
    if (stableStringify(identities) !== stableStringify(context.identities))
        fail('physical workspace changed during planning');
    const binding = {
        mode: 'external',
        kind,
        workspace_id: workspace.manifest.workspace_id,
        workspace_plan_id: workspace.plan_id,
        marker_sha256: context.markerSha256,
        identities,
        output_parent_identity: await identityChain(outputParent),
        inputs,
        compiler_sources: code,
        schemas: schemaHashes,
    };
    return {
        ...binding,
        sha256: sha256(stableStringify(binding)),
        // EXT-01 already recognises working locks inside apps. Keeping this
        // control path there avoids adopting arbitrary files as document inputs.
        lock_output: resolve(
            context.productRoot,
            'apps',
            `document-${sha256(outputPath)}`
        ),
    };
}

export function publicCompilationContext(plan) {
    const context = plan.compilation_context;
    return context
        ? {
              mode: 'external',
              workspace_id: context.workspace_id,
              context_sha256: context.sha256,
          }
        : { mode: 'workshop' };
}

export async function publishCompilationWithContext(
    options,
    plan,
    replan,
    publish,
    failPlan
) {
    if (!plan.compilation_context) return publish(plan, failPlan);
    return withGenerationLock(
        plan.compilation_context.lock_output,
        async () => {
            const current = await replan(options);
            if (
                current.plan_id !== plan.plan_id ||
                current.plan_id !== options.planId
            )
                fail('reviewed plan changed under lock');
            const result = await publish(current, failPlan);
            const after = await replan(options);
            if (after.plan_id !== current.plan_id)
                fail(
                    'context changed during publication; inspect the preserved output'
                );
            return result;
        }
    );
}

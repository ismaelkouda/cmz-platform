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

import { compileOpenApiBackendContract } from '../adapters/openapi-adapter.mjs';
import { compilePostmanBackendContract } from '../adapters/postman-adapter.mjs';
import { verifyBackendContractSnapshots } from './backend-contract.mjs';
import { parseStructuredSource } from './source-document.mjs';
import {
    compileStructuredBackendDefinition,
    serializeCanonicalBackendContract,
    structuredDefinitionSha256,
} from './structured-backend-adapter.mjs';

function fail(message) {
    throw new Error(`backend contract publication: ${message}`);
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function assertInside(root, absolute, label) {
    if (absolute === root || !absolute.startsWith(`${root}${sep}`)) {
        fail(`${label} must be a file inside the workspace`);
    }
}

async function assertPathComponents(root, absolute, includeLeaf) {
    const parts = relative(root, absolute).split(sep).filter(Boolean);
    const limit = includeLeaf ? parts.length : parts.length - 1;
    let current = root;
    for (let index = 0; index < limit; index += 1) {
        current = resolve(current, parts[index]);
        const metadata = await lstat(current);
        if (metadata.isSymbolicLink())
            fail(`symbolic path component forbidden: ${current}`);
        if (index < limit - 1 && !metadata.isDirectory()) {
            fail(`non-directory path component: ${current}`);
        }
    }
}

async function readDefinition(root, path) {
    const absolute = resolve(root, path);
    assertInside(root, absolute, 'definition');
    await assertPathComponents(root, absolute, true);
    const metadata = await lstat(absolute);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
        fail('definition must be a regular non-symlink file');
    }
    const canonical = await realpath(absolute);
    assertInside(root, canonical, 'canonical definition');
    const content = await readFile(canonical);
    return {
        absolute,
        content,
        relative: relative(root, absolute).split(sep).join('/'),
    };
}

function compileSource({
    adapter,
    content,
    snapshotUri,
    snapshotSha256,
    backendContractSchema,
}) {
    let document;
    if (adapter === 'structured') {
        try {
            document = JSON.parse(content.toString('utf8'));
        } catch (error) {
            fail(`definition is not valid JSON (${error.message})`);
        }
        return compileStructuredBackendDefinition({
            definition: document,
            snapshotUri,
            snapshotSha256,
            backendContractSchema,
        });
    }
    if (adapter === 'openapi') {
        document = parseStructuredSource(content, 'OpenAPI source');
        return compileOpenApiBackendContract({
            document,
            snapshotUri,
            snapshotSha256,
            backendContractSchema,
        });
    }
    if (adapter === 'postman') {
        document = parseStructuredSource(content, 'Postman source');
        return compilePostmanBackendContract({
            document,
            snapshotUri,
            snapshotSha256,
            backendContractSchema,
        });
    }
    fail(`unknown adapter ${adapter}`);
}

async function resolveOutput(root, path) {
    const absolute = resolve(root, path);
    assertInside(root, absolute, 'output');
    await assertPathComponents(root, absolute, false);
    const parent = dirname(absolute);
    const parentMetadata = await lstat(parent);
    if (!parentMetadata.isDirectory() || parentMetadata.isSymbolicLink()) {
        fail('output parent must be a regular directory');
    }
    const canonicalParent = await realpath(parent);
    assertInside(
        root,
        resolve(canonicalParent, basename(absolute)),
        'canonical output'
    );
    return {
        absolute,
        parent,
        relative: relative(root, absolute).split(sep).join('/'),
    };
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

async function syncDirectory(path) {
    const handle = await open(path, 'r');
    try {
        await handle.sync();
    } finally {
        await handle.close();
    }
}

export async function planStructuredBackendPublication({
    workspaceRoot,
    definitionPath,
    outputPath,
    backendContractSchema,
    adapter = 'structured',
}) {
    const root = await realpath(resolve(workspaceRoot));
    const definition = await readDefinition(root, definitionPath);
    const output = await resolveOutput(root, outputPath);
    const sourceSha256 = structuredDefinitionSha256(definition.content);
    const contract = compileSource({
        adapter,
        content: definition.content,
        snapshotUri: definition.relative,
        snapshotSha256: sourceSha256,
        backendContractSchema,
    });
    const snapshotErrors = await verifyBackendContractSnapshots(contract, root);
    if (snapshotErrors.length > 0) fail(snapshotErrors.join('\n'));
    const content = Buffer.from(serializeCanonicalBackendContract(contract));
    const outputSha256 = sha256(content);
    const planId = sha256(
        JSON.stringify({
            adapter,
            definition: definition.relative,
            source_sha256: sourceSha256,
            output: output.relative,
            output_sha256: outputSha256,
        })
    );
    return {
        plan_id: planId,
        adapter,
        definition: definition.relative,
        source_sha256: sourceSha256,
        output: output.relative,
        output_sha256: outputSha256,
        candidate: resolve(
            output.parent,
            `.${basename(output.absolute)}.${planId}.candidate`
        ),
        content,
        contract,
        outputAbsolute: output.absolute,
        outputParent: output.parent,
    };
}

async function assertContent(path, expectedHash, label) {
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
        fail(`${label} is not a regular file`);
    }
    if (sha256(await readFile(path)) !== expectedHash) {
        fail(`${label} hash does not match the reviewed plan`);
    }
}

export async function publishStructuredBackendContract(options) {
    const plan = await planStructuredBackendPublication(options);
    if (options.planId !== plan.plan_id)
        fail('reviewed plan id is stale or invalid');

    const outputExists = await entryExists(plan.outputAbsolute);
    const candidateExists = await entryExists(plan.candidate);
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

export function publicBackendPublicationPlan(plan) {
    return {
        plan_id: plan.plan_id,
        adapter: plan.adapter,
        definition: plan.definition,
        source_sha256: plan.source_sha256,
        output: plan.output,
        output_sha256: plan.output_sha256,
    };
}

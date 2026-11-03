import { createHash } from 'node:crypto';
import { compileRuntimeObservationBackend } from '../adapters/runtime-observation-backend-adapter.mjs';
import { loadObservedBackendInputs } from './runtime-observation-backend-inputs.mjs';
import {
    observationInputPrimitives as observationIO,
    observationDiagnostic,
    rejectObservation,
} from './runtime-observation-evidence.mjs';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { basename, dirname, relative, resolve, sep } from 'node:path';

import { compileOpenApiBackendContract } from '../adapters/openapi-adapter.mjs';
import { compilePostmanBackendContract } from '../adapters/postman-adapter.mjs';
import { verifyBackendContractSnapshots } from './backend-contract.mjs';
import { publishDocument } from './document-publication.mjs';
import {
    assertCompilationPaths,
    beginCompilationContext,
    bindCompilationContext,
    publicCompilationContext,
    publishCompilationWithContext,
} from './compilation-context.mjs';
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

export async function planStructuredBackendPublication({
    workspaceRoot,
    targetRoot,
    definitionPath,
    outputPath,
    backendContractSchema,
    adapter = 'structured',
    privateRoot,
    snapshotId,
}) {
    if (adapter === 'runtime-observation') {
        return planObservedBackendPublication({
            workspaceRoot,
            targetRoot,
            definitionPath,
            outputPath,
            backendContractSchema,
            privateRoot,
            snapshotId,
            adapter,
        });
    }
    const context = await beginCompilationContext({
        workspaceRoot,
        targetRoot,
    });
    assertCompilationPaths(context, definitionPath, outputPath);
    const root =
        context?.productRoot ?? (await realpath(resolve(workspaceRoot)));
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
    const compilationContext = await bindCompilationContext(context, {
        kind: 'backend',
        sourcePath: definitionPath,
        sourceContent: definition.content,
        outputPath,
        document: contract,
        schemas: { 'backend-contract': backendContractSchema },
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

export async function publishStructuredBackendContract(options) {
    try {
        const plan = await planStructuredBackendPublication(options);
        if (options.planId !== plan.plan_id)
            fail('reviewed plan id is stale or invalid');

        return await publishCompilationWithContext(
            options,
            plan,
            planStructuredBackendPublication,
            publishDocument,
            fail
        );
    } catch (error) {
        if (options.adapter === 'runtime-observation')
            rejectObservation(observationDiagnostic(error));
        throw error;
    }
}

export function publicBackendPublicationPlan(plan) {
    return {
        ...publicCompilationContext(plan),
        plan_id: plan.plan_id,
        adapter: plan.adapter,
        definition: plan.definition,
        source_sha256: plan.source_sha256,
        output: plan.output,
        output_sha256: plan.output_sha256,
    };
}

// Each source capsule uses the existing single-document publication protocol.
// The backend plan is consumable only after all exact capsules exist. No
// directory transaction, network proof or target status promotion is implied.
async function planObservedBackendPublication(options) {
    try {
        if (!options.targetRoot || !options.privateRoot)
            rejectObservation('OBS_ROOT');
        const input = options.snapshotId
            ? await loadObservedBackendInputs(options)
            : await compileRuntimeObservationBackend(options);
        const context = await beginCompilationContext(options);
        if (sha256(context.toolsRoot) !== input.toolsRootHash)
            rejectObservation('OBS_ROOT');
        assertCompilationPaths(
            context,
            options.definitionPath,
            options.outputPath
        );
        const root = context.productRoot;
        const output = await resolveOutput(root, options.outputPath);
        let content;
        let document;
        if (options.snapshotId) {
            const snapshot = input.snapshots.find(
                (entry) => entry.id === options.snapshotId
            );
            if (!snapshot || snapshot.path !== output.relative)
                rejectObservation('OBS_BINDING');
            content = snapshot.content;
            document = { sources: [] };
            for (const other of input.snapshots) {
                if (other.id === options.snapshotId) continue;
                try {
                    await lstat(resolve(root, other.path));
                } catch (error) {
                    if (error.code === 'ENOENT') continue;
                    throw error;
                }
                const bytes = await observationIO.boundedFile(
                    root,
                    other.path,
                    65536
                );
                if (sha256(bytes) !== other.sha256)
                    rejectObservation('OBS_HASH');
                document.sources.push({
                    snapshot_uri: other.path,
                    sha256: other.sha256,
                });
            }
        } else {
            document = input.contract;
            const errors = await verifyBackendContractSnapshots(
                document,
                root,
                (absolute) =>
                    observationIO.boundedFile(
                        root,
                        relative(root, absolute).split(sep).join('/'),
                        65536
                    )
            );
            if (errors.length) rejectObservation('OBS_HASH');
            content = Buffer.from(serializeCanonicalBackendContract(document));
        }
        const compilationContext = await bindCompilationContext(context, {
            kind: 'backend',
            sourcePath: options.definitionPath,
            sourceContent: input.definitionBytes,
            outputPath: options.outputPath,
            document,
            schemas: { 'backend-contract': options.backendContractSchema },
            inputReader: (sourceRoot, path) =>
                observationIO.boundedFile(sourceRoot, path, 65536),
            privateDigest: input.privateDigest,
        });
        const outputSha256 = sha256(content);
        const sourceSha256 = sha256(input.definitionBytes);
        const planId = sha256(
            JSON.stringify({
                adapter: options.adapter,
                snapshot_id: options.snapshotId ?? null,
                definition: options.definitionPath,
                source_sha256: sourceSha256,
                output: output.relative,
                output_sha256: outputSha256,
                compilation_context_sha256: compilationContext.sha256,
            })
        );
        return {
            plan_id: planId,
            compilation_context: compilationContext,
            adapter: options.adapter,
            definition: options.definitionPath,
            source_sha256: sourceSha256,
            output: output.relative,
            output_sha256: outputSha256,
            candidate: resolve(
                output.parent,
                `.${basename(output.absolute)}.${planId}.candidate`
            ),
            content,
            contract: input.contract,
            outputAbsolute: output.absolute,
            outputParent: output.parent,
        };
    } catch (error) {
        rejectObservation(observationDiagnostic(error));
    }
}

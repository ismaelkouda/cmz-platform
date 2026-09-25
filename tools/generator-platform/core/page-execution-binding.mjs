import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

import { validateJsonSchema } from '../validate-ir.mjs';
import { compilePageExecutionPlan } from './page-execution-plan.mjs';

function fail(message) {
    throw new Error(`page execution binding: ${message}`);
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function workspaceFile(root, declaredPath, label) {
    const segments = declaredPath?.split('/') ?? [];
    if (
        typeof declaredPath !== 'string' ||
        declaredPath.startsWith('/') ||
        segments.some(
            (segment) => segment === '' || segment === '.' || segment === '..'
        )
    ) {
        fail(`${label} must use a normalized workspace-relative path`);
    }
    const absolute = resolve(root, declaredPath);
    const rel = relative(root, absolute);
    if (!rel || rel === '..' || rel.startsWith(`..${sep}`))
        fail(`${label} must be inside the workspace`);

    let current = root;
    const relativeSegments = rel.split(sep);
    for (const [index, segment] of relativeSegments.entries()) {
        current = resolve(current, segment);
        const metadata = lstatSync(current);
        if (metadata.isSymbolicLink())
            fail(`${label} must not traverse a symbolic link`);
        const leaf = index === relativeSegments.length - 1;
        if (!leaf && !metadata.isDirectory())
            fail(`${label} has a non-directory parent`);
        if (leaf && !metadata.isFile()) fail(`${label} must be a regular file`);
    }
    return absolute;
}

function parseJson(content, label) {
    try {
        return JSON.parse(content.toString('utf8'));
    } catch (error) {
        fail(`${label} is invalid JSON (${error.message})`);
    }
}

function assertSame(actual, expected, message) {
    if (actual !== expected) fail(message);
}

function loadPrimitiveArtifacts(root, plan) {
    const references = [
        ...plan.query_nodes.map((node) => node.primitive_ref),
        ...plan.command_nodes.map((node) => node.primitive_ref),
    ];
    const unique = new Map();
    for (const reference of references) {
        const existing = unique.get(reference.uri);
        if (
            existing &&
            (existing.sha256 !== reference.sha256 ||
                existing.kind !== reference.kind ||
                existing.schema_version !== reference.schema_version ||
                existing.model_id !== reference.model_id)
        ) {
            fail(`conflicting primitive references for ${reference.uri}`);
        }
        unique.set(reference.uri, reference);
    }

    const queryModels = [];
    const actionModels = [];
    for (const reference of unique.values()) {
        const absolute = workspaceFile(
            root,
            reference.uri,
            `primitive ${reference.model_id}`
        );
        const document = readFileSync(absolute);
        assertSame(
            sha256(document),
            reference.sha256,
            `primitive ${reference.model_id} sha256 drifted`
        );
        const model = parseJson(document, `primitive ${reference.model_id}`);
        assertSame(
            model.kind,
            reference.kind,
            `primitive ${reference.model_id} kind drifted`
        );
        assertSame(
            model.schema_version,
            reference.schema_version,
            `primitive ${reference.model_id} schema version drifted`
        );
        assertSame(
            model.model_id,
            reference.model_id,
            `primitive ${reference.model_id} identity drifted`
        );
        const operations =
            reference.kind === 'list-query-execution-model'
                ? model.queries
                : model.actions;
        for (const operationReference of references.filter(
            (candidate) => candidate.uri === reference.uri
        )) {
            if (
                !operations?.some(
                    (operation) =>
                        operation.id === operationReference.operation_id
                )
            ) {
                fail(
                    `primitive ${reference.model_id} does not expose operation ${operationReference.operation_id}`
                );
            }
        }
        const artifact = {
            uri: reference.uri,
            sha256: reference.sha256,
            document,
        };
        if (reference.kind === 'list-query-execution-model')
            queryModels.push(artifact);
        else actionModels.push(artifact);
    }
    return { queryModels, actionModels };
}

export function resolvePageExecutionBinding({
    workspaceRoot,
    pageExecutionPlanPath,
    pageExecutionPlanSchema,
    applicationDesignSchema,
    pageContract,
    pageContractPath,
    pageContractContent,
}) {
    if (!pageExecutionPlanPath) return null;
    if (!pageExecutionPlanSchema || !applicationDesignSchema)
        fail('schemas are required when an execution plan is provided');

    const root = resolve(workspaceRoot);
    const planAbsolute = workspaceFile(
        root,
        pageExecutionPlanPath,
        'execution plan'
    );
    const planContent = readFileSync(planAbsolute);
    const plan = parseJson(planContent, 'execution plan');
    const schemaErrors = validateJsonSchema(plan, pageExecutionPlanSchema);
    if (schemaErrors.length > 0)
        fail(`execution plan violates schema\n${schemaErrors.join('\n')}`);

    const normalizedPageContractPath = relative(
        root,
        workspaceFile(root, pageContractPath, 'page contract')
    )
        .split(sep)
        .join('/');
    assertSame(
        plan.source.page_contract.uri,
        normalizedPageContractPath,
        'execution plan references a different page contract path'
    );
    assertSame(
        plan.source.page_contract.sha256,
        sha256(pageContractContent),
        'execution plan references a stale page contract'
    );
    assertSame(
        plan.source.page_contract.page_id,
        pageContract.page.id,
        'execution plan references a different page id'
    );
    assertSame(
        plan.source.page_contract.design_id,
        pageContract.design.id,
        'execution plan references a different design id'
    );
    assertSame(
        plan.source.page_contract.design_version,
        pageContract.design.version,
        'execution plan references a different design version'
    );

    const { queryModels, actionModels } = loadPrimitiveArtifacts(root, plan);
    const expectedPlan = compilePageExecutionPlan({
        pageContract: {
            uri: normalizedPageContractPath,
            sha256: sha256(pageContractContent),
            document: pageContractContent,
        },
        listQueryModels: queryModels,
        actionRequestModels: actionModels,
        applicationDesignSchema,
        pageExecutionPlanSchema,
    });
    if (JSON.stringify(plan) !== JSON.stringify(expectedPlan))
        fail('execution plan differs from the deterministic recompilation');

    return {
        path: relative(root, planAbsolute).split(sep).join('/'),
        sha256: sha256(planContent),
        plan,
    };
}

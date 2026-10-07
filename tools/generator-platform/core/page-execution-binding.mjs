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

function applicationContractLocation(path) {
    const match =
        /^apps\/([a-z][a-z0-9-]*)\/\.cmz\/pages\/(page_[a-f0-9]{16})\.json$/.exec(
            path
        );
    return match ? { appName: match[1], pageId: match[2] } : null;
}

function readPublishedManifest(root, location, label) {
    const path = `apps/${location.appName}/.cmz/app-manifest.json`;
    const manifest = parseJson(
        readFileSync(workspaceFile(root, path, `${label} manifest`)),
        `${label} manifest`
    );
    if (
        manifest.kind !== 'application-shell-manifest' ||
        manifest.app_name !== location.appName ||
        !manifest.design_ref ||
        typeof manifest.design_ref.path !== 'string' ||
        !/^[a-f0-9]{64}$/.test(manifest.design_ref.sha256 ?? '') ||
        typeof manifest.experience_id !== 'string'
    ) {
        fail(`${label} manifest identity is invalid`);
    }
    const design = readFileSync(
        workspaceFile(root, manifest.design_ref.path, `${label} design`)
    );
    assertSame(
        sha256(design),
        manifest.design_ref.sha256,
        `${label} design sha256 drifted`
    );
    return manifest;
}

function resolveContractBinding({
    root,
    sourcePath,
    targetPath,
    sourceReference,
    targetContent,
}) {
    if (sourcePath === targetPath) {
        const publishedTargetContent = readFileSync(
            workspaceFile(root, targetPath, 'target page contract')
        );
        assertSame(
            sha256(targetContent),
            sha256(publishedTargetContent),
            'page contract content differs from the published target'
        );
        return {
            mode: 'exact',
            source_path: sourcePath,
            target_path: targetPath,
        };
    }
    const source = applicationContractLocation(sourcePath);
    const target = applicationContractLocation(targetPath);
    if (
        !source ||
        !target ||
        source.pageId !== target.pageId ||
        source.pageId !== sourceReference.page_id
    ) {
        fail('execution plan references a different page contract path');
    }
    const publishedTargetContent = readFileSync(
        workspaceFile(root, targetPath, 'target page contract')
    );
    assertSame(
        sha256(targetContent),
        sha256(publishedTargetContent),
        'page contract content differs from the published target'
    );
    const sourceContent = readFileSync(
        workspaceFile(root, sourcePath, 'execution plan source page contract')
    );
    assertSame(
        sha256(sourceContent),
        sourceReference.sha256,
        'execution plan source page contract drifted'
    );
    assertSame(
        sha256(targetContent),
        sourceReference.sha256,
        'published page-contract replica differs from the execution plan source'
    );
    const sourceManifest = readPublishedManifest(root, source, 'source app');
    const targetManifest = readPublishedManifest(root, target, 'target app');
    const sourceContract = parseJson(sourceContent, 'source page contract');
    if (
        JSON.stringify(sourceContract.design_ref) !==
        JSON.stringify(sourceManifest.design_ref)
    ) {
        fail('source page contract and app manifest design authority differ');
    }
    if (
        JSON.stringify(sourceManifest.design_ref) !==
            JSON.stringify(targetManifest.design_ref) ||
        sourceManifest.experience_id !== targetManifest.experience_id
    ) {
        fail(
            'published page-contract replicas do not share one design authority'
        );
    }
    return {
        mode: 'published-replica',
        source_path: sourcePath,
        target_path: targetPath,
        source_app: source.appName,
        target_app: target.appName,
        design_ref: sourceManifest.design_ref,
        experience_id: sourceManifest.experience_id,
    };
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
    const contractBinding = resolveContractBinding({
        root,
        sourcePath: plan.source.page_contract.uri,
        targetPath: normalizedPageContractPath,
        sourceReference: plan.source.page_contract,
        targetContent: pageContractContent,
    });
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
            uri: plan.source.page_contract.uri,
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
        contract_binding: contractBinding,
        plan,
    };
}

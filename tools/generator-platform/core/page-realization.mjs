import { createHash, randomUUID } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { lstat, mkdir, open, rename } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

import {
    loadArchetypeSystem,
    selectArchetype,
} from './archetype-selection.mjs';
import { producePageRoleNode } from './role-production.mjs';
import { createPageRealizationOracle } from './page-realization-sandbox.mjs';
import { resolvePageExecutionBinding } from './page-execution-binding.mjs';
import {
    baselineHash,
    gitInventory,
    v5Baseline,
} from './page-realization-baseline.mjs';
import {
    deriveV5WorkOrderId,
    deriveWorkOrderId,
    publicWorkOrder,
} from './page-realization-work-order.mjs';
import {
    assertAllowedPathsMatchGitCommit,
    assertCleanGitWorktree,
    assertGitAncestor,
    assertGitCommit,
    assertOnlyAllowedGitChanges,
    createGitCommitReader,
    gitHead,
} from './git-object-reader.mjs';
import {
    additionalPageRealizationFiles,
    pageRealizationAllowedFiles,
    resolvePageRealizationTarget,
} from './page-realization-files.mjs';
import {
    pageRealizationDirectoryFiles,
    validatePageRealizationEvidence,
} from './page-realization-verification.mjs';
import { resolvePresentationEvidence } from './presentation-evidence.mjs';
import { resolvePresentationLayoutBinding } from './presentation-layout-binding.mjs';

const STATE_ROOT = '.cmz/page-realization-work-orders';
const FORBIDDEN_NETWORK = [
    /\bHttpClient\b/,
    /\bXMLHttpRequest\b/,
    /\bfetch\s*\(/,
    /\baxios\b/,
    /https?:\/\//,
];
function fail(message) {
    throw new Error(`page realization: ${message}`);
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function assertAppPageIdentity(appName, pageId) {
    if (!/^[a-z][a-z0-9-]*$/.test(appName ?? ''))
        fail('app name must be kebab-case');
    if (!/^page_[a-f0-9]{16}$/.test(pageId ?? ''))
        fail('invalid stable page id');
}

function assertWorkspaceEntry(root, path, label, expectedKind) {
    const rel = relative(root, path);
    if (!rel || rel === '..' || rel.startsWith(`..${sep}`))
        fail(`${label} must be inside the workspace`);
    const rootMetadata = lstatSync(root);
    if (!rootMetadata.isDirectory() || rootMetadata.isSymbolicLink())
        fail('workspace root must be a real directory');
    const segments = rel.split(sep);
    let current = root;
    for (const [index, segment] of segments.entries()) {
        current = resolve(current, segment);
        const metadata = lstatSync(current);
        if (metadata.isSymbolicLink())
            fail(`${label} must not traverse a symbolic link`);
        const leaf = index === segments.length - 1;
        if (!leaf && !metadata.isDirectory())
            fail(`${label} has a non-directory parent`);
        if (
            leaf &&
            ((expectedKind === 'file' && !metadata.isFile()) ||
                (expectedKind === 'directory' && !metadata.isDirectory()))
        ) {
            fail(`${label} must be a regular ${expectedKind}`);
        }
    }
    return path;
}

function resolveWorkspaceFile(root, declaredPath, label) {
    const absolute = resolve(root, declaredPath);
    return assertWorkspaceEntry(root, absolute, label, 'file');
}

function appPaths(root, appName, pageId) {
    const app = resolve(root, `apps/${appName}`);
    return {
        app,
        manifest: resolve(app, '.cmz/app-manifest.json'),
        pageContract: resolve(app, `.cmz/pages/${pageId}.json`),
        writeRoot: resolve(app, `src/app/pages/${pageId}`),
    };
}

function statePaths(root, appName, pageId, workOrderId) {
    const directory = resolve(root, STATE_ROOT, appName, pageId, workOrderId);
    return {
        directory,
        workOrder: resolve(directory, 'work-order.json'),
        baseline: resolve(directory, 'baseline.json'),
    };
}

function readJsonFile(path, label) {
    const metadata = lstatSync(path);
    if (!metadata.isFile() || metadata.isSymbolicLink())
        fail(`${label} must be a regular file`);
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
        fail(`${label} is invalid JSON (${error.message})`);
    }
}

function resolveRealizationContract(
    root,
    pageContract,
    pageContractHash,
    target
) {
    const roleNodeSchema = readJsonFile(
        resolve(root, 'tools/generator-platform/schemas/role-node.schema.json'),
        'role node schema'
    );
    const roleNode = producePageRoleNode(
        pageContract,
        pageContractHash,
        roleNodeSchema
    );
    const selection = selectArchetype(
        loadArchetypeSystem(root, target.archetypeStack),
        roleNode
    );
    return { role_node: roleNode, selection };
}

async function writeAtomic(path, document) {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const temporary = resolve(
        dirname(path),
        `.tmp-${process.pid}-${randomUUID()}`
    );
    const handle = await open(temporary, 'wx', 0o600);
    try {
        await handle.writeFile(`${JSON.stringify(document, null, 2)}\n`);
        await handle.sync();
    } finally {
        await handle.close();
    }
    await rename(temporary, path);
    const directory = await open(dirname(path), 'r');
    try {
        await directory.sync();
    } finally {
        await directory.close();
    }
}

export function planPageRealization({
    workspaceRoot,
    appName,
    pageId,
    presentationEvidencePath,
    presentationEvidenceSchema,
    pageExecutionPlanPath,
    pageExecutionPlanSchema,
    applicationDesignSchema,
    layoutBindingPath,
    layoutBindingSchema,
    layoutExampleSetSchema,
    authorityCommitSha,
    baseCommitSha,
    additionalFiles = [],
}) {
    assertAppPageIdentity(appName, pageId);
    const root = resolve(workspaceRoot);
    const paths = appPaths(root, appName, pageId);
    assertWorkspaceEntry(root, paths.manifest, 'app manifest', 'file');
    assertWorkspaceEntry(root, paths.pageContract, 'page contract', 'file');
    const manifest = readJsonFile(paths.manifest, 'app manifest');
    const pageContract = readJsonFile(paths.pageContract, 'page contract');
    if (
        manifest.kind !== 'application-shell-manifest' ||
        manifest.app_name !== appName ||
        pageContract.kind !== 'page-realization-contract' ||
        pageContract.page?.id !== pageId
    ) {
        fail('app/page ownership identity mismatch');
    }
    const target = resolvePageRealizationTarget(manifest.profile);
    const designAbsolute = resolveWorkspaceFile(
        root,
        manifest.design_ref.path,
        'published design'
    );
    const designContent = readFileSync(designAbsolute);
    if (sha256(designContent) !== manifest.design_ref.sha256)
        fail('published design drifted since app creation');
    const pageContractContent = readFileSync(paths.pageContract);
    const pageContractHash = sha256(pageContractContent);
    const pageContractPath = relative(root, paths.pageContract)
        .split(sep)
        .join('/');
    const realizationContract = resolveRealizationContract(
        root,
        pageContract,
        pageContractHash,
        target
    );
    const presentationEvidence = resolvePresentationEvidence({
        workspaceRoot: root,
        presentationEvidencePath,
        presentationEvidenceSchema,
        pageContract,
    });
    const pageExecution = resolvePageExecutionBinding({
        workspaceRoot: root,
        pageExecutionPlanPath,
        pageExecutionPlanSchema,
        applicationDesignSchema,
        pageContract,
        pageContractPath,
        pageContractContent,
    });
    const relativeWriteRoot = relative(root, paths.writeRoot)
        .split(sep)
        .join('/');
    const files = pageRealizationAllowedFiles(target, additionalFiles);
    const writablePaths = files.map((file) => `${relativeWriteRoot}/${file}`);
    const v5Requested = Boolean(
        layoutBindingPath || authorityCommitSha || baseCommitSha
    );
    let layoutGuidance = null;
    let baseline;
    if (v5Requested) {
        if (!layoutBindingPath || !authorityCommitSha || !baseCommitSha)
            fail(
                'layout binding, authority commit and base commit are required together'
            );
        assertGitCommit(root, authorityCommitSha, 'authority_commit_sha');
        assertGitCommit(root, baseCommitSha, 'base_commit_sha');
        if (authorityCommitSha !== baseCommitSha)
            fail('authority_commit_sha must equal base_commit_sha in v5');
        if (gitHead(root) !== baseCommitSha)
            fail('base_commit_sha must equal HEAD during v5 preparation');
        assertCleanGitWorktree(root);
        assertAllowedPathsMatchGitCommit(root, baseCommitSha, writablePaths);
        const readSource = createGitCommitReader(root, authorityCommitSha);
        const committedPageContract = readSource(
            pageContractPath,
            'page contract'
        ).content;
        if (!committedPageContract.equals(pageContractContent))
            fail('page contract differs from base_commit_sha');
        layoutGuidance = resolvePresentationLayoutBinding({
            layoutBindingPath,
            layoutBindingSchema,
            layoutExampleSetSchema,
            pageContract,
            pageContractPath,
            pageContractContent: committedPageContract,
            readSource,
        });
        baseline = v5Baseline(root, baseCommitSha, writablePaths);
    } else {
        baseline = gitInventory(root, writablePaths);
    }
    const protectedHash = baselineHash(baseline);
    const identity = {
        appName,
        pageId,
        pageContractHash,
        protectedWorkspaceHash: protectedHash,
        realizationContract,
        presentationEvidence,
        pageExecution,
        allowedFiles: files,
        target: {
            profile: target.profile,
            archetype_stack: target.archetypeStack,
        },
    };
    const workOrderId = layoutGuidance
        ? deriveV5WorkOrderId({
              ...identity,
              authorityCommitSha,
              baseCommitSha,
              layoutGuidance,
          })
        : deriveWorkOrderId(identity);
    const state = statePaths(root, appName, pageId, workOrderId);
    const workOrder = publicWorkOrder({
        workOrderId,
        appName,
        pageId,
        pageContractPath,
        pageContractHash,
        writeRoot: relativeWriteRoot,
        baselineSha256: protectedHash,
        realizationContract,
        presentationEvidence,
        pageExecution,
        allowedFiles: files,
        target,
        authorityCommitSha,
        baseCommitSha,
        layoutGuidance,
    });
    return {
        work_order_id: workOrderId,
        work_order_path: relative(root, state.workOrder).split(sep).join('/'),
        baseline_sha256: protectedHash,
        workOrder,
        baseline,
        paths,
        state,
        pageContract,
        pageContractHash,
        root,
    };
}

export async function publishPageRealizationWorkOrder(options) {
    const plan = planPageRealization(options);
    if (options.workOrderId !== plan.work_order_id)
        fail('reviewed work order id is stale or invalid');
    let stateExists = false;
    try {
        const metadata = await lstat(plan.state.directory);
        if (!metadata.isDirectory() || metadata.isSymbolicLink())
            fail('work order state root must be a real directory');
        stateExists = true;
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
    if (stateExists) {
        try {
            const existingWorkOrder = readJsonFile(
                plan.state.workOrder,
                'existing work order'
            );
            const existingBaseline = readJsonFile(
                plan.state.baseline,
                'existing baseline'
            );
            if (
                sha256(`${JSON.stringify(existingWorkOrder, null, 2)}\n`) !==
                    sha256(`${JSON.stringify(plan.workOrder, null, 2)}\n`) ||
                baselineHash(existingBaseline.entries) !== plan.baseline_sha256
            ) {
                fail('existing work order state drifted');
            }
            return { plan, already_published: true };
        } catch (error) {
            fail(
                `existing work order is incomplete or invalid (${error.message})`
            );
        }
    }
    await mkdir(plan.state.directory, { recursive: true, mode: 0o700 });
    await writeAtomic(plan.state.workOrder, plan.workOrder);
    await writeAtomic(plan.state.baseline, {
        schema_version: '1.0.0',
        work_order_id: plan.work_order_id,
        entries: plan.baseline,
    });
    return { plan, already_published: false };
}

export function verifyPageRealization(
    {
        workspaceRoot,
        appName,
        pageId,
        workOrderId,
        evidenceSchema,
        presentationEvidenceSchema,
        pageExecutionPlanSchema,
        applicationDesignSchema,
        layoutBindingSchema,
        layoutExampleSetSchema,
    },
    dependencies = {}
) {
    assertAppPageIdentity(appName, pageId);
    if (!/^[a-f0-9]{64}$/.test(workOrderId ?? ''))
        fail('work order id must be SHA-256');
    const root = resolve(workspaceRoot);
    const state = statePaths(root, appName, pageId, workOrderId);
    assertWorkspaceEntry(root, state.workOrder, 'work order', 'file');
    assertWorkspaceEntry(root, state.baseline, 'work order baseline', 'file');
    const workOrder = readJsonFile(state.workOrder, 'work order');
    const baseline = readJsonFile(state.baseline, 'work order baseline');
    if (
        workOrder.schema_version !== '4.0.0' &&
        workOrder.schema_version !== '5.0.0'
    ) {
        fail('unsupported or missing work order schema_version');
    }
    const isV5 = workOrder.schema_version === '5.0.0';
    if (
        !isV5 &&
        (Object.hasOwn(workOrder, 'layout_guidance') ||
            Object.hasOwn(workOrder, 'authority_commit_sha') ||
            Object.hasOwn(workOrder, 'base_commit_sha'))
    ) {
        fail('v4 work order must not contain v5 authority fields');
    }
    if (isV5) {
        assertGitCommit(
            root,
            workOrder.authority_commit_sha,
            'authority_commit_sha'
        );
        assertGitCommit(root, workOrder.base_commit_sha, 'base_commit_sha');
        if (workOrder.authority_commit_sha !== workOrder.base_commit_sha)
            fail('authority_commit_sha must equal base_commit_sha in v5');
        assertGitAncestor(root, workOrder.base_commit_sha);
        if (!workOrder.layout_guidance)
            fail('v5 work order requires layout_guidance');
    }
    if (
        workOrder.work_order_id !== workOrderId ||
        baseline.work_order_id !== workOrderId ||
        baselineHash(baseline.entries) !== workOrder.protected_workspace_sha256
    ) {
        fail('work order state integrity failure');
    }
    const paths = appPaths(root, appName, pageId);
    assertWorkspaceEntry(root, paths.manifest, 'app manifest', 'file');
    assertWorkspaceEntry(root, paths.pageContract, 'page contract', 'file');
    const manifest = readJsonFile(paths.manifest, 'app manifest');
    if (
        manifest.kind !== 'application-shell-manifest' ||
        manifest.app_name !== appName
    ) {
        fail('app ownership identity mismatch');
    }
    const target = resolvePageRealizationTarget(manifest.profile);
    let pageContractContent = readFileSync(paths.pageContract);
    if (isV5) {
        pageContractContent = createGitCommitReader(
            root,
            workOrder.authority_commit_sha
        )(workOrder.page_contract.path, 'page contract').content;
    }
    const pageContractHash = sha256(pageContractContent);
    const pageContract = JSON.parse(pageContractContent.toString('utf8'));
    const violations = [];
    let files = [...target.requiredFiles];
    try {
        files = pageRealizationAllowedFiles(
            target,
            additionalPageRealizationFiles(workOrder, target)
        );
    } catch (error) {
        violations.push(error.message);
    }
    const expectedRealizationContract = resolveRealizationContract(
        root,
        pageContract,
        pageContractHash,
        target
    );
    const expectedPresentationEvidence = resolvePresentationEvidence({
        workspaceRoot: root,
        presentationEvidencePath:
            workOrder.presentation_evidence?.manifest?.path,
        presentationEvidenceSchema,
        pageContract,
    });
    const expectedPageExecution = resolvePageExecutionBinding({
        workspaceRoot: root,
        pageExecutionPlanPath: workOrder.page_execution?.path,
        pageExecutionPlanSchema,
        applicationDesignSchema,
        pageContract,
        pageContractPath: workOrder.page_contract.path,
        pageContractContent,
    });
    const expectedLayoutGuidance = isV5
        ? resolvePresentationLayoutBinding({
              layoutBindingPath: workOrder.layout_guidance?.manifest?.path,
              layoutBindingSchema,
              layoutExampleSetSchema,
              pageContract,
              pageContractPath: workOrder.page_contract.path,
              pageContractContent,
              readSource: createGitCommitReader(
                  root,
                  workOrder.authority_commit_sha
              ),
          })
        : null;
    const relativeWriteRoot = relative(root, paths.writeRoot)
        .split(sep)
        .join('/');
    const pageContractPath = relative(root, paths.pageContract)
        .split(sep)
        .join('/');
    const identity = {
        appName,
        pageId,
        pageContractHash,
        protectedWorkspaceHash: workOrder.protected_workspace_sha256,
        realizationContract: expectedRealizationContract,
        presentationEvidence: expectedPresentationEvidence,
        pageExecution: expectedPageExecution,
        allowedFiles: files,
        target: {
            profile: target.profile,
            archetype_stack: target.archetypeStack,
        },
    };
    const expectedWorkOrderId = isV5
        ? deriveV5WorkOrderId({
              ...identity,
              authorityCommitSha: workOrder.authority_commit_sha,
              baseCommitSha: workOrder.base_commit_sha,
              layoutGuidance: expectedLayoutGuidance,
          })
        : deriveWorkOrderId(identity);
    const expectedWorkOrder = publicWorkOrder({
        workOrderId: expectedWorkOrderId,
        appName,
        pageId,
        pageContractPath,
        pageContractHash,
        writeRoot: relativeWriteRoot,
        baselineSha256: workOrder.protected_workspace_sha256,
        realizationContract: expectedRealizationContract,
        presentationEvidence: expectedPresentationEvidence,
        pageExecution: expectedPageExecution,
        allowedFiles: files,
        target,
        authorityCommitSha: workOrder.authority_commit_sha,
        baseCommitSha: workOrder.base_commit_sha,
        layoutGuidance: expectedLayoutGuidance,
    });
    if (
        expectedWorkOrderId !== workOrderId ||
        JSON.stringify(workOrder) !== JSON.stringify(expectedWorkOrder)
    ) {
        violations.push(
            'work order content does not match its content-addressed id'
        );
    }
    const writablePaths = files.map((file) => `${relativeWriteRoot}/${file}`);
    let currentBaseline;
    if (isV5) {
        assertOnlyAllowedGitChanges(
            root,
            workOrder.base_commit_sha,
            writablePaths
        );
        currentBaseline = v5Baseline(
            root,
            workOrder.base_commit_sha,
            writablePaths
        );
        if (
            JSON.stringify(currentBaseline) !== JSON.stringify(baseline.entries)
        )
            violations.push('v5 baseline does not match base_commit_sha');
    } else {
        currentBaseline = (dependencies.inventory ?? gitInventory)(
            root,
            writablePaths
        );
    }
    if (
        JSON.stringify(workOrder.realization_contract) !==
        JSON.stringify(expectedRealizationContract)
    ) {
        violations.push('role node or archetype selection drifted');
    }
    if (baselineHash(currentBaseline) !== workOrder.protected_workspace_sha256)
        violations.push(
            'workspace changed outside the explicitly allowed files'
        );
    let actualFiles = [];
    try {
        assertWorkspaceEntry(
            root,
            paths.writeRoot,
            'page output root',
            'directory'
        );
        actualFiles = pageRealizationDirectoryFiles(paths.writeRoot);
    } catch (error) {
        violations.push(error.message);
    }
    const missingFiles = files.filter((file) => !actualFiles.includes(file));
    if (missingFiles.length > 0)
        violations.push(`page files are missing: ${missingFiles.join(', ')}`);
    let source = '';
    for (const path of actualFiles.filter((entry) =>
        /\.(?:ts|tsx|html)$/.test(entry)
    ))
        source += readFileSync(resolve(paths.writeRoot, path), 'utf8');
    for (const pattern of FORBIDDEN_NETWORK) {
        if (pattern.test(source))
            violations.push(`direct network access forbidden by ${pattern}`);
    }
    for (const contract of pageContract.backend_contracts ?? []) {
        const snapshot = resolveWorkspaceFile(
            root,
            contract.snapshot_uri,
            `backend contract ${contract.id}`
        );
        const backend = JSON.parse(readFileSync(snapshot, 'utf8'));
        for (const operation of backend.operations ?? []) {
            if (source.includes(operation.path))
                violations.push(
                    `endpoint literal forbidden in page code: ${operation.path}`
                );
        }
    }
    if (actualFiles.includes('realization-evidence.json')) {
        try {
            violations.push(
                ...validatePageRealizationEvidence({
                    evidence: readJsonFile(
                        resolve(paths.writeRoot, 'realization-evidence.json'),
                        'realization evidence'
                    ),
                    schema: evidenceSchema,
                    pageContract,
                    contractHash: pageContractHash,
                    markup: source,
                })
            );
        } catch (error) {
            violations.push(error.message);
        }
    }
    const oracleResults = [];
    if (violations.length === 0) {
        const injectedRun = dependencies.run;
        const oracle = injectedRun
            ? null
            : (dependencies.createOracle ?? createPageRealizationOracle)({
                  workspaceRoot: root,
                  appName,
                  profile: target.profile,
              });
        try {
            const compile =
                target.profile === 'angular-pwa'
                    ? [
                          'ngc',
                          '-p',
                          `apps/${appName}/tsconfig.app.json`,
                          '--noEmit',
                      ]
                    : [
                          'tsc',
                          '-p',
                          `apps/${appName}/tsconfig.app.json`,
                          '--noEmit',
                      ];
            for (const [name, command, args] of [
                ['compile', 'bunx', compile],
                [
                    'build',
                    'bunx',
                    [
                        'nx',
                        'run',
                        `${appName}:build:production`,
                        '--skipNxCache',
                    ],
                ],
                ['lint', 'bunx', ['nx', 'run', `${appName}:lint`]],
                ['test', 'bunx', ['nx', 'run', `${appName}:test`]],
            ]) {
                try {
                    if (injectedRun) injectedRun(command, args, root);
                    else oracle.run(name);
                    oracleResults.push({ name, ok: true });
                } catch (error) {
                    oracleResults.push({ name, ok: false });
                    violations.push(
                        `${name} failed: ${[
                            error.stdout,
                            error.stderr,
                            error.message,
                        ]
                            .filter(Boolean)
                            .join('\n')}`
                    );
                }
            }
        } finally {
            oracle?.dispose();
        }
    }
    return {
        ok: violations.length === 0,
        work_order_id: workOrderId,
        page_id: pageId,
        violations,
        oracle_results: oracleResults,
    };
}

export function publicPageRealizationPlan(plan) {
    return {
        work_order_id: plan.work_order_id,
        work_order_path: plan.work_order_path,
        ...(plan.workOrder.schema_version === '5.0.0'
            ? { schema_version: plan.workOrder.schema_version }
            : {}),
        app_name: plan.workOrder.app_name,
        page_id: plan.workOrder.page_id,
        page_contract: plan.workOrder.page_contract,
        ...(plan.workOrder.schema_version === '5.0.0'
            ? {
                  authority_commit_sha: plan.workOrder.authority_commit_sha,
                  base_commit_sha: plan.workOrder.base_commit_sha,
                  layout_guidance: plan.workOrder.layout_guidance,
              }
            : {}),
        page_execution: plan.workOrder.page_execution,
        presentation_evidence: plan.workOrder.presentation_evidence,
        realization_contract: plan.workOrder.realization_contract,
        target: plan.workOrder.target,
        allowed_write_root: plan.workOrder.allowed_write_root,
        allowed_files: plan.workOrder.allowed_files,
        oracle_policy: plan.workOrder.oracle_policy,
        protected_workspace_sha256: plan.workOrder.protected_workspace_sha256,
    };
}

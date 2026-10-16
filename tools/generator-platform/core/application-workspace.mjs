import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { repositoryRoot, validateJsonSchema } from '../validate-ir.mjs';
import { renderAngularPwaShell } from '../renderers/angular-pwa-shell-renderer.mjs';
import { renderReactSpaShell } from '../renderers/react-spa-shell-renderer.mjs';
import { renderApplicationWorkspace } from '../renderers/application-workspace-renderer.mjs';
import { nxConfinementEnvironment } from '../../library-setup/sandbox.mjs';
import { validateApplicationDesignWithDependencies } from './application-design.mjs';
import { canonicalizeGeneratedFiles } from './canonicalize-generated.mjs';
import {
    assertPhysicalPath,
    assertSourceWeight,
    externalApplicationContext,
    externalFailure,
    fileArtifacts,
    pathExists,
    readProductFile,
    safeRelativePath,
    stageGeneratedTree,
    verifyGeneratedTree,
    workspaceCandidate,
} from './external-application-paths.mjs';
import { sha256, stableStringify } from './generation-manifest.mjs';
import {
    commitDirectoryTransaction,
    withGenerationLock,
} from './generation-transaction.mjs';

import {
    projectProductLock,
    qualifyProductInstallation,
    sourceProvenance,
    sourceToolchain,
} from './application-workspace-toolchain.mjs';
export {
    productDependencyClosure,
    qualifyProductInstallation,
} from './application-workspace-toolchain.mjs';

const MANIFEST = '.cmz/application-workspace.json';
function normalizeWorkspaceOptions(options) {
    if (
        !Array.isArray(options.profiles) ||
        !options.profiles.length ||
        new Set(options.profiles).size !== options.profiles.length ||
        options.profiles.some(
            (profile) => !['angular-pwa', 'react-spa'].includes(profile)
        )
    )
        externalFailure('explicit unique profiles required');
    if (
        !/^[a-zA-Z0-9-]+\/[a-zA-Z0-9_.-]+$/.test(
            options.githubRepository ?? ''
        ) ||
        !/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(options.reviewOwner ?? '')
    )
        externalFailure('GitHub repository and review owner required');
    return [...options.profiles].sort();
}

async function manifestSchema(toolsRoot) {
    return JSON.parse(
        (
            await readProductFile(
                toolsRoot,
                'tools/generator-platform/schemas/application-workspace-manifest.schema.json'
            )
        ).toString('utf8')
    );
}

async function verifyWorkspaceRoot(plan) {
    const { productRoot } = plan;
    if (!(await pathExists(resolve(productRoot, MANIFEST))))
        externalFailure('workspace ownership marker missing');
    if (
        sha256(await readProductFile(productRoot, MANIFEST)) !==
        sha256(plan.files[MANIFEST])
    )
        externalFailure('workspace ownership drift');
    for (const path of plan.manifest.directories) {
        const absolute = await assertPhysicalPath(resolve(productRoot, path));
        if (!(await lstat(absolute)).isDirectory())
            externalFailure('workspace directory missing');
    }
    for (const [path, expected] of Object.entries(plan.files)) {
        if (path === 'bun.lock') continue;
        const content = await readProductFile(productRoot, path);
        if (sha256(content) !== sha256(expected))
            externalFailure('workspace ownership drift');
    }
    const expected = new Set(Object.keys(plan.files));
    const inputs = new Set(plan.inputPaths ?? []);
    for (const entry of await readdir(resolve(productRoot, 'apps'), {
        withFileTypes: true,
    })) {
        if (
            /^\.[a-z][a-z0-9-]*\.(?:external-candidate-[a-f0-9]{64}|generation-lock(?:\..*)?)$/.test(
                entry.name
            )
        ) {
            if (!entry.isDirectory() || entry.isSymbolicLink())
                externalFailure('invalid working directory');
            continue;
        }
        if (!entry.isDirectory() || entry.isSymbolicLink())
            externalFailure('unowned app entry');
        const appRoot = resolve(productRoot, 'apps', entry.name);
        const app = JSON.parse(
            (await readProductFile(appRoot, '.cmz/app-manifest.json')).toString(
                'utf8'
            )
        );
        if (app.app_name !== entry.name || !plan.profiles.includes(app.profile))
            externalFailure('unowned app manifest');
        const designBytes = await readProductFile(
            productRoot,
            app.design_ref.path
        );
        if (sha256(designBytes) !== app.design_ref.sha256)
            externalFailure('workspace app input drift');
        const design = JSON.parse(designBytes.toString('utf8'));
        for (const input of await productInputClosure(
            productRoot,
            app.design_ref.path,
            design
        ))
            inputs.add(input.path);
        const files = await ownedFiles(appRoot, app.generated_files);
        files['.cmz/app-manifest.json'] = await readProductFile(
            appRoot,
            '.cmz/app-manifest.json'
        );
        await verifyGeneratedTree(appRoot, files);
    }
    const runtimeRoots = new Set([
        'node_modules',
        '.git',
        '.nx',
        '.angular',
        'dist',
        'coverage',
        'tmp',
    ]);
    async function reserved(directory, prefix = '') {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
            const path = prefix + entry.name;
            if (!prefix && runtimeRoots.has(entry.name)) {
                if (entry.isSymbolicLink())
                    externalFailure('symbolic runtime root');
                continue;
            }
            if (path === 'descriptions' || path === 'apps') {
                if (!entry.isDirectory() || entry.isSymbolicLink())
                    externalFailure('invalid product namespace');
                continue;
            }
            if (entry.isSymbolicLink())
                externalFailure('symbolic workspace entry');
            if (entry.isDirectory()) {
                if (
                    ![...expected, ...inputs].some((name) =>
                        name.startsWith(path + '/')
                    )
                )
                    externalFailure('unowned workspace directory');
                await reserved(resolve(directory, entry.name), path + '/');
            } else if (
                !expected.has(path) &&
                !inputs.has(path) &&
                path !== 'bun.lock'
            ) {
                externalFailure('unowned workspace file');
            }
        }
    }
    await reserved(productRoot);
}

async function ownedFiles(root, artifacts) {
    const files = {};
    for (const artifact of artifacts) {
        if (Object.hasOwn(files, artifact.path))
            externalFailure('duplicate owned path');
        const content = await readProductFile(root, artifact.path);
        if (
            sha256(content) !== artifact.sha256 ||
            content.length !== artifact.bytes
        )
            externalFailure('workspace ownership drift');
        files[artifact.path] = content.toString('utf8');
    }
    return files;
}

async function workspaceSnapshot(context, options, profiles) {
    const marker = resolve(context.productRoot, MANIFEST);
    if (!(await pathExists(marker)))
        externalFailure('workspace ownership drift');
    const bytes = await readProductFile(context.productRoot, MANIFEST);
    const manifest = JSON.parse(bytes.toString('utf8'));
    if (
        validateJsonSchema(manifest, await manifestSchema(context.toolsRoot))
            .length
    )
        externalFailure('workspace ownership drift');
    const { workspace_id: identity, ...fields } = manifest;
    if (
        identity !== sha256(stableStringify(fields)) ||
        stableStringify(profiles) !== stableStringify(manifest.profiles) ||
        options.githubRepository !== manifest.github_repository ||
        options.reviewOwner !== manifest.review_owner
    )
        externalFailure('workspace ownership drift');
    const files = await ownedFiles(context.productRoot, manifest.files);
    files[MANIFEST] = bytes.toString('utf8');
    files['bun.lock'] = (
        await readProductFile(context.productRoot, 'bun.lock')
    ).toString('utf8');
    return { files, manifest };
}

export async function planApplicationWorkspace(options) {
    const profiles = normalizeWorkspaceOptions(options);
    const context = await externalApplicationContext({
        workspaceRoot: options.workspaceRoot ?? repositoryRoot,
        targetRoot: options.targetRoot,
    });
    const provenance = await sourceProvenance(context.toolsRoot);
    let snapshot;
    if (await pathExists(context.productRoot))
        snapshot = await workspaceSnapshot(context, options, profiles);
    else {
        const toolchain = await sourceToolchain(context.toolsRoot, profiles);
        const files = await renderApplicationWorkspace({
            ...options,
            ...toolchain,
            profiles,
        });
        const fields = {
            schema_version: '1.0.0',
            kind: 'application-workspace-manifest',
            profiles,
            github_repository: options.githubRepository,
            review_owner: options.reviewOwner,
            quality_profile: 'production',
            qualification: 'pending',
            packages: toolchain.packages,
            overrides: toolchain.overrides,
            dependency_closure_sha256: toolchain.dependencyClosureSha256,
            files: fileArtifacts(files),
            dependency_deviations: toolchain.dependencyDeviations,
            directories: ['apps', 'descriptions'],
        };
        const manifest = {
            ...fields,
            workspace_id: sha256(stableStringify(fields)),
        };
        if (
            validateJsonSchema(
                manifest,
                await manifestSchema(context.toolsRoot)
            ).length
        )
            externalFailure('workspace manifest schema');
        Object.assign(
            files,
            await canonicalizeGeneratedFiles({
                [MANIFEST]: JSON.stringify(manifest, null, 2) + '\n',
            })
        );
        files['bun.lock'] = projectProductLock(
            JSON.parse(files['package.json']),
            toolchain
        );
        snapshot = { files, manifest };
    }
    const planId = sha256(
        stableStringify({
            tools_root: context.toolsRoot,
            target_root: context.productRoot,
            workspace_id: snapshot.manifest.workspace_id,
            provenance,
            files: fileArtifacts(snapshot.files),
        })
    );
    const plan = {
        ...context,
        ...snapshot,
        profiles,
        provenance,
        plan_id: planId,
        inputPaths: options.inputPaths ?? [],
        output: context.productRoot,
        candidate: workspaceCandidate(context.productRoot, planId),
    };
    if (await pathExists(context.productRoot)) await verifyWorkspaceRoot(plan);
    return plan;
}

export function publicApplicationWorkspacePlan(plan) {
    return {
        schema_version: '1.0.0',
        plan_id: plan.plan_id,
        tools_root: plan.toolsRoot,
        target_root: plan.productRoot,
        profiles: plan.profiles,
        packages: plan.manifest.packages,
        provenance: plan.provenance,
        overrides: plan.manifest.overrides,
        dependency_closure_sha256: plan.manifest.dependency_closure_sha256,
        dependency_deviations: plan.manifest.dependency_deviations,
        github_repository: plan.manifest.github_repository,
        review_owner: plan.manifest.review_owner,
        files: fileArtifacts(plan.files),
        qualification: 'pending',
        directories: plan.manifest.directories,
    };
}

export async function publishApplicationWorkspace(options) {
    const initial = await planApplicationWorkspace(options);
    if (
        !/^[a-f0-9]{64}$/.test(options.expectedPlanId ?? '') ||
        initial.plan_id !== options.expectedPlanId
    )
        externalFailure('reviewed workspace plan required or stale');
    return withGenerationLock(initial.productRoot, async () => {
        const plan = await planApplicationWorkspace(options);
        if (plan.plan_id !== initial.plan_id)
            externalFailure('workspace changed under lock');
        let recovered = true;
        if (!(await pathExists(plan.productRoot))) {
            await stageGeneratedTree(plan.candidate, plan.files, {
                directories: plan.manifest.directories,
            });
            await externalApplicationContext({
                workspaceRoot: plan.toolsRoot,
                targetRoot: plan.productRoot,
            });
            await commitDirectoryTransaction({
                outputRoot: plan.productRoot,
                candidateRoot: plan.candidate,
                expectedState: 'absent',
            });
            recovered = false;
        }
        await verifyWorkspaceRoot(plan);
        return {
            ...publicApplicationWorkspacePlan(plan),
            status: 'prepared',
            recovered,
        };
    });
}

async function readOwnedWorkspace(options) {
    const context = await externalApplicationContext({
        workspaceRoot: options.workspaceRoot ?? repositoryRoot,
        targetRoot: options.targetRoot,
    });
    const manifest = JSON.parse(
        (await readProductFile(context.productRoot, MANIFEST)).toString('utf8')
    );
    if (
        validateJsonSchema(manifest, await manifestSchema(context.toolsRoot))
            .length
    )
        externalFailure('workspace marker is invalid');
    let inputPaths = [];
    if (options.designPath) {
        inputFilePath(options.designPath);
        const design = JSON.parse(
            (
                await readProductFile(context.productRoot, options.designPath)
            ).toString('utf8')
        );
        inputPaths = (
            await productInputClosure(
                context.productRoot,
                options.designPath,
                design
            )
        ).map((entry) => entry.path);
    }
    return planApplicationWorkspace({
        workspaceRoot: context.toolsRoot,
        targetRoot: context.productRoot,
        profiles: manifest.profiles,
        githubRepository: manifest.github_repository,
        reviewOwner: manifest.review_owner,
        inputPaths,
    });
}

function inputFilePath(path) {
    safeRelativePath(path);
    const reserved = new Set([
        'package.json',
        'bun.lock',
        'nx.json',
        'tsconfig.base.json',
        'eslint.config.mjs',
        '.prettierrc.json',
        '.prettierignore',
        '.gitignore',
        'README.md',
        'AGENTS.md',
    ]);
    if (
        reserved.has(path) ||
        /^(?:apps|node_modules|\.cmz|\.git|\.nx|\.angular|dist|coverage|tmp)\//.test(
            path
        )
    )
        externalFailure('input collides with reserved workspace namespace');
    return path;
}

async function productInputClosure(root, designPath, design) {
    const paths = new Set([inputFilePath(designPath)]);
    const expectedHashes = new Map();
    for (const source of [
        ...(design.sources ?? []),
        ...(design.backend_contracts ?? []),
    ]) {
        paths.add(inputFilePath(source.snapshot_uri));
        expectedHashes.set(source.snapshot_uri, source.sha256);
    }
    for (const reference of design.backend_contracts ?? []) {
        const contract = JSON.parse(
            (await readProductFile(root, reference.snapshot_uri)).toString(
                'utf8'
            )
        );
        for (const source of contract.sources ?? []) {
            if (source.snapshot_uri) {
                paths.add(inputFilePath(source.snapshot_uri));
                expectedHashes.set(source.snapshot_uri, source.sha256);
            }
        }
    }
    const artifacts = [];
    for (const path of [...paths].sort()) {
        // Inputs stay at their declared relative paths; descriptions/ is a
        // convention, not a fallback or an additional business schema.
        const content = await readProductFile(root, path);
        if (
            expectedHashes.has(path) &&
            sha256(content) !== expectedHashes.get(path)
        )
            externalFailure(
                'product application-design rejected: workspace app input drift'
            );
        artifacts.push({
            path,
            sha256: sha256(content),
            bytes: content.length,
        });
    }
    return artifacts;
}

async function renderProductShell(options) {
    const {
        productRoot,
        toolsRoot,
        appName,
        designPath,
        experienceId,
        profile,
    } = options;
    if (!/^[a-z][a-z0-9-]*$/.test(appName ?? ''))
        externalFailure('invalid app name');
    if (!['angular-pwa', 'react-spa'].includes(profile))
        externalFailure('unsupported shell profile');
    inputFilePath(designPath);
    const designBytes = await readProductFile(productRoot, designPath);
    const design = JSON.parse(designBytes.toString('utf8'));
    const loadSchema = async (name) =>
        JSON.parse(
            (
                await readProductFile(
                    toolsRoot,
                    `tools/generator-platform/schemas/${name}.schema.json`
                )
            ).toString('utf8')
        );
    const errors = await validateApplicationDesignWithDependencies({
        design,
        workspaceRoot: productRoot,
        applicationDesignSchema:
            options.applicationDesignSchema ??
            (await loadSchema('application-design')),
        backendContractSchema:
            options.backendContractSchema ??
            (await loadSchema('backend-contract')),
    });
    if (errors.length) externalFailure('product application-design rejected');
    const inputs = await productInputClosure(productRoot, designPath, design);
    const render =
        profile === 'angular-pwa' ? renderAngularPwaShell : renderReactSpaShell;
    const rendered = await render({
        design,
        experienceId,
        appName,
        designPath,
        designSha256: sha256(designBytes),
        externalWorkspace: true,
    });
    return { ...rendered, inputs, designSha256: sha256(designBytes) };
}

export async function planExternalApplicationShell(options) {
    const workspace = await readOwnedWorkspace(options);
    const profile = options.profile ?? 'angular-pwa';
    if (!workspace.profiles.includes(profile))
        externalFailure('profile absent from workspace plan');
    const installation = await qualifyProductInstallation(workspace);
    const rendered = await renderProductShell({
        ...workspace,
        ...options,
        profile,
    });
    const treeSha = sha256(stableStringify(fileArtifacts(rendered.files)));
    const binding = {
        tools_root: workspace.toolsRoot,
        target_root: workspace.productRoot,
        workspace_plan_id: workspace.plan_id,
        provenance: workspace.provenance,
        workspace_manifest_sha256: sha256(workspace.files[MANIFEST]),
        lock_sha256: installation.lock_sha256,
        installed: installation.metadata,
        inputs: rendered.inputs,
        tree_sha256: treeSha,
        app_name: options.appName,
        experience_id: options.experienceId,
        design: options.designPath,
        profile,
    };
    const planId = sha256(stableStringify(binding));
    return {
        plan_id: planId,
        app_name: options.appName,
        profile,
        design: options.designPath,
        design_sha256: rendered.designSha256,
        experience_id: options.experienceId,
        output: `apps/${options.appName}`,
        outputAbsolute: resolve(workspace.productRoot, 'apps', options.appName),
        candidate: resolve(
            workspace.productRoot,
            'apps',
            `.${options.appName}.external-candidate-${planId}`
        ),
        root: workspace.productRoot,
        toolsRoot: workspace.toolsRoot,
        tree_sha256: treeSha,
        files: rendered.files,
        external_workspace: binding,
        compiler: profile === 'angular-pwa' ? 'ngc' : 'tsc',
        compiler_validation:
            profile === 'angular-pwa' ? 'angular-ngc' : 'typescript-tsc',
        workspace,
        installation,
    };
}

export async function runExternalApplicationCommand(command, args, root) {
    const confinement = nxConfinementEnvironment(root);
    const home = resolve(root, '.nx/home');
    const temporary = resolve(root, 'tmp');
    for (const path of [
        home,
        temporary,
        ...Object.values(confinement).filter((value) =>
            value.startsWith(root + '/')
        ),
    ]) {
        await assertPhysicalPath(path, { missing: true });
        await mkdir(path, { recursive: true });
        await assertPhysicalPath(path);
    }
    execFileSync(command, args, {
        cwd: root,
        timeout: 300_000,
        stdio: ['ignore', process.stderr, process.stderr],
        env: {
            CI: 'true',
            PATH: '',
            HOME: home,
            TMPDIR: temporary,
            TMP: temporary,
            TEMP: temporary,
            NX_NO_CLOUD: 'true',
            NX_CACHE_PROJECT_GRAPH: 'false',
            NX_TASKS_RUNNER_DYNAMIC_OUTPUT: 'false',
            ...confinement,
        },
    });
}

function installedBin(plan, packageName, command) {
    const pkg = plan.installation.installed[packageName];
    const bin = pkg?.bin[command];
    if (!bin) externalFailure('qualified native executable missing');
    return resolve(pkg.packageRoot, bin.path);
}

export async function publishExternalApplicationShell(
    options,
    dependencies = {}
) {
    if (!/^[a-f0-9]{64}$/.test(options.expectedPlanId ?? ''))
        externalFailure('external creation requires a reviewed plan');
    const initial = await planExternalApplicationShell(options);
    if (options.expectedPlanId !== initial.plan_id)
        externalFailure('reviewed shell plan is stale');
    const run = dependencies.run ?? runExternalApplicationCommand;
    const phase = dependencies.phase ?? (() => undefined);
    return withGenerationLock(initial.outputAbsolute, async () => {
        const plan = await planExternalApplicationShell(options);
        if (plan.plan_id !== initial.plan_id)
            externalFailure('shell changed under lock');
        const recheck = async () => {
            const current = await planExternalApplicationShell(options);
            if (current.plan_id !== plan.plan_id)
                externalFailure('shell inputs changed during publication');
        };
        const hadOutput = await pathExists(plan.outputAbsolute);
        const hadCandidate = await pathExists(plan.candidate);
        if (hadOutput)
            await verifyGeneratedTree(plan.outputAbsolute, plan.files);
        else await stageGeneratedTree(plan.candidate, plan.files);
        const compilerPackage =
            plan.profile === 'angular-pwa'
                ? '@angular/compiler-cli'
                : 'typescript';
        const compilationRoot = hadOutput
            ? plan.outputAbsolute
            : plan.candidate;
        await phase('candidate-staged', plan);
        await recheck();
        await run(
            process.execPath,
            [
                installedBin(plan, compilerPackage, plan.compiler),
                '-p',
                resolve(compilationRoot, 'tsconfig.app.json'),
                '--noEmit',
            ],
            plan.root
        );
        await verifyGeneratedTree(compilationRoot, plan.files);
        await phase('compiled', plan);
        await recheck();
        let published = hadOutput;
        try {
            if (!hadOutput) {
                await commitDirectoryTransaction({
                    outputRoot: plan.outputAbsolute,
                    candidateRoot: plan.candidate,
                    expectedState: 'absent',
                });
                published = true;
            }
            await phase('published', plan);
            for (const target of ['build:production', 'lint', 'test']) {
                await run(
                    process.execPath,
                    [
                        installedBin(plan, 'nx', 'nx'),
                        'run',
                        `${plan.app_name}:${target}`,
                        '--skipNxCache',
                        '--outputStyle=stream',
                    ],
                    plan.root
                );
                await verifyGeneratedTree(plan.outputAbsolute, plan.files);
                await phase(target, plan);
                await recheck();
            }
            await run(
                process.execPath,
                [resolve(plan.root, '.cmz/support/check-workspace.mjs')],
                plan.root
            );
            await assertSourceWeight(plan.root);
            await recheck();
            await verifyGeneratedTree(plan.outputAbsolute, plan.files);
            await phase('verified', plan);
            await recheck();
            await verifyGeneratedTree(plan.outputAbsolute, plan.files);
            return { plan, recovered: hadOutput || hadCandidate };
        } catch (error) {
            if (
                published &&
                !hadOutput &&
                !(await pathExists(plan.candidate))
            ) {
                // A changed/foreign tree is never moved for recovery. Leave
                // evidence in place and fail; exact owned output may roll back.
                try {
                    await verifyGeneratedTree(plan.outputAbsolute, plan.files);
                    await commitDirectoryTransaction({
                        outputRoot: plan.candidate,
                        candidateRoot: plan.outputAbsolute,
                        expectedState: 'absent',
                    });
                } catch (rollbackError) {
                    throw new AggregateError(
                        [error, rollbackError],
                        'external application: rollback refused; inspect the owned tree locally',
                        { cause: rollbackError }
                    );
                }
            }
            throw error;
        }
    });
}

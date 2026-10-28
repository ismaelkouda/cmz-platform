import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
    cp,
    mkdtemp,
    mkdir,
    readdir,
    readFile,
    rm,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';

import { applyQualifiedAdapter } from '../library-setup/qualified-adapters.mjs';
import { resolvePageExecutionBinding } from './core/page-execution-binding.mjs';
import {
    loadApplicationDesignDependencies,
    validateApplicationDesign,
} from './core/application-design.mjs';
import { planApplicationDesignPublication } from './core/application-design-publication.mjs';
import { planApplicationShell } from './core/application-shell-publication.mjs';
import { canonicalizeGeneratedFiles } from './core/canonicalize-generated.mjs';
import { compilePageExecutionPlan } from './core/page-execution-plan.mjs';
import {
    planPageRealization,
    publicPageRealizationPlan,
} from './core/page-realization.mjs';
import {
    generateAngularPageComposition,
    generatePageComposition,
} from './generate-page-composition.mjs';
import {
    compileUsersManagementProofExecution,
    usersManagementProof,
} from './test-support/users-management-proof.mjs';
import { baselineRenderer } from './test-support/external-application-fixture.mjs';
import { nx24ShellDelta } from './test-support/nx24-shell-delta.mjs';
import { repositoryRoot, validateJsonSchema } from './validate-ir.mjs';

const applicationDesignSchema = JSON.parse(
    await readFile(
        new URL('./schemas/application-design.schema.json', import.meta.url),
        'utf8'
    )
);
const pageExecutionPlanSchema = JSON.parse(
    await readFile(
        new URL('./schemas/page-execution-plan.schema.json', import.meta.url),
        'utf8'
    )
);
const backendContractSchema = JSON.parse(
    await readFile(
        new URL('./schemas/backend-contract.schema.json', import.meta.url),
        'utf8'
    )
);
const pageRealizationEvidenceSchema = JSON.parse(
    await readFile(
        new URL(
            './schemas/page-realization-evidence.schema.json',
            import.meta.url
        ),
        'utf8'
    )
);

async function readRealizationEvidence(shellPlan, profile) {
    const evidencePath = resolve(
        shellPlan.outputAbsolute,
        'src/app/pages',
        usersManagementProof.pageId,
        'realization-evidence.json'
    );
    let evidence = null;
    try {
        evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
    if (!evidence) return null;

    assert.deepEqual(
        validateJsonSchema(evidence, pageRealizationEvidenceSchema),
        [],
        `the realized ${profile} page must carry schema-valid evidence`
    );
    assert.equal(evidence.page_id, usersManagementProof.pageId);
    const contract = await readFile(
        resolve(repositoryRoot, usersManagementProof.pageContractUri)
    );
    assert.equal(
        evidence.page_contract_sha256,
        createHash('sha256').update(contract).digest('hex'),
        `the ${profile} realization evidence must bind the current page contract`
    );
    return evidence;
}

// Existing apps retain their creation manifest: Nx migrates configuration,
// not publication provenance. Verify the complete current renderer against the
// native-qualified migration delta before restoring that historical receipt in
// the expected existing-app tree. Freshly generated manifests remain tested by
// application-shell.test.mjs and T16.
async function migratedPublishedFiles(shellPlan) {
    const profile = shellPlan.profile;
    const renderer = await baselineRenderer(profile);
    const render =
        profile === 'angular-pwa'
            ? renderer.renderAngularPwaShell
            : renderer.renderReactSpaShell;
    const bytes = await readFile(resolve(repositoryRoot, shellPlan.design));
    const historical = await render({
        design: JSON.parse(bytes),
        designSha256: createHash('sha256').update(bytes).digest('hex'),
        designPath: shellPlan.design,
        experienceId: shellPlan.experience_id,
        appName: shellPlan.app_name,
    });
    assert.deepEqual(
        shellPlan.files,
        await nx24ShellDelta(profile, historical.files),
        'the current shell must equal only the native-qualified Nx24 delta'
    );
    return {
        ...shellPlan.files,
        '.cmz/app-manifest.json': historical.files['.cmz/app-manifest.json'],
    };
}

async function qualifiedShellFiles(
    shellPlan,
    { appName, platform, library, compatibilityPath }
) {
    const workspace = await mkdtemp(join(tmpdir(), `cmz-${platform}-shell-`));
    try {
        await mkdir(join(workspace, 'tools/library-setup'), {
            recursive: true,
        });
        await Promise.all([
            cp(
                resolve(repositoryRoot, 'conventions'),
                join(workspace, 'conventions'),
                { recursive: true }
            ),
            cp(
                resolve(
                    repositoryRoot,
                    'tools/library-setup/qualified-adapters.mjs'
                ),
                join(workspace, 'tools/library-setup/qualified-adapters.mjs')
            ),
            cp(
                resolve(repositoryRoot, 'tools/scaffold-tailwind-core.mjs'),
                join(workspace, 'tools/scaffold-tailwind-core.mjs')
            ),
        ]);
        for (const [path, content] of Object.entries(
            await migratedPublishedFiles(shellPlan)
        )) {
            const target = join(workspace, 'apps', appName, path);
            await mkdir(dirname(target), { recursive: true });
            await writeFile(target, content);
        }
        const matrix = JSON.parse(
            await readFile(resolve(repositoryRoot, compatibilityPath), 'utf8')
        );
        const tracks = matrix.tracks.filter(
            ({ status }) => status === 'verified'
        );
        assert.equal(
            tracks.length,
            1,
            `one verified ${platform}/${library} track`
        );
        applyQualifiedAdapter({
            workspace,
            app: appName,
            platform,
            library,
            track: tracks[0],
        });

        const appRoot = join(workspace, 'apps', appName);
        const paths = (
            await readdir(appRoot, { recursive: true, withFileTypes: true })
        )
            .filter((entry) => entry.isFile())
            .map((entry) =>
                relative(appRoot, join(entry.parentPath, entry.name))
            )
            .sort();
        const candidateFiles = Object.fromEntries(
            await Promise.all(
                paths.map(async (path) => [
                    `apps/${appName}/${path}`,
                    await readFile(
                        join(workspace, 'apps', appName, path),
                        'utf8'
                    ),
                ])
            )
        );
        const canonicalFiles = await canonicalizeGeneratedFiles(candidateFiles);
        return Object.fromEntries(
            paths.map((path) => [
                path,
                Buffer.from(canonicalFiles[`apps/${appName}/${path}`]),
            ])
        );
    } finally {
        await rm(workspace, { recursive: true, force: true });
    }
}

function qualifiedAngularShellFiles(shellPlan) {
    return qualifiedShellFiles(shellPlan, {
        appName: usersManagementProof.appName,
        platform: 'angular',
        library: 'angular-material',
        compatibilityPath:
            'conventions/libraries/angular/angular-material.compat.json',
    });
}

function qualifiedReactShellFiles(shellPlan) {
    return qualifiedShellFiles(shellPlan, {
        appName: 'users-management-react-proof',
        platform: 'react',
        library: 'tailwind',
        compatibilityPath: 'conventions/libraries/react/tailwind.compat.json',
    });
}

test('publie le shell C5 canonique sans confondre placeholder et réalisation bornée', async () => {
    const designPlan = await planApplicationDesignPublication({
        workspaceRoot: repositoryRoot,
        sourcePath:
            'examples/users-management-proof/application-design.source.json',
        outputPath: 'designs/users-management-proof.application-design.json',
        applicationDesignSchema,
        backendContractSchema,
    });
    assert.deepEqual(
        await readFile(resolve(repositoryRoot, designPlan.output)),
        designPlan.content
    );

    const shellPlan = await planApplicationShell({
        workspaceRoot: repositoryRoot,
        designPath: designPlan.output,
        experienceId: 'operator-web',
        appName: usersManagementProof.appName,
        profile: 'angular-pwa',
        applicationDesignSchema,
        backendContractSchema,
    });
    const realizedComponent = `src/app/pages/${usersManagementProof.pageId}/page.component.ts`;
    const realizationEvidence = await readRealizationEvidence(
        shellPlan,
        'Angular'
    );
    const expected = await qualifiedAngularShellFiles(shellPlan);

    for (const [path, content] of Object.entries(expected)) {
        const actual = await readFile(resolve(shellPlan.outputAbsolute, path));
        if (path === realizedComponent && realizationEvidence) {
            assert.notDeepEqual(
                actual,
                content,
                `${path} must no longer equal the pre-realization placeholder`
            );
            continue;
        }
        assert.deepEqual(
            actual,
            content,
            `${path} must equal the deterministic Angular shell plus its qualified Material overlay`
        );
    }
});

test('publie le shell React C5 canonique depuis la même conception approuvée', async () => {
    const shellPlan = await planApplicationShell({
        workspaceRoot: repositoryRoot,
        designPath: 'designs/users-management-proof.application-design.json',
        experienceId: 'operator-web',
        appName: 'users-management-react-proof',
        profile: 'react-spa',
        applicationDesignSchema,
        backendContractSchema,
    });

    assert.equal(shellPlan.profile, 'react-spa');
    assert.equal(shellPlan.compiler_validation, 'typescript-tsc');
    const expected = await qualifiedReactShellFiles(shellPlan);
    const realizedPage = `src/app/pages/${usersManagementProof.pageId}/page.tsx`;
    const realizationEvidence = await readRealizationEvidence(
        shellPlan,
        'React'
    );

    for (const [path, content] of Object.entries(expected)) {
        const actual = await readFile(resolve(shellPlan.outputAbsolute, path));
        if (path === realizedPage && realizationEvidence) {
            assert.notDeepEqual(
                actual,
                content,
                `${path} must no longer equal the pre-realization placeholder`
            );
            continue;
        }
        if (path === '.cmz/app-manifest.json') {
            assert.deepEqual(
                JSON.parse(actual.toString('utf8')),
                JSON.parse(content.toString('utf8')),
                `${path} metadata must equal the deterministic React shell manifest`
            );
        }
        assert.deepEqual(
            actual,
            content,
            `${path} must equal the deterministic React shell plus its qualified Tailwind overlay`
        );
    }
});

test('publie la composition React C5 dans le shell et borne son adaptateur host', async () => {
    const generated = await generatePageComposition({
        planPath: resolve(repositoryRoot, usersManagementProof.planUri),
        outputRoot: resolve(
            repositoryRoot,
            usersManagementProof.reactCompositionRoot
        ),
        target: 'reactjs',
        dryRun: true,
    });
    assert.deepEqual(generated.changeSet.summary, {
        create: 0,
        replace: 0,
        preserve: 0,
        delete: 0,
        unchanged: 23,
    });

    const host = await readFile(
        resolve(
            repositoryRoot,
            'apps/users-management-react-proof/src/app/pages/page_6666666666666666/page-host.ts'
        ),
        'utf8'
    );
    assert.match(host, /createPageCompositionHooks/);
    assert.match(host, /settings-api/);
    assert.match(host, /UsersManagementPageHostRequest/);
    assert.doesNotMatch(host, /api-services\.mazone|Authorization|Bearer /);
    assert.doesNotMatch(host, /@angular\//);

    const realization = publicPageRealizationPlan(
        planPageRealization({
            workspaceRoot: repositoryRoot,
            appName: 'users-management-react-proof',
            pageId: usersManagementProof.pageId,
            pageExecutionPlanPath: `${usersManagementProof.reactCompositionRoot}/page-execution-plan.json`,
            pageExecutionPlanSchema,
            applicationDesignSchema,
        })
    );
    assert.equal(realization.presentation_evidence, null);
    assert.deepEqual(realization.page_execution.contract_binding, {
        mode: 'published-replica',
        source_path: usersManagementProof.pageContractUri,
        target_path:
            'apps/users-management-react-proof/.cmz/pages/page_6666666666666666.json',
        source_app: usersManagementProof.appName,
        target_app: 'users-management-react-proof',
        design_ref: {
            path: 'designs/users-management-proof.application-design.json',
            sha256: 'bcbd75141911d69fb31403a57b22e068cc461862c1b74a7dde117062982cc8af',
        },
        experience_id: 'operator-web',
    });
    assert.deepEqual(realization.target, {
        profile: 'react-spa',
        archetype_stack: 'reactjs',
    });
    assert.deepEqual(realization.allowed_files, [
        'page.module.scss',
        'page.spec.tsx',
        'page.tsx',
        'realization-evidence.json',
    ]);
});

test('publie les trois primitives C5 et leur plan depuis le vrai contrat de page', async () => {
    const compiled = await compileUsersManagementProofExecution();
    for (const artifact of [...compiled.primitives, compiled.planArtifact]) {
        assert.deepEqual(
            await readFile(resolve(repositoryRoot, artifact.uri)),
            artifact.document,
            `${artifact.uri} must equal its deterministic compilation`
        );
    }

    const binding = resolvePageExecutionBinding({
        workspaceRoot: repositoryRoot,
        pageExecutionPlanPath: usersManagementProof.planUri,
        pageExecutionPlanSchema,
        applicationDesignSchema,
        pageContract: JSON.parse(
            compiled.pageContract.document.toString('utf8')
        ),
        pageContractPath: compiled.pageContract.uri,
        pageContractContent: compiled.pageContract.document,
    });
    assert.equal(binding.path, usersManagementProof.planUri);
    assert.equal(binding.plan.plan_id, compiled.plan.plan_id);
    assert.deepEqual(
        binding.plan.query_nodes.map(({ id }) => id),
        ['profiles-select', 'users-list']
    );
    assert.deepEqual(
        binding.plan.command_nodes.map(
            ({ id, authorization, invalidates }) => ({
                id,
                authorization,
                invalidates,
            })
        ),
        [
            {
                id: 'create-user',
                authorization: {
                    mode: 'required',
                    permissions: ['users.create'],
                    denied_behavior: 'disable',
                },
                invalidates: ['users-list'],
            },
        ]
    );
});

test('exige une projection explicite et exacte pour la collection paginée', async () => {
    const design = JSON.parse(
        await readFile(
            resolve(
                repositoryRoot,
                'designs/users-management-proof.application-design.json'
            ),
            'utf8'
        )
    );
    const dependencies = await loadApplicationDesignDependencies(
        design,
        repositoryRoot,
        backendContractSchema
    );
    assert.deepEqual(dependencies.errors, []);
    assert.deepEqual(
        validateApplicationDesign(
            design,
            applicationDesignSchema,
            dependencies.contracts
        ),
        []
    );

    const invalidDesign = structuredClone(design);
    invalidDesign.pages[0].data_bindings[0].source_path = ['items'];
    assert.ok(
        validateApplicationDesign(
            invalidDesign,
            applicationDesignSchema,
            dependencies.contracts
        ).some((error) => error.includes('unresolved field items'))
    );

    const missingProjection = structuredClone(design);
    delete missingProjection.pages[0].data_bindings[0].source_path;
    assert.ok(
        validateApplicationDesign(
            missingProjection,
            applicationDesignSchema,
            dependencies.contracts
        ).some((error) => error.includes('does not match response body model'))
    );

    const compiled = await compileUsersManagementProofExecution();
    const invalidContract = JSON.parse(
        compiled.pageContract.document.toString('utf8')
    );
    invalidContract.page.data_bindings[0].source_path = ['items'];
    const document = Buffer.from(
        `${JSON.stringify(invalidContract, null, 2)}\n`
    );
    assert.throws(
        () =>
            compilePageExecutionPlan({
                pageContract: {
                    uri: compiled.pageContract.uri,
                    sha256: createHash('sha256').update(document).digest('hex'),
                    document,
                },
                listQueryModels: compiled.primitives.slice(0, 2),
                actionRequestModels: compiled.primitives.slice(2),
                applicationDesignSchema,
                pageExecutionPlanSchema,
            }),
        /users source path differs from its query primitive/
    );
});

test('publie une composition Angular stable et prépare un work order raccordé', async () => {
    const generated = await generateAngularPageComposition({
        planPath: resolve(repositoryRoot, usersManagementProof.planUri),
        hostBindingsPath: resolve(
            repositoryRoot,
            usersManagementProof.hostBindingsUri
        ),
        outputRoot: resolve(
            repositoryRoot,
            usersManagementProof.compositionRoot
        ),
        dryRun: true,
    });
    assert.deepEqual(generated.changeSet.summary, {
        create: 0,
        replace: 0,
        preserve: 0,
        delete: 0,
        unchanged: 22,
    });

    const realization = publicPageRealizationPlan(
        planPageRealization({
            workspaceRoot: repositoryRoot,
            appName: usersManagementProof.appName,
            pageId: usersManagementProof.pageId,
            pageExecutionPlanPath: usersManagementProof.planUri,
            pageExecutionPlanSchema,
            applicationDesignSchema,
        })
    );
    assert.equal(realization.page_execution.path, usersManagementProof.planUri);
    assert.equal(realization.page_execution.plan.plan_id, generated.planId);
    // Aucune preuve de page n'est publiée pour C5 : la disposition est guidée
    // par la liaison de mise en page d'un work order v5 (ADR-0098, ADR-0099).
    assert.equal(realization.presentation_evidence, null);
});

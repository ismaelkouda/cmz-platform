import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { resolvePageExecutionBinding } from './core/page-execution-binding.mjs';
import {
    loadApplicationDesignDependencies,
    validateApplicationDesign,
} from './core/application-design.mjs';
import { planApplicationDesignPublication } from './core/application-design-publication.mjs';
import { planApplicationShell } from './core/application-shell-publication.mjs';
import { compilePageExecutionPlan } from './core/page-execution-plan.mjs';
import {
    planPageRealization,
    publicPageRealizationPlan,
} from './core/page-realization.mjs';
import { generateAngularPageComposition } from './generate-page-composition.mjs';
import {
    compileUsersManagementProofExecution,
    usersManagementProof,
} from './test-support/users-management-proof.mjs';
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
const presentationEvidenceSchema = JSON.parse(
    await readFile(
        new URL('./schemas/presentation-evidence.schema.json', import.meta.url),
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
    const evidencePath = resolve(
        shellPlan.outputAbsolute,
        'src/app/pages',
        usersManagementProof.pageId,
        'realization-evidence.json'
    );
    let realizationEvidence = null;
    try {
        realizationEvidence = JSON.parse(await readFile(evidencePath, 'utf8'));
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }

    if (realizationEvidence) {
        assert.deepEqual(
            validateJsonSchema(
                realizationEvidence,
                pageRealizationEvidenceSchema
            ),
            [],
            'the realized page must carry schema-valid evidence'
        );
        assert.equal(realizationEvidence.page_id, usersManagementProof.pageId);
        const contract = await readFile(
            resolve(repositoryRoot, usersManagementProof.pageContractUri)
        );
        assert.equal(
            realizationEvidence.page_contract_sha256,
            createHash('sha256').update(contract).digest('hex'),
            'the realization evidence must bind the current page contract'
        );
    }

    for (const [path, content] of Object.entries(shellPlan.files)) {
        const actual = await readFile(resolve(shellPlan.outputAbsolute, path));
        if (path === realizedComponent && realizationEvidence) {
            assert.notDeepEqual(
                actual,
                Buffer.from(content),
                `${path} must no longer equal the pre-realization placeholder`
            );
            continue;
        }
        assert.deepEqual(
            actual,
            Buffer.from(content),
            `${path} must equal the deterministic shell publication`
        );
    }
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
            presentationEvidencePath:
                usersManagementProof.presentationEvidenceUri,
            presentationEvidenceSchema,
        })
    );
    assert.equal(realization.page_execution.path, usersManagementProof.planUri);
    assert.equal(realization.page_execution.plan.plan_id, generated.planId);
    assert.equal(
        realization.presentation_evidence.presentation_id,
        'presentation_5627f087550dd218'
    );
    assert.equal(
        realization.presentation_evidence.manifest.path,
        usersManagementProof.presentationEvidenceUri
    );
    assert.equal(
        realization.presentation_evidence.authority,
        'presentation-only'
    );
    assert.deepEqual(
        realization.presentation_evidence.sources.map(
            ({ id, purpose, state_ids, viewport }) => ({
                id,
                purpose,
                state_ids,
                viewport,
            })
        ),
        [
            {
                id: 'compact-ready-adaptive',
                purpose: 'primary-layout',
                state_ids: ['ready'],
                viewport: { width: 390, height: 844, pixel_ratio: 1 },
            },
            {
                id: 'mobile-create-error',
                purpose: 'state-reference',
                state_ids: ['create-failed'],
                viewport: { width: 390, height: 844, pixel_ratio: 1 },
            },
            {
                id: 'adaptive-placement-audit',
                purpose: 'responsive-layout',
                state_ids: [],
                viewport: null,
            },
            {
                id: 'adaptive-filter-brief',
                purpose: 'responsive-layout',
                state_ids: [],
                viewport: null,
            },
            {
                id: 'compact-filter-summary',
                purpose: 'responsive-layout',
                state_ids: ['ready'],
                viewport: { width: 390, height: 844, pixel_ratio: 1 },
            },
            {
                id: 'compact-filter-detail',
                purpose: 'responsive-layout',
                state_ids: ['ready'],
                viewport: { width: 390, height: 844, pixel_ratio: 1 },
            },
            {
                id: 'medium-filters-adaptive',
                purpose: 'responsive-layout',
                state_ids: ['ready'],
                viewport: { width: 1024, height: 768, pixel_ratio: 1 },
            },
            {
                id: 'expanded-filters-adaptive',
                purpose: 'responsive-layout',
                state_ids: ['ready'],
                viewport: { width: 1440, height: 1024, pixel_ratio: 1 },
            },
        ]
    );
    assert.deepEqual(
        realization.presentation_evidence.sources.find(
            ({ id }) => id === 'adaptive-placement-audit'
        ),
        {
            id: 'adaptive-placement-audit',
            source_kind: 'design-brief',
            purpose: 'responsive-layout',
            path: 'docs/architecture/c5-adapt2-audit-placement-multifenetre-2026-09-28.md',
            media_type: 'text/markdown',
            bytes: 24005,
            sha256: '2fb5823ce595b5c664c55dcd0923904b18c6664b2018ac059cde4be66770a418',
            trust: 'untrusted-content',
            state_ids: [],
            viewport: null,
        }
    );
    assert.deepEqual(
        realization.presentation_evidence.sources.find(
            ({ id }) => id === 'adaptive-filter-brief'
        ),
        {
            id: 'adaptive-filter-brief',
            source_kind: 'design-brief',
            purpose: 'responsive-layout',
            path: 'examples/users-management-proof/presentation/filter-candidates/proposal.md',
            media_type: 'text/markdown',
            bytes: 10636,
            sha256: '17b88e858ade6dd24f7c2714fba2949c6ed1d54d74e8550767ecac8149c9d7c4',
            trust: 'untrusted-content',
            state_ids: [],
            viewport: null,
        }
    );
    assert.deepEqual(
        realization.presentation_evidence.sources
            .filter(({ id }) => id.includes('filter'))
            .map(
                ({
                    id,
                    source_kind,
                    purpose,
                    path,
                    media_type,
                    bytes,
                    sha256,
                    trust,
                    state_ids,
                    viewport,
                }) => ({
                    id,
                    source_kind,
                    purpose,
                    path,
                    media_type,
                    bytes,
                    sha256,
                    trust,
                    state_ids,
                    viewport,
                })
            ),
        [
            {
                id: 'adaptive-filter-brief',
                source_kind: 'design-brief',
                purpose: 'responsive-layout',
                path: 'examples/users-management-proof/presentation/filter-candidates/proposal.md',
                media_type: 'text/markdown',
                bytes: 10636,
                sha256: '17b88e858ade6dd24f7c2714fba2949c6ed1d54d74e8550767ecac8149c9d7c4',
                trust: 'untrusted-content',
                state_ids: [],
                viewport: null,
            },
            {
                id: 'compact-filter-summary',
                source_kind: 'wireframe',
                purpose: 'responsive-layout',
                path: 'examples/users-management-proof/presentation/filter-candidates/compact-filter-list.proposed.png',
                media_type: 'image/png',
                bytes: 34192,
                sha256: '6dc0b706dd0fcf2526d489a0ce63533a60de4ad1f70ea946d01c27a990753e44',
                trust: 'untrusted-content',
                state_ids: ['ready'],
                viewport: { width: 390, height: 844, pixel_ratio: 1 },
            },
            {
                id: 'compact-filter-detail',
                source_kind: 'wireframe',
                purpose: 'responsive-layout',
                path: 'examples/users-management-proof/presentation/filter-candidates/compact-filter-detail.proposed.png',
                media_type: 'image/png',
                bytes: 32034,
                sha256: '7d8bf42fa6c0a828e77c9b60f7da5cc6d33140dbffb7d7b9ffa8a22340049719',
                trust: 'untrusted-content',
                state_ids: ['ready'],
                viewport: { width: 390, height: 844, pixel_ratio: 1 },
            },
            {
                id: 'medium-filters-adaptive',
                source_kind: 'wireframe',
                purpose: 'responsive-layout',
                path: 'examples/users-management-proof/presentation/filter-candidates/medium-filters.proposed.png',
                media_type: 'image/png',
                bytes: 61384,
                sha256: '222a9fdf6b0117af68362e854dc21f86b7b53d294dd97d9e4482e9de130ed8e0',
                trust: 'untrusted-content',
                state_ids: ['ready'],
                viewport: { width: 1024, height: 768, pixel_ratio: 1 },
            },
            {
                id: 'expanded-filters-adaptive',
                source_kind: 'wireframe',
                purpose: 'responsive-layout',
                path: 'examples/users-management-proof/presentation/filter-candidates/expanded-filters.proposed.png',
                media_type: 'image/png',
                bytes: 88132,
                sha256: '6154ffcd008ad3ccdd4d1c52388fcc612b93a9940d51f0e6fe3f5ee5c8180c3c',
                trust: 'untrusted-content',
                state_ids: ['ready'],
                viewport: { width: 1440, height: 1024, pixel_ratio: 1 },
            },
        ]
    );
    assert.equal(
        realization.presentation_evidence.sources.some(({ id }) =>
            [
                'desktop-ready',
                'desktop-create-error',
                'mobile-ready',
                'medium-create-adaptive',
                'expanded-create-adaptive',
            ].includes(id)
        ),
        false,
        'les références remplacées ne doivent plus guider la réalisation'
    );
});

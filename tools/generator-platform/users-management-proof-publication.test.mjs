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
                id: 'adaptive-placement-audit',
                purpose: 'responsive-layout',
                state_ids: [],
                viewport: null,
            },
            {
                id: 'progressive-filter-brief',
                purpose: 'responsive-layout',
                state_ids: [],
                viewport: null,
            },
            {
                id: 'medium-progressive-filter-empty',
                purpose: 'responsive-layout',
                state_ids: ['ready'],
                viewport: { width: 1024, height: 768, pixel_ratio: 1 },
            },
            {
                id: 'medium-progressive-filter-one',
                purpose: 'responsive-layout',
                state_ids: ['ready'],
                viewport: { width: 1024, height: 768, pixel_ratio: 1 },
            },
            {
                id: 'medium-progressive-filter-multiple',
                purpose: 'responsive-layout',
                state_ids: ['ready'],
                viewport: { width: 1024, height: 768, pixel_ratio: 1 },
            },
            {
                id: 'expanded-progressive-filter-empty',
                purpose: 'primary-layout',
                state_ids: ['ready'],
                viewport: { width: 1440, height: 1024, pixel_ratio: 1 },
            },
            {
                id: 'expanded-progressive-filter-one',
                purpose: 'responsive-layout',
                state_ids: ['ready'],
                viewport: { width: 1440, height: 1024, pixel_ratio: 1 },
            },
            {
                id: 'expanded-progressive-filter-multiple',
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
            ({ id }) => id === 'progressive-filter-brief'
        ),
        {
            id: 'progressive-filter-brief',
            source_kind: 'design-brief',
            purpose: 'responsive-layout',
            path: 'examples/users-management-proof/presentation/progressive-filter-candidates/proposal.md',
            media_type: 'text/markdown',
            bytes: 7820,
            sha256: 'b78274c2d5cc0ada90f05c78b81be6fcdc67ef06b07151e30ec0dc0169fdb969',
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
                id: 'progressive-filter-brief',
                source_kind: 'design-brief',
                purpose: 'responsive-layout',
                path: 'examples/users-management-proof/presentation/progressive-filter-candidates/proposal.md',
                media_type: 'text/markdown',
                bytes: 7820,
                sha256: 'b78274c2d5cc0ada90f05c78b81be6fcdc67ef06b07151e30ec0dc0169fdb969',
                trust: 'untrusted-content',
                state_ids: [],
                viewport: null,
            },
            {
                id: 'medium-progressive-filter-empty',
                source_kind: 'wireframe',
                purpose: 'responsive-layout',
                path: 'examples/users-management-proof/presentation/progressive-filter-candidates/medium-empty.proposed.png',
                media_type: 'image/png',
                bytes: 51217,
                sha256: 'a6e2b73b149b06c7090c0d03b2fc02f89aaf0960ec3af13fd924ae746e9e0a01',
                trust: 'untrusted-content',
                state_ids: ['ready'],
                viewport: { width: 1024, height: 768, pixel_ratio: 1 },
            },
            {
                id: 'medium-progressive-filter-one',
                source_kind: 'wireframe',
                purpose: 'responsive-layout',
                path: 'examples/users-management-proof/presentation/progressive-filter-candidates/medium-one-filter.proposed.png',
                media_type: 'image/png',
                bytes: 59877,
                sha256: 'efc918c2341aafa00d289afc8ec98eacea01b30eb41ef5b492db14eb629d7cbd',
                trust: 'untrusted-content',
                state_ids: ['ready'],
                viewport: { width: 1024, height: 768, pixel_ratio: 1 },
            },
            {
                id: 'medium-progressive-filter-multiple',
                source_kind: 'wireframe',
                purpose: 'responsive-layout',
                path: 'examples/users-management-proof/presentation/progressive-filter-candidates/medium-multiple-filters.proposed.png',
                media_type: 'image/png',
                bytes: 59512,
                sha256: '24f4e8829ec742cbf61862cf050a9d96c20b057ba30a39d09116f18ca804dd8c',
                trust: 'untrusted-content',
                state_ids: ['ready'],
                viewport: { width: 1024, height: 768, pixel_ratio: 1 },
            },
            {
                id: 'expanded-progressive-filter-empty',
                source_kind: 'wireframe',
                purpose: 'primary-layout',
                path: 'examples/users-management-proof/presentation/progressive-filter-candidates/expanded-empty.proposed.png',
                media_type: 'image/png',
                bytes: 68000,
                sha256: '16a60e4b488dcf8a91eea59bda7606c07c4f4986d99bcd89c69bd10ceee86fd3',
                trust: 'untrusted-content',
                state_ids: ['ready'],
                viewport: { width: 1440, height: 1024, pixel_ratio: 1 },
            },
            {
                id: 'expanded-progressive-filter-one',
                source_kind: 'wireframe',
                purpose: 'responsive-layout',
                path: 'examples/users-management-proof/presentation/progressive-filter-candidates/expanded-one-filter.proposed.png',
                media_type: 'image/png',
                bytes: 71582,
                sha256: 'a3dadbb9196022d680fb2649ee126a2030f99730e2ace7a7516dd730114725e8',
                trust: 'untrusted-content',
                state_ids: ['ready'],
                viewport: { width: 1440, height: 1024, pixel_ratio: 1 },
            },
            {
                id: 'expanded-progressive-filter-multiple',
                source_kind: 'wireframe',
                purpose: 'responsive-layout',
                path: 'examples/users-management-proof/presentation/progressive-filter-candidates/expanded-multiple-filters.proposed.png',
                media_type: 'image/png',
                bytes: 71484,
                sha256: '36143bf636ac40dcf2c03a6d4d55bfe3418d5c869f8a712c118c3003bc6be5a5',
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
                'mobile-create-error',
                'compact-ready-adaptive',
                'medium-create-adaptive',
                'expanded-create-adaptive',
                'compact-filter-summary',
                'compact-filter-detail',
                'adaptive-filter-brief',
                'medium-filters-adaptive',
                'expanded-filters-adaptive',
            ].includes(id)
        ),
        false,
        'les références remplacées ne doivent plus guider la réalisation'
    );
    const rejectedPresentationRoots = [
        'examples/users-management-proof/presentation/adaptive-candidates/',
        'examples/users-management-proof/presentation/filter-candidates/',
    ];
    const rejectedPresentationFiles = new Set([
        'examples/users-management-proof/presentation/desktop-create-error.proposed.png',
        'examples/users-management-proof/presentation/desktop-ready.proposed.png',
        'examples/users-management-proof/presentation/mobile-create-error.proposed.png',
        'examples/users-management-proof/presentation/mobile-ready.proposed.png',
    ]);
    assert.equal(
        realization.presentation_evidence.sources.some(
            ({ path }) =>
                rejectedPresentationRoots.some((root) =>
                    path.startsWith(root)
                ) || rejectedPresentationFiles.has(path)
        ),
        false,
        'les dossiers et fichiers explicitement rejetés ne doivent pas revenir sous un autre identifiant'
    );
});

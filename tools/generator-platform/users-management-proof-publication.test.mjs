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
import { repositoryRoot } from './validate-ir.mjs';

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

test('publie la conception et le shell C5 depuis leurs sources canoniques', async () => {
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
    for (const [path, content] of Object.entries(shellPlan.files)) {
        assert.deepEqual(
            await readFile(resolve(shellPlan.outputAbsolute, path)),
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
            presentationEvidenceSchema,
        })
    );
    assert.equal(realization.page_execution.path, usersManagementProof.planUri);
    assert.equal(realization.page_execution.plan.plan_id, generated.planId);
    assert.equal(realization.presentation_evidence, null);
});

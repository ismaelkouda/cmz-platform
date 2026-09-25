import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { compileActionRequestV2ExecutionModel } from '../core/action-request-v2-compiler.mjs';
import { compileListQueryV2ExecutionModel } from '../core/list-query-v2-compiler.mjs';
import { compilePageExecutionPlan } from '../core/page-execution-plan.mjs';
import { repositoryRoot } from '../validate-ir.mjs';

export const usersManagementProof = Object.freeze({
    appName: 'users-management-proof',
    pageId: 'page_6666666666666666',
    pageContractUri:
        'apps/users-management-proof/.cmz/pages/page_6666666666666666.json',
    planUri:
        'examples/users-management-proof/execution/page-execution-plan.json',
    compositionRoot:
        'apps/users-management-proof/src/app/generated/page_6666666666666666',
    hostBindingsUri:
        'tools/generator-platform/fixtures/angular-page-host-bindings.json',
});

const primitiveInputs = Object.freeze([
    {
        kind: 'query',
        definitionUri:
            'tools/generator-platform/fixtures/users-list.v2.definition.json',
        outputUri:
            'examples/users-management-proof/execution/users-list.execution-model.json',
    },
    {
        kind: 'query',
        definitionUri:
            'tools/generator-platform/fixtures/profiles-select.v2.definition.json',
        outputUri:
            'examples/users-management-proof/execution/profiles-select.execution-model.json',
    },
    {
        kind: 'command',
        definitionUri:
            'tools/generator-platform/fixtures/create-user.v2.definition.json',
        outputUri:
            'examples/users-management-proof/execution/create-user.execution-model.json',
    },
]);

function sha256(document) {
    return createHash('sha256').update(document).digest('hex');
}

function canonicalDocument(value) {
    return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function artifact(uri, document) {
    return { uri, sha256: sha256(document), document };
}

async function compilePrimitive(input) {
    const definition = JSON.parse(
        await readFile(resolve(repositoryRoot, input.definitionUri), 'utf8')
    );
    const backendContractUri = definition.backend_contract.uri;
    const backendContractDocument = await readFile(
        resolve(repositoryRoot, backendContractUri)
    );
    const value =
        input.kind === 'query'
            ? compileListQueryV2ExecutionModel({
                  definition,
                  backendContractDocument,
                  backendContractUri,
              })
            : compileActionRequestV2ExecutionModel({
                  definition,
                  backendContractDocument,
                  backendContractUri,
              });
    return artifact(input.outputUri, canonicalDocument(value));
}

export async function compileUsersManagementProofExecution() {
    const [applicationDesignSchema, pageExecutionPlanSchema, pageDocument] =
        await Promise.all([
            readFile(
                new URL(
                    '../schemas/application-design.schema.json',
                    import.meta.url
                ),
                'utf8'
            ).then(JSON.parse),
            readFile(
                new URL(
                    '../schemas/page-execution-plan.schema.json',
                    import.meta.url
                ),
                'utf8'
            ).then(JSON.parse),
            readFile(
                resolve(repositoryRoot, usersManagementProof.pageContractUri)
            ),
        ]);
    const primitives = await Promise.all(primitiveInputs.map(compilePrimitive));
    const pageContract = artifact(
        usersManagementProof.pageContractUri,
        pageDocument
    );
    const plan = compilePageExecutionPlan({
        pageContract,
        listQueryModels: primitives.filter((_, index) => index < 2),
        actionRequestModels: primitives.slice(2),
        applicationDesignSchema,
        pageExecutionPlanSchema,
    });
    return {
        pageContract,
        primitives,
        plan,
        planArtifact: artifact(
            usersManagementProof.planUri,
            canonicalDocument(plan)
        ),
    };
}

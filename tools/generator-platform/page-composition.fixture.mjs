import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';

import { compileActionRequestV2ExecutionModel } from './core/action-request-v2-compiler.mjs';
import { compileListQueryV2ExecutionModel } from './core/list-query-v2-compiler.mjs';
import { compilePageExecutionPlan } from './core/page-execution-plan.mjs';
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

export const angularPageHostBindings = JSON.parse(
    await readFile(
        new URL('./fixtures/angular-page-host-bindings.json', import.meta.url),
        'utf8'
    )
);

function digest(document) {
    return createHash('sha256').update(document).digest('hex');
}

function artifact(uri, value) {
    const document = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
    return { uri, sha256: digest(document), document };
}

async function primitive(kind, fixture, uri) {
    const definition = JSON.parse(
        await readFile(
            resolve(
                repositoryRoot,
                `tools/generator-platform/fixtures/${fixture}`
            ),
            'utf8'
        )
    );
    const backendContractUri = definition.backend_contract.uri;
    const backendContractDocument = await readFile(
        resolve(repositoryRoot, backendContractUri)
    );
    const model =
        kind === 'query'
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
    return artifact(uri, model);
}

function modelOf(value) {
    return JSON.parse(value.document.toString('utf8'));
}

function state(id, kind) {
    return {
        id,
        kind,
        description: `${id} state.`,
        announcement: `${id} announcement.`,
    };
}

function page(siteGroups, reportTypes, forgotPassword) {
    return {
        id: 'page_5555555555555555',
        title: 'Request preparation',
        purpose: 'Load two option lists and submit one recovery request.',
        path: '/request-preparation',
        experience_ids: ['web'],
        access: { mode: 'authenticated', permissions: [] },
        initial_state_id: 'loading',
        states: [
            state('loading', 'loading'),
            state('ready', 'ready'),
            state('empty', 'empty'),
            state('query-failed', 'error'),
            state('submitted', 'success'),
            state('submit-failed', 'error'),
        ],
        controls: [
            {
                id: 'email',
                kind: 'text',
                label: 'Email',
                description: 'Password recovery email.',
                required: true,
            },
        ],
        actions: [
            {
                id: 'submit-password-recovery',
                kind: 'backend',
                label: 'Send recovery request',
                description: 'Request password recovery instructions.',
                available_in_state_ids: ['ready'],
                input_bindings: [
                    {
                        control_id: 'email',
                        target_kind: 'body-field',
                        target_name: 'email',
                    },
                ],
                operation_ref: {
                    contract_id: forgotPassword.backend_contract.id,
                    operation_id:
                        forgotPassword.actions[0].transport.operation_id,
                },
                success_state_id: 'submitted',
                error_state_id: 'submit-failed',
            },
        ],
        loads: [
            {
                id: 'load-site-groups',
                operation_ref: {
                    contract_id: siteGroups.backend_contract.id,
                    operation_id: siteGroups.queries[0].transport.operation_id,
                },
                parameter_bindings: [],
                loading_state_id: 'loading',
                success_state_id: 'ready',
                empty_state_id: 'empty',
                error_state_id: 'query-failed',
            },
            {
                id: 'load-report-types',
                operation_ref: {
                    contract_id: reportTypes.backend_contract.id,
                    operation_id: reportTypes.queries[0].transport.operation_id,
                },
                parameter_bindings: [
                    {
                        parameter_name: 'id',
                        parameter_in: 'path',
                        source_kind: 'route',
                        source_ref: 'report-id',
                    },
                ],
                loading_state_id: 'loading',
                success_state_id: 'ready',
                empty_state_id: 'empty',
                error_state_id: 'query-failed',
            },
        ],
        data_bindings: [
            {
                id: 'site-group-options',
                operation_ref: {
                    contract_id: siteGroups.backend_contract.id,
                    operation_id: siteGroups.queries[0].transport.operation_id,
                },
                response_status:
                    siteGroups.queries[0].transport.success_response_status,
                model_id: siteGroups.queries[0].transport.collection_model_id,
                field_names: [],
                visible_in_state_ids: ['ready'],
            },
            {
                id: 'report-type-options',
                operation_ref: {
                    contract_id: reportTypes.backend_contract.id,
                    operation_id: reportTypes.queries[0].transport.operation_id,
                },
                response_status:
                    reportTypes.queries[0].transport.success_response_status,
                model_id: reportTypes.queries[0].transport.collection_model_id,
                field_names: [],
                visible_in_state_ids: ['ready'],
            },
        ],
        regions: [
            {
                id: 'main',
                role: 'main',
                accessible_name: 'Request preparation',
                elements: [
                    {
                        id: 'options',
                        kind: 'list',
                        accessible_name: 'Available options',
                        content: 'Site groups and report types.',
                        control_ids: [],
                        action_ids: [],
                        data_binding_ids: [
                            'site-group-options',
                            'report-type-options',
                        ],
                    },
                    {
                        id: 'recovery-form',
                        kind: 'form',
                        accessible_name: 'Password recovery',
                        content: 'Recovery request form.',
                        control_ids: ['email'],
                        action_ids: ['submit-password-recovery'],
                        data_binding_ids: [],
                    },
                ],
            },
        ],
        evidence: [
            { source_id: 'composition-proof', locator: 'approved-scenario' },
        ],
    };
}

async function writeArtifact(root, value) {
    const path = resolve(root, value.uri);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, value.document);
}

export async function createPageCompositionFixture() {
    const root = await mkdtemp(resolve(tmpdir(), 'cmz-page-composition-'));
    const [siteGroups, reportTypes, forgotPassword] = await Promise.all([
        primitive(
            'query',
            'site-group-select.v2.definition.json',
            'models/site-groups.json'
        ),
        primitive(
            'query',
            'tasks-actions-processing-type.v2.definition.json',
            'models/report-types.json'
        ),
        primitive(
            'command',
            'forgot-password.v2.definition.json',
            'models/forgot-password.json'
        ),
    ]);
    const models = [siteGroups, reportTypes, forgotPassword];
    const parsed = models.map(modelOf);
    const pageContract = artifact('contracts/page.json', {
        schema_version: '1.0.0',
        kind: 'page-realization-contract',
        design_ref: {
            path: 'designs/composition.application-design.json',
            sha256: 'd'.repeat(64),
        },
        design: {
            id: 'composition-proof',
            title: 'Composition proof',
            version: '1.0.0',
        },
        experience: {
            id: 'web',
            channel: 'web',
            offline_policy: 'none',
            audience_ids: ['operator'],
        },
        backend_contracts: parsed.map((model) => ({
            id: model.backend_contract.id,
            role: 'target',
            snapshot_uri: model.backend_contract.uri,
            sha256: model.backend_contract.sha256,
        })),
        page: page(...parsed),
    });
    const plan = compilePageExecutionPlan({
        pageContract,
        listQueryModels: [siteGroups, reportTypes],
        actionRequestModels: [forgotPassword],
        applicationDesignSchema,
        pageExecutionPlanSchema,
    });
    await Promise.all(
        [...models, pageContract].map((value) => writeArtifact(root, value))
    );
    const planPath = resolve(root, 'page-execution-plan.json');
    const hostBindingsPath = resolve(root, 'angular-host-bindings.json');
    await Promise.all([
        writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`),
        writeFile(
            hostBindingsPath,
            `${JSON.stringify(angularPageHostBindings, null, 2)}\n`
        ),
    ]);
    return { root, models, pageContract, plan, planPath, hostBindingsPath };
}

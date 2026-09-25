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

function withCallerDeclaredInvalidation(value) {
    const model = modelOf(value);
    model.actions[0].controller.execution.invalidation = {
        mode: 'caller-declared',
    };
    return artifact(value.uri, model);
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
                invalidates_load_ids: ['load-site-groups'],
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

function usersPage(usersList, profilesSelect, createUser) {
    return {
        id: 'page_6666666666666666',
        title: 'User management',
        purpose: 'List users and create a user from observed SEOS contracts.',
        path: '/settings-security/users',
        experience_ids: ['web'],
        access: { mode: 'authenticated', permissions: [] },
        initial_state_id: 'loading',
        states: [
            state('loading', 'loading'),
            state('ready', 'ready'),
            state('empty', 'empty'),
            state('query-failed', 'error'),
            state('created', 'success'),
            state('create-failed', 'error'),
        ],
        controls: [
            {
                id: 'first-name',
                kind: 'text',
                label: 'First name',
                description: 'Required user first name.',
                required: true,
            },
            {
                id: 'last-name',
                kind: 'text',
                label: 'Last name',
                description: 'Required user last name.',
                required: true,
            },
            {
                id: 'email',
                kind: 'text',
                label: 'Email',
                description: 'Required user email.',
                required: true,
            },
            {
                id: 'phone',
                kind: 'text',
                label: 'Phone',
                description: 'Required user phone number.',
                required: true,
            },
            {
                id: 'profile-id',
                kind: 'select',
                label: 'Profile',
                description: 'Required user profile.',
                required: true,
            },
        ],
        actions: [
            {
                id: 'create-user',
                kind: 'backend',
                label: 'Create user',
                description: 'Create the user with the selected profile.',
                available_in_state_ids: ['ready'],
                input_bindings: [
                    {
                        control_id: 'first-name',
                        target_kind: 'body-field',
                        target_name: 'first_name',
                    },
                    {
                        control_id: 'last-name',
                        target_kind: 'body-field',
                        target_name: 'last_name',
                    },
                    {
                        control_id: 'email',
                        target_kind: 'body-field',
                        target_name: 'email',
                    },
                    {
                        control_id: 'phone',
                        target_kind: 'body-field',
                        target_name: 'phone',
                    },
                    {
                        control_id: 'profile-id',
                        target_kind: 'body-field',
                        target_name: 'profile_id',
                    },
                ],
                operation_ref: {
                    contract_id: createUser.backend_contract.id,
                    operation_id: createUser.actions[0].transport.operation_id,
                },
                invalidates_load_ids: ['users-list'],
                success_state_id: 'created',
                error_state_id: 'create-failed',
            },
        ],
        loads: [
            {
                id: 'users-list',
                operation_ref: {
                    contract_id: usersList.backend_contract.id,
                    operation_id: usersList.queries[0].transport.operation_id,
                },
                parameter_bindings: [
                    {
                        parameter_name: 'page',
                        parameter_in: 'query',
                        source_kind: 'constant',
                        source_ref: '1',
                    },
                ],
                loading_state_id: 'loading',
                success_state_id: 'ready',
                empty_state_id: 'empty',
                error_state_id: 'query-failed',
            },
            {
                id: 'profiles-select',
                operation_ref: {
                    contract_id: profilesSelect.backend_contract.id,
                    operation_id:
                        profilesSelect.queries[0].transport.operation_id,
                },
                parameter_bindings: [],
                loading_state_id: 'loading',
                success_state_id: 'ready',
                empty_state_id: 'empty',
                error_state_id: 'query-failed',
            },
        ],
        data_bindings: [
            {
                id: 'users',
                operation_ref: {
                    contract_id: usersList.backend_contract.id,
                    operation_id: usersList.queries[0].transport.operation_id,
                },
                response_status:
                    usersList.queries[0].transport.success_response_status,
                model_id: usersList.queries[0].transport.collection_model_id,
                field_names: [],
                visible_in_state_ids: ['ready'],
            },
            {
                id: 'profiles',
                operation_ref: {
                    contract_id: profilesSelect.backend_contract.id,
                    operation_id:
                        profilesSelect.queries[0].transport.operation_id,
                },
                response_status:
                    profilesSelect.queries[0].transport.success_response_status,
                model_id:
                    profilesSelect.queries[0].transport.collection_model_id,
                field_names: [],
                visible_in_state_ids: ['ready'],
            },
        ],
        regions: [
            {
                id: 'main',
                role: 'main',
                accessible_name: 'User management',
                elements: [
                    {
                        id: 'users-table',
                        kind: 'list',
                        accessible_name: 'Users',
                        content: 'Paginated users list.',
                        control_ids: [],
                        action_ids: [],
                        data_binding_ids: ['users'],
                    },
                    {
                        id: 'create-user-form',
                        kind: 'form',
                        accessible_name: 'Create user',
                        content: 'Required user creation fields.',
                        control_ids: [
                            'first-name',
                            'last-name',
                            'email',
                            'phone',
                            'profile-id',
                        ],
                        action_ids: ['create-user'],
                        data_binding_ids: ['profiles'],
                    },
                ],
            },
        ],
        evidence: [
            { source_id: 'users-composition-proof', locator: 'c5-baseline' },
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
    const [siteGroups, reportTypes, baseForgotPassword] = await Promise.all([
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
    const forgotPassword = withCallerDeclaredInvalidation(baseForgotPassword);
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

export async function createUsersPageCompositionFixture() {
    const root = await mkdtemp(resolve(tmpdir(), 'cmz-users-composition-'));
    const [usersList, profilesSelect, createUser] = await Promise.all([
        primitive(
            'query',
            'users-list.v2.definition.json',
            'models/users-list.json'
        ),
        primitive(
            'query',
            'profiles-select.v2.definition.json',
            'models/profiles-select.json'
        ),
        primitive(
            'command',
            'create-user.v2.definition.json',
            'models/create-user.json'
        ),
    ]);
    const models = [usersList, profilesSelect, createUser];
    const parsed = models.map(modelOf);
    const pageContract = artifact('contracts/users-page.json', {
        schema_version: '1.0.0',
        kind: 'page-realization-contract',
        design_ref: {
            path: 'designs/users.application-design.json',
            sha256: 'e'.repeat(64),
        },
        design: {
            id: 'users-composition-proof',
            title: 'Users composition proof',
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
        page: usersPage(...parsed),
    });
    const plan = compilePageExecutionPlan({
        pageContract,
        listQueryModels: [usersList, profilesSelect],
        actionRequestModels: [createUser],
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

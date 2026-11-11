import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import {
    createApplicationSessionFixture,
    SESSION_FIXTURE_DOMAINS,
    sessionArtifact,
} from './test-support/application-session-fixture.mjs';

import { compileActionRequestV2ExecutionModel } from './core/action-request-v2-compiler.mjs';
import { compileListQueryV2ExecutionModel } from './core/list-query-v2-compiler.mjs';
import { queryBindingModelId } from './core/list-query-collection.mjs';
import {
    compilePageExecutionPlan,
    validatePageExecutionCapabilities,
    validatePageExecutionPlan,
} from './core/page-execution-plan.mjs';
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

function digest(document) {
    return createHash('sha256').update(document).digest('hex');
}

function documentArtifact(uri, value) {
    const document = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
    return { uri, sha256: digest(document), document };
}

async function compilePrimitive(kind, fixture) {
    const definitionPath = resolve(
        repositoryRoot,
        `tools/generator-platform/fixtures/${fixture}`
    );
    const definition = JSON.parse(await readFile(definitionPath, 'utf8'));
    const backendContractUri = definition.backend_contract.uri;
    const backendContractDocument = await readFile(
        resolve(repositoryRoot, backendContractUri)
    );
    const model =
        kind === 'list-query'
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
    return documentArtifact(`generated/${model.model_id}.json`, model);
}

const [siteGroups, reportTypes, forgotPassword] = await Promise.all([
    compilePrimitive('list-query', 'site-group-select.v2.definition.json'),
    compilePrimitive(
        'list-query',
        'tasks-actions-processing-type.v2.definition.json'
    ),
    compilePrimitive('action-request', 'forgot-password.v2.definition.json'),
]);

function modelOf(artifact) {
    return JSON.parse(artifact.document.toString('utf8'));
}

const siteGroupsModel = modelOf(siteGroups);
const reportTypesModel = modelOf(reportTypes);
const forgotPasswordModel = modelOf(forgotPassword);

function evidence() {
    return [{ source_id: 'composition-proof', locator: 'approved-scenario' }];
}

function state(id, kind) {
    return {
        id,
        kind,
        description: `${id} state.`,
        announcement: `${id} announcement.`,
    };
}

function page(overrides = {}) {
    return {
        id: 'page_5555555555555555',
        title: 'Request preparation',
        purpose: 'Load two option lists and submit one password recovery.',
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
                authorization: { mode: 'none' },
                available_in_state_ids: ['ready'],
                input_bindings: [
                    {
                        control_id: 'email',
                        target_kind: 'body-field',
                        target_name: 'email',
                    },
                ],
                operation_ref: {
                    contract_id: forgotPasswordModel.backend_contract.id,
                    operation_id:
                        forgotPasswordModel.actions[0].transport.operation_id,
                },
                success_state_id: 'submitted',
                error_state_id: 'submit-failed',
            },
        ],
        loads: [
            {
                id: 'load-site-groups',
                operation_ref: {
                    contract_id: siteGroupsModel.backend_contract.id,
                    operation_id:
                        siteGroupsModel.queries[0].transport.operation_id,
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
                    contract_id: reportTypesModel.backend_contract.id,
                    operation_id:
                        reportTypesModel.queries[0].transport.operation_id,
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
                    contract_id: siteGroupsModel.backend_contract.id,
                    operation_id:
                        siteGroupsModel.queries[0].transport.operation_id,
                },
                response_status:
                    siteGroupsModel.queries[0].transport
                        .success_response_status,
                model_id: queryBindingModelId(siteGroupsModel.queries[0]),
                field_names: [],
                visible_in_state_ids: ['ready'],
            },
            {
                id: 'report-type-options',
                operation_ref: {
                    contract_id: reportTypesModel.backend_contract.id,
                    operation_id:
                        reportTypesModel.queries[0].transport.operation_id,
                },
                response_status:
                    reportTypesModel.queries[0].transport
                        .success_response_status,
                model_id: queryBindingModelId(reportTypesModel.queries[0]),
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
                        id: 'title',
                        kind: 'heading',
                        accessible_name: 'Page title',
                        content: 'Prepare request',
                        control_ids: [],
                        action_ids: [],
                        data_binding_ids: [],
                    },
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
        evidence: evidence(),
        ...overrides,
    };
}

function pageContract(pageValue = page()) {
    const contract = {
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
        backend_contracts: [
            siteGroupsModel,
            reportTypesModel,
            forgotPasswordModel,
        ].map((model) => ({
            id: model.backend_contract.id,
            role: 'target',
            snapshot_uri: model.backend_contract.uri,
            sha256: model.backend_contract.sha256,
        })),
        page: pageValue,
    };
    return documentArtifact(
        'generated/page_5555555555555555.contract.json',
        contract
    );
}

function compile(overrides = {}) {
    return compilePageExecutionPlan({
        pageContract: pageContract(),
        listQueryModels: [siteGroups, reportTypes],
        actionRequestModels: [forgotPassword],
        applicationDesignSchema,
        pageExecutionPlanSchema,
        ...overrides,
    });
}

test('compiles two queries and one command into independent content-addressed nodes', () => {
    const plan = compile();

    assert.equal(plan.kind, 'page-execution-plan');
    assert.equal(plan.page.state_mode, 'independent-nodes');
    assert.deepEqual(
        plan.query_nodes.map((node) => node.id),
        ['load-report-types', 'load-site-groups']
    );
    assert.deepEqual(
        plan.command_nodes.map((node) => node.id),
        ['submit-password-recovery']
    );
    assert.equal(plan.query_nodes[0].primitive_ref.sha256, reportTypes.sha256);
    assert.deepEqual(plan.query_nodes[0].input_bindings, [
        {
            input_field: 'reportUniqId',
            source: { kind: 'route', ref: 'report-id' },
            target: { kind: 'backend-parameter', in: 'path', name: 'id' },
            type: { kind: 'primitive', name: 'string' },
        },
    ]);
    assert.deepEqual(plan.command_nodes[0].input_bindings, [
        {
            input_field: 'email',
            source: { kind: 'control', ref: 'email' },
            target: { kind: 'body-field', name: 'email' },
            type: { kind: 'primitive', name: 'string' },
        },
    ]);
    assert.deepEqual(
        plan.output_bindings.map((binding) => [
            binding.id,
            binding.producer_node_id,
            binding.output.model_id,
        ]),
        [
            [
                'report-type-options',
                'load-report-types',
                'report-action-type-option',
            ],
            ['site-group-options', 'load-site-groups', 'select-option'],
        ]
    );
    assert.ok(
        plan.required_capabilities.includes(
            'composition.independent-node-state@1'
        )
    );
    assert.ok(
        plan.required_capabilities.includes('host.authentication.bearer@1')
    );
    assert.ok(
        plan.required_capabilities.includes('host.authentication.omit@1')
    );
});

test('capability negotiation fails closed when a target lacks one requirement', () => {
    const plan = compile();
    assert.deepEqual(
        validatePageExecutionCapabilities(plan, plan.required_capabilities),
        []
    );
    const available = plan.required_capabilities.filter(
        (capability) => capability !== 'query.cancellation.on-destroy@1'
    );
    assert.deepEqual(validatePageExecutionCapabilities(plan, available), [
        'missing target capability query.cancellation.on-destroy@1',
    ]);
});

test('standalone replay validation rejects broken producers and capability drift', () => {
    const brokenProducer = structuredClone(compile());
    brokenProducer.output_bindings[0].producer_node_id = 'missing-node';
    assert.ok(
        validatePageExecutionPlan(
            brokenProducer,
            pageExecutionPlanSchema
        ).includes('$.output_bindings[0].producer_node_id: unresolved node')
    );

    const missingCapability = structuredClone(compile());
    missingCapability.required_capabilities.pop();
    assert.ok(
        validatePageExecutionPlan(
            missingCapability,
            pageExecutionPlanSchema
        ).includes(
            '$.required_capabilities: must equal the exact canonical union of node requirements'
        )
    );

    const traversingReference = structuredClone(compile());
    traversingReference.query_nodes[0].primitive_ref.uri = '../model.json';
    assert.ok(
        validatePageExecutionPlan(
            traversingReference,
            pageExecutionPlanSchema
        ).includes(
            '$.query_nodes[0].primitive_ref.uri: must be a normalized relative path'
        )
    );

    const hiddenInvalidation = structuredClone(compile());
    hiddenInvalidation.command_nodes[0].invalidates = ['load-site-groups'];
    assert.ok(
        validatePageExecutionPlan(
            hiddenInvalidation,
            pageExecutionPlanSchema
        ).includes(
            '$.command_nodes[0].invalidates: action.invalidation.none@1 forbids targets'
        )
    );
});

test('rejects an ambiguous output producer instead of binding by operation only', () => {
    const ambiguous = page();
    ambiguous.loads.push({
        ...structuredClone(ambiguous.loads[0]),
        id: 'load-site-groups-again',
    });
    assert.throws(
        () => compile({ pageContract: pageContract(ambiguous) }),
        /site-group-options has ambiguous producer nodes.*producer_node_id/
    );
});

test('rejects weaker page access, missing primitives, and stale artifact hashes', () => {
    const publicPage = page({ access: { mode: 'public', permissions: [] } });
    assert.throws(
        () => compile({ pageContract: pageContract(publicPage) }),
        /requires stronger access/
    );
    assert.throws(
        () => compile({ listQueryModels: [siteGroups] }),
        /load-report-types has no primitive/
    );
    assert.throws(
        () =>
            compile({
                actionRequestModels: [
                    { ...forgotPassword, sha256: '0'.repeat(64) },
                ],
            }),
        /sha256 does not match its document/
    );
    assert.throws(
        () =>
            compile({
                listQueryModels: [
                    { ...siteGroups, uri: '../escaped-model.json' },
                    reportTypes,
                ],
            }),
        /uri must be a normalized relative path/
    );
});

test('compiles caller-declared invalidation to one named page query', () => {
    const model = structuredClone(forgotPasswordModel);
    model.actions[0].controller.execution.invalidation = {
        mode: 'caller-declared',
    };
    const callerDeclared = documentArtifact(
        'generated/caller-declared-action.json',
        model
    );
    const invalidatingPage = page();
    invalidatingPage.actions[0].invalidates_load_ids = ['load-site-groups'];
    const plan = compile({
        pageContract: pageContract(invalidatingPage),
        actionRequestModels: [callerDeclared],
    });
    assert.deepEqual(plan.command_nodes[0].invalidates, ['load-site-groups']);
    assert.ok(
        plan.required_capabilities.includes(
            'action.invalidation.caller-declared@1'
        )
    );
});

test('propage l’autorisation fine de commande et négocie sa capability', () => {
    const authorizedPage = page();
    authorizedPage.actions[0].authorization = {
        mode: 'required',
        permissions: ['recovery.submit'],
        denied_behavior: 'disable',
        evidence: [
            { source_id: 'composition-proof', locator: 'authorization' },
        ],
    };
    const plan = compile({ pageContract: pageContract(authorizedPage) });

    assert.deepEqual(plan.command_nodes[0].authorization, {
        mode: 'required',
        permissions: ['recovery.submit'],
        denied_behavior: 'disable',
    });
    assert.ok(
        plan.required_capabilities.includes(
            'action.authorization.permissions-all@1'
        )
    );

    const strippedGuard = structuredClone(plan);
    strippedGuard.command_nodes[0].authorization = { mode: 'none' };
    assert.ok(
        validatePageExecutionPlan(strippedGuard, pageExecutionPlanSchema).some(
            (error) => error.includes('authorization.none forbids')
        )
    );
});

test('rejects absent, unknown, or policy-incompatible invalidation targets', () => {
    const model = structuredClone(forgotPasswordModel);
    model.actions[0].controller.execution.invalidation = {
        mode: 'caller-declared',
    };
    const callerDeclared = documentArtifact(
        'generated/caller-declared-action.json',
        model
    );
    assert.throws(
        () => compile({ actionRequestModels: [callerDeclared] }),
        /requires at least one invalidation target/
    );

    const unknownTarget = page();
    unknownTarget.actions[0].invalidates_load_ids = ['missing-query'];
    assert.throws(
        () =>
            compile({
                pageContract: pageContract(unknownTarget),
                actionRequestModels: [callerDeclared],
            }),
        /invalidates unknown page query missing-query/
    );

    const forbiddenTarget = page();
    forbiddenTarget.actions[0].invalidates_load_ids = ['load-site-groups'];
    assert.throws(
        () => compile({ pageContract: pageContract(forbiddenTarget) }),
        /declares invalidation targets but its action-request policy is none/
    );
});

for (const domain of SESSION_FIXTURE_DOMAINS) {
    test(`plan 1.1 : liaisons vides si et seulement si la commande est sans corps : ${domain}`, async (t) => {
        const data = await createApplicationSessionFixture({ domain });
        t.after(() => rm(data.root, { recursive: true, force: true }));
        const entries = [...data.pages.values()];
        const withoutBody = entries.find(
            (entry) => entry.page.path === '/agree'
        );
        const withBody = entries.find((entry) => entry.page.path === '/enter');
        const schema = data.schemas['page-execution-plan'];
        assert.equal(
            data.actions.get(`${domain}-agree`).model.actions[0].port.input
                .kind,
            'none'
        );
        assert.deepEqual(withoutBody.plan.command_nodes[0].input_bindings, []);
        assert.deepEqual(
            validatePageExecutionPlan(withoutBody.plan, schema),
            []
        );
        assert.deepEqual(validatePageExecutionPlan(withBody.plan, schema), []);

        const missing = structuredClone(withBody.plan);
        missing.command_nodes[0].input_bindings = [];
        assert.ok(
            validatePageExecutionPlan(missing, schema).includes(
                'PAGE_SESSION_BINDING'
            )
        );
        const extra = structuredClone(withoutBody.plan);
        extra.command_nodes[0].input_bindings = [
            structuredClone(withBody.plan.command_nodes[0].input_bindings[0]),
        ];
        assert.ok(
            validatePageExecutionPlan(extra, schema).includes(
                'PAGE_SESSION_BINDING'
            )
        );

        const compileChanged = (entry, contract) =>
            compilePageExecutionPlan({
                pageContract: sessionArtifact(entry.artifact.uri, contract),
                listQueryModels: [data.queryArtifact],
                actionRequestModels: [...data.actions.values()].map(
                    (action) => action.artifact
                ),
                applicationDesignSchema: data.schemas['application-design'],
                pageExecutionPlanSchema: schema,
            });
        const missingPage = structuredClone(withBody.pageContract);
        missingPage.page.actions[0].input_bindings = [];
        assert.throws(
            () => compileChanged(withBody, missingPage),
            /missing required body field/
        );
        const extraPage = structuredClone(withoutBody.pageContract);
        extraPage.page.controls.push(
            structuredClone(withBody.pageContract.page.controls[0])
        );
        extraPage.page.actions[0].input_bindings = [
            structuredClone(
                withBody.pageContract.page.actions[0].input_bindings[0]
            ),
        ];
        assert.throws(
            () => compileChanged(withoutBody, extraPage),
            /binds unknown body field/
        );
    });

    test(`plan de session ${domain} : producteurs, projection renommée et capsule fermée`, async (t) => {
        const data = await createApplicationSessionFixture({ domain });
        t.after(() => rm(data.root, { recursive: true, force: true }));
        const enter = [...data.pages.values()].find(
            (entry) => entry.page.path === '/enter'
        );
        const plan = enter.plan;
        assert.equal(plan.schema_version, '1.1.0');
        assert.equal(plan.query_nodes.length, 0);
        assert.equal(plan.command_nodes.length, 1);
        assert.equal(plan.session.effects[0].kind, 'establish');
        assert.equal(plan.session.effects[0].producer.page_id, enter.page.id);
        const canonical = plan.session.effects[0].canonical_fields;
        assert.ok(
            canonical.some((field) => field.source_field === data.names.token)
        );
        if (domain === 'equipment-hire')
            assert.ok(
                canonical.every((field) => field.name.startsWith('projected_'))
            );
        assert.deepEqual(
            validatePageExecutionPlan(
                plan,
                data.schemas['page-execution-plan']
            ),
            []
        );
        const changed = structuredClone(enter.pageContract);
        changed.experience.session.producer.action_id = 'missing';
        assert.throws(() =>
            compilePageExecutionPlan({
                pageContract: sessionArtifact(enter.artifact.uri, changed),
                listQueryModels: [data.queryArtifact],
                actionRequestModels: [...data.actions.values()].map(
                    (entry) => entry.artifact
                ),
                applicationDesignSchema: data.schemas['application-design'],
                pageExecutionPlanSchema: data.schemas['page-execution-plan'],
            })
        );
        const extra = structuredClone(plan);
        extra.session.toString = 'SENTINEL_PRIVATE_RESPONSE';
        assert.notDeepEqual(
            validatePageExecutionPlan(
                extra,
                data.schemas['page-execution-plan']
            ),
            []
        );
        const catalogue = [...data.pages.values()].find(
            (entry) => entry.page.path === '/catalogue'
        ).plan;
        assert.equal(catalogue.command_nodes.length, 0);
        assert.equal(catalogue.query_nodes.length, 1);
        assert.deepEqual(catalogue.session.effects, []);
    });
}

test('plan 1.0 : une commande conserve au moins une liaison de corps', () => {
    const plan = compile();
    assert.equal(plan.schema_version, '1.0.0');
    plan.command_nodes[0].input_bindings = [];
    assert.ok(
        validateJsonSchema(
            plan,
            pageExecutionPlanSchema.$defs.plan10,
            pageExecutionPlanSchema
        ).some(
            (error) =>
                error ===
                '$.command_nodes[0].input_bindings: must contain at least 1 items'
        )
    );
    assert.notDeepEqual(
        validatePageExecutionPlan(plan, pageExecutionPlanSchema),
        []
    );
});

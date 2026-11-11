import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
    mkdir,
    mkdtemp,
    readFile,
    realpath,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
    applicationDesign,
    backendDefinition,
} from './application-design-fixture.mjs';
import { validateBackendContract } from '../core/backend-contract.mjs';
import { compileActionRequestV2ExecutionModel } from '../core/action-request-v2-compiler.mjs';
import { compileListQueryV2ExecutionModel } from '../core/list-query-v2-compiler.mjs';
import { compilePageExecutionPlan } from '../core/page-execution-plan.mjs';
import { observationInputPrimitives as io } from '../core/runtime-observation-evidence.mjs';
import { sessionEndpointToken } from '../renderers/angular-application-session-renderer.mjs';
import { pageContract as nativePageContract } from '../renderers/angular-pwa-shell-renderer.mjs';
export const SESSION_FIXTURE_DOMAINS = Object.freeze([
    'observatory',
    'equipment-hire',
]);
const digest = (value) => createHash('sha256').update(value).digest('hex');
export { digest as sessionFixtureDigest };
const bytesOf = (value) => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const primitive = (name) => ({ kind: 'primitive', name });
const array = (items) => ({ kind: 'array', items });
export function sessionArtifact(uri, value) {
    const document = bytesOf(value);
    return { uri, sha256: digest(document), document };
}
function declaration(domain) {
    const alternate = domain === 'equipment-hire';
    const names = Object.fromEntries(
        [
            ['token', 'credential', 'ticket'],
            ['secret', 'value', 'secret'],
            ['subject', 'member', 'operator'],
            ['menu', 'sections', 'navigation'],
            ['paths', 'paths', 'route_set'],
            ['permissions', 'grants', 'claims'],
            ['privacy', 'consent', 'policy'],
            ['accepted', 'accepted_at', 'confirmed'],
            ['rotate', 'must_rotate', 'must_renew'],
            ['label', 'caption', 'title'],
            ['path', 'href', 'url'],
            ['children', 'entries', 'links'],
            ['error', 'error', 'rejected'],
            ['message', 'message', 'notice'],
        ].map(([key, one, two]) => [key, alternate ? two : one])
    );
    const id = (name) => `${domain}-${name}`;
    const model = (name) => ({ kind: 'model', model_id: id(name) });
    const field = (name, type, options = {}) => ({
        name,
        type,
        description: 'Declared fixture field.',
        required: true,
        nullable: false,
        ...options,
    });
    const text = (name, options = {}) =>
        field(name, primitive('string'), options);
    const object = (name, fields, options = {}) => ({
        id: id(name),
        kind: 'object',
        description: 'Declared fixture model.',
        fields,
        ...options,
    });
    const models = [
        object('enter-input', [text('identity'), text('passphrase')]),
        object('token', [text(names.secret)]),
        object('privacy', [text(names.accepted, { nullable: true })]),
        object('leaf', [
            text(names.label),
            text(names.path),
            field('active', primitive('boolean')),
        ]),
        object('group', [
            text(names.label),
            text(names.path, { nullable: true }),
            field(names.children, array(model('leaf'))),
            text('statut'),
        ]),
        object('subject', [
            text('name'),
            text('toString'),
            field('is_admin', primitive('boolean')),
            field(names.privacy, model('privacy')),
            field(names.rotate, primitive('boolean')),
            field(names.menu, array(model('group'))),
            field(names.paths, array(primitive('string'))),
            field(names.permissions, array(primitive('string'))),
            text('note', {
                required: false,
                nullable: true,
            }),
        ]),
        object('session-result', [
            field(names.token, model('token'), { required: false }),
            field(names.subject, model('subject'), { required: false }),
            field('challenge', primitive('boolean')),
        ]),
        object('rotate-input', [
            text('current_secret'),
            text('next_secret'),
            text('confirmation'),
        ]),
        object('command-result', [
            field(names.error, primitive('boolean')),
            text(names.message),
            field('data', primitive('null'), { nullable: true }),
        ]),
        object('bad-request', [
            field(names.error, primitive('boolean')),
            text(names.message),
            field('statusCode', primitive('integer')),
        ]),
        object('unauthenticated', [text(names.message)]),
        object('field-errors', [], {
            additional_properties: array(primitive('string')),
        }),
        object('validation-error', [
            text(names.message),
            field('errors', model('field-errors')),
        ]),
        object('item', [field('id', primitive('string')), text('label')]),
        {
            id: id('items'),
            kind: 'array',
            description: 'Declared fixture collection.',
            items: model('item'),
        },
    ];
    const response = (status, outcome, name, envelope = { kind: 'none' }) => ({
        status,
        outcome,
        description: 'Declared fixture response.',
        body: { media_type: 'application/json', model_id: id(name), envelope },
    });
    const errorResponses = [
        response(400, 'error', 'bad-request'),
        response(401, 'error', 'unauthenticated'),
        response(422, 'error', 'validation-error'),
    ];
    const access = (mode) => ({
        mode,
        security_scheme_ids: mode === 'public' ? [] : [id('bearer')],
        permissions: [],
    });
    const operation = (
        name,
        method,
        path,
        input,
        output = 'command-result',
        mode = 'authenticated',
        envelope = method === 'GET'
            ? {
                  kind: 'object',
                  error_field: names.error,
                  message_field: names.message,
                  data_field: 'data',
              }
            : { kind: 'none' }
    ) => ({
        id: id(name),
        service_id: id('service'),
        method,
        path: (alternate ? '/v1.0' : '') + path,
        description: 'Declared fixture operation.',
        access: access(mode),
        request: {
            parameters: [],
            ...(input
                ? {
                      body: {
                          model_id: id(input),
                          required: true,
                          media_types: ['application/json'],
                      },
                  }
                : {}),
        },
        responses: [
            response(200, 'success', output, envelope),
            ...(method === 'GET' ? [errorResponses[1]] : errorResponses),
        ],
    });
    const operations = [
        operation(
            'enter',
            'POST',
            '/access',
            'enter-input',
            'session-result',
            'public',
            alternate
                ? { kind: 'none' }
                : {
                      kind: 'object',
                      error_field: names.error,
                      message_field: names.message,
                      data_field: 'payload',
                  }
        ),
        operation('agree', 'POST', '/consents', null),
        operation('rotate', 'PATCH', '/credentials', 'rotate-input'),
        operation('catalogue', 'GET', '/items', null, 'items'),
    ];
    const defaults = backendDefinition();
    Object.assign(defaults.contract, {
        id: id('api'),
        title: `Fixture ${domain}`,
        description: 'Synthetic declared fixture; never a network proof.',
    });
    Object.assign(defaults.services[0], {
        id: id('service'),
        description: 'Fixture endpoint.',
    });
    defaults.services[0].base_urls = [
        { environment: 'test', url: `https://${domain}.example/api/` },
    ];
    Object.assign(defaults.security_schemes[0], {
        id: id('bearer'),
        description: 'Declared fixture bearer.',
    });
    return {
        names,
        contract: defaults.contract,
        services: defaults.services,
        security_schemes: defaults.security_schemes,
        models,
        operations,
    };
}

function canonicalFixture(declared, sourceUri, sourceDocument, domain) {
    const sourceId = `${domain}-fixture-source`;
    const result = structuredClone(declared);
    delete result.names;
    result.schema_version = '1.1.0';
    result.kind = 'backend-contract';
    result.sources = [
        {
            id: sourceId,
            kind: 'manual',
            authority: 'declared',
            status: 'planned',
            snapshot_uri: sourceUri,
            sha256: digest(sourceDocument),
        },
    ];
    const proof = (value, pointer) => {
        value.evidence = [{ source_id: sourceId, locator: pointer }];
    };
    for (const collection of [
        'services',
        'security_schemes',
        'models',
        'operations',
    ])
        for (const [index, value] of result[collection].entries()) {
            value.status = 'planned';
            proof(value, `/${collection}/${index}`);
        }
    for (const [index, model] of result.models.entries())
        for (const [fieldIndex, field] of (model.fields ?? []).entries())
            proof(field, `/models/${index}/fields/${fieldIndex}`);
    for (const [index, operation] of result.operations.entries()) {
        const path = `/operations/${index}`;
        if (operation.request.body)
            proof(operation.request.body, `${path}/request/body`);
        for (const [responseIndex, response] of operation.responses.entries()) {
            const pointer = `${path}/responses/${responseIndex}`;
            proof(response, pointer);
            proof(response.body, `${pointer}/body`);
        }
    }
    return result;
}

function backendRef(contract, artifact) {
    return {
        uri: artifact.uri,
        id: contract.contract.id,
        version: contract.contract.version,
        sha256: artifact.sha256,
    };
}

function fixtureAction(contract, backend, operation, domain) {
    const alternate = domain === 'equipment-hire';
    const messageField = alternate ? 'notice' : 'message';
    const errorField = alternate ? 'rejected' : 'error';
    const projectedField = (source_field) => ({
        name: (alternate ? 'projected_' : '') + source_field,
        source_field,
    });
    const request = contract.models.find(
        (model) => model.id === operation.request.body?.model_id
    );
    const response = operation.responses.find(
        (entry) => entry.outcome === 'success'
    );
    const wire = contract.models.find(
        (model) => model.id === response.body.model_id
    );
    const fields = request?.fields ?? [];
    return {
        schema_version: '2.1.0',
        kind: 'action-request',
        feature: {
            id: operation.id + '-feature',
            name: 'Fixture action',
            description: 'Synthetic fixture, not a live API.',
        },
        backend_contract: backendRef(contract, backend),
        operations: [
            {
                id: operation.id,
                operation_ref: { operation_id: operation.id },
                success_response_status: 200,
                request_body: request ? 'json' : 'none',
                input: {
                    fields: fields.map((field) => ({
                        name: field.name,
                        body_field: field.name,
                        validations: [{ kind: 'required' }],
                    })),
                },
                result_model: {
                    id: operation.id + '-projection',
                    description: 'Decoded fixture result.',
                    fields: wire.fields.map((field) =>
                        projectedField(field.name)
                    ),
                },
                error_presentations: operation.responses
                    .filter((entry) => entry.outcome === 'error')
                    .map((entry) => ({
                        status: entry.status,
                        message_pointer: '/' + messageField,
                        ...(entry.status === 400
                            ? {
                                  status_pointer: '/statusCode',
                                  error_flag_pointer: '/' + errorField,
                              }
                            : {}),
                        ...(entry.status === 422
                            ? { fields_pointer: '/errors' }
                            : {}),
                    })),
                execution: {
                    concurrency: 'reject-while-pending',
                    retry: { mode: 'none' },
                    idempotency: { mode: 'none' },
                    invalidation: { mode: 'none' },
                    post_success: { mode: 'none' },
                },
            },
        ],
    };
}

function fixtureDesign(declared, backend, briefDocument, domain) {
    const design = JSON.parse(
        JSON.stringify(
            applicationDesign(digest(briefDocument), backend.sha256)
        ).replaceAll('clean-street', domain)
    );
    const id = (name) => 'page_' + digest(domain + ':' + name).slice(0, 16);
    const experience = design.experiences[0];
    experience.offline_policy = 'none';
    experience.page_ids = [
        'enter',
        'agree',
        'rotate',
        'dashboard',
        'catalogue',
        'restricted',
    ].map(id);
    experience.entry_page_id = id('enter');
    design.schema_version = '1.1.0';
    design.design.title = `Fixture ${domain}`;
    design.design.problem = 'A synthetic operator needs a declared session.';
    design.design.primary_outcome =
        'The declared catalogue can be opened after ordered steps.';
    design.backend_contracts[0] = {
        id: declared.contract.id,
        role: 'target',
        snapshot_uri: backend.uri,
        sha256: backend.sha256,
    };
    design.sources[0].snapshot_uri = `fixtures/${domain}.brief.md`;
    const template = structuredClone(design.pages[1]);
    const group = (kind, control_ids, action_ids) => ({
        id: kind,
        kind,
        accessible_name: 'Fixture controls',
        content: 'Declared controls',
        control_ids,
        action_ids,
        data_binding_ids: [],
    });
    design.pages = [
        'enter',
        'agree',
        'rotate',
        'dashboard',
        'catalogue',
        'restricted',
    ].map((name) => {
        const page = structuredClone(template);
        page.id = id(name);
        page.title = `${domain} ${name}`;
        page.path = name === 'catalogue' ? '/catalogue' : '/' + name;
        page.purpose = 'Declared fixture page.';
        page.access = {
            mode:
                name === 'enter'
                    ? 'public'
                    : name === 'restricted'
                      ? 'authorized'
                      : 'authenticated',
            permissions: name === 'restricted' ? ['override'] : [],
        };
        page.controls = [];
        page.actions = [];
        page.loads = [];
        page.data_bindings = [];
        page.regions[0].elements = [
            structuredClone(template.regions[0].elements[0]),
        ];
        page.regions[0].elements[0].content = page.title;
        const operation = declared.operations.find(
            (entry) => entry.id === `${domain}-${name}`
        );
        if (operation && operation.method !== 'GET') {
            const body = declared.models.find(
                (model) => model.id === operation.request.body?.model_id
            );
            const fields = body?.fields ?? [];
            page.controls = fields.map((field) => ({
                id: field.name,
                kind: field.name === 'identity' ? 'text' : 'password',
                label: field.name,
                description: 'Fixture input.',
                required: true,
            }));
            const action = structuredClone(template.actions[0]);
            action.id = name;
            action.operation_ref = {
                contract_id: declared.contract.id,
                operation_id: operation.id,
            };
            action.input_bindings = fields.map((field) => ({
                control_id: field.name,
                target_kind: 'body-field',
                target_name: field.name,
            }));
            page.actions = [action];
            page.regions[0].elements.push(
                group(
                    'form',
                    fields.map((field) => field.name),
                    [action.id]
                )
            );
        }
        if (name === 'dashboard')
            page.actions = ['catalogue', 'restricted'].map((destination) => ({
                id: 'open-' + destination,
                kind: 'navigate',
                label: destination,
                description: 'Fixture navigation.',
                available_in_state_ids: ['ready'],
                input_bindings: [],
                authorization: { mode: 'none' },
                destination_page_id: id(destination),
            }));
        if (name === 'dashboard')
            page.regions[0].elements.push(
                group(
                    'action-group',
                    [],
                    page.actions.map((action) => action.id)
                )
            );

        if (name === 'catalogue') {
            page.loads = [
                {
                    id: 'catalogue',
                    operation_ref: {
                        contract_id: declared.contract.id,
                        operation_id: `${domain}-catalogue`,
                    },
                    parameter_bindings: [],
                    loading_state_id: 'loading',
                    success_state_id: 'ready',
                    error_state_id: 'failed',
                },
            ];
            page.states.push({
                id: 'loading',
                kind: 'loading',
                description: 'Loading fixture.',
                announcement: 'Loading.',
            });
        }
        return page;
    });
    const n = declared.names;
    const producer = (name, result) => ({
        page_id: id(name),
        action_id: name,
        response_status: 200,
        result_model_id: `${domain}-${result}`,
    });
    const stage = (stageId, page, pointer, operator, effect) => ({
        id: stageId,
        page_id: id(page),
        predicate: { pointer, operator },
        completion: {
            producer: producer(page, 'command-result'),
            effect,
            result_condition: { pointer: '/' + n.error, equals: false },
        },
    });
    experience.session = {
        storage: 'memory',
        producer: producer('enter', 'session-result'),
        projection: {
            token_pointer: `/${n.token}/${n.secret}`,
            subject_pointer: `/${n.subject}`,
            menu_pointer: `/${n.subject}/${n.menu}`,
            allowed_paths_pointer: `/${n.subject}/${n.paths}`,
            permissions_pointer: `/${n.subject}/${n.permissions}`,
        },
        stages: [
            stage(
                'review',
                'agree',
                `/${n.subject}/${n.privacy}/${n.accepted}`,
                'is-null',
                'acknowledge'
            ),
            stage(
                'renew',
                'rotate',
                `/${n.subject}/${n.rotate}`,
                'is-true',
                'clear-and-reconnect'
            ),
        ],
        landing_page_id: id('dashboard'),
        reconnect_page_id: id('enter'),
        logout_label: 'Se déconnecter',
        menu: {
            label_pointer: '/' + n.label,
            path_pointer: '/' + n.path,
            children_pointer: '/' + n.children,
        },
        protected_operations: declared.operations
            .filter((operation) => operation.access.mode !== 'public')
            .map((operation) => ({
                contract_id: declared.contract.id,
                service_id: operation.service_id,
                operation_id: operation.id,
                method: operation.method,
                path: operation.path,
                security_scheme_id: operation.access.security_scheme_ids[0],
            })),
    };
    if (domain === 'equipment-hire') experience.session.stages.reverse();
    return design;
}

export async function createApplicationSessionFixture({
    domain = 'observatory',
    root,
} = {}) {
    assert.ok(SESSION_FIXTURE_DOMAINS.includes(domain));
    root ??= await mkdtemp(join(tmpdir(), 'application-session-'));
    root = await realpath(root);
    const schemas = {};
    for (const name of [
        'application-design',
        'backend-contract',
        'page-execution-plan',
    ])
        schemas[name] = io.parseSchema(
            await readFile(
                new URL(`../schemas/${name}.schema.json`, import.meta.url)
            )
        );
    const declared = declaration(domain);
    const { names: _names, ...source } = declared;
    void _names;
    const sourceDocument = bytesOf(source),
        sourceUri = `fixtures/${domain}.declared.json`;
    const contract = canonicalFixture(
        declared,
        sourceUri,
        sourceDocument,
        domain
    );
    assert.deepEqual(
        validateBackendContract(contract, schemas['backend-contract']),
        [],
        'synthetic backend fixture must satisfy the native contract'
    );
    const backend = sessionArtifact(
        `contracts/${domain}.backend.json`,
        contract
    );
    const brief = Buffer.from(
        'Synthetic fixture only. No network or verified-live evidence.\n'
    );
    const design = fixtureDesign(declared, backend, brief, domain);
    const contracts = new Map([
        [contract.contract.id, { ...design.backend_contracts[0], contract }],
    ]);
    const actions = new Map(),
        actionArtifacts = [];
    for (const operation of contract.operations.filter(
        (entry) => entry.method !== 'GET'
    )) {
        const definition = fixtureAction(contract, backend, operation, domain);
        const model = compileActionRequestV2ExecutionModel({
            definition,
            backendContractDocument: backend.document,
            backendContractUri: backend.uri,
        });
        const artifact = sessionArtifact(
            `generated/${operation.id}.action.json`,
            model
        );
        actions.set(operation.id, { definition, model, artifact });
        actionArtifacts.push(artifact);
    }
    const queryDefinition = JSON.parse(
        await readFile(
            new URL(
                '../fixtures/site-group-select.v2.definition.json',
                import.meta.url
            ),
            'utf8'
        )
    );
    queryDefinition.feature = {
        id: domain + '-catalogue-feature',
        name: 'Fixture catalogue',
        description: 'Synthetic fixture.',
    };
    queryDefinition.backend_contract = backendRef(contract, backend);
    const query = queryDefinition.operations[0];
    query.id = domain + '-catalogue';
    query.operation_ref.operation_id = query.id;
    query.read_model = {
        id: domain + '-item-projection',
        description: 'Fixture row.',
        fields: [
            { name: 'id', source_field: 'id' },
            { name: 'label', source_field: 'label' },
        ],
    };
    const queryModel = compileListQueryV2ExecutionModel({
        definition: queryDefinition,
        backendContractDocument: backend.document,
        backendContractUri: backend.uri,
    });
    const queryArtifact = sessionArtifact(
        `generated/${domain}-catalogue.query.json`,
        queryModel
    );
    const pages = new Map();
    const files = new Map([
        [`design/${domain}.json`, bytesOf(design)],
        [sourceUri, sourceDocument],
        [backend.uri, backend.document],
        [`fixtures/${domain}.brief.md`, brief],
    ]);
    for (const artifact of [...actionArtifacts, queryArtifact])
        files.set(artifact.uri, artifact.document);
    for (const page of design.pages) {
        const pageContract = nativePageContract(
            design,
            design.experiences[0],
            page,
            `design/${domain}.json`,
            digest(bytesOf(design))
        );
        const artifact = sessionArtifact(`pages/${page.id}.json`, pageContract);
        files.set(artifact.uri, artifact.document);
        const plan =
            page.actions.some((entry) => entry.kind === 'backend') ||
            page.loads.length
                ? compilePageExecutionPlan({
                      pageContract: artifact,
                      actionRequestModels: actionArtifacts,
                      listQueryModels: [queryArtifact],
                      applicationDesignSchema: schemas['application-design'],
                      pageExecutionPlanSchema: schemas['page-execution-plan'],
                  })
                : null;
        pages.set(page.id, { page, pageContract, artifact, plan });
    }
    for (const [id, entry] of actions)
        files.set(`definitions/${id}.json`, bytesOf(entry.definition));
    for (const [path, document] of files) {
        await mkdir(dirname(join(root, path)), { recursive: true });
        await writeFile(join(root, path), document);
    }
    const hostBindings = {
        schema_version: '1.1.0',
        kind: 'angular-page-host-bindings',
        session: { module: '../session', token: 'APPLICATION_SESSION' },
        services: {
            [domain + '-service']: {
                module: '../../../session',
                token: sessionEndpointToken(domain + '-service'),
            },
        },
    };
    const n = declared.names;
    const sessionResult = {
        [n.token]: { [n.secret]: 'fixture-token-value' },
        [n.subject]: {
            name: 'Fixture operator',
            toString: 'declared-own-string',
            is_admin: true,
            [n.privacy]: { [n.accepted]: null },
            [n.rotate]: true,
            [n.permissions]: [],
            [n.paths]: ['/catalogue', '/restricted', '/not-generated'],
            [n.menu]: [
                {
                    [n.label]: 'Catalogue',
                    [n.path]: null,
                    statut: 'ignored',
                    [n.children]: [
                        {
                            [n.label]: 'Items',
                            [n.path]: '/catalogue',
                            active: false,
                        },
                        {
                            [n.label]: 'Restricted',
                            [n.path]: '/restricted',
                            active: true,
                        },
                    ],
                },
            ],
            note: null,
        },
        challenge: false,
    };
    const wireResponse =
        domain === 'equipment-hire'
            ? sessionResult
            : {
                  [n.error]: false,
                  [n.message]: 'Connected',
                  payload: sessionResult,
              };
    return {
        root,
        domain,
        declared,
        names: n,
        contract,
        contractArtifact: backend,
        contracts,
        design,
        schemas,
        actions,
        queryModel,
        queryArtifact,
        pages,
        hostBindings,
        sessionResult,
        wireResponse,
        enterInput: { identity: 'demo', passphrase: 'fixture-passphrase' },
        commandResult: {
            [n.error]: false,
            [n.message]: 'Accepted',
            data: null,
        },
        inputFixtureOnly: true,
        networkVerified: false,
    };
}

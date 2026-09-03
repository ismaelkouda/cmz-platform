import { validateBackendContract } from '../core/backend-contract.mjs';

const POSTMAN_SCHEMA =
    'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';
const METADATA_VARIABLES = [
    'cmz_contract_id',
    'cmz_contract_version',
    'cmz_environment',
    'cmz_service_id',
    'cmz_source_id',
];

function fail(path, message) {
    throw new Error(`Postman ${path}: ${message}`);
}

function text(value, path) {
    const normalized =
        typeof value === 'string'
            ? value
            : typeof value?.content === 'string'
              ? value.content
              : undefined;
    if (!normalized?.trim()) fail(path, 'non-empty text is required');
    return normalized.trim();
}

function canonicalId(value, path) {
    const source = text(value, path);
    const id = source
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[^A-Za-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id))
        fail(
            path,
            `cannot derive a canonical id from ${JSON.stringify(source)}`
        );
    return id;
}

function proof(sourceId, locator) {
    return [{ source_id: sourceId, locator }];
}

function collectionVariables(document) {
    const variables = new Map();
    for (const [index, variable] of (document.variable ?? []).entries()) {
        const key = text(variable?.key, `#/variable/${index}/key`);
        if (variables.has(key))
            fail(`#/variable/${index}`, `duplicate variable ${key}`);
        if (typeof variable.value !== 'string' || variable.value.length === 0)
            fail(`#/variable/${index}/value`, 'string value is required');
        variables.set(key, variable.value);
    }
    for (const key of METADATA_VARIABLES) {
        if (!variables.has(key))
            fail('#/variable', `missing metadata variable ${key}`);
    }
    return variables;
}

function authKind(auth, path) {
    const type = auth?.type;
    if (type === 'bearer') return 'bearer';
    if (type === 'basic') return 'basic';
    if (type === 'apikey') return 'api-key';
    if (type === 'oauth2') return 'oauth2';
    if (type === 'noauth' || auth === null) return undefined;
    fail(path, `unsupported auth type ${JSON.stringify(type)}`);
}

function flattenItems(items, inheritedAuth, path = '#/item') {
    const result = [];
    for (const [index, item] of (items ?? []).entries()) {
        const locator = `${path}/${index}`;
        const auth = item.auth === undefined ? inheritedAuth : item.auth;
        if (item.request) {
            result.push({ item, auth, locator });
        } else if (Array.isArray(item.item)) {
            result.push(...flattenItems(item.item, auth, `${locator}/item`));
        } else {
            fail(locator, 'expected a request or a folder');
        }
    }
    return result;
}

function mediaTypeAndPrimitive(body, headers = []) {
    const contentType = headers.find(
        (header) =>
            header?.key?.toLowerCase() === 'content-type' && !header.disabled
    )?.value;
    if (typeof contentType === 'string' && contentType.length > 0) {
        return {
            mediaType: contentType.split(';')[0].trim(),
            primitive: contentType.toLowerCase().includes('json')
                ? 'json'
                : 'string',
        };
    }
    try {
        JSON.parse(body);
        return { mediaType: 'application/json', primitive: 'json' };
    } catch {
        return { mediaType: 'text/plain', primitive: 'string' };
    }
}

function requestUrl(request, variables, path) {
    const raw =
        typeof request.url === 'string'
            ? request.url
            : typeof request.url?.raw === 'string'
              ? request.url.raw
              : undefined;
    if (!raw) fail(`${path}/url`, 'raw URL is required');
    const base = variables.get('baseUrl');
    if (!base) fail('#/variable', 'baseUrl variable is required');
    const acceptedPrefixes = ['{{baseUrl}}', base.replace(/\/$/, '')];
    const prefix = acceptedPrefixes.find((candidate) =>
        raw.startsWith(candidate)
    );
    if (!prefix)
        fail(
            `${path}/url`,
            'URL must start with {{baseUrl}} or its exact value'
        );
    const withoutBase = raw.slice(prefix.length).split('#')[0];
    const [rawPath] = withoutBase.split('?');
    const route = (rawPath.startsWith('/') ? rawPath : `/${rawPath}`)
        .replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, '{$1}')
        .replace(/\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g, '{$1}');
    if (
        !/^\/(?:[A-Za-z0-9._~-]+|\{[A-Za-z_][A-Za-z0-9_]*\})(?:\/(?:[A-Za-z0-9._~-]+|\{[A-Za-z_][A-Za-z0-9_]*\}))*$/.test(
            route
        )
    )
        fail(`${path}/url`, `unsupported canonical path ${route}`);
    return route;
}

function urlObject(request) {
    return typeof request.url === 'object' && request.url ? request.url : {};
}

function projectParameters(request, route, sourceId, path) {
    const parameters = [];
    const url = urlObject(request);
    const pathDescriptions = new Map(
        (url.variable ?? []).map((entry, index) => [
            entry.key,
            text(
                entry.description,
                `${path}/url/variable/${index}/description`
            ),
        ])
    );
    for (const match of route.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)) {
        const name = match[1];
        if (!pathDescriptions.has(name))
            fail(
                `${path}/url/variable`,
                `missing described path variable ${name}`
            );
        parameters.push({
            name,
            in: 'path',
            description: pathDescriptions.get(name),
            required: true,
            type: { kind: 'primitive', name: 'string' },
            evidence: proof(sourceId, `${path}/url/variable/${name}`),
        });
    }
    for (const [index, query] of (url.query ?? []).entries()) {
        if (query.disabled) continue;
        parameters.push({
            name: text(query.key, `${path}/url/query/${index}/key`),
            in: 'query',
            description: text(
                query.description,
                `${path}/url/query/${index}/description`
            ),
            required: false,
            type: { kind: 'primitive', name: 'string' },
            evidence: proof(sourceId, `${path}/url/query/${index}`),
        });
    }
    for (const [index, header] of (request.header ?? []).entries()) {
        if (header.disabled) continue;
        const name = text(header.key, `${path}/header/${index}/key`);
        if (
            ['authorization', 'content-type', 'accept'].includes(
                name.toLowerCase()
            )
        )
            continue;
        parameters.push({
            name,
            in: 'header',
            description: text(
                header.description,
                `${path}/header/${index}/description`
            ),
            required: false,
            type: { kind: 'primitive', name: 'string' },
            evidence: proof(sourceId, `${path}/header/${index}`),
        });
    }
    return parameters;
}

function uniqueModel(models, model) {
    const existing = models.find((entry) => entry.id === model.id);
    if (existing) fail('#/item', `generated model id collision ${model.id}`);
    models.push(model);
}

function projectRequestBody(request, operationId, models, sourceId, path) {
    if (!request.body) return undefined;
    if (request.body.mode !== 'raw' || typeof request.body.raw !== 'string')
        fail(`${path}/body`, 'only raw bodies are supported without inference');
    const { mediaType, primitive } = mediaTypeAndPrimitive(
        request.body.raw,
        request.header
    );
    const modelId = `${operationId}-request-body`;
    uniqueModel(models, {
        id: modelId,
        kind: 'scalar',
        status: 'reference',
        description: `Opaque ${primitive} request body observed in Postman.`,
        type: { kind: 'primitive', name: primitive },
        evidence: proof(sourceId, `${path}/body/raw`),
    });
    return {
        required: false,
        media_types: [mediaType],
        model_id: modelId,
        evidence: proof(sourceId, `${path}/body`),
    };
}

function projectResponses(item, operationId, models, sourceId, path) {
    const responses = [];
    for (const [index, example] of (item.response ?? []).entries()) {
        const locator = `${path}/response/${index}`;
        if (
            !Number.isInteger(example.code) ||
            example.code < 100 ||
            example.code > 599
        )
            fail(`${locator}/code`, 'exact HTTP status is required');
        const response = {
            status: example.code,
            outcome:
                example.code >= 200 && example.code < 300 ? 'success' : 'error',
            description: text(
                example.status ?? example.name,
                `${locator}/status`
            ),
            evidence: proof(sourceId, locator),
        };
        if (typeof example.body === 'string' && example.body.length > 0) {
            const { mediaType, primitive } = mediaTypeAndPrimitive(
                example.body,
                example.header
            );
            const modelId = `${operationId}-response-${example.code}`;
            uniqueModel(models, {
                id: modelId,
                kind: 'scalar',
                status: 'reference',
                description: `Opaque ${primitive} response body observed in Postman.`,
                type: { kind: 'primitive', name: primitive },
                evidence: proof(sourceId, `${locator}/body`),
            });
            response.body = {
                media_type: mediaType,
                model_id: modelId,
                envelope: { kind: 'none' },
                evidence: proof(sourceId, `${locator}/body`),
            };
        }
        responses.push(response);
    }
    if (!responses.some((response) => response.outcome === 'success'))
        fail(
            `${path}/response`,
            'at least one saved success response is required'
        );
    return responses;
}

function normalizedBaseUrl(value) {
    let url;
    try {
        url = new URL(value);
    } catch {
        fail('#/variable/baseUrl', 'must be an absolute URL');
    }
    if (!['http:', 'https:'].includes(url.protocol))
        fail('#/variable/baseUrl', 'must use HTTP(S)');
    if (url.username || url.password)
        fail('#/variable/baseUrl', 'credentials are forbidden');
    url.pathname = url.pathname.endsWith('/')
        ? url.pathname
        : `${url.pathname}/`;
    return url.toString();
}

export function compilePostmanBackendContract({
    document,
    snapshotUri,
    snapshotSha256,
    backendContractSchema,
}) {
    if (document.info?.schema !== POSTMAN_SCHEMA)
        fail('#/info/schema', 'Postman Collection v2.1.0 is required');
    const variables = collectionVariables(document);
    const sourceId = canonicalId(
        variables.get('cmz_source_id'),
        '#/variable/cmz_source_id'
    );
    const serviceId = canonicalId(
        variables.get('cmz_service_id'),
        '#/variable/cmz_service_id'
    );
    const description = text(document.info.description, '#/info/description');
    const flattened = flattenItems(document.item, document.auth);
    const authKinds = new Map();
    for (const entry of flattened) {
        const kind = authKind(entry.auth, `${entry.locator}/auth`);
        if (kind) authKinds.set(kind, `${kind}-auth`);
    }
    const security_schemes = [...authKinds.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([kind, id]) => ({
            id,
            kind,
            status: 'reference',
            description: `${kind} authentication observed in the Postman collection.`,
            evidence: proof(sourceId, '#/auth'),
        }));
    const models = [];
    const operations = flattened.map(({ item, auth, locator }) => {
        const operationId = canonicalId(item.name, `${locator}/name`);
        const request = item.request;
        const route = requestUrl(request, variables, `${locator}/request`);
        const kind = authKind(auth, `${locator}/auth`);
        const body = projectRequestBody(
            request,
            operationId,
            models,
            sourceId,
            `${locator}/request`
        );
        return {
            id: operationId,
            service_id: serviceId,
            status: 'reference',
            description: text(
                request.description ?? item.description,
                `${locator}/request/description`
            ),
            method: text(
                request.method,
                `${locator}/request/method`
            ).toUpperCase(),
            path: route,
            access: kind
                ? {
                      mode: 'authenticated',
                      security_scheme_ids: [authKinds.get(kind)],
                      permissions: [],
                  }
                : { mode: 'public', security_scheme_ids: [], permissions: [] },
            request: {
                parameters: projectParameters(
                    request,
                    route,
                    sourceId,
                    `${locator}/request`
                ),
                ...(body ? { body } : {}),
            },
            responses: projectResponses(
                item,
                operationId,
                models,
                sourceId,
                locator
            ),
            evidence: proof(sourceId, locator),
        };
    });
    const contract = {
        schema_version: '1.0.0',
        kind: 'backend-contract',
        contract: {
            id: canonicalId(
                variables.get('cmz_contract_id'),
                '#/variable/cmz_contract_id'
            ),
            title: text(document.info.name, '#/info/name'),
            version: text(
                variables.get('cmz_contract_version'),
                '#/variable/cmz_contract_version'
            ),
            status: 'reference',
            description,
        },
        sources: [
            {
                id: sourceId,
                kind: 'postman',
                authority: 'observational',
                status: 'reference',
                snapshot_uri: snapshotUri,
                sha256: snapshotSha256,
            },
        ],
        services: [
            {
                id: serviceId,
                status: 'reference',
                description,
                base_urls: [
                    {
                        environment: canonicalId(
                            variables.get('cmz_environment'),
                            '#/variable/cmz_environment'
                        ),
                        url: normalizedBaseUrl(variables.get('baseUrl')),
                    },
                ],
                evidence: proof(sourceId, '#/variable/baseUrl'),
            },
        ],
        security_schemes,
        models,
        operations,
    };
    const errors = validateBackendContract(contract, backendContractSchema);
    if (errors.length > 0)
        fail('#', `canonical projection rejected:\n${errors.join('\n')}`);
    return contract;
}

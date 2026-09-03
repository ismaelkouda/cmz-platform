import { validateBackendContract } from '../core/backend-contract.mjs';

const HTTP_METHODS = [
    'get',
    'post',
    'put',
    'patch',
    'delete',
    'head',
    'options',
];
const METADATA_KEYS = [
    'authority',
    'contract_id',
    'lifecycle',
    'service_id',
    'source_id',
];
const LIFECYCLE_AUTHORITY = {
    reference: 'observational',
    planned: 'declared',
    implemented: 'authoritative',
};

function fail(path, message) {
    throw new Error(`OpenAPI ${path}: ${message}`);
}

function exactKeys(value, keys) {
    const actual = Object.keys(value ?? {}).sort();
    return (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        actual.length === keys.length &&
        actual.every((key, index) => key === keys[index])
    );
}

function requiredText(value, path) {
    if (typeof value !== 'string' || value.trim().length === 0)
        fail(path, 'non-empty text is required');
    return value.trim();
}

function canonicalId(value, path) {
    const source = requiredText(value, path);
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

function rejectUnsupportedSchema(schema, path) {
    for (const keyword of [
        'allOf',
        'anyOf',
        'oneOf',
        'not',
        'if',
        'then',
        'else',
    ]) {
        if (schema?.[keyword] !== undefined)
            fail(path, `${keyword} is not representable without loss`);
    }
}

function schemaBaseType(schema, path) {
    rejectUnsupportedSchema(schema, path);
    if (Array.isArray(schema?.type)) {
        const nonNull = schema.type.filter((entry) => entry !== 'null');
        if (nonNull.length !== 1 || schema.type.length > 2)
            fail(path, 'type union must contain exactly one non-null type');
        return { type: nonNull[0], nullable: schema.type.includes('null') };
    }
    return { type: schema?.type, nullable: schema?.nullable === true };
}

function constraintsOf(schema) {
    const result = {};
    const mapping = {
        minLength: 'min_length',
        maxLength: 'max_length',
        pattern: 'pattern',
        minimum: 'minimum',
        maximum: 'maximum',
        minItems: 'min_items',
        maxItems: 'max_items',
    };
    for (const [source, target] of Object.entries(mapping)) {
        if (schema[source] !== undefined) result[target] = schema[source];
    }
    return Object.keys(result).length > 0 ? result : undefined;
}

function primitiveName(schema, path) {
    const { type } = schemaBaseType(schema, path);
    if (type === 'string') {
        const formats = {
            date: 'date',
            'date-time': 'datetime',
            uuid: 'uuid',
            binary: 'binary',
        };
        return formats[schema.format] ?? 'string';
    }
    if (['integer', 'number', 'boolean'].includes(type)) return type;
    if (type === 'object' && schema.additionalProperties !== false)
        return 'json';
    fail(path, `unsupported primitive schema type ${JSON.stringify(type)}`);
}

function localReferenceName(reference, section, path) {
    const prefix = `#/components/${section}/`;
    if (typeof reference !== 'string' || !reference.startsWith(prefix))
        fail(path, 'only local component references are supported');
    const encoded = reference.slice(prefix.length);
    if (!encoded || encoded.includes('/'))
        fail(path, 'invalid local reference');
    return encoded.replaceAll('~1', '/').replaceAll('~0', '~');
}

function resolveComponent(value, section, components, path) {
    if (!value?.$ref) return value;
    if (Object.keys(value).length !== 1)
        fail(path, '$ref siblings are not supported');
    const name = localReferenceName(value.$ref, section, path);
    const resolved = components?.[section]?.[name];
    if (!resolved) fail(path, `unresolved component ${name}`);
    if (resolved.$ref) fail(path, 'reference chains are not supported');
    return resolved;
}

function typeRef(schema, schemaIds, path) {
    if (schema?.$ref) {
        const name = localReferenceName(schema.$ref, 'schemas', path);
        const modelId = schemaIds.get(name);
        if (!modelId) fail(path, `unresolved schema ${name}`);
        return { kind: 'model', model_id: modelId };
    }
    const { type } = schemaBaseType(schema, path);
    if (type === 'array') {
        if (!schema.items) fail(path, 'array items are required');
        return {
            kind: 'array',
            items: typeRef(schema.items, schemaIds, `${path}/items`),
        };
    }
    return { kind: 'primitive', name: primitiveName(schema, path) };
}

function createIdMap(entries, path) {
    const map = new Map();
    const used = new Map();
    for (const name of Object.keys(entries ?? {}).sort()) {
        const id = canonicalId(name, `${path}/${name}`);
        if (used.has(id))
            fail(
                path,
                `${name} and ${used.get(id)} normalize to the same id ${id}`
            );
        map.set(name, id);
        used.set(id, name);
    }
    return map;
}

function projectModels(document, sourceId, status) {
    const schemas = document.components?.schemas ?? {};
    const schemaIds = createIdMap(schemas, '#/components/schemas');
    const models = [];
    for (const [name, schema] of Object.entries(schemas).sort(([a], [b]) =>
        a.localeCompare(b)
    )) {
        const path = `#/components/schemas/${name}`;
        if (schema.$ref)
            fail(path, 'top-level schema aliases are not supported');
        const { type } = schemaBaseType(schema, path);
        const base = {
            id: schemaIds.get(name),
            status,
            description: requiredText(
                schema.description,
                `${path}/description`
            ),
            evidence: proof(sourceId, path),
        };
        if (type === 'object' && schema.properties) {
            if (
                schema.additionalProperties &&
                schema.additionalProperties !== false
            )
                fail(
                    path,
                    'object maps are not supported alongside declared fields'
                );
            const required = new Set(schema.required ?? []);
            const fields = Object.entries(schema.properties)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([fieldName, fieldSchema]) => {
                    const fieldPath = `${path}/properties/${fieldName}`;
                    const { nullable } = schemaBaseType(fieldSchema, fieldPath);
                    const allowedValues = fieldSchema.enum?.filter(
                        (value) => value !== null
                    );
                    return {
                        name: fieldName,
                        description: requiredText(
                            fieldSchema.description,
                            `${fieldPath}/description`
                        ),
                        required: required.has(fieldName),
                        nullable,
                        type: typeRef(fieldSchema, schemaIds, fieldPath),
                        ...(allowedValues?.length
                            ? { allowed_values: allowedValues }
                            : {}),
                        ...(constraintsOf(fieldSchema)
                            ? { constraints: constraintsOf(fieldSchema) }
                            : {}),
                        evidence: proof(sourceId, fieldPath),
                    };
                });
            models.push({ ...base, kind: 'object', fields });
        } else if (type === 'array') {
            if (!schema.items) fail(path, 'array items are required');
            models.push({
                ...base,
                kind: 'array',
                items: typeRef(schema.items, schemaIds, `${path}/items`),
            });
        } else {
            models.push({
                ...base,
                kind: 'scalar',
                type: { kind: 'primitive', name: primitiveName(schema, path) },
            });
        }
    }
    return { models, schemaIds };
}

function securityKind(scheme, path) {
    if (scheme.type === 'apiKey') return 'api-key';
    if (scheme.type === 'oauth2' || scheme.type === 'openIdConnect')
        return 'oauth2';
    if (scheme.type === 'http' && scheme.scheme === 'bearer') return 'bearer';
    if (scheme.type === 'http' && scheme.scheme === 'basic') return 'basic';
    if (scheme.type === 'mutualTLS') return 'other';
    fail(
        path,
        `unsupported security scheme ${scheme.type}/${scheme.scheme ?? ''}`
    );
}

function projectSecurity(document, sourceId, status) {
    const entries = document.components?.securitySchemes ?? {};
    const ids = createIdMap(entries, '#/components/securitySchemes');
    const security_schemes = Object.entries(entries)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, value]) => {
            const path = `#/components/securitySchemes/${name}`;
            const scheme = resolveComponent(
                value,
                'securitySchemes',
                document.components,
                path
            );
            return {
                id: ids.get(name),
                kind: securityKind(scheme, path),
                status,
                description: requiredText(
                    scheme.description,
                    `${path}/description`
                ),
                evidence: proof(sourceId, path),
            };
        });
    return { security_schemes, securityIds: ids };
}

function projectAccess(requirements, securityIds, path) {
    if (requirements === undefined || requirements.length === 0)
        return { mode: 'public', security_scheme_ids: [], permissions: [] };
    if (!Array.isArray(requirements) || requirements.length !== 1)
        fail(path, 'security alternatives are not representable without loss');
    const requirement = requirements[0];
    if (
        !requirement ||
        typeof requirement !== 'object' ||
        Array.isArray(requirement)
    )
        fail(path, 'invalid security requirement');
    const entries = Object.entries(requirement);
    if (entries.length === 0)
        return { mode: 'public', security_scheme_ids: [], permissions: [] };
    const schemeIds = [];
    const permissions = [];
    for (const [name, scopes] of entries) {
        if (!securityIds.has(name))
            fail(path, `unresolved security scheme ${name}`);
        if (
            !Array.isArray(scopes) ||
            scopes.some((scope) => typeof scope !== 'string')
        )
            fail(path, `invalid scopes for ${name}`);
        schemeIds.push(securityIds.get(name));
        permissions.push(...scopes);
    }
    return {
        mode: permissions.length > 0 ? 'authorized' : 'authenticated',
        security_scheme_ids: schemeIds.sort(),
        permissions: [...new Set(permissions)].sort(),
    };
}

function projectParameters(
    pathParameters,
    operationParameters,
    document,
    schemaIds,
    sourceId,
    path
) {
    const merged = [...(pathParameters ?? []), ...(operationParameters ?? [])];
    const seen = new Set();
    return merged.map((raw, index) => {
        const locator = `${path}/parameters/${index}`;
        const parameter = resolveComponent(
            raw,
            'parameters',
            document.components,
            locator
        );
        if (!['path', 'query', 'header'].includes(parameter.in))
            fail(locator, `unsupported parameter location ${parameter.in}`);
        const key = `${parameter.in}:${parameter.name}`;
        if (seen.has(key)) fail(locator, `duplicate parameter ${key}`);
        seen.add(key);
        if (!parameter.schema) fail(locator, 'schema is required');
        return {
            name: requiredText(parameter.name, `${locator}/name`),
            in: parameter.in,
            description: requiredText(
                parameter.description,
                `${locator}/description`
            ),
            required:
                parameter.in === 'path' ? true : parameter.required === true,
            type: typeRef(parameter.schema, schemaIds, `${locator}/schema`),
            ...(constraintsOf(parameter.schema)
                ? { constraints: constraintsOf(parameter.schema) }
                : {}),
            evidence: proof(sourceId, locator),
        };
    });
}

function referencedModelFromContent(content, schemaIds, path, allowMany) {
    const entries = Object.entries(content ?? {});
    if (entries.length === 0) return undefined;
    const refs = entries.map(([mediaType, media]) => ({
        mediaType,
        name: localReferenceName(
            media?.schema?.$ref,
            'schemas',
            `${path}/content/${mediaType}/schema`
        ),
    }));
    if (!allowMany && refs.length !== 1)
        fail(path, 'exactly one response media type is required');
    if (new Set(refs.map((entry) => entry.name)).size !== 1)
        fail(path, 'all request media types must reference the same model');
    const model_id = schemaIds.get(refs[0].name);
    if (!model_id) fail(path, `unresolved schema ${refs[0].name}`);
    return { refs, model_id };
}

function projectRequest(
    operation,
    document,
    schemaIds,
    sourceId,
    pathParameters,
    path
) {
    const request = {
        parameters: projectParameters(
            pathParameters,
            operation.parameters,
            document,
            schemaIds,
            sourceId,
            path
        ),
    };
    if (operation.requestBody) {
        const body = resolveComponent(
            operation.requestBody,
            'requestBodies',
            document.components,
            `${path}/requestBody`
        );
        const model = referencedModelFromContent(
            body.content,
            schemaIds,
            `${path}/requestBody`,
            true
        );
        if (!model) fail(`${path}/requestBody`, 'content is required');
        request.body = {
            required: body.required === true,
            media_types: model.refs.map((entry) => entry.mediaType).sort(),
            model_id: model.model_id,
            evidence: proof(sourceId, `${path}/requestBody`),
        };
    }
    return request;
}

function projectResponses(operation, document, schemaIds, sourceId, path) {
    const responses = [];
    for (const [statusText, raw] of Object.entries(
        operation.responses ?? {}
    ).sort(([a], [b]) => a.localeCompare(b))) {
        if (!/^[1-5][0-9]{2}$/.test(statusText))
            fail(
                `${path}/responses/${statusText}`,
                'only exact HTTP status codes are supported'
            );
        const locator = `${path}/responses/${statusText}`;
        const response = resolveComponent(
            raw,
            'responses',
            document.components,
            locator
        );
        if (response.headers && Object.keys(response.headers).length > 0)
            fail(
                locator,
                'response headers are not represented by the canonical contract'
            );
        if (response.links && Object.keys(response.links).length > 0)
            fail(
                locator,
                'response links are not represented by the canonical contract'
            );
        const model = referencedModelFromContent(
            response.content,
            schemaIds,
            locator,
            false
        );
        responses.push({
            status: Number(statusText),
            outcome: statusText.startsWith('2') ? 'success' : 'error',
            description: requiredText(
                response.description,
                `${locator}/description`
            ),
            ...(model
                ? {
                      body: {
                          media_type: model.refs[0].mediaType,
                          model_id: model.model_id,
                          envelope: { kind: 'none' },
                          evidence: proof(
                              sourceId,
                              `${locator}/content/${model.refs[0].mediaType}`
                          ),
                      },
                  }
                : {}),
            evidence: proof(sourceId, locator),
        });
    }
    return responses;
}

function projectOperations(
    document,
    sourceId,
    status,
    serviceId,
    schemaIds,
    securityIds
) {
    const operations = [];
    const usedIds = new Map();
    for (const [route, pathItem] of Object.entries(document.paths ?? {}).sort(
        ([a], [b]) => a.localeCompare(b)
    )) {
        if (pathItem.$ref)
            fail(`#/paths/${route}`, 'referenced path items are not supported');
        for (const method of HTTP_METHODS) {
            const operation = pathItem[method];
            if (!operation) continue;
            const path = `#/paths/${route}/${method}`;
            if (
                operation.callbacks &&
                Object.keys(operation.callbacks).length > 0
            )
                fail(
                    path,
                    'callbacks are not represented by the canonical contract'
                );
            if (operation.servers)
                fail(path, 'operation-level servers are not supported');
            const id = canonicalId(
                operation.operationId,
                `${path}/operationId`
            );
            if (usedIds.has(id))
                fail(path, `operation id collides with ${usedIds.get(id)}`);
            usedIds.set(id, path);
            operations.push({
                id,
                service_id: serviceId,
                status,
                description: requiredText(
                    operation.description ?? operation.summary,
                    `${path}/description`
                ),
                method: method.toUpperCase(),
                path: route,
                access: projectAccess(
                    operation.security ?? document.security ?? [],
                    securityIds,
                    `${path}/security`
                ),
                request: projectRequest(
                    operation,
                    document,
                    schemaIds,
                    sourceId,
                    pathItem.parameters,
                    path
                ),
                responses: projectResponses(
                    operation,
                    document,
                    schemaIds,
                    sourceId,
                    path
                ),
                evidence: proof(sourceId, path),
            });
        }
    }
    return operations;
}

function normalizedServers(servers) {
    if (!Array.isArray(servers) || servers.length === 0)
        fail('#/servers', 'at least one absolute server is required');
    const result = [];
    for (const [index, server] of servers.entries()) {
        const path = `#/servers/${index}`;
        const value = requiredText(server.url, `${path}/url`);
        if (value.includes('{'))
            fail(path, 'server variables are not supported');
        let url;
        try {
            url = new URL(value);
        } catch {
            fail(path, 'server URL must be absolute');
        }
        if (!['http:', 'https:'].includes(url.protocol))
            fail(path, 'server URL must use HTTP(S)');
        if (url.username || url.password)
            fail(path, 'server URL must never contain credentials');
        if (url.search || url.hash)
            fail(path, 'server URL must not contain query or fragment data');
        url.pathname = url.pathname.endsWith('/')
            ? url.pathname
            : `${url.pathname}/`;
        result.push({
            environment: canonicalId(
                server['x-cmz-environment'],
                `${path}/x-cmz-environment`
            ),
            url: url.toString(),
        });
    }
    return result.sort((a, b) => a.environment.localeCompare(b.environment));
}

export function compileOpenApiBackendContract({
    document,
    snapshotUri,
    snapshotSha256,
    backendContractSchema,
}) {
    if (!/^3\.(?:0|1|2)\.[0-9]+$/.test(document.openapi ?? ''))
        fail('#/openapi', 'only OpenAPI 3.0, 3.1 and 3.2 are supported');
    if (document.webhooks && Object.keys(document.webhooks).length > 0)
        fail('#/webhooks', 'webhooks are not represented by this contract');
    const metadata = document['x-cmz-contract'];
    if (!exactKeys(metadata, METADATA_KEYS))
        fail(
            '#/x-cmz-contract',
            `keys must be exactly ${METADATA_KEYS.join(', ')}`
        );
    const status = metadata.lifecycle;
    if (!Object.hasOwn(LIFECYCLE_AUTHORITY, status))
        fail(
            '#/x-cmz-contract/lifecycle',
            'expected reference, planned or implemented'
        );
    if (metadata.authority !== LIFECYCLE_AUTHORITY[status])
        fail(
            '#/x-cmz-contract/authority',
            `${status} requires ${LIFECYCLE_AUTHORITY[status]}`
        );
    const sourceId = canonicalId(
        metadata.source_id,
        '#/x-cmz-contract/source_id'
    );
    const serviceId = canonicalId(
        metadata.service_id,
        '#/x-cmz-contract/service_id'
    );
    const { models, schemaIds } = projectModels(document, sourceId, status);
    const { security_schemes, securityIds } = projectSecurity(
        document,
        sourceId,
        status
    );
    const contract = {
        schema_version: '1.0.0',
        kind: 'backend-contract',
        contract: {
            id: canonicalId(
                metadata.contract_id,
                '#/x-cmz-contract/contract_id'
            ),
            title: requiredText(document.info?.title, '#/info/title'),
            version: requiredText(document.info?.version, '#/info/version'),
            status,
            description: requiredText(
                document.info?.description,
                '#/info/description'
            ),
        },
        sources: [
            {
                id: sourceId,
                kind: 'openapi',
                authority: metadata.authority,
                status,
                snapshot_uri: snapshotUri,
                sha256: snapshotSha256,
            },
        ],
        services: [
            {
                id: serviceId,
                status,
                description: requiredText(
                    document.info?.description,
                    '#/info/description'
                ),
                base_urls: normalizedServers(document.servers),
                evidence: proof(sourceId, '#/servers'),
            },
        ],
        security_schemes,
        models,
        operations: projectOperations(
            document,
            sourceId,
            status,
            serviceId,
            schemaIds,
            securityIds
        ),
    };
    const errors = validateBackendContract(contract, backendContractSchema);
    if (errors.length > 0)
        fail('#', `canonical projection rejected:\n${errors.join('\n')}`);
    return contract;
}

import { pascalCase } from './shared.mjs';

// A backend primitive becomes renderable only after its runtime decoder has an
// executable oracle on every active target.
export const LIST_QUERY_V2_SUPPORTED_PRIMITIVES = new Set([
    'integer',
    'string',
]);

export const LIST_QUERY_V2_SUPPORTED_INPUT_PRIMITIVES = new Set([
    'boolean',
    'integer',
    'string',
]);

const LIST_QUERY_V2_PAGE_FIELDS = [
    'currentPage',
    'lastPage',
    'pageSize',
    'totalItems',
];

export function exactKeys(value, expected) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const actual = Object.keys(value).sort();
    const sortedExpected = [...expected].sort();
    return (
        actual.length === sortedExpected.length &&
        actual.every((key, index) => key === sortedExpected[index])
    );
}

function fail(renderer, message) {
    throw new Error(`${renderer} list-query v2 renderer: ${message}`);
}

function occurrenceCount(value, token) {
    return value.split(token).length - 1;
}

function property(name) {
    return JSON.stringify(name);
}

export function listQueryV2TypeScriptPrimitive(
    type,
    renderer,
    supported = LIST_QUERY_V2_SUPPORTED_PRIMITIVES
) {
    if (type?.kind !== 'primitive' || !supported.has(type.name)) {
        fail(
            renderer,
            `unsupported wire primitive ${type?.kind}:${type?.name ?? ''}`
        );
    }
    if (type.name === 'integer') return 'number';
    return type.name;
}

function fieldType(field, renderer) {
    const base =
        field.type.kind === 'array'
            ? `readonly ${listQueryV2TypeScriptPrimitive(field.type.items, renderer)}[]`
            : listQueryV2TypeScriptPrimitive(field.type, renderer);
    const nullable = field.nullable ? `${base} | null` : base;
    return field.required ? nullable : `${nullable} | undefined`;
}

function renderInterface(model, renderer) {
    const fields = model.fields
        .map(
            (field) =>
                `    readonly ${property(field.name)}${field.required ? '' : '?'}: ${fieldType(field, renderer)};`
        )
        .join('\n');
    return `export interface ${pascalCase(model.id)} {\n${fields}\n}`;
}

function renderInputInterface(query, renderer) {
    const fields = query.port.input.fields
        .map(
            (field) =>
                `    readonly ${property(field.name)}${field.required ? '' : '?'}: ${listQueryV2TypeScriptPrimitive(field.type, renderer, LIST_QUERY_V2_SUPPORTED_INPUT_PRIMITIVES)};`
        )
        .join('\n');
    return `export interface ${pascalCase(query.id)}Input {\n${fields}\n}`;
}

function renderPageInterface(query) {
    const readName = pascalCase(query.read_model.id);
    const fields = LIST_QUERY_V2_PAGE_FIELDS.map(
        (name) => `    readonly ${property(name)}: number;`
    ).join('\n');
    return `export interface ${pascalCase(query.id)}Page {\n    readonly items: readonly ${readName}[];\n${fields}\n}`;
}

export function renderListQueryV2Models(query, renderer) {
    const input =
        query.port.input.kind === 'object'
            ? `\n\n${renderInputInterface(query, renderer)}`
            : '';
    const page =
        query.transport.result.kind === 'page'
            ? `\n\n${renderPageInterface(query)}`
            : '';
    return `${renderInterface(query.wire_model, renderer)}\n\n${renderInterface(query.read_model, renderer)}${input}${page}\n`;
}

function primitiveCheck(field, variable) {
    if (field.type.name === 'integer') {
        return `typeof ${variable} === 'number' && Number.isInteger(${variable})`;
    }
    return `typeof ${variable} === 'string'`;
}

function renderConstraintChecks(field) {
    const checks = [];
    const constraints = field.constraints ?? {};
    if (constraints.min_length !== undefined) {
        checks.push(
            `    if (value.length < ${constraints.min_length}) invalid(path, 'min length ${constraints.min_length}');`
        );
    }
    if (constraints.max_length !== undefined) {
        checks.push(
            `    if (value.length > ${constraints.max_length}) invalid(path, 'max length ${constraints.max_length}');`
        );
    }
    if (constraints.pattern !== undefined) {
        checks.push(
            `    if (!new RegExp(${JSON.stringify(constraints.pattern)}).test(value)) invalid(path, 'declared pattern');`
        );
    }
    if (constraints.minimum !== undefined) {
        checks.push(
            `    if (value < ${constraints.minimum}) invalid(path, 'minimum ${constraints.minimum}');`
        );
    }
    if (constraints.maximum !== undefined) {
        checks.push(
            `    if (value > ${constraints.maximum}) invalid(path, 'maximum ${constraints.maximum}');`
        );
    }
    if (constraints.min_items !== undefined) {
        checks.push(
            `    if (value.length < ${constraints.min_items}) invalid(path, 'min items ${constraints.min_items}');`
        );
    }
    if (constraints.max_items !== undefined) {
        checks.push(
            `    if (value.length > ${constraints.max_items}) invalid(path, 'max items ${constraints.max_items}');`
        );
    }
    if (field.type.kind === 'primitive' && field.allowed_values) {
        checks.push(
            `    if (!${JSON.stringify(field.allowed_values)}.some((allowed) => Object.is(allowed, value))) invalid(path, 'declared value');`
        );
    }
    return checks.join('\n');
}

function renderFieldDecoder(field, index, renderer) {
    const name = `decodeField${index}`;
    const returnType = fieldType(field, renderer);
    const expectedType =
        field.type.kind === 'array' ? 'array' : field.type.name;
    const absent = field.required
        ? `invalid(path, '${expectedType}');`
        : 'return undefined;';
    const nullable = field.nullable
        ? 'return null;'
        : `invalid(path, '${expectedType}');`;
    const constraints = renderConstraintChecks(field);
    if (field.type.kind === 'array') {
        const itemCheck = primitiveCheck({ type: field.type.items }, 'item');
        const allowed = field.allowed_values
            ? `\n        if (!${JSON.stringify(field.allowed_values)}.some((allowed) => Object.is(allowed, item))) invalid(\`\${path}[\${itemIndex}]\`, 'declared value');`
            : '';
        return `function ${name}(record: Readonly<Record<string, unknown>>, basePath: string): ${returnType} {
    const path = \`\${basePath}.${field.name}\`;
    const value = record[${property(field.name)}];
    if (value === undefined) ${absent}
    if (value === null) ${nullable}
    if (!Array.isArray(value)) invalid(path, 'array');
${constraints}
    return value.map((item, itemIndex) => {
        if (!(${itemCheck})) invalid(\`\${path}[\${itemIndex}]\`, '${field.type.items.name}');${allowed}
        return item;
    });
}`;
    }
    return `function ${name}(record: Readonly<Record<string, unknown>>, basePath: string): ${returnType} {
    const path = \`\${basePath}.${field.name}\`;
    const value = record[${property(field.name)}];
    if (value === undefined) ${absent}
    if (value === null) ${nullable}
    if (!(${primitiveCheck(field, 'value')})) invalid(path, '${field.type.name}');
${constraints}
    return value;
}`;
}

export function renderListQueryV2Decoder(
    query,
    renderer,
    errorsModule = '@cmz/shared-domain'
) {
    const decoderName = `decode${pascalCase(query.id)}Response`;
    const wireName = pascalCase(query.wire_model.id);
    const readName = pascalCase(query.read_model.id);
    const isPage = query.transport.result.kind === 'page';
    const pageName = `${pascalCase(query.id)}Page`;
    const outputName = isPage ? pageName : `readonly ${readName}[]`;
    const importedModels = [readName, wireName, ...(isPage ? [pageName] : [])]
        .sort()
        .join(', ');
    const fieldDecoders = query.wire_model.fields
        .map((field, index) => renderFieldDecoder(field, index, renderer))
        .join('\n\n');
    const wireFields = query.wire_model.fields
        .map(
            (field, index) =>
                `        ${property(field.name)}: decodeField${index}(record, path),`
        )
        .join('\n');
    const readFields = query.read_model.fields
        .map(
            (field) =>
                `        ${property(field.name)}: wire[${property(field.source_field)}],`
        )
        .join('\n');
    const envelope = query.transport.envelope;
    const resultPath =
        envelope.kind === 'object' ? `$.${envelope.data_field}` : '$';
    const collectionPath = isPage
        ? `${resultPath}.${query.transport.result.items_field}`
        : resultPath;
    const collectionExpression =
        envelope.kind === 'object'
            ? `    const envelope = asRecord(payload, '$');
    const error = envelope[${property(envelope.error_field)}];
    const message = envelope[${property(envelope.message_field)}];
    if (typeof error !== 'boolean') invalid('$.${envelope.error_field}', 'boolean');
    if (typeof message !== 'string') invalid('$.${envelope.message_field}', 'string');
    if (error) throw new ServerResponseError(message);
    const result = envelope[${property(envelope.data_field)}];`
            : '    const result = payload;';
    const pageExpression = isPage
        ? `    const page = asRecord(result, ${JSON.stringify(resultPath)});
    const collection = page[${property(query.transport.result.items_field)}];`
        : '    const collection = result;';
    const pageChecks = isPage
        ? LIST_QUERY_V2_PAGE_FIELDS.map(
              (name) => query.transport.result.page_fields[name]
          )
              .map(
                  (
                      field,
                      index
                  ) => `    const pageField${index} = page[${property(field.source_field)}];
    if (typeof pageField${index} !== 'number' || !Number.isInteger(pageField${index})) invalid(${JSON.stringify(`${resultPath}.${field.source_field}`)}, 'integer');`
              )
              .join('\n')
        : '';
    const decodedItems =
        'collection.map((item, index) => mapReadModel(decodeWireItem(item, index)))';
    const resultExpression = isPage
        ? `    return {
        items: ${decodedItems},
${LIST_QUERY_V2_PAGE_FIELDS.map(
    (name, index) => `        ${property(name)}: pageField${index},`
).join('\n')}
    };`
        : `    return ${decodedItems};`;
    return `import { InvalidPayloadError, ServerResponseError } from '${errorsModule}';

import type { ${importedModels} } from './models';

function invalid(path: string, expected: string): never {
    throw new InvalidPayloadError(path, expected);
}

function asRecord(value: unknown, path: string): Readonly<Record<string, unknown>> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        invalid(path, 'object');
    }
    return value as Readonly<Record<string, unknown>>;
}

${fieldDecoders}

const WIRE_FIELDS = new Set(${JSON.stringify(query.wire_model.fields.map((field) => field.name))});

function decodeWireItem(value: unknown, index: number): ${wireName} {
    const path = ${JSON.stringify(collectionPath)} + \`[\${index}]\`;
    const record = asRecord(value, path);
    for (const key of Object.keys(record)) {
        if (!WIRE_FIELDS.has(key)) invalid(\`\${path}.\${key}\`, 'declared field');
    }
    return {
${wireFields}
    };
}

function mapReadModel(wire: ${wireName}): ${readName} {
    return {
${readFields}
    };
}

export function ${decoderName}(payload: unknown): ${outputName} {
${collectionExpression}
${pageExpression}
    if (!Array.isArray(collection)) invalid(${JSON.stringify(collectionPath)}, 'array');
${pageChecks}
${resultExpression}
}
`;
}

export function renderListQueryV2RequestPath(query, inputName) {
    const checks = query.transport.parameters
        .map((binding, index) => {
            const constraints = binding.constraints ?? {};
            const lines = [
                `    const parameter${index} = input[${property(binding.source_field)}];`,
                `    if (typeof parameter${index} !== 'string') invalidInput('$.${binding.source_field}', 'string');`,
            ];
            if (constraints.min_length !== undefined) {
                lines.push(
                    `    if (parameter${index}.length < ${constraints.min_length}) invalidInput('$.${binding.source_field}', 'min length ${constraints.min_length}');`
                );
            }
            lines.push(
                `    path = path.replace(${JSON.stringify(`{${binding.name}}`)}, encodeURIComponent(parameter${index}));`
            );
            return lines.join('\n');
        })
        .join('\n');
    return `function invalidInput(path: string, expected: string): never {
    throw new InvalidPayloadError(path, expected);
}

function requestPath(input: ${inputName}): string {
    let path = ${JSON.stringify(query.transport.path)};
${checks}
    return path;
}`;
}

function validateField(field, queryId, renderer) {
    if (field.type?.kind === 'array') {
        if (
            field.type.items?.kind !== 'primitive' ||
            field.type.items.name !== 'string' ||
            field.required !== true ||
            field.nullable !== false ||
            !Array.isArray(field.allowed_values) ||
            field.allowed_values.length === 0 ||
            field.allowed_values.some((value) => typeof value !== 'string')
        ) {
            fail(
                renderer,
                `${queryId}.${field.name} requires the proven required enum string-array shape`
            );
        }
        const constraints = field.constraints ?? {};
        for (const key of Object.keys(constraints)) {
            if (!['max_items', 'min_items'].includes(key)) {
                fail(
                    renderer,
                    `${queryId}.${field.name} has unsupported array constraint ${key}`
                );
            }
        }
        return;
    }
    listQueryV2TypeScriptPrimitive(field.type, renderer);
    const primitive = field.type.name;
    const constraints = field.constraints ?? {};
    const supportedConstraints =
        primitive === 'string'
            ? ['max_length', 'min_length', 'pattern']
            : ['maximum', 'minimum'];
    if (
        !constraints ||
        typeof constraints !== 'object' ||
        Array.isArray(constraints)
    ) {
        fail(
            renderer,
            `${queryId}.${field.name} constraints must be an object`
        );
    }
    for (const key of Object.keys(constraints)) {
        if (!supportedConstraints.includes(key)) {
            fail(
                renderer,
                `${queryId}.${field.name} has unsupported ${primitive} constraint ${key}`
            );
        }
    }
    for (const allowed of field.allowed_values ?? []) {
        const valid =
            primitive === 'string'
                ? typeof allowed === 'string'
                : typeof allowed === 'number' && Number.isInteger(allowed);
        if (!valid) {
            fail(
                renderer,
                `${queryId}.${field.name} has an invalid allowed value`
            );
        }
    }
}

function validateExecution(query, renderer) {
    const execution = query.controller?.execution;
    const supported =
        execution?.concurrency === 'latest-wins' &&
        execution.cancellation?.on_superseded === true &&
        execution.cancellation?.on_destroy === true &&
        execution.retry?.mode === 'none' &&
        execution.stale_data?.on_reload === 'preserve' &&
        execution.stale_data?.on_error === 'preserve' &&
        query.request_policy?.cache?.mode === 'host' &&
        query.request_policy.cache.refresh === 'bypass' &&
        ['principal', 'public'].includes(query.request_policy.cache.scope);
    if (!supported) {
        const displayName =
            renderer === 'angular'
                ? 'Angular'
                : renderer === 'react'
                  ? 'React'
                  : renderer;
        const article = renderer === 'angular' ? 'an' : 'a';
        fail(
            renderer,
            `${query.id} uses an execution policy without ${article} ${displayName} oracle`
        );
    }
}

function validQueryParameter(field, binding) {
    if (
        !field ||
        !binding ||
        field.name !== binding.source_field ||
        binding.in !== 'query' ||
        typeof binding.required !== 'boolean' ||
        field.required !== binding.required ||
        JSON.stringify(field.type) !== JSON.stringify(binding.type) ||
        JSON.stringify(field.constraints ?? {}) !==
            JSON.stringify(binding.constraints ?? {}) ||
        field.type?.kind !== 'primitive' ||
        !LIST_QUERY_V2_SUPPORTED_INPUT_PRIMITIVES.has(field.type.name)
    ) {
        return false;
    }
    const constraints = field.constraints ?? {};
    const supportedConstraints =
        field.type.name === 'string'
            ? ['max_length', 'min_length', 'pattern']
            : field.type.name === 'integer'
              ? ['maximum', 'minimum']
              : [];
    if (
        !Object.keys(constraints).every((key) =>
            supportedConstraints.includes(key)
        )
    ) {
        return false;
    }
    for (const key of ['max_length', 'min_length']) {
        if (
            constraints[key] !== undefined &&
            (!Number.isInteger(constraints[key]) || constraints[key] < 0)
        ) {
            return false;
        }
    }
    for (const key of ['maximum', 'minimum']) {
        if (
            constraints[key] !== undefined &&
            !Number.isInteger(constraints[key])
        ) {
            return false;
        }
    }
    if (
        constraints.min_length !== undefined &&
        constraints.max_length !== undefined &&
        constraints.min_length > constraints.max_length
    ) {
        return false;
    }
    if (
        constraints.minimum !== undefined &&
        constraints.maximum !== undefined &&
        constraints.minimum > constraints.maximum
    ) {
        return false;
    }
    if (constraints.pattern !== undefined) {
        if (typeof constraints.pattern !== 'string') return false;
        try {
            new RegExp(constraints.pattern);
        } catch {
            return false;
        }
    }
    return true;
}

function validateResult(query, renderer, capabilities) {
    const result = query.transport?.result;
    const output = query.port?.output;
    if (result?.kind === 'list' && output?.kind === 'list') return;
    if (result?.kind !== 'page' || output?.kind !== 'page') {
        fail(renderer, `${query.id} uses an unsupported result shape`);
    }
    if (capabilities.page !== true) {
        fail(renderer, `${query.id} uses pagination without a runtime oracle`);
    }
    if (
        !exactKeys(result, [
            'kind',
            'page_model_id',
            'items_field',
            'page_fields',
        ]) ||
        !exactKeys(result.page_fields, LIST_QUERY_V2_PAGE_FIELDS) ||
        Object.values(result.page_fields).some(
            (field) =>
                !exactKeys(field, ['source_field', 'type']) ||
                typeof field.source_field !== 'string' ||
                field.type !== 'integer'
        ) ||
        new Set(
            Object.values(result.page_fields).map((field) => field.source_field)
        ).size !== 4
    ) {
        fail(renderer, `${query.id} requires the proven canonical page shape`);
    }
}

export function assertListQueryV2RendererModel(
    model,
    renderer,
    capabilities = {}
) {
    if (model?.kind !== 'list-query-execution-model') {
        fail(renderer, 'expected list-query-execution-model');
    }
    if (model.queries?.length !== 1) {
        fail(renderer, 'the first active renderer requires exactly one query');
    }
    const query = model.queries[0];
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(query.id)) {
        fail(renderer, `unsafe query id ${query.id}`);
    }
    validateResult(query, renderer, capabilities);
    const parameterBindings = query.transport?.parameters;
    if (query.port?.input?.kind === 'none') {
        if (!Array.isArray(parameterBindings) || parameterBindings.length > 0) {
            fail(renderer, `${query.id} has parameters without business input`);
        }
    } else if (query.port?.input?.kind === 'object') {
        const fields = query.port.input.fields ?? [];
        const bindingNames = (parameterBindings ?? []).map(
            (binding) => binding.name
        );
        const bindingSources = (parameterBindings ?? []).map(
            (binding) => binding.source_field
        );
        const isProvenPath =
            fields.length === 1 &&
            parameterBindings?.length === 1 &&
            fields[0].name === parameterBindings[0].source_field &&
            fields[0].type?.kind === 'primitive' &&
            fields[0].type.name === 'string' &&
            fields[0].required === true &&
            parameterBindings[0].in === 'path' &&
            parameterBindings[0].required === true &&
            occurrenceCount(
                query.transport.path,
                `{${parameterBindings[0].name}}`
            ) === 1 &&
            JSON.stringify(parameterBindings[0].constraints ?? {}) ===
                JSON.stringify({ min_length: 1 });
        if (!isProvenPath) {
            if (
                capabilities.queryParameters !== true ||
                fields.length === 0 ||
                fields.length !== parameterBindings?.length ||
                new Set(bindingNames).size !== bindingNames.length ||
                new Set(bindingSources).size !== bindingSources.length ||
                !fields.every(
                    (field, index) =>
                        validQueryParameter(field, parameterBindings[index]) &&
                        /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(
                            parameterBindings[index].name
                        ) &&
                        occurrenceCount(
                            query.transport.path,
                            `{${parameterBindings[index].name}}`
                        ) === 0
                )
            ) {
                fail(
                    renderer,
                    `${query.id} requires the proven single non-empty string path input or typed query parameters with a runtime oracle`
                );
            }
        }
    } else {
        fail(renderer, `${query.id} requires unsupported business input`);
    }
    if (query.transport?.method !== 'GET') {
        fail(
            renderer,
            `${query.id} requires unsupported method ${query.transport?.method}`
        );
    }
    if (
        query.transport?.media_type !== 'application/json' ||
        query.transport?.envelope?.kind !== 'object'
    ) {
        fail(renderer, `${query.id} requires the proven JSON object envelope`);
    }
    if ((query.access?.permissions ?? []).length > 0) {
        fail(renderer, `${query.id} requires an unsupported permission gate`);
    }
    validateExecution(query, renderer);
    const authentication = query.request_policy?.authentication;
    if (
        authentication?.mode === 'omit' &&
        !exactKeys(authentication, ['mode'])
    ) {
        fail(
            renderer,
            `${query.id} public authentication must use the closed omit shape`
        );
    }
    if (authentication?.mode === 'host') {
        if (
            !exactKeys(authentication, ['mode', 'schemes']) ||
            !Array.isArray(authentication.schemes)
        ) {
            fail(
                renderer,
                `${query.id} host authentication must use the closed shape`
            );
        }
        const kinds = authentication.schemes.map((scheme) => scheme.kind);
        if (kinds.length !== 1 || kinds[0] !== 'bearer') {
            fail(
                renderer,
                `${query.id} host authentication supports exactly one bearer scheme`
            );
        }
    }
    if (!['host', 'omit'].includes(authentication?.mode)) {
        fail(renderer, `${query.id} uses unsupported authentication`);
    }
    for (const field of query.wire_model.fields) {
        validateField(field, query.id, renderer);
    }
    return query;
}

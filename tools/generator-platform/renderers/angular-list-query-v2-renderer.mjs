import { pascalCase } from './shared.mjs';

// Keep this deliberately smaller than the backend schema. A primitive becomes
// renderable only after its runtime decoder has an executable oracle.
const SUPPORTED_PRIMITIVES = new Set(['integer', 'string']);

function fail(message) {
    throw new Error(`angular list-query v2 renderer: ${message}`);
}

function exactKeys(value, expected) {
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

function typeScriptPrimitive(type) {
    if (type.kind !== 'primitive' || !SUPPORTED_PRIMITIVES.has(type.name)) {
        fail(`unsupported wire primitive ${type.kind}:${type.name ?? ''}`);
    }
    return type.name === 'integer' ? 'number' : 'string';
}

function fieldType(field) {
    const base =
        field.type.kind === 'array'
            ? `readonly ${typeScriptPrimitive(field.type.items)}[]`
            : typeScriptPrimitive(field.type);
    const nullable = field.nullable ? `${base} | null` : base;
    return field.required ? nullable : `${nullable} | undefined`;
}

function occurrenceCount(value, token) {
    return value.split(token).length - 1;
}

function property(name) {
    return JSON.stringify(name);
}

function renderInterface(model) {
    const fields = model.fields
        .map(
            (field) =>
                `    readonly ${property(field.name)}${field.required ? '' : '?'}: ${fieldType(field)};`
        )
        .join('\n');
    return `export interface ${pascalCase(model.id)} {\n${fields}\n}`;
}

function renderModels(query) {
    const input =
        query.port.input.kind === 'object'
            ? `\n\n${renderInputInterface(query)}`
            : '';
    return `${renderInterface(query.wire_model)}\n\n${renderInterface(query.read_model)}${input}\n`;
}

function renderInputInterface(query) {
    const fields = query.port.input.fields
        .map(
            (field) =>
                `    readonly ${property(field.name)}: ${typeScriptPrimitive(field.type)};`
        )
        .join('\n');
    return `export interface ${pascalCase(query.id)}Input {\n${fields}\n}`;
}

function primitiveCheck(field, variable) {
    const expected = field.type.name;
    if (expected === 'integer') {
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

function renderFieldDecoder(field, index) {
    const name = `decodeField${index}`;
    const returnType = fieldType(field);
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

function renderDecoder(query) {
    const decoderName = `decode${pascalCase(query.id)}Response`;
    const wireName = pascalCase(query.wire_model.id);
    const readName = pascalCase(query.read_model.id);
    const fieldDecoders = query.wire_model.fields
        .map(renderFieldDecoder)
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
    const collectionPath =
        envelope.kind === 'object' ? `$.${envelope.data_field}` : '$';
    const collectionExpression =
        envelope.kind === 'object'
            ? `    const envelope = asRecord(payload, '$');
    const error = envelope[${property(envelope.error_field)}];
    const message = envelope[${property(envelope.message_field)}];
    if (typeof error !== 'boolean') invalid('$.${envelope.error_field}', 'boolean');
    if (typeof message !== 'string') invalid('$.${envelope.message_field}', 'string');
    if (error) throw new ServerResponseError(message);
    const collection = envelope[${property(envelope.data_field)}];`
            : '    const collection = payload;';
    return `import { InvalidPayloadError, ServerResponseError } from '@cmz/shared-domain';

import type { ${readName}, ${wireName} } from './models';

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

export function ${decoderName}(payload: unknown): readonly ${readName}[] {
${collectionExpression}
    if (!Array.isArray(collection)) invalid(${JSON.stringify(collectionPath)}, 'array');
    return collection.map((item, index) => mapReadModel(decodeWireItem(item, index)));
}
`;
}

function renderSource(query, binding) {
    const className = `${pascalCase(query.id)}Source`;
    const decoderName = `decode${pascalCase(query.id)}Response`;
    const readName = pascalCase(query.read_model.id);
    const hasInput = query.port.input.kind === 'object';
    const inputName = `${pascalCase(query.id)}Input`;
    const modelImports = hasInput ? `${inputName}, ${readName}` : readName;
    const inputParameter = hasInput ? `input: ${inputName}, ` : '';
    const path = hasInput
        ? 'requestPath(input)'
        : JSON.stringify(query.transport.path);
    const requestPath = hasInput ? renderRequestPath(query, inputName) : '';
    const invalidPayloadImport = hasInput
        ? "import { InvalidPayloadError } from '@cmz/shared-domain';\n"
        : '';
    const policy = JSON.stringify(
        {
            authentication: {
                mode: query.request_policy.authentication.mode,
            },
            cache: query.request_policy.cache,
        },
        null,
        4
    );
    return `import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { createListQueryRequestContext, ${binding.token}, type ListQueryRequestPolicy } from '${binding.module}';
${invalidPayloadImport}import { map, type Observable } from 'rxjs';

import { ${decoderName} } from './${query.id}.decoder';
import type { ${modelImports} } from './models';

const REQUEST_POLICY: ListQueryRequestPolicy = ${policy};

function joinUrl(baseUrl: string, path: string): string {
    return [baseUrl.replace(/\\/$/, ''), path.replace(/^\\//, '')].join('/');
}

${requestPath}

@Service({ autoProvided: false })
export class ${className} {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(${binding.token});

    readAll(${inputParameter}isRefresh: boolean): Observable<readonly ${readName}[]> {
        const context = createListQueryRequestContext(REQUEST_POLICY, { isRefresh });
        return this.http
            .get<unknown>(joinUrl(this.baseUrl, ${path}), { context })
            .pipe(map(${decoderName}));
    }
}
`;
}

function renderRequestPath(query, inputName) {
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

function renderFacade(query) {
    const className = `${pascalCase(query.id)}Facade`;
    const sourceName = `${pascalCase(query.id)}Source`;
    const readName = pascalCase(query.read_model.id);
    const hasInput = query.port.input.kind === 'object';
    const inputName = `${pascalCase(query.id)}Input`;
    const modelImports = hasInput ? `${inputName}, ${readName}` : readName;
    const queryInputField = hasInput
        ? `\n    readonly input: ${inputName};`
        : '';
    const sourceInput = hasInput ? 'params.input, ' : '';
    const loadInputParameter = hasInput ? `input: ${inputName}, ` : '';
    const loadInputValue = hasInput ? ' input,' : '';
    return `import { Service, computed, effect, inject, signal } from '@angular/core';
import { ResourceFacade, type ResourceStreamContext } from '@cmz/shared-application';
import { type Observable } from 'rxjs';

import { ${sourceName} } from './${query.id}.source';
import type { ${modelImports} } from './models';

interface LoadOptions {
    readonly forceRefresh?: boolean;
}

interface QueryParams {
    readonly forceRefresh: boolean;
${queryInputField}
}

export type ${pascalCase(query.id)}State = 'idle' | 'loading' | 'success' | 'empty' | 'error' | 'reloading';

@Service({ autoProvided: false })
export class ${className} extends ResourceFacade<readonly ${readName}[], QueryParams> {
    private readonly source = inject(${sourceName});
    private readonly lastResolvedItems = signal<readonly ${readName}[]>([]);

    readonly items = computed(
        () => this.value() ?? this.lastResolvedItems()
    );
    readonly state = computed<${pascalCase(query.id)}State>(() => {
        const status = this.status();
        if (status === 'resolved' || status === 'local') {
            return this.items().length === 0 ? 'empty' : 'success';
        }
        return status;
    });

    constructor() {
        super();
        effect(() => {
            const status = this.status();
            const value = this.value();
            if ((status === 'resolved' || status === 'local') && value) {
                this.lastResolvedItems.set(value);
            }
        });
    }

    protected stream(
        params: QueryParams,
        context: ResourceStreamContext
    ): Observable<readonly ${readName}[]> {
        const isRefresh =
            params.forceRefresh || context.previousStatus !== 'idle';
        return this.source.readAll(${sourceInput}isRefresh);
    }

    load(${loadInputParameter}options: LoadOptions = {}): void {
        this.setParams({${loadInputValue} forceRefresh: options.forceRefresh ?? false });
    }
}
`;
}

function validateField(field, queryId) {
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
                `${queryId}.${field.name} requires the proven required enum string-array shape`
            );
        }
        const constraints = field.constraints ?? {};
        for (const key of Object.keys(constraints)) {
            if (!['max_items', 'min_items'].includes(key)) {
                fail(
                    `${queryId}.${field.name} has unsupported array constraint ${key}`
                );
            }
        }
        return;
    }
    typeScriptPrimitive(field.type);
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
        fail(`${queryId}.${field.name} constraints must be an object`);
    }
    for (const key of Object.keys(constraints)) {
        if (!supportedConstraints.includes(key)) {
            fail(
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
            fail(`${queryId}.${field.name} has an invalid allowed value`);
        }
    }
}

function validateExecution(query) {
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
        fail(`${query.id} uses an execution policy without an Angular oracle`);
    }
}

function validateInput(model, hostBindings) {
    if (model?.kind !== 'list-query-execution-model') {
        fail('expected list-query-execution-model');
    }
    if (model.queries?.length !== 1) {
        fail('the first active renderer requires exactly one query');
    }
    if (!exactKeys(hostBindings, ['services'])) {
        fail('host bindings must use the closed services shape');
    }
    if (
        !hostBindings.services ||
        typeof hostBindings.services !== 'object' ||
        Array.isArray(hostBindings.services)
    ) {
        fail('host bindings services must be an object');
    }
    const query = model.queries[0];
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(query.id)) {
        fail(`unsafe query id ${query.id}`);
    }
    const parameterBindings = query.transport?.parameters;
    if (query.port?.input?.kind === 'none') {
        if (!Array.isArray(parameterBindings) || parameterBindings.length > 0) {
            fail(`${query.id} has parameters without business input`);
        }
    } else if (query.port?.input?.kind === 'object') {
        const fields = query.port.input.fields ?? [];
        if (
            fields.length !== 1 ||
            parameterBindings?.length !== 1 ||
            fields[0].name !== parameterBindings[0].source_field ||
            fields[0].type?.kind !== 'primitive' ||
            fields[0].type.name !== 'string' ||
            fields[0].required !== true ||
            parameterBindings[0].in !== 'path' ||
            parameterBindings[0].required !== true ||
            occurrenceCount(
                query.transport.path,
                `{${parameterBindings[0].name}}`
            ) !== 1 ||
            JSON.stringify(parameterBindings[0].constraints ?? {}) !==
                JSON.stringify({ min_length: 1 })
        ) {
            fail(
                `${query.id} requires the proven single non-empty string path input`
            );
        }
    } else {
        fail(`${query.id} requires unsupported business input`);
    }
    if (query.transport?.method !== 'GET') {
        fail(
            `${query.id} requires unsupported method ${query.transport?.method}`
        );
    }
    if (
        query.transport?.media_type !== 'application/json' ||
        query.transport?.envelope?.kind !== 'object'
    ) {
        fail(`${query.id} requires the proven JSON object envelope`);
    }
    if ((query.access?.permissions ?? []).length > 0) {
        fail(`${query.id} requires an unsupported permission gate`);
    }
    validateExecution(query);
    const authentication = query.request_policy?.authentication;
    if (
        authentication?.mode === 'omit' &&
        !exactKeys(authentication, ['mode'])
    ) {
        fail(
            `${query.id} public authentication must use the closed omit shape`
        );
    }
    if (authentication?.mode === 'host') {
        if (
            !exactKeys(authentication, ['mode', 'schemes']) ||
            !Array.isArray(authentication.schemes)
        ) {
            fail(`${query.id} host authentication must use the closed shape`);
        }
        const kinds = authentication.schemes.map((scheme) => scheme.kind);
        if (kinds.length !== 1 || kinds[0] !== 'bearer') {
            fail(
                `${query.id} host authentication supports exactly one bearer scheme`
            );
        }
    }
    if (!['host', 'omit'].includes(authentication?.mode)) {
        fail(`${query.id} uses unsupported authentication`);
    }
    const binding = hostBindings.services[query.transport.service_id];
    if (!binding || !exactKeys(binding, ['module', 'token'])) {
        fail(`missing closed host binding for ${query.transport.service_id}`);
    }
    if (
        !/^[@A-Za-z0-9][@A-Za-z0-9._/-]*$/.test(binding.module) ||
        !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(binding.token)
    ) {
        fail(`unsafe host binding for ${query.transport.service_id}`);
    }
    for (const field of query.wire_model.fields) validateField(field, query.id);
    return { query, binding };
}

export function renderAngularListQueryV2(model, hostBindings) {
    const { query, binding } = validateInput(model, hostBindings);
    const files = {
        'src/models.ts': renderModels(query),
        [`src/${query.id}.decoder.ts`]: renderDecoder(query),
        [`src/${query.id}.source.ts`]: renderSource(query, binding),
        [`src/${query.id}.facade.ts`]: renderFacade(query),
        'src/index.ts': `export * from './models';\nexport * from './${query.id}.decoder';\nexport * from './${query.id}.source';\nexport * from './${query.id}.facade';\n`,
    };
    return { files, queryId: query.id };
}

export const angularListQueryV2RendererInternals = {
    supportedPrimitives: SUPPORTED_PRIMITIVES,
};

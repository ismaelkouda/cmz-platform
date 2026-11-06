import { pascalCase } from './shared.mjs';

const property = (name) => JSON.stringify(name);
const graphName = (id) => pascalCase(id.replaceAll('.', '-'));
const nameOf = (model) => graphName(model.id);
const PRIMITIVE_DECODERS = new Map(
    Object.entries({
        boolean: 'Boolean',
        string: 'String',
        uuid: 'Uuid',
        integer: 'Integer',
        number: 'Number',
        null: 'Null',
    })
);

function fail() {
    throw new Error('AR_GRAPH_RENDER_UNSUPPORTED');
}

function typeOf(type) {
    if (type.kind === 'model') return graphName(type.model_id);
    if (type.kind === 'array') return `readonly (${typeOf(type.items)})[]`;
    if (type.kind !== 'primitive') fail();
    if (['integer', 'number'].includes(type.name)) return 'number';
    if (['uuid', 'string'].includes(type.name)) return 'string';
    if (['boolean', 'null'].includes(type.name)) return type.name;
    fail();
}

function fieldType(field) {
    const base = typeOf(field.type);
    return field.nullable && base !== 'null' ? `${base} | null` : base;
}

function objectType(model, name = nameOf(model)) {
    const fields = model.fields.map(
        (field) =>
            `    readonly ${property(field.name)}${field.required ? '' : '?'}: ${fieldType(field)};`
    );
    if (model.additional_properties) {
        const union = [
            ...new Set([
                typeOf(model.additional_properties),
                ...model.fields.map(fieldType),
                ...(model.fields.some((field) => !field.required)
                    ? ['undefined']
                    : []),
            ]),
        ].join(' | ');
        fields.push(`    readonly [key: string]: ${union};`);
    }
    return `export interface ${name} {\n${fields.join('\n')}\n}`;
}

function referencedModels(type, result = new Set()) {
    if (type?.kind === 'model') result.add(graphName(type.model_id));
    if (type?.kind === 'array') referencedModels(type.items, result);
    return result;
}

function modelReferences(model) {
    const names = new Set();
    for (const field of model.fields ?? []) referencedModels(field.type, names);
    referencedModels(
        model.additional_properties ?? model.items ?? model.type,
        names
    );
    return names;
}

function typeImports(names) {
    return names.size
        ? `import type { ${[...names].sort().join(', ')} } from './models';\n`
        : '';
}

export function actionGraphRequestTypeName(action) {
    if (!action.request_model.id) return null;
    const name = nameOf(action.request_model);
    return action.model_graph.some(
        (model) => model.id === action.request_model.id
    )
        ? name
        : `${name}RequestBody`;
}

export function renderActionGraphModels(action) {
    const names = action.model_graph.map(nameOf);
    const inputName = `${pascalCase(action.id)}Input`;
    const resultName = nameOf(action.result_model);
    names.push(
        inputName,
        resultName,
        'ActionRequestDiagnostic',
        'ActionRequestFailure'
    );
    const requestName = actionGraphRequestTypeName(action);
    if (
        requestName &&
        !action.model_graph.some(
            (model) => model.id === action.request_model.id
        )
    )
        names.push(requestName);
    if (
        new Set(names).size !== names.length ||
        names.some((name) => !/^[A-Z][A-Za-z0-9]*$/.test(name))
    )
        fail();
    const files = {};
    const localNames = new Set();
    const models = action.model_graph.map((model) => {
        const type =
            model.kind === 'array'
                ? { kind: 'array', items: model.items }
                : model.type;
        const content =
            model.kind === 'object'
                ? objectType(model)
                : `export type ${nameOf(model)} = ${typeOf(type)};`;
        files[`src/response.${model.id}.types.ts`] =
            typeImports(modelReferences(model)) + content + '\n';
        return `export type { ${nameOf(model)} } from './response.${model.id}.types';`;
    });
    if (
        requestName &&
        !action.model_graph.some(
            (model) => model.id === action.request_model.id
        )
    )
        models.push(objectType(action.request_model, requestName));
    for (const field of [
        ...action.port.input.fields,
        ...action.result_model.fields,
    ])
        referencedModels(field.type, localNames);
    models.push(
        action.port.input.kind === 'none'
            ? `export type ${inputName} = Readonly<Record<string, never>>;`
            : objectType({ fields: action.port.input.fields }, inputName)
    );
    models.push(objectType(action.result_model));
    models.push(`export interface ActionRequestDiagnostic {
    readonly kind: 'request' | 'fields' | 'unauthenticated' | 'forbidden' | 'transport' | 'invalid-response' | 'invalid-input';
    readonly status: number;
    readonly message: string;
    readonly fields: Readonly<Record<string, readonly string[]>>;
}`);
    const graphIds = new Map(
        action.model_graph.map((model) => [nameOf(model), model.id])
    );
    files['src/models.ts'] =
        [...localNames]
            .sort()
            .map(
                (name) =>
                    `import type { ${name} } from './response.${graphIds.get(name)}.types';\n`
            )
            .join('') +
        models.join('\n\n') +
        '\n';
    return files;
}

function decodeType(type, value = 'value', budget = 'budget') {
    if (type.kind === 'model')
        return `decodeModel${graphName(type.model_id)}(${value}, ${budget})`;
    if (type.kind === 'array')
        return `decodeArray(${value}, ${budget}, (item, next) => ${decodeType(type.items, 'item', 'next')})`;
    const primitive = PRIMITIVE_DECODERS.get(type.name);
    if (!primitive) fail();
    return `decode${primitive}(${value}, ${budget})`;
}

function constraints(field) {
    const checks = [];
    for (const [key, bound] of Object.entries(field.constraints ?? {})) {
        const operand = [
            'min_length',
            'max_length',
            'min_items',
            'max_items',
        ].includes(key)
            ? 'decoded.length'
            : 'decoded';
        const operator = ['min_length', 'min_items', 'minimum'].includes(key)
            ? '<'
            : '>';
        checks.push(
            `    if (${operand} ${operator} ${JSON.stringify(bound)}) invalid();`
        );
    }
    if (field.format === 'email')
        checks.push(
            `    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(decoded)) invalid();`
        );
    if (field.allowed_values)
        checks.push(
            `    if (!${JSON.stringify(field.allowed_values)}.some((allowed) => Object.is(allowed, decoded))) invalid();`
        );
    return checks.join('\n');
}

function runtimeCalls(source) {
    return source
        .replace(
            /\b(newBudget|invalid|take|container|freezeRecord|asRecord|ownKeys|readOwn|required|optional|decodeBoolean|decodeString|decodeUuid|decodeInteger|decodeNumber|decodeNull|decodeArray|diagnostic|at|text)\(/g,
            'response.$1('
        )
        .replace(/\bBudget\b/g, 'response.Budget')
        .replace(
            /new ActionRequestFailure\(/g,
            'new response.ActionRequestFailure('
        );
}

function modelDecoder(model) {
    const name = nameOf(model);
    const files = {};
    const dependencies = modelReferences(model);
    // Filenames retain the canonical id; imported symbols use its checked TS name.
    const header =
        typeImports(new Set([name, ...dependencies])) +
        "import * as response from './response-runtime';\n";
    if (model.kind !== 'object') {
        const type =
            model.kind === 'array'
                ? { kind: 'array', items: model.items }
                : model.type;
        files[`src/response.${model.id}.decoder.ts`] =
            header +
            runtimeCalls(
                `export function decodeModel${name}(value: unknown, budget: Budget): ${name} {\n    return ${decodeType(type)};\n}`
            );
        return { files, dependencies };
    }
    for (const [index, field] of model.fields.entries()) {
        const source = `export function decode${name}Field${index}(value: unknown, budget: Budget): ${fieldType(field)} {
${field.nullable && field.type.name !== 'null' ? '    if (value === null) { take(budget); return null; }\n' : ''}    const decoded = ${decodeType(field.type)};
${constraints(field)}
    return decoded;
}`;
        files[`src/response.${model.id}.field${index}.ts`] =
            typeImports(referencedModels(field.type)) +
            "import * as response from './response-runtime';\n" +
            runtimeCalls(source);
    }
    const reads = model.fields.map(
        (field, index) =>
            `        const field${index} = ${field.required ? 'required' : 'optional'}(record, ${property(field.name)}, budget, decode${name}Field${index});`
    );
    const assignments = model.fields.map((field, index) =>
        field.required
            ? `            [${property(field.name)}]: field${index},`
            : `            ...(field${index} === undefined ? {} : { [${property(field.name)}]: field${index} }),`
    );
    const known = JSON.stringify(model.fields.map((field) => field.name));
    const extra = model.additional_properties
        ? `        const extras: Record<string, ${typeOf(model.additional_properties)}> = Object.create(null);
        const extraKeys = keys.filter((key) => !known.has(key));
        if (extraKeys.length > 128) invalid();
        for (const key of extraKeys) Object.defineProperty(extras, key, { value: ${decodeType(model.additional_properties, 'readOwn(record, key)')}, enumerable: true });`
        : `        if (keys.some((key) => !known.has(key))) invalid();`;
    const fieldImports = model.fields
        .map(
            (field, index) =>
                `import { decode${name}Field${index} } from './response.${model.id}.field${index}';`
        )
        .join('\n');
    files[`src/response.${model.id}.decoder.ts`] =
        typeImports(
            new Set([name, ...referencedModels(model.additional_properties)])
        ) +
        "import * as response from './response-runtime';\n" +
        fieldImports +
        '\n' +
        runtimeCalls(`
export function decodeModel${name}(value: unknown, budget: Budget): ${name} {
    return container(budget, () => {
        const record = asRecord(value);
        const keys = ownKeys(record);
        const known = new Set<string>(${known});
${extra}
${reads.join('\n')}
        return freezeRecord({
${model.additional_properties ? '            ...extras,\n' : ''}${assignments.join('\n')}
        });
    });
}`);
    return { files, dependencies };
}

function envelopeDecoder(name, modelId, envelope, failure) {
    if (!['none', 'object', 'status-object'].includes(envelope.kind)) fail();
    if (envelope.kind === 'none')
        return `function ${name}(payload: unknown, budget: Budget): ${graphName(modelId)} { return decodeModel${graphName(modelId)}(payload, budget); }`;
    const fields = [
        envelope.error_field,
        envelope.message_field,
        ...(envelope.kind === 'object' ? [envelope.data_field] : []),
    ];
    return `function ${name}(payload: unknown, budget: Budget): ${graphName(modelId)} {
    const outer = asRecord(payload);
    const allowed = new Set<string>(${JSON.stringify(fields)});
    if (ownKeys(outer).some((key) => !allowed.has(key)) && ${envelope.kind === 'object'}) invalid();
    const rejected = decodeBoolean(readOwn(outer, ${property(envelope.error_field)}), budget);
    ${failure ? '' : 'const message = '}decodeString(readOwn(outer, ${property(envelope.message_field)}), budget);
    if (rejected !== ${failure}) {
${failure ? '        invalid();' : "        throw new ActionRequestFailure(diagnostic('request', 200, message));"}
    }
    return decodeModel${graphName(modelId)}(${envelope.kind === 'object' ? `readOwn(outer, ${property(envelope.data_field)})` : 'payload'}, budget);
}`;
}

function primitiveDecoders(action) {
    const used = new Set();
    const visit = (type) => {
        if (type.kind === 'primitive') used.add(type.name);
        if (type.kind === 'array') {
            used.add('array');
            visit(type.items);
        }
    };
    for (const model of action.model_graph) {
        if (model.kind === 'object') {
            for (const field of model.fields) visit(field.type);
            if (model.additional_properties) visit(model.additional_properties);
        } else
            visit(
                model.kind === 'array'
                    ? { kind: 'array', items: model.items }
                    : model.type
            );
    }
    if (
        [
            action.transport.envelope,
            ...action.failures.http_responses.map((entry) => entry.envelope),
        ].some((envelope) => envelope && envelope.kind !== 'none')
    ) {
        used.add('boolean');
        used.add('string');
    }
    if (used.has('uuid')) used.add('string');
    if (used.has('integer')) used.add('number');
    const sources = {
        string: `function decodeString(value: unknown, budget: Budget): string { take(budget); if (typeof value !== 'string' || value.length > 8192) invalid(); return value; }`,
        uuid: `function decodeUuid(value: unknown, budget: Budget): string { const text = decodeString(value, budget); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) invalid(); return text; }`,
        boolean: `function decodeBoolean(value: unknown, budget: Budget): boolean { take(budget); if (typeof value !== 'boolean') invalid(); return value; }`,
        number: `function decodeNumber(value: unknown, budget: Budget): number { take(budget); if (typeof value !== 'number' || !Number.isFinite(value)) invalid(); return value; }`,
        integer: `function decodeInteger(value: unknown, budget: Budget): number { const number = decodeNumber(value, budget); if (!Number.isInteger(number)) invalid(); return number; }`,
        null: `function decodeNull(value: unknown, budget: Budget): null { take(budget); if (value !== null) invalid(); return null; }`,
        array: `function decodeArray<T>(value: unknown, budget: Budget, decode: (value: unknown, budget: Budget) => T): readonly T[] {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > 2048 || Reflect.ownKeys(value).length !== value.length + 1) invalid();
    return container(budget, () => {
        const items: T[] = [];
        for (let index = 0; index < value.length; index++) {
            const entry = Object.getOwnPropertyDescriptor(value, String(index));
            if (!entry || !Object.hasOwn(entry, 'value') || !entry.enumerable) invalid();
            items.push(decode(entry.value, budget));
        }
        return Object.freeze(items);
    });
}`,
    };
    return [...used]
        .map((name) => (Object.hasOwn(sources, name) ? sources[name] : fail()))
        .join('\n');
}

export function renderActionGraphDecoder(action) {
    const resultName = nameOf(action.result_model);
    const errorBodies = action.failures.http_responses.filter(
        (response) => response.body_model_id !== null
    );
    const bodyDecoders = errorBodies.map((response) =>
        envelopeDecoder(
            `decodeHttp${response.status}Body`,
            response.body_model_id,
            response.envelope,
            true
        )
    );
    const hasFields = action.error_presentations.some(
        (entry) => entry.fields_pointer !== undefined
    );
    const fields = action.model_graph.flatMap((model) => model.fields ?? []);
    const decodeErrors = action.error_presentations.map((presentation) => {
        const fields =
            presentation.fields_pointer === undefined
                ? ''
                : `
                const rawMap = at(body, ${property(presentation.fields_pointer)});
                const fieldMap = rawMap === undefined || rawMap === null ? Object.freeze(Object.create(null)) : asRecord(rawMap);
                for (const binding of INPUT_BINDINGS) {
                    const raw = readOwn(fieldMap, binding.wire);
                    if (raw === undefined) continue;
                    if (!Array.isArray(raw) || raw.length > 16) invalid();
                    Object.defineProperty(fields, binding.input, { value: Object.freeze(raw.map((entry: unknown) => { if (typeof entry !== 'string') invalid(); return text(entry); })), enumerable: true });
                }`;
        return `        case ${presentation.status}: {
            try {
${presentation.status_pointer === undefined ? '' : `                if (at(body, ${property(presentation.status_pointer)}) !== status) invalid();\n`}${presentation.error_flag_pointer === undefined ? '' : `                if (at(body, ${property(presentation.error_flag_pointer)}) !== true) invalid();\n`}                const message = at(body, ${property(presentation.message_pointer)});
                if (message !== undefined && message !== null && typeof message !== 'string') invalid();
                const fields: Record<string, readonly string[]> = Object.create(null);${fields}
                return diagnostic(Object.keys(fields).length ? 'fields' : ${presentation.status === 401 ? "'unauthenticated'" : presentation.status === 403 ? "'forbidden'" : "'request'"}, status, typeof message === 'string' ? message : undefined, fields);
            } catch { return diagnostic('invalid-response', status); }
        }`;
    });
    const output = action.result_model.fields.map((field) =>
        field.required
            ? `        [${property(field.name)}]: wire[${property(field.source_field)}],`
            : `        ...(wire[${property(field.source_field)}] === undefined ? {} : { [${property(field.name)}]: wire[${property(field.source_field)}] }),`
    );
    const runtime = `import type { ActionRequestDiagnostic } from './models';

export interface Budget { nodes: number; depth: number; }
export const newBudget = (): Budget => ({ nodes: 32768, depth: 0 });
function invalid(): never { throw new ActionRequestFailure(diagnostic('invalid-response', 0)); }
function take(budget: Budget): void { if (--budget.nodes < 0) invalid(); }
function container<T>(budget: Budget, decode: () => T): T {
    take(budget);
    if (++budget.depth > 32) invalid();
    try { return decode(); } finally { --budget.depth; }
}
function freezeRecord<T extends object>(value: T): Readonly<T> { Object.setPrototypeOf(value, null); return Object.freeze(value); }
function asRecord(value: unknown): Readonly<Record<string, unknown>> {
    if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid();
    return value as Readonly<Record<string, unknown>>;
}
function ownKeys(record: Readonly<Record<string, unknown>>): string[] {
    const keys = Reflect.ownKeys(record);
    if (keys.length > 160 || keys.some((key) => typeof key !== 'string' || key.length > 256 || !Object.getOwnPropertyDescriptor(record, key)?.enumerable)) invalid();
    return Object.keys(record);
}
function readOwn(record: object, key: string): unknown {
    const entry = Object.getOwnPropertyDescriptor(record, key);
    if (!entry) return undefined;
    if (!Object.hasOwn(entry, 'value') || !entry.enumerable) invalid();
    return entry.value;
}
${
    fields.some((field) => field.required)
        ? `function required<T>(record: Readonly<Record<string, unknown>>, key: string, budget: Budget, decode: (value: unknown, budget: Budget) => T): T {
    const value = readOwn(record, key); if (value === undefined) invalid(); return decode(value, budget);
}`
        : ''
}
${
    fields.some((field) => !field.required)
        ? `function optional<T>(record: Readonly<Record<string, unknown>>, key: string, budget: Budget, decode: (value: unknown, budget: Budget) => T): T | undefined {
    const value = readOwn(record, key); return value === undefined ? undefined : decode(value, budget);
}`
        : ''
}
${primitiveDecoders(action)}
${
    action.error_presentations.length
        ? `function at(value: unknown, pointer: string): unknown {
    let current = value;
    if (!pointer) return current;
    for (const encoded of pointer.slice(1).split('/')) {
        const key = encoded.replaceAll('~1', '/').replaceAll('~0', '~');
        if (Array.isArray(current)) {
            if (!/^(0|[1-9][0-9]*)$/.test(key) || !Object.hasOwn(current, key)) return undefined;
            current = current[Number(key)];
        } else { if (!current || typeof current !== 'object') return undefined; current = readOwn(asRecord(current), key); }
    }
    return current;
}`
        : ''
}
function text(value: string): string { return value.replace(/[\\u0000-\\u001f\\u007f]/g, ' ').slice(0, 256).trim(); }
export function diagnostic(kind: ActionRequestDiagnostic['kind'], status: number, message?: string, fields: Readonly<Record<string, readonly string[]>> = Object.freeze(Object.create(null))): ActionRequestDiagnostic {
    const normalized: Record<string, readonly string[]> = Object.create(null);
    const record = asRecord(fields);
    const keys = ownKeys(record);
    if (keys.length > 32) invalid();
    for (const key of keys) {
        const value = readOwn(record, key);
        if (!Array.isArray(value) || value.length > 16) invalid();
        const messages: string[] = [];
        for (let index = 0; index < value.length; index++) {
            const entry = readOwn(value, String(index));
            if (typeof entry !== 'string') invalid(); messages.push(text(entry));
        }
        Object.defineProperty(normalized, key, { value: Object.freeze(messages), enumerable: true });
    }
    const category = ['request', 'fields', 'unauthenticated', 'forbidden', 'transport', 'invalid-response', 'invalid-input'].includes(kind) ? kind : 'invalid-response';
    const code = Number.isInteger(status) && status >= 0 && status <= 599 ? status : 0;
    return freezeRecord({ kind: category, status: code, message: message ? text(message) : 'La requête ne peut pas être traitée.', fields: Object.freeze(normalized) });
}
export class ActionRequestFailure extends Error {
    readonly code = 'ACTION_REQUEST_FAILURE';
    readonly #diagnostic: ActionRequestDiagnostic;
    constructor(value: ActionRequestDiagnostic) { super('La requête ne peut pas être traitée.'); this.name = 'ActionRequestFailure'; this.#diagnostic = value; }
    get diagnostic(): ActionRequestDiagnostic { return this.#diagnostic; }
}
`;
    const source = `export { ActionRequestFailure, diagnostic } from './response-runtime';
${hasFields ? `const INPUT_BINDINGS: readonly { readonly wire: string; readonly input: string }[] = ${JSON.stringify(action.request_model.fields.map((field) => ({ wire: field.name, input: field.source_field })))};` : ''}

${envelopeDecoder('decodeSuccessBody', action.transport.response_model_id, action.transport.envelope, false)}

${bodyDecoders.join('\n\n')}

const ERROR_BODY_DECODERS: Readonly<Record<number, (payload: unknown, budget: Budget) => unknown>> = Object.freeze(Object.assign(Object.create(null), {
${errorBodies.map((entry) => `    [${entry.status}]: decodeHttp${entry.status}Body,`).join('\n')}
}));

export function decode${pascalCase(action.id)}Response(payload: unknown): ${resultName} {
    try {
    const wire = decodeSuccessBody(payload, newBudget());
    return freezeRecord({
${output.join('\n')}
    });
    } catch (error) {
        if (error instanceof response.ActionRequestFailure) throw error;
        throw new ActionRequestFailure(diagnostic('invalid-response', 0));
    }
}
export function decode${pascalCase(action.id)}Failure(status: number, payload: unknown): ActionRequestDiagnostic {
    if (!Number.isInteger(status) || status < 0 || status > 599) return diagnostic('invalid-response', 0);
    const decode = ERROR_BODY_DECODERS[status];
${action.error_presentations.length ? '    let body: unknown;\n' : ''}    if (decode) { try { ${action.error_presentations.length ? 'body = ' : ''}decode(payload, newBudget()); } catch { return diagnostic('invalid-response', status); } }
    switch (status) {
${decodeErrors.join('\n')}
        default: return diagnostic(status === 401 ? 'unauthenticated' : status === 403 ? 'forbidden' : status === 0 ? 'transport' : 'request', status);
    }
}
`;
    const localTypes = new Set([
        resultName,
        'ActionRequestDiagnostic',
        graphName(action.transport.response_model_id),
        ...errorBodies.map((response) => graphName(response.body_model_id)),
    ]);
    const files = {
        'src/response-runtime.ts': runtime.replace(
            /^function /gm,
            'export function '
        ),
        [`src/${action.id}.decoder.ts`]:
            typeImports(localTypes) +
            "import * as response from './response-runtime';\n" +
            runtimeCalls(source),
    };
    for (const model of action.model_graph)
        Object.assign(files, modelDecoder(model).files);
    for (const [path, content] of Object.entries(files)) {
        const imports = action.model_graph
            .filter(
                (model) =>
                    path !== `src/response.${model.id}.decoder.ts` &&
                    content.includes(`decodeModel${nameOf(model)}(`)
            )
            .map(
                (model) =>
                    `import { decodeModel${nameOf(model)} } from './response.${model.id}.decoder';`
            );
        if (imports.length) files[path] = imports.join('\n') + '\n' + content;
    }
    return files;
}

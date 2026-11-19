import { isDeepStrictEqual } from 'node:util';

import { selectedOpenApiPrimitives } from './openapi-adapter.mjs';
import {
    assertObservationSchema,
    loadObservationModelInputs,
    observationDiagnostic,
    rejectObservation,
} from '../core/runtime-observation-evidence.mjs';

// R1 only: project one explicitly secured request and its reachable models.
// No servers, response examples, lifecycle metadata or source text is emitted.
export function projectSelectedOpenApiRequest(
    document,
    binding,
    sourceId,
    options = {}
) {
    const fail = () => rejectObservation('OBS_OPENAPI');
    const {
        projectModels,
        projectRequest,
        projectSecurity,
        projectAccess,
        canonicalId,
        localReferenceName,
        resolveComponent,
        methods: HTTP_METHODS,
    } = selectedOpenApiPrimitives;
    const { path: route, method, operation_id: id } = binding;
    const own = (object, key) =>
        object && Object.hasOwn(object, key) ? object[key] : undefined;
    const verb = method.toLowerCase();
    const item = own(document.paths, route);
    const operation = own(item, verb);
    if (
        !/^3\.(?:0|1|2)\.[0-9]+$/.test(document.openapi ?? '') ||
        !HTTP_METHODS.includes(verb) ||
        !operation ||
        item.$ref ||
        operation.servers ||
        item.servers ||
        operation.callbacks ||
        (item.parameters?.length ?? 0) !== 0 ||
        canonicalId(operation.operationId, '#') !== id
    )
        fail('#', 'selected request is not supported');
    const requirements = Object.hasOwn(operation, 'security')
        ? operation.security
        : own(document, 'security');
    if (!Array.isArray(requirements))
        fail('#', 'explicit security is required');
    const { security_schemes, securityIds } = projectSecurity(
        document,
        sourceId,
        'reference'
    );
    const access = projectAccess(requirements, securityIds, '#');
    const selected = Object.create(null);
    const visiting = new Set();
    function visit(value) {
        if (!value || typeof value !== 'object') return;
        if (value.$ref) {
            const name = localReferenceName(value.$ref, 'schemas', '#');
            if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name) || visiting.has(name))
                fail('#', 'unsupported component identity or cycle');
            if (Object.hasOwn(selected, name)) return;
            const schema = own(document.components?.schemas, name);
            if (!schema) fail('#', 'missing selected component');
            visiting.add(name);
            visit(schema);
            visiting.delete(name);
            selected[name] = schema;
            return;
        }
        // Enumerations/patterns and raw values need a separate public-content
        // policy. Never drop them silently or copy them into the R1 result.
        if (
            value.enum ||
            value.pattern ||
            value.default !== undefined ||
            value.example !== undefined ||
            value.examples !== undefined
        )
            fail('#', 'value-bearing request schemas are outside R1');
        if (typeof value.type === 'string' || Array.isArray(value.type)) {
            const supported = new Set([
                'type',
                'format',
                'description',
                'title',
                'properties',
                'required',
                'additionalProperties',
                'items',
                'minLength',
                'maxLength',
                'minimum',
                'maximum',
                'minItems',
                'maxItems',
                'nullable',
            ]);
            if (
                Object.keys(value).some((key) => !supported.has(key)) ||
                (value.format !== undefined &&
                    ![
                        ...['date', 'date-time', 'uuid', 'binary'],
                        ...(options.extended ? ['email'] : []),
                    ].includes(value.format))
            )
                fail('#', 'unrepresented schema constraint');
            const type = Array.isArray(value.type)
                ? value.type.find((entry) => entry !== 'null')
                : value.type;
            if (
                type === 'object' &&
                (!value.properties ||
                    (value.additionalProperties !== false && !options.extended))
            )
                fail('#', 'request maps are outside R1');
            for (const [low, high, types] of [
                ['minLength', 'maxLength', ['string']],
                ['minimum', 'maximum', ['integer', 'number']],
                ['minItems', 'maxItems', ['array']],
            ]) {
                if (
                    (value[low] !== undefined || value[high] !== undefined) &&
                    !types.includes(type)
                )
                    fail('#', 'incompatible constraint');
                if (
                    value[low] !== undefined &&
                    value[high] !== undefined &&
                    value[low] > value[high]
                )
                    fail('#', 'contradictory constraints');
            }
        }
        for (const child of Object.values(value)) visit(child);
    }
    const body = operation.requestBody
        ? resolveComponent(
              operation.requestBody,
              'requestBodies',
              document.components,
              '#'
          )
        : undefined;
    visit(body?.content);
    for (const raw of operation.parameters ?? []) {
        const parameter = resolveComponent(
            raw,
            'parameters',
            document.components,
            '#'
        );
        visit(parameter.schema);
    }
    const { models, schemaIds } = projectModels(
        { components: { schemas: selected } },
        sourceId,
        'reference'
    );
    if (options.extended) {
        for (const [name, schema] of Object.entries(selected)) {
            const model = models.find(
                (entry) => entry.id === schemaIds.get(name)
            );
            if (model?.kind !== 'object') continue;
            if (schema.additionalProperties !== false) {
                if (
                    schema.additionalProperties &&
                    schema.additionalProperties !== true
                )
                    fail();
                model.additional_properties = {
                    kind: 'primitive',
                    name: 'json',
                };
            } else model.additional_properties = false;
            for (const field of model.fields) {
                if (schema.properties[field.name].format === 'email')
                    field.format = 'email';
            }
        }
    }
    const escaped = route.replaceAll('~', '~0').replaceAll('/', '~1');
    const request = projectRequest(
        operation,
        document,
        schemaIds,
        sourceId,
        [],
        `#/paths/${escaped}/${verb}`
    );
    for (const model of models) {
        model.description = 'Selected request model.';
        for (const field of model.fields ?? [])
            field.description = 'Declared request field.';
    }
    for (const parameter of request.parameters)
        parameter.description = 'Declared request parameter.';
    for (const scheme of security_schemes)
        scheme.description = 'Declared security scheme.';
    return {
        request,
        models,
        access,
        security_schemes: security_schemes.filter((scheme) =>
            access.security_scheme_ids.includes(scheme.id)
        ),
    };
}

const ref = (source_id, locator) => ({ source_id, locator });

function distinct(entries, key) {
    if (new Set(entries.map((entry) => entry[key])).size !== entries.length)
        rejectObservation('OBS_IDENTITY');
}

// These checks reconcile a structural witness with explicit declarations.
// They never infer required/nullable, a permission, or a network qualification.
function verifyWitness(shape, declaration, declarations, active = new Set()) {
    if (declaration.kind === 'model') {
        const model = declarations.get(declaration.model_id);
        if (!model || active.has(model.id)) rejectObservation('OBS_COMPLEMENT');
        const next = new Set(active).add(model.id);
        if (model.kind === 'scalar')
            return verifyWitness(shape, model.type, declarations, next);
        if (model.kind === 'array')
            return verifyWitness(
                shape,
                { kind: 'array', items: model.items },
                declarations,
                next
            );
        if (shape.kind !== 'object') rejectObservation('OBS_CONFLICT');
        distinct(model.fields, 'name');
        const fields = new Map(
            model.fields.map((field) => [field.name, field])
        );
        const observed = new Map(
            shape.fields.map((field) => [field.name, field.shape])
        );
        for (const name of observed.keys()) {
            if (!fields.has(name)) rejectObservation('OBS_COMPLEMENT');
        }
        for (const field of model.fields) {
            const value = observed.get(field.name);
            if (!value || value.kind === 'absent') {
                if (field.required) rejectObservation('OBS_CONFLICT');
            } else if (value.kind === 'null') {
                if (!field.nullable) rejectObservation('OBS_CONFLICT');
            } else verifyWitness(value, field.type, declarations, next);
        }
        return;
    }
    if (declaration.kind === 'array') {
        if (shape.kind !== 'array') rejectObservation('OBS_CONFLICT');
        for (const item of shape.items)
            verifyWitness(item, declaration.items, declarations, active);
        return;
    }
    if (shape.kind !== 'scalar' || shape.type !== declaration.name)
        rejectObservation('OBS_CONFLICT');
}

function reachableModels(
    id,
    declarations,
    result = new Set(),
    active = new Set()
) {
    if (active.has(id)) rejectObservation('OBS_COMPLEMENT');
    if (result.has(id)) return result;
    const model = declarations.get(id);
    if (!model) rejectObservation('OBS_COMPLEMENT');
    const next = new Set(active).add(id);
    function visit(type) {
        if (type.kind === 'model')
            reachableModels(type.model_id, declarations, result, next);
        if (type.kind === 'array') visit(type.items);
    }
    if (model.kind === 'object') {
        distinct(model.fields, 'name');
        for (const field of model.fields) visit(field.type);
    } else visit(model.kind === 'array' ? model.items : model.type);
    result.add(id);
    return result;
}

function observationRefs(shape, type, declarations, sourceId, pointer, refs) {
    if (type.kind === 'model') {
        const model = declarations.get(type.model_id);
        const entries = refs.get(model.id) ?? [];
        entries.push(ref(sourceId, pointer));
        refs.set(model.id, entries);
        if (model.kind === 'object') {
            for (const [index, field] of shape.fields.entries()) {
                const descriptor = model.fields.find(
                    (entry) => entry.name === field.name
                );
                const key = `${model.id}/${field.name}`;
                const path = `${pointer}/fields/${index}/shape`;
                refs.set(key, [...(refs.get(key) ?? []), ref(sourceId, path)]);
                if (!['absent', 'null'].includes(field.shape.kind))
                    observationRefs(
                        field.shape,
                        descriptor.type,
                        declarations,
                        sourceId,
                        path,
                        refs
                    );
            }
        } else
            observationRefs(
                shape,
                model.kind === 'array'
                    ? { kind: 'array', items: model.items }
                    : model.type,
                declarations,
                sourceId,
                pointer,
                refs
            );
    } else if (type.kind === 'array') {
        for (const [index, item] of shape.items.entries())
            observationRefs(
                item,
                type.items,
                declarations,
                sourceId,
                `${pointer}/items/${index}`,
                refs
            );
    }
}

function projectModels(
    ids,
    declarations,
    annotations,
    sourceId,
    references,
    backendSchema
) {
    const proof = (id, path) =>
        [ref(sourceId, path), ...(references.get(id) ?? [])].filter(
            (entry, index, all) =>
                all.findIndex((item) => isDeepStrictEqual(item, entry)) ===
                index
        );
    return [...ids].sort().map((id) => {
        const declaration = declarations.get(id);
        const index = annotations.models.indexOf(declaration);
        const path = `/models/${index}`;
        const model = {
            id,
            kind: declaration.kind,
            status: 'reference',
            description:
                'Declared model reconciled with structural observations.',
            evidence: proof(id, path),
        };
        if (model.kind === 'object')
            model.fields = declaration.fields.map((field, n) => ({
                ...field,
                description: 'Declared response field.',
                evidence: proof(`${id}/${field.name}`, `${path}/fields/${n}`),
            }));
        else if (model.kind === 'array') model.items = declaration.items;
        else model.type = declaration.type;
        assertObservationSchema(model, backendSchema, 'model');
        return model;
    });
}

function checkProvenance(input, fact) {
    const source = input.inventory.sources.find(
        (entry) => entry.id === fact.source_id
    );
    const provenance = input.annotations.provenance;
    const expected = {
        operation_id: fact.operation_id,
        method: fact.method,
        path: fact.path,
        case_id: fact.case_id,
        status: fact.status,
        content_type: fact.content_type,
    };
    if (
        !source ||
        source.sha256 !== provenance.observation_sha256 ||
        source.context_alias !== provenance.context_alias ||
        source.captured_at !== provenance.captured_at ||
        !provenance.cases.some((entry) => isDeepStrictEqual(entry, expected)) ||
        (source.origin === 'fixture' && input.annotations.origin !== 'fixture')
    )
        rejectObservation('OBS_CONFLICT');
}

export async function compileRuntimeObservationModels(options) {
    try {
        const input = await loadObservationModelInputs(options);
        const { selection, inventory, annotations, backendSchema } = input;
        distinct(annotations.models, 'id');
        const declarations = new Map(
            annotations.models.map((model) => [model.id, model])
        );
        const sourceIds = inventory.sources.map((source) => source.id);
        if (
            sourceIds.includes(selection.openapi.id) ||
            sourceIds.includes(selection.annotations.id)
        )
            rejectObservation('OBS_IDENTITY');
        const ids = new Set();
        const references = new Map();
        const requests = new Map();
        const bindings = [];
        for (const binding of selection.bindings) {
            const fact = inventory.facts.find(
                (entry) => entry.id === binding.fact_id
            );
            if (
                !fact ||
                binding.request.operation_id !== fact.operation_id ||
                binding.request.method !== fact.method ||
                binding.request.path !== fact.path ||
                binding.request.base_path !==
                    annotations.provenance.base_path ||
                binding.request.base_path
                    .split('/')
                    .some((part) => ['.', '..'].includes(part))
            )
                rejectObservation('OBS_BINDING');
            checkProvenance(input, fact);
            const type = { kind: 'model', model_id: binding.response_model_id };
            const reachable = reachableModels(
                binding.response_model_id,
                declarations
            );
            verifyWitness(fact.observation, type, declarations);
            observationRefs(
                fact.observation,
                type,
                declarations,
                fact.source_id,
                fact.pointer,
                references
            );
            for (const id of reachable) ids.add(id);
            let projected;
            try {
                projected = projectSelectedOpenApiRequest(
                    input.openapi,
                    binding.request,
                    selection.openapi.id
                );
            } catch {
                rejectObservation('OBS_OPENAPI');
            }
            const previous = requests.get(fact.operation_id);
            if (previous && !isDeepStrictEqual(previous, projected))
                rejectObservation('OBS_CONFLICT');
            requests.set(fact.operation_id, projected);
            bindings.push({
                operation_id: fact.operation_id,
                case_id: fact.case_id,
                method: fact.method,
                path: fact.path,
                status: fact.status,
                content_type: fact.content_type,
                response_model_id: binding.response_model_id,
                fact_id: fact.id,
            });
        }
        const responseModels = projectModels(
            ids,
            declarations,
            annotations,
            selection.annotations.id,
            references,
            backendSchema
        );
        const requestModels = new Map();
        for (const request of requests.values())
            for (const model of request.models) {
                if (ids.has(model.id)) rejectObservation('OBS_IDENTITY');
                const previous = requestModels.get(model.id);
                if (previous && !isDeepStrictEqual(previous, model))
                    rejectObservation('OBS_CONFLICT');
                assertObservationSchema(model, backendSchema, 'model');
                requestModels.set(model.id, model);
            }
        return {
            schema_version: '1.1.0',
            kind: 'observation-model-candidate',
            status: 'reference',
            qualification: 'structural-only',
            network_verified: false,
            workspace_id: inventory.workspace_id,
            mapping_sha256: input.mappingHash,
            sources: [
                ...inventory.sources.map(({ id, path, sha256 }) => ({
                    id,
                    kind: 'runtime-observation',
                    authority: 'observational',
                    status: 'reference',
                    snapshot_uri: path,
                    sha256,
                })),
                ...[
                    ['openapi', selection.openapi],
                    ['manual', selection.annotations],
                ].map(([kind, source]) => ({
                    id: source.id,
                    kind,
                    authority: 'observational',
                    status: 'reference',
                    snapshot_uri: source.path,
                    sha256: source.sha256,
                })),
            ],
            request_models: [...requestModels.values()].sort((a, b) =>
                a.id.localeCompare(b.id)
            ),
            response_models: responseModels,
            requests: [...requests].map(([operation_id, value]) => ({
                operation_id,
                request: value.request,
                access: value.access,
                security_schemes: value.security_schemes,
            })),
            bindings,
            unknowns: [
                'network-authenticity',
                'permissions-enforcement',
                'exhaustiveness',
                'validity-window',
                'private-runtime-binding',
            ],
        };
    } catch (error) {
        rejectObservation(observationDiagnostic(error));
    }
}

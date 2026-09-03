import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

import { RegExpParser } from '@eslint-community/regexpp';

import { validateJsonSchema } from '../validate-ir.mjs';

const TYPE_KEYS = {
    primitive: ['kind', 'name'],
    model: ['kind', 'model_id'],
    array: ['items', 'kind'],
};

const MODEL_KEYS = {
    object: ['description', 'evidence', 'fields', 'id', 'kind', 'status'],
    array: ['description', 'evidence', 'id', 'items', 'kind', 'status'],
    scalar: ['description', 'evidence', 'id', 'kind', 'status', 'type'],
};

const STATUS_RANK = new Map([
    ['reference', 0],
    ['planned', 1],
    ['implemented', 2],
    ['verified-live', 3],
]);

const REGEXP_PARSER = new RegExpParser({ ecmaVersion: 2024 });

function exactKeys(value, expected) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return false;
    const actual = Object.keys(value).sort();
    return (
        actual.length === expected.length &&
        actual.every((key, index) => key === expected[index])
    );
}

function duplicateErrors(entries, path) {
    const seen = new Set();
    const errors = [];
    for (const [index, entry] of (entries ?? []).entries()) {
        if (!entry || typeof entry.id !== 'string') continue;
        if (seen.has(entry.id))
            errors.push(`${path}[${index}].id: duplicate ${entry.id}`);
        seen.add(entry.id);
    }
    return errors;
}

function duplicateValueErrors(values, path, keyOf = (value) => value) {
    const seen = new Set();
    const errors = [];
    for (const [index, value] of (values ?? []).entries()) {
        const key = JSON.stringify(keyOf(value));
        if (seen.has(key)) errors.push(`${path}[${index}]: duplicate ${key}`);
        seen.add(key);
    }
    return errors;
}

function validateType(type, path, modelIds, errors) {
    if (!type || typeof type !== 'object' || Array.isArray(type)) return;
    const keys = TYPE_KEYS[type.kind];
    if (!keys || !exactKeys(type, keys)) {
        errors.push(
            `${path}: invalid closed type shape for ${type.kind ?? 'unknown'}`
        );
        return;
    }
    if (type.kind === 'model' && !modelIds.has(type.model_id)) {
        errors.push(`${path}.model_id: unresolved model ${type.model_id}`);
    }
    if (type.kind === 'array')
        validateType(type.items, `${path}.items`, modelIds, errors);
}

function validateEvidence(evidence, path, sourceIds, usedSources, errors) {
    for (const [index, reference] of (evidence ?? []).entries()) {
        if (!reference || typeof reference.source_id !== 'string') continue;
        if (!sourceIds.has(reference.source_id)) {
            errors.push(
                `${path}[${index}].source_id: unresolved source ${reference.source_id}`
            );
        } else {
            usedSources.add(reference.source_id);
        }
    }
}

function validateStatusEvidence(entity, path, sourceStatusById, errors) {
    if (!STATUS_RANK.has(entity?.status)) return;
    const evidenceStatuses = (entity.evidence ?? [])
        .map((reference) => sourceStatusById.get(reference?.source_id))
        .filter((status) => STATUS_RANK.has(status));
    if (entity.status === 'reference') {
        if (!evidenceStatuses.includes('reference')) {
            errors.push(
                `${path}.status: reference requires reference evidence`
            );
        }
        return;
    }
    const strongestTarget = Math.max(
        -1,
        ...evidenceStatuses
            .filter((status) => status !== 'reference')
            .map((status) => STATUS_RANK.get(status))
    );
    if (strongestTarget < STATUS_RANK.get(entity.status)) {
        errors.push(
            `${path}.status: ${entity.status} exceeds its strongest target evidence`
        );
    }
}

function validateSourceLifecycle(source, path, errors) {
    if (!source || typeof source !== 'object') return;
    const exactLifecycle = {
        openapi: {
            reference: 'observational',
            planned: 'declared',
            implemented: 'authoritative',
        },
        postman: {
            reference: 'observational',
            planned: 'declared',
        },
        'legacy-code': {
            reference: 'observational',
            implemented: 'observational',
        },
    }[source.kind];
    if (exactLifecycle) {
        const authority = exactLifecycle[source.status];
        if (!authority) {
            errors.push(
                `${path}.status: ${source.kind} sources cannot prove ${source.status}`
            );
        } else if (source.authority !== authority) {
            errors.push(
                `${path}.authority: ${source.kind}/${source.status} requires ${authority}`
            );
        }
    }
    if (
        source.kind === 'manual' &&
        !['reference', 'planned'].includes(source.status)
    ) {
        errors.push(
            `${path}.status: manual sources cannot prove ${source.status}`
        );
    }
    if (
        source.kind === 'runtime-observation' &&
        !['reference', 'verified-live'].includes(source.status)
    ) {
        errors.push(
            `${path}.status: runtime observations prove only reference or verified-live`
        );
    }
    if (
        source.status === 'verified-live' &&
        source.kind !== 'runtime-observation'
    ) {
        errors.push(
            `${path}.status: verified-live requires runtime-observation evidence`
        );
    }
    if (source.status === 'reference' && source.authority !== 'observational') {
        errors.push(
            `${path}.authority: reference sources must be observational`
        );
    }
    if (source.status === 'planned' && source.authority !== 'declared') {
        errors.push(`${path}.authority: planned sources must be declared`);
    }
    if (
        source.status === 'verified-live' &&
        source.authority !== 'observational'
    ) {
        errors.push(
            `${path}.authority: verified-live sources must be observational`
        );
    }
}

function validateFields(
    fields,
    path,
    modelIds,
    sourceIds,
    usedSources,
    errors
) {
    errors.push(...duplicateValueErrors(fields, path, (field) => field?.name));
    for (const [index, field] of (fields ?? []).entries()) {
        if (!field || typeof field !== 'object') continue;
        validateType(field.type, `${path}[${index}].type`, modelIds, errors);
        validateConstraints(
            field.constraints,
            field.type,
            `${path}[${index}].constraints`,
            errors
        );
        validateEvidence(
            field.evidence,
            `${path}[${index}].evidence`,
            sourceIds,
            usedSources,
            errors
        );
        if (field.allowed_values) {
            errors.push(
                ...duplicateValueErrors(
                    field.allowed_values,
                    `${path}[${index}].allowed_values`
                )
            );
            for (const [valueIndex, value] of field.allowed_values.entries()) {
                if (
                    value === null ||
                    !['string', 'number', 'boolean'].includes(typeof value)
                ) {
                    errors.push(
                        `${path}[${index}].allowed_values[${valueIndex}]: expected scalar value`
                    );
                }
                if (field.type?.kind !== 'primitive') {
                    errors.push(
                        `${path}[${index}].allowed_values: only primitive fields may declare values`
                    );
                } else if (!allowedValueMatchesType(value, field.type.name)) {
                    errors.push(
                        `${path}[${index}].allowed_values[${valueIndex}]: value does not match ${field.type.name}`
                    );
                }
            }
        }
    }
}

function validateConstraints(constraints, type, path, errors) {
    if (!constraints || typeof constraints !== 'object' || !type) return;
    const stringKeys = new Set(['min_length', 'max_length', 'pattern']);
    const numberKeys = new Set(['minimum', 'maximum']);
    const arrayKeys = new Set(['min_items', 'max_items']);
    let allowed = new Set();
    if (
        type.kind === 'primitive' &&
        ['string', 'date', 'datetime', 'uuid', 'binary'].includes(type.name)
    ) {
        allowed = stringKeys;
    } else if (
        type.kind === 'primitive' &&
        ['integer', 'number'].includes(type.name)
    ) {
        allowed = numberKeys;
    } else if (type.kind === 'array') {
        allowed = arrayKeys;
    }
    for (const key of Object.keys(constraints)) {
        if (!allowed.has(key))
            errors.push(`${path}.${key}: incompatible with declared type`);
    }
    for (const [minimumKey, maximumKey] of [
        ['min_length', 'max_length'],
        ['minimum', 'maximum'],
        ['min_items', 'max_items'],
    ]) {
        if (
            constraints[minimumKey] !== undefined &&
            constraints[maximumKey] !== undefined &&
            constraints[minimumKey] > constraints[maximumKey]
        ) {
            errors.push(`${path}: ${minimumKey} exceeds ${maximumKey}`);
        }
    }
    if (constraints.pattern !== undefined) {
        try {
            REGEXP_PARSER.parsePattern(
                constraints.pattern,
                0,
                constraints.pattern.length,
                false
            );
        } catch {
            errors.push(`${path}.pattern: invalid regular expression`);
        }
    }
}

function allowedValueMatchesType(value, primitive) {
    if (primitive === 'boolean') return typeof value === 'boolean';
    if (primitive === 'integer') return Number.isInteger(value);
    if (primitive === 'number')
        return typeof value === 'number' && Number.isFinite(value);
    if (['string', 'date', 'datetime', 'uuid'].includes(primitive)) {
        return typeof value === 'string';
    }
    return false;
}

function validateAccess(access, path, securityIds, errors) {
    if (!access || typeof access !== 'object') return;
    errors.push(
        ...duplicateValueErrors(
            access.security_scheme_ids,
            `${path}.security_scheme_ids`
        ),
        ...duplicateValueErrors(access.permissions, `${path}.permissions`)
    );
    for (const [index, id] of (access.security_scheme_ids ?? []).entries()) {
        if (!securityIds.has(id)) {
            errors.push(
                `${path}.security_scheme_ids[${index}]: unresolved security scheme ${id}`
            );
        }
    }
    if (access.mode === 'public') {
        if (access.security_scheme_ids?.length > 0)
            errors.push(
                `${path}: public access cannot declare a security scheme`
            );
        if (access.permissions?.length > 0)
            errors.push(`${path}: public access cannot declare permissions`);
    } else if (!access.security_scheme_ids?.length) {
        errors.push(
            `${path}: ${access.mode} access requires a security scheme`
        );
    }
    if (access.mode === 'authorized' && !access.permissions?.length) {
        errors.push(`${path}: authorized access requires permissions`);
    }
    if (access.mode !== 'authorized' && access.permissions?.length > 0) {
        errors.push(`${path}: only authorized access may declare permissions`);
    }
}

function pathParameterNames(path) {
    return new Set(
        Array.from(
            path?.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g) ?? [],
            (match) => match[1]
        )
    );
}

function validateOperation(
    operation,
    index,
    { modelIds, securityIds, serviceIds, sourceIds, usedSources },
    errors
) {
    if (!operation || typeof operation !== 'object') return;
    const path = `$.operations[${index}]`;
    if (!serviceIds.has(operation.service_id)) {
        errors.push(
            `${path}.service_id: unresolved service ${operation.service_id}`
        );
    }
    validateAccess(operation.access, `${path}.access`, securityIds, errors);
    validateEvidence(
        operation.evidence,
        `${path}.evidence`,
        sourceIds,
        usedSources,
        errors
    );

    const parameters = operation.request?.parameters ?? [];
    errors.push(
        ...duplicateValueErrors(
            parameters,
            `${path}.request.parameters`,
            (parameter) => [parameter?.in, parameter?.name]
        )
    );
    const declaredPathParameters = new Set();
    for (const [parameterIndex, parameter] of parameters.entries()) {
        const parameterPath = `${path}.request.parameters[${parameterIndex}]`;
        validateType(parameter.type, `${parameterPath}.type`, modelIds, errors);
        validateConstraints(
            parameter.constraints,
            parameter.type,
            `${parameterPath}.constraints`,
            errors
        );
        validateEvidence(
            parameter.evidence,
            `${parameterPath}.evidence`,
            sourceIds,
            usedSources,
            errors
        );
        if (parameter.in === 'path') {
            declaredPathParameters.add(parameter.name);
            if (parameter.required !== true)
                errors.push(
                    `${parameterPath}.required: path parameters are always required`
                );
        }
    }
    const placeholders = pathParameterNames(operation.path);
    for (const name of placeholders) {
        if (!declaredPathParameters.has(name))
            errors.push(
                `${path}.path: placeholder {${name}} has no path parameter`
            );
    }
    for (const name of declaredPathParameters) {
        if (!placeholders.has(name))
            errors.push(
                `${path}.request.parameters: path parameter ${name} has no placeholder`
            );
    }

    const body = operation.request?.body;
    if (body) {
        if (!modelIds.has(body.model_id))
            errors.push(
                `${path}.request.body.model_id: unresolved model ${body.model_id}`
            );
        errors.push(
            ...duplicateValueErrors(
                body.media_types,
                `${path}.request.body.media_types`
            )
        );
        validateEvidence(
            body.evidence,
            `${path}.request.body.evidence`,
            sourceIds,
            usedSources,
            errors
        );
    }

    errors.push(
        ...duplicateValueErrors(
            operation.responses,
            `${path}.responses`,
            (response) => response?.status
        )
    );
    if (
        !(operation.responses ?? []).some(
            (response) => response?.outcome === 'success'
        )
    ) {
        errors.push(
            `${path}.responses: at least one success response is required`
        );
    }
    for (const [responseIndex, response] of (
        operation.responses ?? []
    ).entries()) {
        const responsePath = `${path}.responses[${responseIndex}]`;
        validateEvidence(
            response.evidence,
            `${responsePath}.evidence`,
            sourceIds,
            usedSources,
            errors
        );
        if (!response.body) continue;
        if (!modelIds.has(response.body.model_id))
            errors.push(
                `${responsePath}.body.model_id: unresolved model ${response.body.model_id}`
            );
        validateEvidence(
            response.body.evidence,
            `${responsePath}.body.evidence`,
            sourceIds,
            usedSources,
            errors
        );
        const envelope = response.body.envelope;
        if (!envelope || typeof envelope !== 'object') continue;
        const expectedEnvelopeKeys =
            envelope.kind === 'none'
                ? ['kind']
                : ['data_field', 'error_field', 'kind', 'message_field'];
        if (!exactKeys(envelope, expectedEnvelopeKeys)) {
            errors.push(
                `${responsePath}.body.envelope: invalid closed shape for ${envelope.kind}`
            );
        }
    }
}

export function validateBackendContract(contract, schema) {
    const errors = [...validateJsonSchema(contract, schema)];
    if (!contract || typeof contract !== 'object' || Array.isArray(contract))
        return errors;

    errors.push(
        ...duplicateErrors(contract.sources, '$.sources'),
        ...duplicateErrors(contract.services, '$.services'),
        ...duplicateErrors(contract.security_schemes, '$.security_schemes'),
        ...duplicateErrors(contract.models, '$.models'),
        ...duplicateErrors(contract.operations, '$.operations')
    );
    errors.push(
        ...duplicateValueErrors(
            contract.operations,
            '$.operations',
            (operation) => [
                operation?.service_id,
                operation?.method,
                operation?.path,
            ]
        ).map((error) => `${error} endpoint`)
    );
    const sourceIds = new Set(
        (contract.sources ?? []).map((source) => source?.id)
    );
    const serviceIds = new Set(
        (contract.services ?? []).map((service) => service?.id)
    );
    const securityIds = new Set(
        (contract.security_schemes ?? []).map((scheme) => scheme?.id)
    );
    const modelIds = new Set((contract.models ?? []).map((model) => model?.id));
    const sourceStatusById = new Map(
        (contract.sources ?? []).map((source) => [source?.id, source?.status])
    );
    const usedSources = new Set();

    for (const [index, source] of (contract.sources ?? []).entries()) {
        validateSourceLifecycle(source, `$.sources[${index}]`, errors);
    }

    const statusEntities = [
        ...(contract.services ?? []),
        ...(contract.security_schemes ?? []),
        ...(contract.models ?? []),
        ...(contract.operations ?? []),
    ];
    const contractStatus = contract.contract?.status;
    if (STATUS_RANK.has(contractStatus)) {
        if (contractStatus === 'reference') {
            if (
                statusEntities.some((entity) => entity?.status !== 'reference')
            ) {
                errors.push(
                    '$.contract.status: a reference contract may contain only reference entities'
                );
            }
        } else {
            if (
                statusEntities.some((entity) => entity?.status === 'reference')
            ) {
                errors.push(
                    '$.contract.status: target contracts cannot contain reference entities'
                );
            }
            const ranks = statusEntities
                .map((entity) => STATUS_RANK.get(entity?.status))
                .filter((rank) => rank !== undefined);
            if (
                ranks.length > 0 &&
                Math.min(...ranks) !== STATUS_RANK.get(contractStatus)
            ) {
                errors.push(
                    '$.contract.status: must equal the least mature target entity'
                );
            }
        }
    }

    for (const [index, service] of (contract.services ?? []).entries()) {
        errors.push(
            ...duplicateValueErrors(
                service?.base_urls,
                `$.services[${index}].base_urls`,
                (entry) => entry?.environment
            )
        );
        validateEvidence(
            service?.evidence,
            `$.services[${index}].evidence`,
            sourceIds,
            usedSources,
            errors
        );
        validateStatusEvidence(
            service,
            `$.services[${index}]`,
            sourceStatusById,
            errors
        );
    }
    for (const [index, scheme] of (contract.security_schemes ?? []).entries()) {
        validateEvidence(
            scheme?.evidence,
            `$.security_schemes[${index}].evidence`,
            sourceIds,
            usedSources,
            errors
        );
        validateStatusEvidence(
            scheme,
            `$.security_schemes[${index}]`,
            sourceStatusById,
            errors
        );
    }
    for (const [index, model] of (contract.models ?? []).entries()) {
        validateEvidence(
            model?.evidence,
            `$.models[${index}].evidence`,
            sourceIds,
            usedSources,
            errors
        );
        validateStatusEvidence(
            model,
            `$.models[${index}]`,
            sourceStatusById,
            errors
        );
        if (!model || typeof model !== 'object') continue;
        const expectedKeys = MODEL_KEYS[model.kind];
        if (!expectedKeys || !exactKeys(model, expectedKeys)) {
            errors.push(
                `$.models[${index}]: invalid closed model shape for ${model.kind ?? 'unknown'}`
            );
            continue;
        }
        if (model.kind === 'object') {
            validateFields(
                model.fields,
                `$.models[${index}].fields`,
                modelIds,
                sourceIds,
                usedSources,
                errors
            );
        } else {
            const property = model.kind === 'array' ? 'items' : 'type';
            const type = model[property];
            validateType(
                type,
                `$.models[${index}].${property}`,
                modelIds,
                errors
            );
            if (model.kind === 'scalar' && type?.kind !== 'primitive') {
                errors.push(
                    `$.models[${index}].type: scalar model requires a primitive type`
                );
            }
        }
    }
    for (const [index, operation] of (contract.operations ?? []).entries()) {
        validateStatusEvidence(
            operation,
            `$.operations[${index}]`,
            sourceStatusById,
            errors
        );
        validateOperation(
            operation,
            index,
            { modelIds, securityIds, serviceIds, sourceIds, usedSources },
            errors
        );
    }
    for (const sourceId of sourceIds) {
        if (typeof sourceId === 'string' && !usedSources.has(sourceId)) {
            errors.push(`$.sources: unused source ${sourceId}`);
        }
    }
    return [...new Set(errors)].sort();
}

export async function verifyBackendContractSnapshots(contract, workspaceRoot) {
    const errors = [];
    const root = await realpath(resolve(workspaceRoot));
    for (const [index, source] of (contract?.sources ?? []).entries()) {
        if (!source || typeof source.snapshot_uri !== 'string') continue;
        const path = `$.sources[${index}].snapshot_uri`;
        const absolute = resolve(root, source.snapshot_uri);
        if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) {
            errors.push(`${path}: escapes workspace`);
            continue;
        }
        try {
            const metadata = await lstat(absolute);
            if (!metadata.isFile() || metadata.isSymbolicLink()) {
                errors.push(
                    `${path}: snapshot must be a regular non-symlink file`
                );
                continue;
            }
            const canonical = await realpath(absolute);
            if (canonical !== root && !canonical.startsWith(`${root}${sep}`)) {
                errors.push(`${path}: canonical snapshot escapes workspace`);
                continue;
            }
            const actual = createHash('sha256')
                .update(await readFile(canonical))
                .digest('hex');
            if (actual !== source.sha256)
                errors.push(`${path}: sha256 mismatch`);
        } catch (error) {
            errors.push(
                `${path}: snapshot inaccessible (${error.code ?? error.message})`
            );
        }
    }
    return errors.sort();
}

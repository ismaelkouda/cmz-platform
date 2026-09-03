import { createHash } from 'node:crypto';

import { validateBackendContract } from './backend-contract.mjs';

const TOP_LEVEL_KEYS = [
    'contract',
    'kind',
    'models',
    'operations',
    'schema_version',
    'security_schemes',
    'services',
    'source',
];
const SOURCE_KEYS = ['authority', 'id'];
const SOURCE_KEYS_WITH_ORIGIN = ['authority', 'id', 'original_uri'];
const RESERVED_KEYS = new Set([
    'evidence',
    'sha256',
    'snapshot_uri',
    'sources',
]);

function fail(message) {
    throw new Error(`structured backend definition: ${message}`);
}

function exactKeys(value, expected) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return false;
    const actual = Object.keys(value).sort();
    return (
        actual.length === expected.length &&
        actual.every((key, index) => key === expected[index])
    );
}

function rejectReservedKeys(value, path = '$') {
    if (Array.isArray(value)) {
        value.forEach((entry, index) =>
            rejectReservedKeys(entry, `${path}[${index}]`)
        );
        return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
        if (RESERVED_KEYS.has(key))
            fail(`${path}.${key}: adapter-owned property`);
        if (
            key === 'status' &&
            /^\$\.(?:services|security_schemes|models|operations)\[\d+\]$/.test(
                path
            )
        ) {
            fail(
                `${path}.status: entity status is derived from contract.status`
            );
        }
        rejectReservedKeys(child, `${path}.${key}`);
    }
}

function proof(sourceId, pointer) {
    return [{ source_id: sourceId, locator: pointer }];
}

function withEvidence(value, sourceId, pointer) {
    return { ...value, evidence: proof(sourceId, pointer) };
}

function projectField(field, sourceId, pointer) {
    return withEvidence(field, sourceId, pointer);
}

function projectModel(model, index, sourceId, status) {
    const pointer = `/models/${index}`;
    const projected = { ...model, status };
    if (model?.kind === 'object' && Array.isArray(model.fields)) {
        projected.fields = model.fields.map((field, fieldIndex) =>
            projectField(field, sourceId, `${pointer}/fields/${fieldIndex}`)
        );
    }
    return withEvidence(projected, sourceId, pointer);
}

function projectParameter(parameter, operationIndex, parameterIndex, sourceId) {
    return withEvidence(
        parameter,
        sourceId,
        `/operations/${operationIndex}/request/parameters/${parameterIndex}`
    );
}

function projectOperation(operation, index, sourceId, status) {
    const pointer = `/operations/${index}`;
    const request = {
        ...operation.request,
        parameters: (operation.request?.parameters ?? []).map(
            (parameter, parameterIndex) =>
                projectParameter(parameter, index, parameterIndex, sourceId)
        ),
    };
    if (operation.request?.body) {
        request.body = withEvidence(
            operation.request.body,
            sourceId,
            `${pointer}/request/body`
        );
    }
    const responses = (operation.responses ?? []).map(
        (response, responseIndex) => {
            const responsePointer = `${pointer}/responses/${responseIndex}`;
            const projected = { ...response };
            if (response.body) {
                projected.body = withEvidence(
                    response.body,
                    sourceId,
                    `${responsePointer}/body`
                );
            }
            return withEvidence(projected, sourceId, responsePointer);
        }
    );
    return withEvidence(
        { ...operation, status, request, responses },
        sourceId,
        pointer
    );
}

function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
        Object.keys(value)
            .sort()
            .map((key) => [key, canonicalize(value[key])])
    );
}

export function serializeCanonicalBackendContract(contract) {
    return `${JSON.stringify(canonicalize(contract), null, 2)}\n`;
}

export function compileStructuredBackendDefinition({
    definition,
    snapshotUri,
    snapshotSha256,
    backendContractSchema,
}) {
    if (!exactKeys(definition, TOP_LEVEL_KEYS)) {
        fail(`top-level keys must be exactly ${TOP_LEVEL_KEYS.join(', ')}`);
    }
    if (definition.schema_version !== '1.0.0')
        fail('unsupported schema_version');
    if (definition.kind !== 'backend-contract-definition')
        fail('unsupported kind');
    for (const key of [
        'services',
        'security_schemes',
        'models',
        'operations',
    ]) {
        if (!Array.isArray(definition[key])) fail(`${key} must be an array`);
    }
    if (!['reference', 'planned'].includes(definition.contract?.status)) {
        fail(
            'manual definitions may declare only reference or planned contracts'
        );
    }
    const expectedSourceKeys = Object.hasOwn(
        definition.source ?? {},
        'original_uri'
    )
        ? SOURCE_KEYS_WITH_ORIGIN
        : SOURCE_KEYS;
    if (!exactKeys(definition.source, expectedSourceKeys)) {
        fail(`source keys must be exactly ${expectedSourceKeys.join(', ')}`);
    }
    const expectedAuthority =
        definition.contract.status === 'reference'
            ? 'observational'
            : 'declared';
    if (definition.source.authority !== expectedAuthority) {
        fail(
            `${definition.contract.status} requires source.authority=${expectedAuthority}`
        );
    }
    if (!/^[a-f0-9]{64}$/.test(snapshotSha256 ?? ''))
        fail('invalid snapshot sha256');
    if (typeof snapshotUri !== 'string' || snapshotUri.length === 0) {
        fail('snapshot uri is required');
    }
    rejectReservedKeys(definition);

    const sourceId = definition.source.id;
    const status = definition.contract.status;
    const source = {
        id: sourceId,
        kind: 'manual',
        authority: definition.source.authority,
        status,
        snapshot_uri: snapshotUri,
        ...(definition.source.original_uri
            ? { original_uri: definition.source.original_uri }
            : {}),
        sha256: snapshotSha256,
    };
    const contract = {
        schema_version: '1.0.0',
        kind: 'backend-contract',
        contract: definition.contract,
        sources: [source],
        services: definition.services.map((service, index) =>
            withEvidence({ ...service, status }, sourceId, `/services/${index}`)
        ),
        security_schemes: definition.security_schemes.map((scheme, index) =>
            withEvidence(
                { ...scheme, status },
                sourceId,
                `/security_schemes/${index}`
            )
        ),
        models: definition.models.map((model, index) =>
            projectModel(model, index, sourceId, status)
        ),
        operations: definition.operations.map((operation, index) =>
            projectOperation(operation, index, sourceId, status)
        ),
    };
    const errors = validateBackendContract(contract, backendContractSchema);
    if (errors.length > 0)
        fail(`canonical projection rejected:\n${errors.join('\n')}`);
    return canonicalize(contract);
}

export function structuredDefinitionSha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

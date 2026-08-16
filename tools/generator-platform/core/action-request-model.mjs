import { readFile } from 'node:fs/promises';

export const primitiveString = {
    kind: 'primitive',
    name: 'string',
    nullable: false,
};

export function canonicalName(value) {
    return value
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replaceAll('-', '_')
        .toLowerCase();
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function assertKeys(value, allowed, path) {
    for (const key of Object.keys(value)) {
        assert(allowed.includes(key), `${path}: unsupported property ${key}`);
    }
}

export function validateObservation(observation) {
    assertKeys(observation, ['schema_version', 'domain_id', 'operations'], '$');
    assert(
        observation.schema_version === '1.0.0',
        '$.schema_version: unsupported'
    );
    assert(typeof observation.domain_id === 'string', '$.domain_id: required');
    assert(
        Array.isArray(observation.operations),
        '$.operations: array required'
    );

    const operationIds = new Set();
    for (const [
        operationIndex,
        operation,
    ] of observation.operations.entries()) {
        const path = `$.operations[${operationIndex}]`;
        assertKeys(
            operation,
            ['id', 'input', 'output', 'access', 'http', 'effects'],
            path
        );
        assert(
            !operationIds.has(operation.id),
            `${path}.id: duplicate ${operation.id}`
        );
        operationIds.add(operation.id);
        assert(
            ['public', 'authenticated', 'authorized'].includes(
                operation.access
            ),
            `${path}.access: unsupported`
        );
        assert(
            Array.isArray(operation.effects) && operation.effects.length > 0,
            `${path}.effects: non-empty array required`
        );
        assertKeys(
            operation.http,
            ['method', 'path', 'authentication'],
            `${path}.http`
        );

        for (const boundary of ['input', 'output']) {
            assertKeys(operation[boundary], ['fields'], `${path}.${boundary}`);
            assert(
                Array.isArray(operation[boundary].fields),
                `${path}.${boundary}.fields: array required`
            );
            const fieldNames = new Set();
            for (const [fieldIndex, field] of operation[
                boundary
            ].fields.entries()) {
                const fieldPath = `${path}.${boundary}.fields[${fieldIndex}]`;
                assertKeys(
                    field,
                    ['name', 'type', 'required', 'format', 'equals'],
                    fieldPath
                );
                assert(
                    !fieldNames.has(field.name),
                    `${fieldPath}.name: duplicate ${field.name}`
                );
                fieldNames.add(field.name);
                assert(
                    typeof field.required === 'boolean',
                    `${fieldPath}.required: boolean required`
                );
                assert(
                    field.type && typeof field.type.kind === 'string',
                    `${fieldPath}.type: required`
                );
                assertKeys(
                    field.type,
                    ['kind', 'name', 'nullable'],
                    `${fieldPath}.type`
                );
                assert(
                    ['primitive', 'model'].includes(field.type.kind),
                    `${fieldPath}.type.kind: unsupported ${field.type.kind}`
                );
                assert(
                    typeof field.type.name === 'string',
                    `${fieldPath}.type.name: required`
                );
                assert(
                    typeof field.type.nullable === 'boolean',
                    `${fieldPath}.type.nullable: boolean required`
                );
                if (field.format !== undefined) {
                    assert(
                        field.format === 'email',
                        `${fieldPath}.format: unsupported ${field.format}`
                    );
                }
                if (field.equals !== undefined) {
                    assert(
                        typeof field.equals === 'string' &&
                            field.equals.includes('.'),
                        `${fieldPath}.equals: qualified field target required`
                    );
                }
            }
        }
        assert(
            ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(
                operation.http.method
            ),
            `${path}.http.method: unsupported`
        );
        assert(
            typeof operation.http.path === 'string',
            `${path}.http.path: required`
        );
        assert(
            ['none', 'bearer', 'session', 'api_key', 'other'].includes(
                operation.http.authentication
            ),
            `${path}.http.authentication: unsupported`
        );
    }
    return observation;
}

function evidenceRefsForInput(operationId, policyOperation, field) {
    const inputFact = `fact.${operationId}.input`;
    const refs = [inputFact];
    if (
        (field.required || field.format || field.equals) &&
        policyOperation.constraint_fact !== inputFact
    ) {
        refs.push(policyOperation.constraint_fact);
    }
    return refs;
}

function constraintId(prefix, fieldName, kind) {
    const field = fieldName
        .replaceAll('_', '-')
        .replace('confirm-password', 'confirmation');
    if (kind === 'equals') return `constraint.${prefix}-password-confirmation`;
    const suffix = kind;
    return `constraint.${prefix}-${field}-${suffix}`;
}

export function buildSemanticModel(observation, policy) {
    validateObservation(observation);
    assert(
        observation.domain_id === policy.domain.id,
        'policy domain does not match observation'
    );

    const types = policy.opaque_types.map((type) => ({
        id: type.id,
        kind: 'opaque',
        description: type.description,
        fields: [],
        evidence_refs: [
            'fact.login.output',
            'decision.opaque-authentication-values',
        ],
    }));
    const constraints = [];
    const operations = [];
    const integrations = [];
    const emittedOutputTypes = new Map();

    for (const operation of observation.operations) {
        const metadata = policy.operations[operation.id];
        assert(metadata, `policy missing operation ${operation.id}`);
        const inputType = `${operation.id}-input`;
        const constraintFact = metadata.constraint_fact;
        types.push({
            id: inputType,
            kind: 'object',
            description: metadata.input_description,
            fields: operation.input.fields.map((field) => ({
                name: field.name,
                type: field.type,
                required: field.required,
                evidence_refs: evidenceRefsForInput(
                    operation.id,
                    metadata,
                    field
                ),
            })),
            evidence_refs: [
                ...new Set(
                    operation.input.fields.flatMap((field) =>
                        evidenceRefsForInput(operation.id, metadata, field)
                    )
                ),
            ],
        });

        const outputSignature = JSON.stringify(operation.output.fields);
        const previousSignature = emittedOutputTypes.get(metadata.output_type);
        assert(
            !previousSignature || previousSignature === outputSignature,
            `output type ${metadata.output_type} has conflicting shapes`
        );
        if (!previousSignature) {
            emittedOutputTypes.set(metadata.output_type, outputSignature);
            const outputEvidence = observation.operations
                .filter(
                    (candidate) =>
                        policy.operations[candidate.id].output_type ===
                        metadata.output_type
                )
                .map((candidate) => `fact.${candidate.id}.output`);
            types.push({
                id: metadata.output_type,
                kind: 'object',
                description: metadata.output_description,
                fields: operation.output.fields.map((field) => ({
                    name: field.name,
                    type: field.type,
                    required: field.required,
                    evidence_refs: outputEvidence,
                })),
                evidence_refs: outputEvidence,
            });
        }

        for (const field of operation.input.fields) {
            const target = `${inputType}.${field.name}`;
            if (field.required) {
                constraints.push({
                    id: constraintId(
                        metadata.constraint_prefix,
                        field.name,
                        'required'
                    ),
                    kind: 'required',
                    target,
                    parameters: {},
                    evidence_refs: [constraintFact],
                });
            }
            if (field.format) {
                constraints.push({
                    id: constraintId(
                        metadata.constraint_prefix,
                        field.name,
                        'format'
                    ),
                    kind: 'format',
                    target,
                    parameters: { format: field.format },
                    evidence_refs: [constraintFact],
                });
            }
            if (field.equals) {
                constraints.push({
                    id: constraintId(
                        metadata.constraint_prefix,
                        field.name,
                        'equals'
                    ),
                    kind: 'equals',
                    target,
                    parameters: { other_target: field.equals },
                    evidence_refs: [constraintFact],
                });
            }
        }

        const operationFact = `fact.${operation.id}.operation`;
        const effectFacts = {
            establish_session: 'fact.login.session-effect',
            external_call: operationFact,
            request_recovery: operationFact,
            reset_credential: operationFact,
        };
        const evidenceRefs = [
            'decision.command-classification',
            operationFact,
            `fact.${operation.id}.input`,
            `fact.${operation.id}.output`,
        ];
        if (operation.effects.includes('establish_session'))
            evidenceRefs.push('fact.login.session-effect');
        operations.push({
            id: operation.id,
            kind: 'command',
            description: metadata.description,
            input: { kind: 'model', name: inputType, nullable: false },
            output: {
                kind: 'model',
                name: metadata.output_type,
                nullable: false,
            },
            access: { mode: operation.access, evidence_refs: [operationFact] },
            effects: operation.effects.map((kind) => ({
                kind,
                description: metadata.effects[kind],
                evidence_refs: [effectFacts[kind]],
            })),
            integration_ref: `integration.${operation.id}`,
            evidence_refs: evidenceRefs,
        });
        integrations.push({
            id: `integration.${operation.id}`,
            kind: 'http',
            method: operation.http.method,
            path: operation.http.path,
            authentication: operation.http.authentication,
            evidence_refs: [operationFact],
        });
    }

    return {
        schema_version: '1.0.0',
        model_id: 'authentication-action-request-semantic',
        domain: policy.domain,
        types,
        operations,
        constraints,
        integrations,
    };
}

export async function readJson(path) {
    return JSON.parse(await readFile(path, 'utf8'));
}

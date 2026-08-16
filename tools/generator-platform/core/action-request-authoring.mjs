const primitiveNames = new Set([
    'boolean',
    'date',
    'datetime',
    'decimal',
    'integer',
    'json',
    'string',
    'uuid',
]);

function invariant(condition, message) {
    if (!condition) throw new Error(`action-request definition: ${message}`);
}

function ensureUnique(entries, label) {
    const seen = new Set();
    for (const entry of entries) {
        invariant(!seen.has(entry.id), `duplicate ${label} ${entry.id}`);
        seen.add(entry.id);
    }
}

function validateFields(fields, path, knownModels, allowConstraints) {
    const names = new Set();
    for (const field of fields) {
        invariant(!names.has(field.name), `${path}: duplicate ${field.name}`);
        names.add(field.name);
        if (field.type.kind === 'primitive') {
            invariant(
                primitiveNames.has(field.type.name),
                `${path}.${field.name}: unknown primitive ${field.type.name}`
            );
        } else {
            invariant(
                knownModels.has(field.type.name),
                `${path}.${field.name}: unknown model ${field.type.name}`
            );
        }
        if (field.equals !== undefined) {
            invariant(
                fields.some(({ name }) => name === field.equals),
                `${path}.${field.name}: equals references unknown field ${field.equals}`
            );
        }
        invariant(
            allowConstraints ||
                (field.format === undefined && field.equals === undefined),
            `${path}.${field.name}: output constraints are unsupported`
        );
    }
}

export function validateActionRequestDefinition(definition) {
    ensureUnique(definition.opaque_types, 'opaque type');
    ensureUnique(definition.operations, 'operation');
    const outputIds = definition.operations.map(({ output }) => ({
        id: output.id,
    }));
    const knownModels = new Set([
        ...definition.opaque_types.map(({ id }) => id),
        ...outputIds.map(({ id }) => id),
    ]);
    const outputShapes = new Map();

    for (const operation of definition.operations) {
        validateFields(
            operation.input.fields,
            `${operation.id}.input`,
            knownModels,
            true
        );
        validateFields(
            operation.output.fields,
            `${operation.id}.output`,
            knownModels,
            false
        );
        const outputShape = JSON.stringify(operation.output.fields);
        const previous = outputShapes.get(operation.output.id);
        invariant(
            previous === undefined || previous === outputShape,
            `output ${operation.output.id} has conflicting shapes`
        );
        outputShapes.set(operation.output.id, outputShape);
        invariant(
            operation.effects.some(({ kind }) => kind === 'external_call'),
            `${operation.id}: action-request requires external_call`
        );
        invariant(
            operation.access.mode !== 'authorized' ||
                operation.access.permissions?.length,
            `${operation.id}: authorized access requires permissions`
        );
        invariant(
            operation.access.mode === 'authorized' ||
                operation.access.permissions === undefined,
            `${operation.id}: only authorized access may declare permissions`
        );
        const permissions = operation.access.permissions ?? [];
        invariant(
            new Set(permissions).size === permissions.length,
            `${operation.id}: duplicate permissions are forbidden`
        );
        invariant(
            operation.access.mode !== 'public' ||
                operation.http.authentication === 'none',
            `${operation.id}: public access requires authentication none`
        );
        invariant(
            operation.access.mode === 'public' ||
                operation.http.authentication !== 'none',
            `${operation.id}: non-public access requires authentication`
        );
        if (
            operation.effects.some(({ kind }) => kind === 'establish_session')
        ) {
            const fields = new Set(
                operation.output.fields.map(({ name }) => name)
            );
            invariant(
                fields.has('user') && fields.has('token'),
                `${operation.id}: establish_session requires user and token outputs`
            );
        }
    }
    return definition;
}

function fact(id, category, statement, sourceId) {
    return {
        id,
        category,
        statement,
        evidence_refs: [sourceId],
        confidence: 1,
        status: 'asserted',
    };
}

function evidenceIds(operation) {
    return {
        operation: `fact.${operation.id}.operation`,
        input: `fact.${operation.id}.input`,
        output: `fact.${operation.id}.output`,
        constraints: `fact.${operation.id}.constraints`,
        effects: `fact.${operation.id}.effects`,
    };
}

function constraintId(operation, field, kind) {
    return `constraint.${operation.id}-${field.name.replaceAll('_', '-')}-${kind}`;
}

export function compileActionRequestDefinition(
    definition,
    { sourceUri, sourceSha256 }
) {
    validateActionRequestDefinition(definition);
    const sourceId = 'source.action-request-definition';
    const typeFactId = `fact.${definition.feature.id}.types`;
    const facts = [
        fact(
            typeFactId,
            'data_shape',
            `The definition declares the shared types for ${definition.feature.name}.`,
            sourceId
        ),
    ];
    const types = definition.opaque_types.map((type) => ({
        id: type.id,
        kind: 'opaque',
        description: type.description,
        fields: [],
        evidence_refs: [typeFactId],
    }));
    const constraints = [];
    const operations = [];
    const integrations = [];
    const emittedOutputs = new Set();

    for (const operation of definition.operations) {
        const ids = evidenceIds(operation);
        facts.push(
            fact(ids.operation, 'operation', operation.description, sourceId),
            fact(
                ids.input,
                'data_shape',
                operation.input.description,
                sourceId
            ),
            fact(
                ids.output,
                'data_shape',
                operation.output.description,
                sourceId
            ),
            fact(
                ids.effects,
                'effect',
                operation.effects
                    .map(({ description }) => description)
                    .join(' '),
                sourceId
            )
        );
        const constrained = operation.input.fields.some(
            (field) => field.required || field.format || field.equals
        );
        if (constrained) {
            facts.push(
                fact(
                    ids.constraints,
                    'constraint',
                    `The definition declares validation constraints for ${operation.id}.`,
                    sourceId
                )
            );
        }

        const inputType = `${operation.id}-input`;
        types.push({
            id: inputType,
            kind: 'object',
            description: operation.input.description,
            fields: operation.input.fields.map((field) => ({
                name: field.name,
                type: field.type,
                required: field.required,
                evidence_refs: [ids.input],
            })),
            evidence_refs: [ids.input],
        });
        if (!emittedOutputs.has(operation.output.id)) {
            emittedOutputs.add(operation.output.id);
            types.push({
                id: operation.output.id,
                kind: 'object',
                description: operation.output.description,
                fields: operation.output.fields.map((field) => ({
                    name: field.name,
                    type: field.type,
                    required: field.required,
                    evidence_refs: [ids.output],
                })),
                evidence_refs: [ids.output],
            });
        }

        for (const field of operation.input.fields) {
            const target = `${inputType}.${field.name}`;
            if (field.required) {
                constraints.push({
                    id: constraintId(operation, field, 'required'),
                    kind: 'required',
                    target,
                    parameters: {},
                    evidence_refs: [ids.constraints],
                });
            }
            if (field.format) {
                constraints.push({
                    id: constraintId(operation, field, 'format'),
                    kind: 'format',
                    target,
                    parameters: { format: field.format },
                    evidence_refs: [ids.constraints],
                });
            }
            if (field.equals) {
                constraints.push({
                    id: constraintId(operation, field, 'equals'),
                    kind: 'equals',
                    target,
                    parameters: {
                        other_target: `${inputType}.${field.equals}`,
                    },
                    evidence_refs: [ids.constraints],
                });
            }
        }

        operations.push({
            id: operation.id,
            kind: 'command',
            description: operation.description,
            input: { kind: 'model', name: inputType, nullable: false },
            output: {
                kind: 'model',
                name: operation.output.id,
                nullable: false,
            },
            access: {
                mode: operation.access.mode,
                ...(operation.access.permissions
                    ? { permissions: [...operation.access.permissions] }
                    : {}),
                evidence_refs: [ids.operation],
            },
            effects: operation.effects.map((effect) => ({
                kind: effect.kind,
                description: effect.description,
                evidence_refs: [ids.effects],
            })),
            integration_ref: `integration.${operation.id}`,
            evidence_refs: [ids.operation, ids.input, ids.output, ids.effects],
        });
        integrations.push({
            id: `integration.${operation.id}`,
            kind: 'http',
            method: operation.http.method,
            path: operation.http.path,
            authentication: operation.http.authentication,
            evidence_refs: [ids.operation],
        });
    }

    const evidence = {
        schema_version: '1.0.0',
        model_id: `${definition.feature.id}-action-request-definition-evidence`,
        sources: [
            {
                id: sourceId,
                kind: 'specification',
                uri: sourceUri,
                sha256: sourceSha256,
            },
        ],
        facts,
        unknowns: [
            {
                id: 'unknown.backend-contract-authority',
                question:
                    'Does an independent backend contract confirm this declaration?',
                impact: 'Generation can verify internal consistency but not the deployed backend.',
                blocking: false,
                evidence_refs: [sourceId],
            },
            {
                id: 'unknown.error-contract',
                question:
                    'Which transport and domain errors belong to the public contract?',
                impact: 'Generated clients can propagate failures but cannot type unspecified errors.',
                blocking: false,
                evidence_refs: [sourceId],
            },
        ],
        decisions: [],
    };
    const semantic = {
        schema_version: '1.0.0',
        model_id: `${definition.feature.id}-action-request-semantic`,
        domain: definition.feature,
        types,
        operations,
        constraints,
        integrations,
    };
    return { evidence, semantic };
}

const V2_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function exactKeys(value, required, optional = []) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return false;
    const allowed = new Set([...required, ...optional]);
    return (
        required.every((key) => Object.hasOwn(value, key)) &&
        Object.keys(value).every((key) => allowed.has(key))
    );
}

function duplicateErrors(entries, keyOf, path) {
    const seen = new Set();
    const errors = [];
    for (const [index, entry] of (entries ?? []).entries()) {
        const key = keyOf(entry);
        if (seen.has(key)) errors.push(`${path}[${index}]: duplicate ${key}`);
        seen.add(key);
    }
    return errors;
}

function operationById(contract, operationId) {
    return contract.operations?.find(
        (operation) => operation.id === operationId
    );
}

function modelById(contract, modelId) {
    return contract.models?.find((model) => model.id === modelId);
}

function hasOnlyPrimitiveFields(model) {
    return (model?.fields ?? []).every(
        (field) => field.type?.kind === 'primitive'
    );
}

function validateBackendReference(definition, contract, sha256, uri, errors) {
    const reference = definition.backend_contract;
    const uriSegments = reference?.uri?.split('/') ?? [];
    if (
        reference?.uri?.startsWith('/') ||
        uriSegments.some(
            (segment) => segment === '' || segment === '.' || segment === '..'
        )
    ) {
        errors.push(
            '$.backend_contract.uri: must be a normalized workspace-relative path'
        );
    }
    if (reference?.id !== contract.contract?.id) {
        errors.push('$.backend_contract.id: does not match backend contract');
    }
    if (reference?.version !== contract.contract?.version) {
        errors.push(
            '$.backend_contract.version: does not match backend contract'
        );
    }
    if (reference?.sha256 !== sha256) {
        errors.push('$.backend_contract.sha256: does not match backend bytes');
    }
    if (uri !== undefined && reference?.uri !== uri) {
        errors.push('$.backend_contract.uri: does not match backend path');
    }
}

function resolveMutation(contract, operation, status, path, errors) {
    if (!operation) return undefined;
    if (!MUTATION_METHODS.has(operation.method)) {
        errors.push(
            `${path}.operation_ref: action-request requires a mutation`
        );
    }
    if ((operation.request?.parameters ?? []).length > 0) {
        errors.push(
            `${path}.operation_ref: backend parameters are not supported by action-request v2 yet`
        );
    }
    const body = operation.request?.body;
    if (!body || body.required !== true) {
        errors.push(
            `${path}.operation_ref: a required request body is required`
        );
    } else if (
        body.media_types?.length !== 1 ||
        body.media_types[0] !== 'application/json'
    ) {
        errors.push(
            `${path}.operation_ref: exactly application/json is supported`
        );
    }
    const inputModel = body ? modelById(contract, body.model_id) : undefined;
    if (inputModel?.kind !== 'object') {
        errors.push(
            `${path}.operation_ref: request body must be an object model`
        );
    } else if (!hasOnlyPrimitiveFields(inputModel)) {
        errors.push(
            `${path}.operation_ref: request body fields must be primitive`
        );
    }
    const response = operation.responses?.find(
        (candidate) => candidate.status === status
    );
    if (!response || response.outcome !== 'success') {
        errors.push(
            `${path}.success_response_status: unresolved successful response ${status}`
        );
        return undefined;
    }
    if (!response.body) {
        errors.push(`${path}.success_response_status: response has no body`);
        return undefined;
    }
    const resultModel = modelById(contract, response.body.model_id);
    if (resultModel?.kind !== 'object') {
        errors.push(
            `${path}.success_response_status: response body must be an object model`
        );
    } else if (!hasOnlyPrimitiveFields(resultModel)) {
        errors.push(
            `${path}.success_response_status: response body fields must be primitive`
        );
    }
    if (
        inputModel?.kind !== 'object' ||
        resultModel?.kind !== 'object' ||
        !hasOnlyPrimitiveFields(inputModel) ||
        !hasOnlyPrimitiveFields(resultModel)
    ) {
        return undefined;
    }
    return { body, inputModel, response, resultModel };
}

function validateInput(action, wireModel, path, errors) {
    const fields = action.input?.fields ?? [];
    errors.push(
        ...duplicateErrors(
            fields,
            (field) => field?.name,
            `${path}.input.fields`
        ),
        ...duplicateErrors(
            fields,
            (field) => field?.body_field,
            `${path}.input.fields.body_field`
        )
    );
    const wireFields = new Map(
        (wireModel.fields ?? []).map((field) => [field.name, field])
    );
    for (const [index, field] of fields.entries()) {
        const wireField = wireFields.get(field.body_field);
        if (!wireField) {
            errors.push(
                `${path}.input.fields[${index}].body_field: unresolved wire field ${field.body_field}`
            );
            continue;
        }
        const validations = field.validations ?? [];
        errors.push(
            ...duplicateErrors(
                validations,
                (validation) => validation?.kind,
                `${path}.input.fields[${index}].validations`
            )
        );
        const required = validations.some(
            (validation) => validation.kind === 'required'
        );
        if (required !== wireField.required) {
            errors.push(
                `${path}.input.fields[${index}].validations: required must match backend field`
            );
        }
        for (const validation of validations) {
            if (
                validation.kind === 'format' &&
                wireField.type?.name !== 'string'
            ) {
                errors.push(
                    `${path}.input.fields[${index}].validations: format requires a string field`
                );
            }
            if (validation.kind === 'equals') {
                if (validation.other_field === field.name) {
                    errors.push(
                        `${path}.input.fields[${index}].validations: equals cannot reference itself`
                    );
                } else if (
                    !fields.some(
                        (candidate) => candidate.name === validation.other_field
                    )
                ) {
                    errors.push(
                        `${path}.input.fields[${index}].validations: equals references unknown input field ${validation.other_field}`
                    );
                } else {
                    const other = fields.find(
                        (candidate) => candidate.name === validation.other_field
                    );
                    const otherWireField = wireFields.get(other.body_field);
                    if (
                        otherWireField &&
                        (otherWireField.nullable !== wireField.nullable ||
                            otherWireField.type?.name !== wireField.type?.name)
                    ) {
                        errors.push(
                            `${path}.input.fields[${index}].validations: equals requires compatible backend field types`
                        );
                    }
                }
            }
        }
    }
    for (const wireField of wireFields.values()) {
        if (
            fields.filter((field) => field.body_field === wireField.name)
                .length !== 1
        ) {
            errors.push(
                `${path}.input.fields: backend body field ${wireField.name} requires exactly one binding`
            );
        }
    }
}

function validateResult(action, wireModel, path, errors) {
    const fields = action.result_model?.fields ?? [];
    errors.push(
        ...duplicateErrors(
            fields,
            (field) => field?.name,
            `${path}.result_model.fields`
        ),
        ...duplicateErrors(
            fields,
            (field) => field?.source_field,
            `${path}.result_model.fields.source_field`
        )
    );
    const wireFields = new Set(
        (wireModel.fields ?? []).map((field) => field.name)
    );
    for (const [index, field] of fields.entries()) {
        if (!wireFields.has(field.source_field)) {
            errors.push(
                `${path}.result_model.fields[${index}].source_field: unresolved wire field ${field.source_field}`
            );
        }
    }
}

function validateExecution(execution, path, errors) {
    if (!execution) return;
    if (
        execution.retry?.mode === 'manual' &&
        execution.idempotency?.mode !== 'host'
    ) {
        errors.push(`${path}.retry: manual retry requires host idempotency`);
    }
    if (
        execution.concurrency === 'parallel' &&
        execution.idempotency?.mode !== 'host'
    ) {
        errors.push(
            `${path}.concurrency: parallel commands require host idempotency`
        );
    }
}

export function validateActionRequestV2Definition(
    definition,
    backendContract,
    { backendContractSha256, backendContractUri }
) {
    const errors = [];
    validateBackendReference(
        definition,
        backendContract,
        backendContractSha256,
        backendContractUri,
        errors
    );
    errors.push(
        ...duplicateErrors(
            definition.operations,
            (operation) => operation?.id,
            '$.operations'
        ),
        ...duplicateErrors(
            definition.operations,
            (operation) => operation?.operation_ref?.operation_id,
            '$.operations.operation_ref'
        )
    );
    for (const [index, action] of (definition.operations ?? []).entries()) {
        const path = `$.operations[${index}]`;
        const operationId = action.operation_ref?.operation_id;
        const operation = operationById(backendContract, operationId);
        if (!operation) {
            errors.push(
                `${path}.operation_ref.operation_id: unresolved backend operation ${operationId}`
            );
            continue;
        }
        const resolved = resolveMutation(
            backendContract,
            operation,
            action.success_response_status,
            path,
            errors
        );
        validateExecution(action.execution, `${path}.execution`, errors);
        if (!resolved) continue;
        validateInput(action, resolved.inputModel, path, errors);
        validateResult(action, resolved.resultModel, path, errors);
    }
    return errors;
}

function normalizedPath(path) {
    return path?.startsWith('/') ? path : `/${path}`;
}

function authenticationKind(contract, operation) {
    const schemeIds = operation.access?.security_scheme_ids ?? [];
    if (schemeIds.length === 0) return 'none';
    if (schemeIds.length !== 1) return 'ambiguous';
    const scheme = contract.security_schemes?.find(
        (candidate) => candidate.id === schemeIds[0]
    );
    return (
        {
            bearer: 'bearer',
            cookie: 'session',
            'api-key': 'api_key',
            other: 'other',
        }[scheme?.kind] ?? 'unsupported'
    );
}

function assertLegacyOperationMatchesBackend(
    source,
    backendOperation,
    backendContract,
    successResponseStatus
) {
    const mismatches = [];
    if (source.http?.method !== backendOperation.method)
        mismatches.push('method');
    if (normalizedPath(source.http?.path) !== backendOperation.path)
        mismatches.push('path');
    if (source.access?.mode !== backendOperation.access?.mode)
        mismatches.push('access');
    const sourcePermissions = [...(source.access?.permissions ?? [])].sort();
    const backendPermissions = [
        ...(backendOperation.access?.permissions ?? []),
    ].sort();
    if (
        sourcePermissions.length !== backendPermissions.length ||
        sourcePermissions.some(
            (permission, index) => permission !== backendPermissions[index]
        )
    ) {
        mismatches.push('permissions');
    }
    if (
        source.http?.authentication !==
        authenticationKind(backendContract, backendOperation)
    ) {
        mismatches.push('authentication');
    }
    const response = backendOperation.responses?.find(
        (candidate) => candidate.status === successResponseStatus
    );
    const expectedEnvelope =
        source.http?.response_envelope === 'simple' ? 'object' : 'none';
    if (response?.body?.envelope?.kind !== expectedEnvelope)
        mismatches.push('response_envelope');
    if (mismatches.length) {
        throw new Error(
            `action-request migration: ${source.id} disagrees with backend authority on ${mismatches.join(', ')}`
        );
    }
}

function backendPrimitiveMatchesLegacy(backendType, legacyType) {
    if (backendType?.kind !== 'primitive' || legacyType?.kind !== 'primitive')
        return false;
    const expected = legacyType.name === 'decimal' ? 'number' : legacyType.name;
    return backendType.name === expected;
}

function fieldMappings(decision, key) {
    const mappings = decision[key] ?? [];
    const bySource = new Map();
    for (const mapping of mappings) {
        if (bySource.has(mapping.source_field)) {
            throw new Error(
                `action-request migration: duplicate ${key} source ${mapping.source_field}`
            );
        }
        bySource.set(mapping.source_field, mapping.target_field);
    }
    return bySource;
}

function assertMappingDomain(sourceFields, wireFields, mappings, label) {
    for (const [sourceField, targetField] of mappings) {
        if (!sourceFields.has(sourceField)) {
            throw new Error(
                `action-request migration: ${label} mapping references unknown source field ${sourceField}`
            );
        }
        if (!wireFields.has(targetField)) {
            throw new Error(
                `action-request migration: ${label} mapping references unknown backend field ${targetField}`
            );
        }
    }
}

function migrateInput(source, wireModel, decision) {
    const mappings = fieldMappings(decision, 'input_field_mappings');
    const wireFields = new Map(
        (wireModel.fields ?? []).map((field) => [field.name, field])
    );
    const sourceFields = new Set(
        source.input.fields.map((field) => field.name)
    );
    assertMappingDomain(sourceFields, wireFields, mappings, 'input');
    const fields = source.input.fields.map((legacyField) => {
        const targetName = mappings.get(legacyField.name) ?? legacyField.name;
        const wireField = wireFields.get(targetName);
        if (
            !wireField ||
            wireField.required !== legacyField.required ||
            wireField.nullable !== legacyField.type.nullable ||
            !backendPrimitiveMatchesLegacy(wireField.type, legacyField.type)
        ) {
            throw new Error(
                `action-request migration: ${source.id}.${legacyField.name} changes request type, required or nullable semantics`
            );
        }
        const validations = [
            ...(legacyField.required ? [{ kind: 'required' }] : []),
            ...(legacyField.format
                ? [{ kind: 'format', format: legacyField.format }]
                : []),
            ...(legacyField.equals
                ? [{ kind: 'equals', other_field: legacyField.equals }]
                : []),
        ];
        return {
            name: legacyField.name,
            body_field: targetName,
            validations,
        };
    });
    if (
        fields.length !== wireFields.size ||
        new Set(fields.map((field) => field.body_field)).size !==
            wireFields.size
    ) {
        throw new Error(
            `action-request migration: ${source.id} input mappings must cover both models exactly`
        );
    }
    return { fields };
}

function migrateResult(source, wireModel, decision) {
    const mappings = fieldMappings(decision, 'result_field_mappings');
    const wireFields = new Map(
        (wireModel.fields ?? []).map((field) => [field.name, field])
    );
    const sourceFields = new Set(
        source.output.fields.map((field) => field.name)
    );
    assertMappingDomain(sourceFields, wireFields, mappings, 'result');
    const fields = source.output.fields.map((legacyField) => {
        const targetName = mappings.get(legacyField.name) ?? legacyField.name;
        const wireField = wireFields.get(targetName);
        if (
            !wireField ||
            wireField.required !== legacyField.required ||
            wireField.nullable !== legacyField.type.nullable ||
            !backendPrimitiveMatchesLegacy(wireField.type, legacyField.type)
        ) {
            throw new Error(
                `action-request migration: ${source.id}.${legacyField.name} changes result type, required or nullable semantics`
            );
        }
        return { name: legacyField.name, source_field: targetName };
    });
    if (
        new Set(fields.map((field) => field.source_field)).size !==
        fields.length
    ) {
        throw new Error(
            `action-request migration: ${source.id} result mappings must be one-to-one`
        );
    }
    return {
        id: source.output.id,
        description: source.output.description,
        fields,
    };
}

function decisionFor(decisions, operationId) {
    const matches = (decisions.operations ?? []).filter(
        (decision) => decision.source_operation_id === operationId
    );
    if (matches.length !== 1) {
        throw new Error(
            `action-request migration: ${operationId} requires exactly one explicit migration decision`
        );
    }
    return matches[0];
}

function validateDecisions(decisions) {
    if (
        decisions?.schema_version !== '1.0.0' ||
        decisions?.kind !== 'action-request-v1-migration-decisions'
    ) {
        throw new Error(
            'action-request migration: migration decisions are required'
        );
    }
    if (!exactKeys(decisions, ['schema_version', 'kind', 'operations'])) {
        throw new Error(
            'action-request migration: migration decisions are not closed'
        );
    }
    if (!Array.isArray(decisions.operations)) {
        throw new Error(
            'action-request migration: operations decisions must be an array'
        );
    }
    for (const decision of decisions.operations ?? []) {
        if (
            !exactKeys(
                decision,
                [
                    'source_operation_id',
                    'backend_operation_id',
                    'success_response_status',
                    'execution',
                ],
                ['input_field_mappings', 'result_field_mappings']
            )
        ) {
            throw new Error(
                'action-request migration: each operation decision must use the closed v1 migration shape'
            );
        }
        for (const key of ['input_field_mappings', 'result_field_mappings']) {
            if (
                decision[key] !== undefined &&
                (!Array.isArray(decision[key]) ||
                    decision[key].some(
                        (mapping) =>
                            !exactKeys(mapping, [
                                'source_field',
                                'target_field',
                            ])
                    ))
            ) {
                throw new Error(
                    'action-request migration: field mappings must use the closed shape'
                );
            }
        }
    }
}

export function migrateActionRequestV1Definition(
    definition,
    { backendContract, backendContractUri, backendContractSha256, decisions }
) {
    if (definition.schema_version === '2.0.0') {
        const errors = validateActionRequestV2Definition(
            definition,
            backendContract,
            { backendContractSha256, backendContractUri }
        );
        if (errors.length) {
            throw new Error(
                `action-request migration: invalid v2 input\n${errors.join('\n')}`
            );
        }
        return structuredClone(definition);
    }
    if (definition.schema_version !== '1.0.0') {
        throw new Error(
            `action-request migration: unsupported schema ${definition.schema_version}`
        );
    }
    if (!V2_ID.test(definition.feature?.id ?? '')) {
        throw new Error(
            `action-request migration: feature ${definition.feature?.id} uses an identifier unsupported by v2`
        );
    }
    validateDecisions(decisions);
    const migratedOperations = definition.operations.map((source) => {
        if (!V2_ID.test(source.id) || !V2_ID.test(source.output.id)) {
            throw new Error(
                `action-request migration: ${source.id} uses an identifier unsupported by v2`
            );
        }
        const decision = decisionFor(decisions, source.id);
        const backendOperation = operationById(
            backendContract,
            decision.backend_operation_id
        );
        if (!backendOperation) {
            throw new Error(
                `action-request migration: ${source.id} references unknown backend operation ${decision.backend_operation_id}`
            );
        }
        assertLegacyOperationMatchesBackend(
            source,
            backendOperation,
            backendContract,
            decision.success_response_status
        );
        const errors = [];
        const resolved = resolveMutation(
            backendContract,
            backendOperation,
            decision.success_response_status,
            `operation ${source.id}`,
            errors
        );
        if (!resolved || errors.length) {
            throw new Error(
                `action-request migration: ${source.id} cannot resolve mutation\n${errors.join('\n')}`
            );
        }
        const establishesSession = source.effects.some(
            (effect) => effect.kind === 'establish_session'
        );
        if (
            establishesSession !==
            (decision.execution?.post_success?.mode === 'host')
        ) {
            throw new Error(
                `action-request migration: ${source.id} post-success host effect must match establish_session`
            );
        }
        return {
            id: source.id,
            operation_ref: {
                operation_id: decision.backend_operation_id,
            },
            success_response_status: decision.success_response_status,
            input: migrateInput(source, resolved.inputModel, decision),
            result_model: migrateResult(source, resolved.resultModel, decision),
            execution: structuredClone(decision.execution),
        };
    });
    if ((decisions.operations ?? []).length !== migratedOperations.length) {
        throw new Error(
            'action-request migration: decisions must match v1 operations exactly'
        );
    }
    const migrated = {
        schema_version: '2.0.0',
        kind: 'action-request',
        feature: structuredClone(definition.feature),
        backend_contract: {
            uri: backendContractUri,
            id: backendContract.contract.id,
            version: backendContract.contract.version,
            sha256: backendContractSha256,
        },
        operations: migratedOperations,
    };
    const errors = validateActionRequestV2Definition(
        migrated,
        backendContract,
        { backendContractSha256, backendContractUri }
    );
    if (errors.length) {
        throw new Error(
            `action-request migration: invalid migrated definition\n${errors.join('\n')}`
        );
    }
    return migrated;
}

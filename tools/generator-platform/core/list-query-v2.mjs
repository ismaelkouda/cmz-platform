const V2_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

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

function resolveListResponse(contract, operation, status, path, errors) {
    if (!operation) return undefined;
    if (operation.method !== 'GET') {
        errors.push(`${path}.operation_ref: list-query requires GET`);
    }
    if (operation.request?.body) {
        errors.push(`${path}.operation_ref: GET/HEAD query cannot use a body`);
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
    const collection = modelById(contract, response.body.model_id);
    if (collection?.kind !== 'array') {
        errors.push(
            `${path}.success_response_status: response model must be an array`
        );
        return undefined;
    }
    if (collection.items?.kind !== 'model') {
        errors.push(
            `${path}.success_response_status: array items must be a model`
        );
        return undefined;
    }
    const item = modelById(contract, collection.items.model_id);
    if (item?.kind !== 'object') {
        errors.push(
            `${path}.success_response_status: array item must resolve to an object model`
        );
        return undefined;
    }
    return { response, collection, item };
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

function validateExecution(execution, access, path, errors) {
    if (!execution) return;
    if (execution.concurrency === 'latest-wins') {
        if (execution.cancellation?.on_superseded !== true) {
            errors.push(
                `${path}.cancellation.on_superseded: latest-wins requires cancellation`
            );
        }
    } else if (execution.cancellation?.on_superseded === true) {
        errors.push(
            `${path}.cancellation.on_superseded: only latest-wins supersedes an active request`
        );
    }
    if (execution.cache?.mode !== 'host') return;
    if (access?.mode === 'public' && execution.cache.scope !== 'public') {
        errors.push(`${path}.cache.scope: public query requires public scope`);
    }
    if (access?.mode !== 'public' && execution.cache.scope === 'public') {
        errors.push(
            `${path}.cache.scope: authenticated query cannot use public scope`
        );
    }
}

function validateInputBindings(query, operation, path, errors) {
    const parameters = operation.request?.parameters ?? [];
    const fields = query.input?.fields ?? [];
    errors.push(
        ...duplicateErrors(
            fields,
            (field) => field?.name,
            `${path}.input.fields`
        ),
        ...duplicateErrors(
            fields,
            (field) =>
                `${field?.parameter_ref?.in}:${field?.parameter_ref?.name}`,
            `${path}.input.fields.parameter_ref`
        )
    );
    for (const [fieldIndex, field] of fields.entries()) {
        const reference = field?.parameter_ref;
        const parameter = parameters.find(
            (candidate) =>
                candidate.in === reference?.in &&
                candidate.name === reference?.name
        );
        if (!parameter) {
            errors.push(
                `${path}.input.fields[${fieldIndex}].parameter_ref: unresolved backend parameter ${reference?.in}:${reference?.name}`
            );
        }
    }
    for (const parameter of parameters) {
        const matches = fields.filter(
            (field) =>
                field?.parameter_ref?.in === parameter.in &&
                field?.parameter_ref?.name === parameter.name
        );
        if (matches.length !== 1) {
            errors.push(
                `${path}.input.fields: backend parameter ${parameter.in}:${parameter.name} requires exactly one input binding`
            );
        }
    }
    if (parameters.length === 0 && query.input !== undefined) {
        errors.push(`${path}.input: operation has no backend parameters`);
    }
}

export function validateListQueryV2Definition(
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
    for (const [index, query] of (definition.operations ?? []).entries()) {
        const path = `$.operations[${index}]`;
        const operationId = query.operation_ref?.operation_id;
        const operation = operationById(backendContract, operationId);
        if (!operation) {
            errors.push(
                `${path}.operation_ref.operation_id: unresolved backend operation ${operationId}`
            );
            continue;
        }
        const resolved = resolveListResponse(
            backendContract,
            operation,
            query.success_response_status,
            path,
            errors
        );
        validateInputBindings(query, operation, path, errors);
        validateExecution(query.execution, operation.access, path, errors);
        if (!resolved) continue;
        errors.push(
            ...duplicateErrors(
                query.read_model?.fields,
                (field) => field?.name,
                `${path}.read_model.fields`
            )
        );
        const sourceFields = new Set(
            resolved.item.fields?.map((field) => field.name)
        );
        for (const [fieldIndex, field] of (
            query.read_model?.fields ?? []
        ).entries()) {
            if (!sourceFields.has(field.source_field)) {
                errors.push(
                    `${path}.read_model.fields[${fieldIndex}].source_field: unresolved wire field ${field.source_field}`
                );
            }
        }
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
            `list-query migration: ${source.id} disagrees with backend authority on ${mismatches.join(', ')}`
        );
    }
}

function backendPrimitiveMatchesLegacy(backendType, legacyType) {
    if (backendType?.kind !== 'primitive' || legacyType?.kind !== 'primitive')
        return false;
    const expected = legacyType.name === 'decimal' ? 'number' : legacyType.name;
    return backendType.name === expected;
}

function migrateReadModel(source, wireItem, decision) {
    const mappings = new Map(
        (decision.field_mappings ?? []).map((mapping) => [
            mapping.target_field,
            mapping.source_field,
        ])
    );
    if (mappings.size !== (decision.field_mappings ?? []).length) {
        throw new Error(
            `list-query migration: ${source.id} has duplicate target field mappings`
        );
    }
    const wireFields = new Map(
        (wireItem.fields ?? []).map((field) => [field.name, field])
    );
    const fields = source.item.fields.map((legacyField) => {
        const sourceFieldName =
            mappings.get(legacyField.name) ?? legacyField.name;
        const wireField = wireFields.get(sourceFieldName);
        if (!wireField) {
            throw new Error(
                `list-query migration: ${source.id}.${legacyField.name} cannot resolve wire field ${sourceFieldName}`
            );
        }
        if (
            wireField.required !== legacyField.required ||
            wireField.nullable !== legacyField.type.nullable ||
            !backendPrimitiveMatchesLegacy(wireField.type, legacyField.type)
        ) {
            throw new Error(
                `list-query migration: ${source.id}.${legacyField.name} changes wire type, required or nullable semantics`
            );
        }
        return { name: legacyField.name, source_field: sourceFieldName };
    });
    if (
        (decision.field_mappings ?? []).some(
            (mapping) =>
                !source.item.fields.some(
                    (field) => field.name === mapping.target_field
                )
        )
    ) {
        throw new Error(
            `list-query migration: ${source.id} maps an unknown target field`
        );
    }
    return {
        id: source.item.id,
        description: source.item.description,
        fields,
    };
}

function decisionFor(decisions, operationId) {
    const matches = (decisions.operations ?? []).filter(
        (decision) => decision.source_operation_id === operationId
    );
    if (matches.length !== 1) {
        throw new Error(
            `list-query migration: ${operationId} requires exactly one explicit migration decision`
        );
    }
    return matches[0];
}

export function migrateListQueryV1Definition(
    definition,
    { backendContract, backendContractUri, backendContractSha256, decisions }
) {
    if (definition.schema_version === '2.0.0') {
        const errors = validateListQueryV2Definition(
            definition,
            backendContract,
            { backendContractSha256, backendContractUri }
        );
        if (errors.length) {
            throw new Error(
                `list-query migration: invalid v2 input\n${errors.join('\n')}`
            );
        }
        return structuredClone(definition);
    }
    if (definition.schema_version !== '1.0.0') {
        throw new Error(
            `list-query migration: unsupported schema ${definition.schema_version}`
        );
    }
    if (!V2_ID.test(definition.feature?.id ?? '')) {
        throw new Error(
            `list-query migration: feature ${definition.feature?.id} uses an identifier unsupported by v2`
        );
    }
    if (
        decisions?.schema_version !== '1.0.0' ||
        decisions?.kind !== 'list-query-v1-migration-decisions'
    ) {
        throw new Error(
            'list-query migration: migration decisions are required'
        );
    }
    if (!exactKeys(decisions, ['schema_version', 'kind', 'operations'])) {
        throw new Error(
            'list-query migration: migration decisions are not closed'
        );
    }
    if (!Array.isArray(decisions.operations)) {
        throw new Error(
            'list-query migration: migration decision operations must be an array'
        );
    }
    for (const decision of decisions.operations) {
        const mappings = decision?.field_mappings;
        if (
            !exactKeys(
                decision,
                [
                    'source_operation_id',
                    'backend_operation_id',
                    'success_response_status',
                    'execution',
                ],
                ['field_mappings']
            ) ||
            (mappings !== undefined && !Array.isArray(mappings)) ||
            (Array.isArray(mappings) &&
                mappings.some(
                    (mapping) =>
                        !exactKeys(mapping, ['target_field', 'source_field'])
                ))
        ) {
            throw new Error(
                'list-query migration: each operation decision must use the closed v1 migration shape'
            );
        }
    }
    const migratedOperations = definition.operations.map((source) => {
        if (!V2_ID.test(source.id) || !V2_ID.test(source.item.id)) {
            throw new Error(
                `list-query migration: ${source.id} uses an identifier unsupported by v2`
            );
        }
        const decision = decisionFor(decisions, source.id);
        const backendOperation = operationById(
            backendContract,
            decision.backend_operation_id
        );
        if (!backendOperation) {
            throw new Error(
                `list-query migration: ${source.id} references unknown backend operation ${decision.backend_operation_id}`
            );
        }
        assertLegacyOperationMatchesBackend(
            source,
            backendOperation,
            backendContract,
            decision.success_response_status
        );
        const errors = [];
        const resolved = resolveListResponse(
            backendContract,
            backendOperation,
            decision.success_response_status,
            `operation ${source.id}`,
            errors
        );
        if (!resolved || errors.length) {
            throw new Error(
                `list-query migration: ${source.id} cannot resolve list response\n${errors.join('\n')}`
            );
        }
        return {
            id: source.id,
            operation_ref: {
                operation_id: decision.backend_operation_id,
            },
            success_response_status: decision.success_response_status,
            read_model: migrateReadModel(source, resolved.item, decision),
            execution: structuredClone(decision.execution),
        };
    });
    if ((decisions.operations ?? []).length !== migratedOperations.length) {
        throw new Error(
            'list-query migration: decisions must match v1 operations exactly'
        );
    }
    const migrated = {
        schema_version: '2.0.0',
        kind: 'list-query',
        feature: structuredClone(definition.feature),
        backend_contract: {
            uri: backendContractUri,
            id: backendContract.contract.id,
            version: backendContract.contract.version,
            sha256: backendContractSha256,
        },
        operations: migratedOperations,
    };
    const errors = validateListQueryV2Definition(migrated, backendContract, {
        backendContractSha256,
        backendContractUri,
    });
    if (errors.length) {
        throw new Error(
            `list-query migration: invalid migrated definition\n${errors.join('\n')}`
        );
    }
    return migrated;
}

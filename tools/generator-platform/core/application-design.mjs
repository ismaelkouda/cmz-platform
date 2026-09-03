import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

import { validateJsonSchema } from '../validate-ir.mjs';
import {
    validateBackendContract,
    verifyBackendContractSnapshots,
} from './backend-contract.mjs';

const ACCESS_RANK = { public: 0, authenticated: 1, authorized: 2 };
const FORBIDDEN_TARGET_TOKENS = [
    /\bangular\b/i,
    /\breact(?:js)?\b/i,
    /\bkotlin\b/i,
    /\bswift\b/i,
    /\btypescript\b/i,
    /\bnx\b/i,
    /(?:^|["\s])(apps|libs|src)\//i,
    /\.(?:ts|tsx|kt|swift|html|scss)(?:["\s]|$)/i,
];

function duplicateErrors(entries, path, key = (entry) => entry?.id) {
    const seen = new Set();
    const errors = [];
    for (const [index, entry] of (entries ?? []).entries()) {
        const value = key(entry);
        const token = JSON.stringify(value);
        if (seen.has(token))
            errors.push(`${path}[${index}]: duplicate ${token}`);
        seen.add(token);
    }
    return errors;
}

function referenceErrors(values, allowed, path, label) {
    const errors = [];
    for (const [index, value] of (values ?? []).entries()) {
        if (!allowed.has(value))
            errors.push(`${path}[${index}]: unresolved ${label} ${value}`);
    }
    return errors;
}

function evidenceErrors(entity, path, sourceIds, usedSources) {
    const errors = [];
    for (const [index, evidence] of (entity?.evidence ?? []).entries()) {
        if (!sourceIds.has(evidence?.source_id)) {
            errors.push(
                `${path}.evidence[${index}]: unresolved source ${evidence?.source_id}`
            );
        } else {
            usedSources.add(evidence.source_id);
        }
    }
    return errors;
}

function operationFor(reference, contracts, path, errors) {
    const entry = contracts.get(reference?.contract_id);
    if (!entry) {
        errors.push(`${path}.contract_id: unresolved target contract`);
        return undefined;
    }
    if (entry.role !== 'target') {
        errors.push(
            `${path}.contract_id: reference backends cannot drive implementation`
        );
        return undefined;
    }
    const operation = entry.contract.operations.find(
        (candidate) => candidate.id === reference?.operation_id
    );
    if (!operation)
        errors.push(
            `${path}.operation_id: unresolved operation ${reference?.operation_id}`
        );
    return operation;
}

function assertPageAccess(page, operation, path, errors) {
    if (!operation) return;
    if (ACCESS_RANK[page.access?.mode] < ACCESS_RANK[operation.access?.mode]) {
        errors.push(`${path}: page access is weaker than operation access`);
    }
    const pagePermissions = new Set(page.access?.permissions ?? []);
    for (const permission of operation.access?.permissions ?? []) {
        if (!pagePermissions.has(permission))
            errors.push(
                `${path}: page is missing operation permission ${permission}`
            );
    }
}

function modelFor(contractEntry, modelId) {
    return contractEntry?.contract.models.find((model) => model.id === modelId);
}

function stateReference(errors, states, value, path, expectedKind) {
    const state = states.get(value);
    if (!state) errors.push(`${path}: unresolved state ${value}`);
    else if (expectedKind && !expectedKind.includes(state.kind))
        errors.push(
            `${path}: state ${value} must be ${expectedKind.join(' or ')}`
        );
}

function validateAction(page, action, index, context, errors) {
    const path = `${context.path}.actions[${index}]`;
    const states = context.states;
    for (const stateId of action.available_in_state_ids ?? [])
        stateReference(
            errors,
            states,
            stateId,
            `${path}.available_in_state_ids`
        );
    if (action.kind === 'navigate') {
        if (!action.destination_page_id)
            errors.push(`${path}.destination_page_id: required for navigation`);
        if (
            action.operation_ref ||
            action.success_state_id ||
            action.error_state_id ||
            action.input_bindings?.length
        ) {
            errors.push(
                `${path}: navigate action contains backend-only properties`
            );
        }
        return;
    }
    if (action.destination_page_id)
        errors.push(
            `${path}.destination_page_id: forbidden for backend action`
        );
    if (!action.operation_ref)
        errors.push(`${path}.operation_ref: required for backend action`);
    if (!action.success_state_id || !action.error_state_id)
        errors.push(
            `${path}: backend action requires success and error states`
        );
    stateReference(
        errors,
        states,
        action.success_state_id,
        `${path}.success_state_id`,
        ['ready', 'success']
    );
    stateReference(
        errors,
        states,
        action.error_state_id,
        `${path}.error_state_id`,
        ['error']
    );
    const operation = operationFor(
        action.operation_ref,
        context.contracts,
        `${path}.operation_ref`,
        errors
    );
    assertPageAccess(page, operation, path, errors);
    if (!operation) return;
    const contractEntry = context.contracts.get(
        action.operation_ref.contract_id
    );
    const controls = context.controls;
    const targets = new Set();
    for (const [bindingIndex, binding] of (
        action.input_bindings ?? []
    ).entries()) {
        const bindingPath = `${path}.input_bindings[${bindingIndex}]`;
        const control = controls.get(binding.control_id);
        if (!control)
            errors.push(`${bindingPath}.control_id: unresolved control`);
        const target = `${binding.target_kind}:${binding.target_name}`;
        if (targets.has(target))
            errors.push(`${bindingPath}: duplicate target ${target}`);
        targets.add(target);
        if (binding.target_kind === 'body-field') {
            const body = operation.request?.body;
            const model = modelFor(contractEntry, body?.model_id);
            const field =
                model?.kind === 'object'
                    ? model.fields.find(
                          (candidate) => candidate.name === binding.target_name
                      )
                    : undefined;
            if (!body || !field)
                errors.push(
                    `${bindingPath}: unresolved request body field ${binding.target_name}`
                );
            else if (field.required && control && !control.required)
                errors.push(
                    `${bindingPath}: required backend field needs a required control`
                );
        } else {
            const location = binding.target_kind.replace('-parameter', '');
            const parameter = operation.request?.parameters.find(
                (candidate) =>
                    candidate.in === location &&
                    candidate.name === binding.target_name
            );
            if (!parameter)
                errors.push(
                    `${bindingPath}: unresolved ${location} parameter ${binding.target_name}`
                );
            else if (parameter.required && control && !control.required)
                errors.push(
                    `${bindingPath}: required parameter needs a required control`
                );
        }
    }
    const bodyModel = modelFor(
        contractEntry,
        operation.request?.body?.model_id
    );
    for (const field of bodyModel?.kind === 'object' ? bodyModel.fields : []) {
        if (field.required && !targets.has(`body-field:${field.name}`))
            errors.push(
                `${path}.input_bindings: missing required body field ${field.name}`
            );
    }
    for (const parameter of operation.request?.parameters ?? []) {
        if (
            parameter.required &&
            !targets.has(`${parameter.in}-parameter:${parameter.name}`)
        )
            errors.push(
                `${path}.input_bindings: missing required ${parameter.in} parameter ${parameter.name}`
            );
    }
}

function validateLoad(page, load, index, context, errors) {
    const path = `${context.path}.loads[${index}]`;
    const operation = operationFor(
        load.operation_ref,
        context.contracts,
        `${path}.operation_ref`,
        errors
    );
    assertPageAccess(page, operation, path, errors);
    if (operation && !['GET', 'HEAD'].includes(operation.method))
        errors.push(`${path}.operation_ref: page loads require GET or HEAD`);
    stateReference(
        errors,
        context.states,
        load.loading_state_id,
        `${path}.loading_state_id`,
        ['loading']
    );
    stateReference(
        errors,
        context.states,
        load.success_state_id,
        `${path}.success_state_id`,
        ['ready', 'success']
    );
    stateReference(
        errors,
        context.states,
        load.error_state_id,
        `${path}.error_state_id`,
        ['error']
    );
    if (load.empty_state_id)
        stateReference(
            errors,
            context.states,
            load.empty_state_id,
            `${path}.empty_state_id`,
            ['empty']
        );
    if (!operation) return;
    const targets = new Set();
    for (const [bindingIndex, binding] of (
        load.parameter_bindings ?? []
    ).entries()) {
        const bindingPath = `${path}.parameter_bindings[${bindingIndex}]`;
        const target = `${binding.parameter_in}:${binding.parameter_name}`;
        if (targets.has(target))
            errors.push(`${bindingPath}: duplicate target ${target}`);
        targets.add(target);
        if (
            !operation.request?.parameters.some(
                (parameter) =>
                    parameter.in === binding.parameter_in &&
                    parameter.name === binding.parameter_name
            )
        ) {
            errors.push(
                `${bindingPath}: unresolved operation parameter ${target}`
            );
        }
    }
    for (const parameter of operation.request?.parameters ?? []) {
        if (
            parameter.required &&
            !targets.has(`${parameter.in}:${parameter.name}`)
        )
            errors.push(
                `${path}.parameter_bindings: missing required parameter ${parameter.name}`
            );
    }
}

function validateDataBinding(page, binding, index, context, errors) {
    const path = `${context.path}.data_bindings[${index}]`;
    const operation = operationFor(
        binding.operation_ref,
        context.contracts,
        `${path}.operation_ref`,
        errors
    );
    assertPageAccess(page, operation, path, errors);
    for (const stateId of binding.visible_in_state_ids ?? [])
        stateReference(
            errors,
            context.states,
            stateId,
            `${path}.visible_in_state_ids`
        );
    if (!operation) return;
    const response = operation.responses.find(
        (candidate) => candidate.status === binding.response_status
    );
    if (!response) {
        errors.push(`${path}.response_status: unresolved response`);
        return;
    }
    if (response.body?.model_id !== binding.model_id) {
        errors.push(`${path}.model_id: does not match response body model`);
        return;
    }
    const contract = context.contracts.get(binding.operation_ref.contract_id);
    const model = modelFor(contract, binding.model_id);
    if (model?.kind !== 'object' && binding.field_names?.length > 0)
        errors.push(
            `${path}.field_names: scalar/array models have no named fields`
        );
    const fields = new Set(
        model?.kind === 'object' ? model.fields.map((field) => field.name) : []
    );
    for (const fieldName of binding.field_names ?? []) {
        if (!fields.has(fieldName))
            errors.push(`${path}.field_names: unresolved field ${fieldName}`);
    }
}

function validateRegions(page, context, errors) {
    const used = { controls: new Set(), actions: new Set(), data: new Set() };
    if (
        (page.regions ?? []).filter((region) => region.role === 'main')
            .length !== 1
    )
        errors.push(
            `${context.path}.regions: exactly one main region is required`
        );
    let headings = 0;
    for (const [regionIndex, region] of (page.regions ?? []).entries()) {
        errors.push(
            ...duplicateErrors(
                region.elements,
                `${context.path}.regions[${regionIndex}].elements`
            )
        );
        for (const [elementIndex, element] of (
            region.elements ?? []
        ).entries()) {
            const path = `${context.path}.regions[${regionIndex}].elements[${elementIndex}]`;
            if (element.kind === 'heading') headings += 1;
            for (const [key, allowed, bucket] of [
                ['control_ids', context.controls, used.controls],
                ['action_ids', context.actions, used.actions],
                ['data_binding_ids', context.dataBindings, used.data],
            ]) {
                for (const reference of element[key] ?? []) {
                    if (!allowed.has(reference))
                        errors.push(`${path}.${key}: unresolved ${reference}`);
                    bucket.add(reference);
                }
            }
        }
    }
    if (headings === 0)
        errors.push(
            `${context.path}.regions: at least one heading is required`
        );
    for (const [label, values, usedValues] of [
        ['control', context.controls, used.controls],
        ['action', context.actions, used.actions],
        ['data binding', context.dataBindings, used.data],
    ]) {
        for (const id of values.keys()) {
            if (!usedValues.has(id))
                errors.push(
                    `${context.path}.regions: unrendered ${label} ${id}`
                );
        }
    }
}

function validatePage(page, index, context, errors) {
    const path = `$.pages[${index}]`;
    errors.push(
        ...evidenceErrors(page, path, context.sourceIds, context.usedSources)
    );
    if (page.access?.mode === 'authorized' && !page.access.permissions?.length)
        errors.push(`${path}.access: authorized page requires permissions`);
    if (page.access?.mode !== 'authorized' && page.access?.permissions?.length)
        errors.push(
            `${path}.access: only authorized pages may declare permissions`
        );
    for (const key of [
        'states',
        'controls',
        'actions',
        'loads',
        'data_bindings',
        'regions',
    ])
        errors.push(...duplicateErrors(page[key], `${path}.${key}`));
    const states = new Map(
        (page.states ?? []).map((entry) => [entry.id, entry])
    );
    const controls = new Map(
        (page.controls ?? []).map((entry) => [entry.id, entry])
    );
    const actions = new Map(
        (page.actions ?? []).map((entry) => [entry.id, entry])
    );
    const dataBindings = new Map(
        (page.data_bindings ?? []).map((entry) => [entry.id, entry])
    );
    stateReference(
        errors,
        states,
        page.initial_state_id,
        `${path}.initial_state_id`
    );
    const local = { ...context, path, states, controls, actions, dataBindings };
    for (const [actionIndex, action] of (page.actions ?? []).entries())
        validateAction(page, action, actionIndex, local, errors);
    for (const [loadIndex, load] of (page.loads ?? []).entries())
        validateLoad(page, load, loadIndex, local, errors);
    for (const [bindingIndex, binding] of (page.data_bindings ?? []).entries())
        validateDataBinding(page, binding, bindingIndex, local, errors);
    validateRegions(page, local, errors);
}

function validateExperienceGraph(experience, pages, errors) {
    const allowed = new Set(experience.page_ids ?? []);
    const visited = new Set([experience.entry_page_id]);
    const queue = [experience.entry_page_id];
    while (queue.length > 0) {
        const page = pages.get(queue.shift());
        for (const action of page?.actions ?? []) {
            if (
                action.kind === 'navigate' &&
                allowed.has(action.destination_page_id) &&
                !visited.has(action.destination_page_id)
            ) {
                visited.add(action.destination_page_id);
                queue.push(action.destination_page_id);
            }
        }
    }
    for (const pageId of allowed) {
        if (!visited.has(pageId))
            errors.push(
                `$.experiences[${experience.id}]: unreachable page ${pageId}`
            );
        const page = pages.get(pageId);
        if (
            experience.offline_policy !== 'none' &&
            (page?.loads?.length > 0 ||
                page?.actions?.some((action) => action.kind === 'backend')) &&
            !page.states.some((state) => state.kind === 'offline')
        ) {
            errors.push(
                `$.experiences[${experience.id}]: page ${pageId} needs an offline state`
            );
        }
    }
}

export function validateApplicationDesign(design, schema, backendContracts) {
    const errors = [...validateJsonSchema(design, schema)];
    if (!design || typeof design !== 'object' || Array.isArray(design))
        return errors;
    for (const [name, entries] of [
        ['sources', design.sources],
        ['backend_contracts', design.backend_contracts],
        ['audiences', design.audiences],
        ['experiences', design.experiences],
        ['pages', design.pages],
        ['unknowns', design.unknowns],
    ]) {
        errors.push(...duplicateErrors(entries, `$.${name}`));
    }
    errors.push(
        ...duplicateErrors(design.pages, '$.pages.path', (page) => page?.path)
    );
    const serialized = JSON.stringify(design);
    for (const pattern of FORBIDDEN_TARGET_TOKENS) {
        if (pattern.test(serialized))
            errors.push(`$: target-specific token forbidden by ${pattern}`);
    }
    if (design.design?.status === 'approved' && design.unknowns?.length > 0)
        errors.push('$.unknowns: approved design cannot contain unknowns');
    if (!design.backend_contracts?.some((entry) => entry.role === 'target'))
        errors.push(
            '$.backend_contracts: at least one target contract is required'
        );
    const sourceIds = new Set((design.sources ?? []).map((entry) => entry.id));
    const usedSources = new Set();
    errors.push(
        ...evidenceErrors(design.design, '$.design', sourceIds, usedSources)
    );
    const audiences = new Set(
        (design.audiences ?? []).map((entry) => entry.id)
    );
    const experiences = new Map(
        (design.experiences ?? []).map((entry) => [entry.id, entry])
    );
    const pages = new Map(
        (design.pages ?? []).map((entry) => [entry.id, entry])
    );
    for (const [index, audience] of (design.audiences ?? []).entries())
        errors.push(
            ...evidenceErrors(
                audience,
                `$.audiences[${index}]`,
                sourceIds,
                usedSources
            )
        );
    for (const [index, experience] of (design.experiences ?? []).entries()) {
        const path = `$.experiences[${index}]`;
        errors.push(
            ...evidenceErrors(experience, path, sourceIds, usedSources)
        );
        errors.push(
            ...duplicateErrors(
                experience.audience_ids,
                `${path}.audience_ids`,
                (value) => value
            ),
            ...duplicateErrors(
                experience.page_ids,
                `${path}.page_ids`,
                (value) => value
            ),
            ...referenceErrors(
                experience.audience_ids,
                audiences,
                `${path}.audience_ids`,
                'audience'
            ),
            ...referenceErrors(
                experience.page_ids,
                new Set(pages.keys()),
                `${path}.page_ids`,
                'page'
            )
        );
        if (!experience.page_ids?.includes(experience.entry_page_id))
            errors.push(`${path}.entry_page_id: must belong to page_ids`);
    }
    const context = { contracts: backendContracts, sourceIds, usedSources };
    for (const [index, page] of (design.pages ?? []).entries()) {
        errors.push(
            ...duplicateErrors(
                page.experience_ids,
                `$.pages[${index}].experience_ids`,
                (value) => value
            ),
            ...referenceErrors(
                page.experience_ids,
                new Set(experiences.keys()),
                `$.pages[${index}].experience_ids`,
                'experience'
            )
        );
        for (const experienceId of page.experience_ids ?? []) {
            if (!experiences.get(experienceId)?.page_ids.includes(page.id))
                errors.push(
                    `$.pages[${index}]: experience ${experienceId} does not include page`
                );
        }
        for (const action of page.actions ?? []) {
            if (action.kind !== 'navigate') continue;
            if (!pages.has(action.destination_page_id)) {
                errors.push(
                    `$.pages[${index}].actions: unresolved destination page ${action.destination_page_id}`
                );
                continue;
            }
            const destination = pages.get(action.destination_page_id);
            if (
                !page.experience_ids.some((id) =>
                    destination.experience_ids.includes(id)
                )
            )
                errors.push(
                    `$.pages[${index}].actions: navigation crosses unrelated experiences`
                );
        }
        validatePage(page, index, context, errors);
    }
    if (design.design?.status === 'approved') {
        for (const experience of design.experiences ?? []) {
            for (const pageId of experience.page_ids ?? []) {
                if (!pages.get(pageId)?.experience_ids.includes(experience.id))
                    errors.push(
                        `$.experiences[${experience.id}]: page ${pageId} does not reference experience`
                    );
            }
            validateExperienceGraph(experience, pages, errors);
        }
    }
    for (const sourceId of sourceIds) {
        if (!usedSources.has(sourceId))
            errors.push(`$.sources: unused source ${sourceId}`);
    }
    return [...new Set(errors)].sort();
}

async function safeSnapshot(root, uri, expectedHash, path) {
    const absolute = resolve(root, uri);
    if (absolute === root || !absolute.startsWith(`${root}${sep}`))
        throw new Error(`${path}: escapes workspace`);
    const parts = relative(root, absolute).split(sep).filter(Boolean);
    let current = root;
    for (const part of parts) {
        current = resolve(current, part);
        const metadata = await lstat(current);
        if (metadata.isSymbolicLink())
            throw new Error(`${path}: symbolic path forbidden`);
    }
    const metadata = await lstat(absolute);
    if (!metadata.isFile()) throw new Error(`${path}: expected regular file`);
    const content = await readFile(absolute);
    const actual = createHash('sha256').update(content).digest('hex');
    if (actual !== expectedHash) throw new Error(`${path}: sha256 mismatch`);
    return content;
}

export async function loadApplicationDesignDependencies(
    design,
    workspaceRoot,
    backendContractSchema
) {
    const root = await realpath(resolve(workspaceRoot));
    const errors = [];
    const contracts = new Map();
    for (const [index, source] of (design.sources ?? []).entries()) {
        try {
            await safeSnapshot(
                root,
                source.snapshot_uri,
                source.sha256,
                `$.sources[${index}].snapshot_uri`
            );
        } catch (error) {
            errors.push(error.message);
        }
    }
    for (const [index, reference] of (
        design.backend_contracts ?? []
    ).entries()) {
        const path = `$.backend_contracts[${index}]`;
        try {
            const content = await safeSnapshot(
                root,
                reference.snapshot_uri,
                reference.sha256,
                `${path}.snapshot_uri`
            );
            const contract = JSON.parse(content.toString('utf8'));
            errors.push(
                ...validateBackendContract(contract, backendContractSchema).map(
                    (error) => `${path}: ${error}`
                )
            );
            errors.push(
                ...(await verifyBackendContractSnapshots(contract, root)).map(
                    (error) => `${path}: ${error}`
                )
            );
            if (contract.contract?.id !== reference.id)
                errors.push(`${path}.id: does not match backend contract id`);
            if (
                reference.role === 'reference' &&
                contract.contract?.status !== 'reference'
            )
                errors.push(
                    `${path}.role: reference role requires reference status`
                );
            if (
                reference.role === 'target' &&
                contract.contract?.status === 'reference'
            )
                errors.push(
                    `${path}.role: target role forbids reference status`
                );
            contracts.set(reference.id, { ...reference, contract });
        } catch (error) {
            errors.push(`${path}: ${error.message}`);
        }
    }
    return { contracts, errors: [...new Set(errors)].sort() };
}

export async function validateApplicationDesignWithDependencies({
    design,
    applicationDesignSchema,
    backendContractSchema,
    workspaceRoot,
}) {
    const dependencies = await loadApplicationDesignDependencies(
        design,
        workspaceRoot,
        backendContractSchema
    );
    return [
        ...dependencies.errors,
        ...validateApplicationDesign(
            design,
            applicationDesignSchema,
            dependencies.contracts
        ),
    ].sort();
}

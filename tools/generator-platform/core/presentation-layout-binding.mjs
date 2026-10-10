import { createHash } from 'node:crypto';

import { validateJsonSchema } from '../validate-ir.mjs';

const MAX_SELECTION_COUNT = 32;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');

const AUTHORITY_KIND_BY_CAPABILITY = Object.freeze({
    search: 'backend-parameter',
    'column-filters': 'backend-parameter',
    'filter-trigger': 'backend-parameter',
    'filter-panel': 'backend-parameter',
    'progressive-loading': 'backend-parameter',
    create: 'page-action',
    'create-fab': 'page-action',
    export: 'page-action',
    'row-actions': 'page-action',
    'card-actions': 'page-action',
    refresh: 'page-load',
    'row-rank': 'page-load',
    'workspace-tabs': null,
    'individual-tab-close': null,
    'close-all-except-pinned': null,
    'horizontal-tab-overflow': null,
});

const REQUIRED_CAPABILITY_BY_REGION = Object.freeze({
    'filter-panel': 'filter-panel',
    'bottom-sheet': 'filter-panel',
    'modal-backdrop': 'filter-panel',
    'row-actions-rail': 'row-actions',
    'search-controls': 'search',
    'floating-action': 'create-fab',
});

function fail(message) {
    throw new Error(`presentation layout binding: ${message}`);
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function readJson(content, label) {
    try {
        return JSON.parse(content.toString('utf8'));
    } catch (error) {
        fail(`${label} is invalid JSON (${error.message})`);
    }
}

function assertSorted(values, label) {
    if (JSON.stringify(values) !== JSON.stringify([...values].sort()))
        fail(`${label} must be sorted`);
}

function compareCodePoints(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
}

function resolvedCapability(capability) {
    if (capability.status === 'absent') {
        return {
            id: capability.id,
            status: capability.status,
            reason: capability.reason,
        };
    }
    const authority = capability.authorized_by;
    if (authority.kind === 'backend-parameter') {
        return {
            id: capability.id,
            status: capability.status,
            authorized_by: {
                kind: authority.kind,
                contract_id: authority.contract_id,
                operation_id: authority.operation_id,
                parameters: authority.parameters,
            },
        };
    }
    if (authority.kind === 'page-action') {
        return {
            id: capability.id,
            status: capability.status,
            authorized_by: {
                kind: authority.kind,
                action_id: authority.action_id,
            },
        };
    }
    return {
        id: capability.id,
        status: capability.status,
        authorized_by: {
            kind: authority.kind,
            load_id: authority.load_id,
        },
    };
}

function verifyDeclaredBlob(entry, declared, label, mediaType) {
    if (entry.content.byteLength !== declared.bytes)
        fail(`${label} byte length drifted`);
    if (sha256(entry.content) !== declared.sha256)
        fail(`${label} sha256 drifted`);
    if (
        mediaType === 'image/png' &&
        !entry.content.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
    ) {
        fail(`${label} is not a PNG payload`);
    }
}

export function resolvePresentationLayoutBinding({
    layoutBindingPath,
    layoutBindingSchema,
    layoutExampleSetSchema,
    pageContract,
    pageContractPath,
    pageContractContent,
    readSource,
}) {
    if (!layoutBindingPath) return null;
    if (!layoutBindingSchema || !layoutExampleSetSchema || !readSource)
        fail('schemas and a Git source reader are required');

    const authoritySources = new Map();
    let totalBytes = 0;
    const readAuthoritySource = (path, label, kind) => {
        const entry = readSource(path, label);
        const identity = {
            path: entry.path,
            kind,
            mode: entry.mode,
            bytes: entry.content.byteLength,
            sha256: sha256(entry.content),
        };
        const previous = authoritySources.get(entry.path);
        if (previous && JSON.stringify(previous) !== JSON.stringify(identity))
            fail(`${label} has conflicting identities`);
        authoritySources.set(entry.path, identity);
        totalBytes += previous ? 0 : entry.content.byteLength;
        if (totalBytes > MAX_TOTAL_BYTES)
            fail(`authority sources exceed ${MAX_TOTAL_BYTES} bytes`);
        return entry;
    };

    const pageIdentity = readAuthoritySource(
        pageContractPath,
        'page contract',
        'page-contract'
    );
    if (!pageIdentity.content.equals(pageContractContent))
        fail('page contract must be read from the authority commit');
    const pageContractHash = sha256(pageIdentity.content);

    const bindingEntry = readAuthoritySource(
        layoutBindingPath,
        'layout binding',
        'layout-binding'
    );
    const binding = readJson(bindingEntry.content, 'layout binding');
    const bindingErrors = validateJsonSchema(binding, layoutBindingSchema);
    if (bindingErrors.length > 0)
        fail(`binding violates schema\n${bindingErrors.join('\n')}`);
    if (binding.page_id !== pageContract.page.id)
        fail('page_id does not match the page contract');
    if (binding.page_contract_sha256 !== pageContractHash)
        fail('page contract drifted since the binding was written');
    if (binding.selections.length > MAX_SELECTION_COUNT)
        fail(`selections must contain at most ${MAX_SELECTION_COUNT} entries`);
    assertSorted(
        binding.example_sets.map(({ set_id }) => set_id),
        'example_sets'
    );
    assertSorted(
        binding.capabilities.map(({ id }) => id),
        'capabilities'
    );
    assertSorted(
        binding.selections.map(
            ({ set_id, source_id }) => `${set_id}/${source_id}`
        ),
        'selections'
    );

    const sets = new Map();
    for (const declared of binding.example_sets) {
        if (sets.has(declared.set_id))
            fail(`duplicate example set ${declared.set_id}`);
        const entry = readAuthoritySource(
            declared.path,
            `example set ${declared.set_id}`,
            'example-set'
        );
        if (sha256(entry.content) !== declared.sha256)
            fail(`example set ${declared.set_id} sha256 drifted`);
        const manifest = readJson(
            entry.content,
            `example set ${declared.set_id}`
        );
        const errors = validateJsonSchema(manifest, layoutExampleSetSchema);
        if (errors.length > 0)
            fail(
                `example set ${declared.set_id} violates schema\n${errors.join('\n')}`
            );
        if (manifest.set_id !== declared.set_id)
            fail(`example set ${declared.set_id} declares another identity`);
        if (manifest.status !== 'approved-example')
            fail(`example set ${declared.set_id} is not an approved example`);
        for (const source of manifest.render_sources) {
            const render = readAuthoritySource(
                source.path,
                `render source ${source.path}`,
                'render-source'
            );
            verifyDeclaredBlob(render, source, `render source ${source.path}`);
        }
        sets.set(declared.set_id, { declared, manifest });
    }

    const backendSources = new Map();
    const backendOperation = (authority, capabilityId) => {
        const contract = (pageContract.backend_contracts ?? []).find(
            ({ id }) => id === authority.contract_id
        );
        if (!contract)
            fail(
                `capability ${capabilityId} references an unknown backend contract`
            );
        let backend = backendSources.get(contract.id);
        if (!backend) {
            const entry = readAuthoritySource(
                contract.snapshot_uri,
                `backend contract ${contract.id}`,
                'backend-contract'
            );
            if (sha256(entry.content) !== contract.sha256)
                fail(`backend contract ${contract.id} sha256 drifted`);
            backend = readJson(
                entry.content,
                `backend contract ${contract.id}`
            );
            backendSources.set(contract.id, backend);
        }
        const operation = (backend.operations ?? []).find(
            ({ id }) => id === authority.operation_id
        );
        if (!operation)
            fail(`capability ${capabilityId} references an unknown operation`);
        return operation;
    };

    const capabilities = new Map();
    for (const capability of binding.capabilities) {
        if (capabilities.has(capability.id))
            fail(`duplicate capability ${capability.id}`);
        const expectedKind = AUTHORITY_KIND_BY_CAPABILITY[capability.id];
        if (expectedKind === null)
            fail(
                `capability ${capability.id} belongs to the application shell`
            );
        if (capability.status === 'declared') {
            const authority = capability.authorized_by;
            if (authority.kind !== expectedKind)
                fail(
                    `capability ${capability.id} must be authorized by ${expectedKind}`
                );
            if (
                authority.kind === 'page-action' &&
                !(pageContract.page.actions ?? []).some(
                    ({ id }) => id === authority.action_id
                )
            ) {
                fail(
                    `capability ${capability.id} references an unknown page action`
                );
            }
            if (
                authority.kind === 'page-load' &&
                !(pageContract.page.loads ?? []).some(
                    ({ id }) => id === authority.load_id
                )
            ) {
                fail(
                    `capability ${capability.id} references an unknown page load`
                );
            }
            if (authority.kind === 'backend-parameter') {
                assertSorted(
                    authority.parameters,
                    `capability ${capability.id} parameters`
                );
                const operation = backendOperation(authority, capability.id);
                const parameters = new Set(
                    (operation.request?.parameters ?? []).map(
                        ({ name }) => name
                    )
                );
                for (const parameter of authority.parameters) {
                    if (!parameters.has(parameter))
                        fail(
                            `capability ${capability.id} references unknown parameter ${parameter}`
                        );
                }
            }
        }
        capabilities.set(capability.id, capability.status);
    }

    const stateIds = new Set(pageContract.page.states.map(({ id }) => id));
    const shown = new Set();
    const usedSets = new Set();
    const selectionKeys = new Set();
    const sources = binding.selections.map((selection) => {
        const key = `${selection.set_id}/${selection.source_id}`;
        if (selectionKeys.has(key)) fail(`duplicate selection ${key}`);
        selectionKeys.add(key);
        const set = sets.get(selection.set_id);
        if (!set) fail(`selection ${key} references an unknown example set`);
        usedSets.add(selection.set_id);
        const source = set.manifest.sources.find(
            ({ id }) => id === selection.source_id
        );
        if (!source) fail(`selection ${key} references an unknown source`);
        for (const stateId of selection.page_state_ids) {
            if (!stateIds.has(stateId))
                fail(`selection ${key} references unknown state ${stateId}`);
        }
        for (const capability of source.capabilities_shown) {
            if (AUTHORITY_KIND_BY_CAPABILITY[capability] === null)
                fail(
                    `selection ${key} shows application-shell capability ${capability}`
                );
            if (!capabilities.has(capability))
                fail(`selection ${key} shows unbound capability ${capability}`);
            shown.add(capability);
        }
        const omitted = source.capabilities_shown
            .filter((capability) => capabilities.get(capability) === 'absent')
            .sort();
        assertSorted(
            selection.page_state_ids,
            `selection ${key} page_state_ids`
        );
        assertSorted(
            selection.omitted_capabilities,
            `selection ${key} omitted_capabilities`
        );
        if (
            JSON.stringify(selection.omitted_capabilities) !==
            JSON.stringify(omitted)
        )
            fail(`selection ${key} has an invalid omitted capability set`);
        const regions = source.authoritative_regions.filter((region) => {
            const required = REQUIRED_CAPABILITY_BY_REGION[region];
            return !required || capabilities.get(required) === 'declared';
        });
        if (regions.length === 0)
            fail(`selection ${key} keeps no applicable region`);
        if (JSON.stringify(selection.regions) !== JSON.stringify(regions))
            fail(`selection ${key} has an invalid authoritative region set`);
        const image = readAuthoritySource(
            source.path,
            `example ${key}`,
            'layout-example'
        );
        verifyDeclaredBlob(image, source, `example ${key}`, source.media_type);
        return {
            set_id: selection.set_id,
            id: source.id,
            path: source.path,
            media_type: source.media_type,
            bytes: source.bytes,
            sha256: source.sha256,
            trust: 'untrusted-content',
            layout_class: source.layout_class,
            space: source.space,
            state: source.state,
            page_state_ids: selection.page_state_ids,
            regions,
            omitted_capabilities: omitted,
            viewport: source.viewport,
        };
    });

    for (const setId of sets.keys()) {
        if (!usedSets.has(setId))
            fail(`example set ${setId} is selected but never used`);
    }
    for (const capability of capabilities.keys()) {
        if (!shown.has(capability))
            fail(`capability ${capability} is not shown by a selected example`);
    }

    return {
        schema_version: binding.schema_version,
        binding_id: binding.binding_id,
        page_id: binding.page_id,
        page_contract_sha256: pageContractHash,
        authority: binding.authority,
        manifest: {
            path: bindingEntry.path,
            sha256: sha256(bindingEntry.content),
        },
        example_sets: binding.example_sets,
        capabilities: binding.capabilities.map(resolvedCapability),
        sources,
        authority_sources: [...authoritySources.values()].sort((left, right) =>
            compareCodePoints(left.path, right.path)
        ),
    };
}

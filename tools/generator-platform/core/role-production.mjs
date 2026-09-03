import { validateJsonSchema } from '../validate-ir.mjs';

function fail(message) {
    throw new Error(`role production: ${message}`);
}

function sortedIds(entries) {
    return (entries ?? []).map(({ id }) => id).sort();
}

export function producePageRoleNode(pageContract, pageContractSha256, schema) {
    if (pageContract?.kind !== 'page-realization-contract')
        fail('source must be a page-realization-contract');
    if (!/^[a-f0-9]{64}$/.test(pageContractSha256 ?? ''))
        fail('source hash must be SHA-256');

    const page = pageContract.page;
    const node = {
        schema_version: '1.0.0',
        kind: 'archetype-role-node',
        node_id: `${pageContract.design.id}:${page.id}:screen`,
        role: 'screen',
        source: {
            kind: pageContract.kind,
            id: page.id,
            sha256: pageContractSha256,
        },
        payload: {
            page_id: page.id,
            path: page.path,
            access_mode: page.access.mode,
            state_ids: sortedIds(page.states),
            control_ids: sortedIds(page.controls),
            action_ids: sortedIds(page.actions),
            region_ids: sortedIds(page.regions),
        },
    };
    const violations = validateJsonSchema(node, schema);
    if (violations.length > 0) fail(violations.join('\n'));
    return node;
}

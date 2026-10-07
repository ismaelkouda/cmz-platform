import { lstatSync, readdirSync } from 'node:fs';

import { validateJsonSchema } from '../validate-ir.mjs';

function fail(message) {
    throw new Error(`page realization: ${message}`);
}

function expectedMappings(page) {
    return {
        states: page.states.map((entry) => entry.id).sort(),
        controls: page.controls.map((entry) => entry.id).sort(),
        actions: page.actions.map((entry) => entry.id).sort(),
        data_bindings: page.data_bindings.map((entry) => entry.id).sort(),
        regions: page.regions.map((entry) => entry.id).sort(),
        elements: page.regions
            .flatMap((region) => region.elements.map((entry) => entry.id))
            .sort(),
    };
}

export function pageRealizationDirectoryFiles(root) {
    const rootMetadata = lstatSync(root);
    if (!rootMetadata.isDirectory() || rootMetadata.isSymbolicLink())
        fail('page output root must be a real directory');
    const files = [];
    for (const entry of readdirSync(root, { withFileTypes: true })) {
        if (entry.isSymbolicLink() || !entry.isFile())
            fail(`page output contains a non-regular entry: ${entry.name}`);
        files.push(entry.name);
    }
    return files.sort();
}

export function validatePageRealizationEvidence({
    evidence,
    schema,
    pageContract,
    contractHash,
    markup,
}) {
    const violations = [...validateJsonSchema(evidence, schema)];
    if (evidence.page_id !== pageContract.page.id)
        violations.push('$.page_id: does not match page contract');
    if (evidence.page_contract_sha256 !== contractHash)
        violations.push('$.page_contract_sha256: stale page contract');
    const expected = expectedMappings(pageContract.page);
    for (const [category, ids] of Object.entries(expected)) {
        const mappings = evidence[category] ?? [];
        const actual = mappings.map((entry) => entry.id).sort();
        if (JSON.stringify(actual) !== JSON.stringify(ids))
            violations.push(
                `$.${category}: ids must match the page contract exactly`
            );
        const selectors = new Set();
        for (const mapping of mappings) {
            const expectedSelector = `[data-cmz-id="${mapping.id}"]`;
            if (mapping.selector !== expectedSelector)
                violations.push(
                    `$.${category}.${mapping.id}: selector must be ${expectedSelector}`
                );
            if (selectors.has(mapping.selector))
                violations.push(
                    `$.${category}: duplicate selector ${mapping.selector}`
                );
            selectors.add(mapping.selector);
            if (!markup.includes(`data-cmz-id="${mapping.id}"`))
                violations.push(
                    `$.${category}.${mapping.id}: selector absent from page markup`
                );
        }
    }
    return violations;
}

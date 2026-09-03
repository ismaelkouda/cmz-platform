import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
    loadArchetypeSystem,
    selectArchetype,
    validateArchetypeDocuments,
} from './core/archetype-selection.mjs';
import { producePageRoleNode } from './core/role-production.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const system = loadArchetypeSystem(root, 'angular');
const roleNodeSchema = JSON.parse(
    await readFile(
        new URL('./schemas/role-node.schema.json', import.meta.url),
        'utf8'
    )
);

function node() {
    return producePageRoleNode(
        {
            kind: 'page-realization-contract',
            design: { id: 'proof-design' },
            page: {
                id: 'page_1111111111111111',
                path: '/proof',
                access: { mode: 'public' },
                states: [{ id: 'ready' }],
                controls: [{ id: 'message' }],
                actions: [{ id: 'submit' }],
                regions: [{ id: 'main' }],
            },
        },
        'a'.repeat(64),
        roleNodeSchema
    );
}

function documents() {
    return structuredClone({
        registry: system.registry,
        target: system.target,
        contracts: system.contracts,
        schemas: system.schemas,
    });
}

test('un contrat de page produit un nœud fermé réellement sélectionné', () => {
    const produced = node();
    assert.deepEqual(produced.payload, {
        page_id: 'page_1111111111111111',
        path: '/proof',
        access_mode: 'public',
        state_ids: ['ready'],
        control_ids: ['message'],
        action_ids: ['submit'],
        region_ids: ['main'],
    });
    const selected = selectArchetype(system, produced);
    assert.equal(selected.archetype, 'component');
    assert.equal(selected.selector, 'always');
    assert.match(selected.contract.sha256, /^[a-f0-9]{64}$/);
    assert.ok(selected.contract.forbid.length > 0);
});

test('la cible doit couvrir exactement tous les rôles produits et consommés', () => {
    const value = documents();
    delete value.target.roles.screen;
    assert.throws(
        () => validateArchetypeDocuments(value),
        /cover the registry exactly/
    );
});

test('un producteur ou consommateur seulement déclaré est refusé', () => {
    const value = documents();
    value.registry.roles[0].producer = 'imaginary-producer';
    assert.throws(
        () => validateArchetypeDocuments(value),
        /producer or consumer is not implemented/
    );
});

test('une sélection conditionnelle inconnue échoue fermé', () => {
    const value = documents();
    value.target.roles.screen.unshift({
        selector: 'screen.unknown',
        archetype: 'component',
    });
    assert.throws(() => validateArchetypeDocuments(value), /unknown selector/);
});

test('le catch-all always est obligatoire et uniquement final', () => {
    const value = documents();
    value.target.roles.screen = [
        { selector: 'screen.known', archetype: 'component' },
    ];
    assert.throws(
        () => validateArchetypeDocuments(value),
        /final selector must be always/
    );
});

test('un frontmatter incohérent ou orphelin est refusé', () => {
    const incoherent = documents();
    incoherent.contracts.component.frontmatter.role = 'navigation-edge';
    assert.throws(
        () => validateArchetypeDocuments(incoherent),
        /incoherent contract/
    );

    const orphan = documents();
    orphan.contracts.unused = structuredClone(orphan.contracts.component);
    orphan.contracts.unused.frontmatter.archetype = 'unused';
    assert.throws(() => validateArchetypeDocuments(orphan), /without a role/);
});

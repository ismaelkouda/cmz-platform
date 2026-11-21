// Défaut CI de 9ecb7df9 (job « Garde-fous socle », TS2554) : le consommateur
// de fixture des tests de pile appelait `load()` sans entrée alors que la
// lecture paginée d'observatory en attend une. L'appel suit maintenant la
// façade (`port.input.kind`), sur les deux produits. Attendus en LITTÉRAL.
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import test from 'node:test';

import { createApplicationSessionFixture } from './test-support/application-session-fixture.mjs';
import {
    catalogueRead,
    loadInput,
    sessionConsumers,
} from './test-support/session-consumers.mjs';

const fixtureOf = async (t, domain) => {
    const data = await createApplicationSessionFixture({ domain });
    t.after(() => rm(data.root, { recursive: true, force: true }));
    return data;
};
const catalogueOf = (data) =>
    [...data.pages.values()].find(({ page }) => page.loads.length > 0);

test('consommateur de fixture : load avec entrée pour une lecture paginée, sans entrée sinon', async (t) => {
    for (const [domain, call] of [
        ['observatory', 'constructor() { this.page.catalogue.load({}); }'],
        ['equipment-hire', 'constructor() { this.page.catalogue.load(); }'],
    ]) {
        const source = sessionConsumers(await fixtureOf(t, domain));
        assert.equal(source.split(call).length, 2, `${domain} : ${call}`);
        assert.equal(source.split('.load(').length, 2, domain);
    }
});

test('consommateur de fixture : un nœud ou une lecture introuvable refuse la préparation', async (t) => {
    const data = await fixtureOf(t, 'observatory');
    const { plan } = catalogueOf(data);
    assert.equal(loadInput(data, plan, 'catalogue'), '{}');
    assert.throws(
        () => loadInput(data, plan, 'absent'),
        /^Error: fixture consumer: page load absent has no read$/
    );
    const orphan = structuredClone(plan);
    orphan.query_nodes[0].primitive_ref.operation_id = 'other-operation';
    assert.throws(
        () => loadInput(data, orphan, 'catalogue'),
        /^Error: fixture consumer: page load catalogue has no read$/
    );
});

test('forme de la lecture catalogue publiée au runtime des specs de pile', async (t) => {
    assert.deepEqual(catalogueRead(await fixtureOf(t, 'observatory')), {
        input: true,
        page: {
            items: 'items',
            currentPage: 'current_page',
            lastPage: 'last_page',
            pageSize: 'per_page',
            totalItems: 'total',
        },
    });
    assert.deepEqual(catalogueRead(await fixtureOf(t, 'equipment-hire')), {
        input: false,
        page: null,
    });
    const data = await fixtureOf(t, 'observatory');
    data.queryModel.queries.push(data.queryModel.queries[0]);
    assert.throws(
        () => catalogueRead(data),
        /^Error: fixture consumer: exactly one catalogue read$/
    );
});

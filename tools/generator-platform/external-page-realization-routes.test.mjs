// CI #389 (e) : routes déclarées de la preuve N2, sans navigateur. Elles sont
// dérivées par la fonction du produit (sessionRenderConfiguration), jamais par
// un repli : un ensemble vide, ou sans l'entrée et l'accueil, arrête la preuve.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { n2DeclaredRoutes } from './proof-support/external-page-realization-native.mjs';
import { SESSION_FIXTURE_DOMAINS } from './test-support/application-session-fixture.mjs';
import { writeExternalSessionDesign } from './test-support/external-session-fixture.mjs';

async function sessionInput(t, domain) {
    const root = await mkdtemp(join(tmpdir(), 'cmz-n2-routes-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    return writeExternalSessionDesign(root, domain);
}

for (const domain of SESSION_FIXTURE_DOMAINS)
    test(`N2 : routes déclarées de ${domain}, dérivées comme le produit`, async (t) => {
        const input = await sessionInput(t, domain);
        const routes = n2DeclaredRoutes(input);
        const experience = input.design.experiences.find(
            (entry) => entry.id === input.experienceId
        );
        const pages = new Map(
            input.design.pages.map((page) => [page.id, page])
        );
        assert.ok(routes.length > 0);
        assert.ok(routes.includes(input.entryPage.path));
        assert.ok(routes.includes(input.landingPage.path));
        assert.deepEqual(
            routes,
            experience.page_ids.map((id) => pages.get(id).path)
        );
    });

test('N2 : une donnée de route attendue absente arrête la preuve, avec un message nommé', async (t) => {
    const input = await sessionInput(t, SESSION_FIXTURE_DOMAINS[0]);
    assert.throws(
        () => n2DeclaredRoutes({ ...input, experienceId: 'absent' }),
        /N2 : expérience de la preuve introuvable/
    );
    assert.throws(
        () =>
            n2DeclaredRoutes({
                ...input,
                entryPage: { ...input.entryPage, path: '/hors-experience' },
            }),
        /N2 : route d’entrée absente/
    );
    assert.throws(
        () =>
            n2DeclaredRoutes({
                ...input,
                landingPage: { ...input.landingPage, path: '/hors-experience' },
            }),
        /N2 : route d’accueil absente/
    );
    const empty = structuredClone(input.design);
    empty.experiences.find(
        (entry) => entry.id === input.experienceId
    ).page_ids = [];
    assert.throws(
        () => n2DeclaredRoutes({ ...input, design: empty }),
        /N2 : aucune route déclarée/
    );
});

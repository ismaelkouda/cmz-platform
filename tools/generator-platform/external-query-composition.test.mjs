// X5 C4 (E6, E7, D-X5-3) : composition extérieure d'une page À LECTURE. La
// lecture publiée par `generate:list-query` est consommée telle quelle ; ses
// six membres fermés entrent dans la table `api` (G-A5) ; la spec de contrat
// des lectures est générée. Le runner injecté ne compile rien : la chaîne
// native du produit est prouvée par les preuves natives.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { queryOutputRoot } from './core/external-list-query.mjs';
import {
    planExternalPageComposition,
    publicExternalPageCompositionPlan,
    publishExternalPageComposition,
} from './core/external-page-composition.mjs';
import { planExternalPageRealizationWorkOrder } from './core/external-page-realization.mjs';
import { READ_STATES_RULE } from './core/external-read-states.mjs';
import { EXTERNAL_QUERY_STATES } from './core/list-query-external-profile.mjs';
import { QUERY_MEMBER_KINDS } from './renderers/angular-page-composition-api.mjs';
import {
    publication,
    publish,
} from './test-support/external-publication-fixture.mjs';
import { SESSION_FIXTURE_DOMAINS } from './test-support/external-session-fixture.mjs';
import {
    compositionFile,
    queryPage,
} from './test-support/external-query-page.mjs';

const native = () => ({ run: () => undefined });

test('C4 : page à lecture composée sur deux produits fictifs, en consommant la lecture publiée', async (t) => {
    for (const domain of SESSION_FIXTURE_DOMAINS) {
        const { options, queryId } = await queryPage(t, domain);
        const plan = await planExternalPageComposition(options);
        const visible = publicExternalPageCompositionPlan(plan);
        assert.deepEqual(visible.consumed_commands, []);
        assert.deepEqual(visible.consumed_queries, [
            `src/app/generated/queries/${queryId}`,
        ]);
        // La lecture n'est pas recopiée : seule la composition est publiée.
        assert.ok(
            plan.changes.every(
                ({ path }) =>
                    !path.startsWith(`${queryOutputRoot(queryId)}/`) &&
                    path.includes('/composition/')
            )
        );
        // Table `api` : `online` et les six membres fermés, genre par genre.
        const api = compositionFile(plan, 'page-composition.api.ts');
        for (const [member, kind] of Object.entries(QUERY_MEMBER_KINDS))
            assert.match(
                api,
                new RegExp(`path: 'catalogue\\.${member}',\\s*kind: '${kind}'`)
            );
        assert.match(
            api,
            /IsCommand<PageComposition\[['"]catalogue['"]\]\[['"]load['"]\]>/
        );
        assert.match(
            api,
            /IsDataSignal<PageComposition\[['"]catalogue['"]\]\[['"]items['"]\]>/
        );
        // Patrons fermés : lecture ou délégation à la façade seulement.
        const source = compositionFile(plan, 'page-composition.ts');
        assert.match(
            source,
            /error: computed\(\(\) => this\.catalogueFacade\.error\(\)\?\.statusCode\)/
        );
        assert.match(
            source,
            /load: \(\s*input: Readonly<Record<string, never>>\s*\): Observable<undefined> =>\s*defer\(\(\) => \{\s*void input;\s*this\.catalogueFacade\.load\(\);\s*return of\(undefined\);\s*\}\)/
        );
        // Décision du pilote : lecture initiale du nœud \`page-enter\` à la
        // construction, par la façade, une seule fois.
        assert.equal(
            [...source.matchAll(/this\.catalogueFacade\.load\(\);/g)].length,
            2
        );
        assert.match(
            source,
            /inject\(DestroyRef\)\.onDestroy\(reset\);\s*this\.catalogueFacade\.load\(\);\s*\}/
        );
        // G3 : aucune adresse, aucun appel HTTP ; F-d : aucun gel de donnée dans
        // la composition (seul le sac de membres de chaque nœud est gelé).
        assert.doesNotMatch(source, /HttpClient|injector|this\.http/);
        assert.deepEqual(
            [...source.matchAll(/Object\.freeze\(/g)].length,
            [
                ...source.matchAll(
                    /readonly [a-z][A-Za-z0-9]* = Object\.freeze\(\{/g
                ),
            ].length
        );
        // Spec de contrat des lectures générée ; celle des commandes n'a aucune
        // commande.
        const spec = compositionFile(plan, 'page-composition.queries.spec.ts');
        assert.match(spec, /name: 'catalogue'/);
        assert.match(spec, /deux load, les requêtes précédentes sont annulées/);
        // Page de lectures seules : aucune spec des commandes (une liste vide
        // ne se type pas) ; la spec des lectures porte les contrôles généraux.
        assert.equal(
            compositionFile(plan, 'page-composition.contract.spec.ts'),
            undefined
        );
        assert.match(
            spec,
            /expose exactement la table api, en Données lisibles/
        );
    }
});

test('C4 : une lecture publiée qui diffère du rendu attendu est refusée, nommée', async (t) => {
    const { product, options, queryId } = await queryPage(t, 'observatory');
    const facade = `${queryOutputRoot(queryId)}/src/${queryId}.facade.ts`;
    await publish(
        publication(
            product,
            { [facade]: 'export const altered = true;\n' },
            'generate:list-query'
        )
    );
    await assert.rejects(
        planExternalPageComposition(options),
        /page load catalogue differs from its published read; republish it with generate:list-query/
    );
});

test('C5 : le bon de travail d’une page à lecture interdit le chemin de la lecture', async (t) => {
    const { product, options } = await queryPage(t, 'observatory');
    const composition = await planExternalPageComposition(options);
    await publishExternalPageComposition(
        { ...options, expectedPlanId: composition.plan_id },
        native()
    );
    const plan = await planExternalPageRealizationWorkOrder(options);
    const path = plan.changes
        .map((change) => change.path)
        .find((entry) => entry.endsWith('work-order.json'));
    const workOrder = JSON.parse(plan.files[path]);
    const contract = JSON.parse(
        await readFile(
            join(product.root, 'descriptions/session-observatory/backend.json'),
            'utf8'
        )
    );
    const catalogue = contract.operations.find(
        (operation) => operation.id === 'observatory-catalogue'
    );
    // Source unique : le chemin déclaré par le contrat du produit.
    assert.deepEqual(workOrder.forbidden_literals, [catalogue.path]);
    // E8 : états déclarés de la lecture, données du plan et du profil.
    assert.equal(workOrder.read_states.rule, READ_STATES_RULE);
    assert.deepEqual(
        workOrder.read_states.reads.map((entry) => [
            entry.member,
            Object.keys(entry.states),
            entry.offline,
            entry.absent_fields,
        ]),
        [['catalogue', [...EXTERNAL_QUERY_STATES], 'online', []]]
    );
    // B+ : aucun champ ne peut manquer, aucun texte d'absence publié ; le
    // bon de travail ne porte jamais de texte, seulement un chemin ou null.
    assert.ok(
        workOrder.read_states.reads[0].bindings.every(
            (entry) => entry.absent_text_path === null
        )
    );
    assert.ok(
        !workOrder.composition.api.some((entry) =>
            entry.path.startsWith('absentText')
        )
    );
});

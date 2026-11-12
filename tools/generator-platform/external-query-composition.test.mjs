// X5 C4 (E6, E7, D-X5-3) : composition extérieure d'une page À LECTURE. La
// lecture publiée par `generate:list-query` est consommée telle quelle ; ses
// six membres fermés entrent dans la table `api` (G-A5) ; la spec de contrat
// des lectures est générée. Le runner injecté ne compile rien : la chaîne
// native du produit est prouvée par les preuves natives.
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    planExternalListQuery,
    publishExternalListQuery,
    queryOutputRoot,
} from './core/external-list-query.mjs';
import {
    planExternalPageComposition,
    publicExternalPageCompositionPlan,
} from './core/external-page-composition.mjs';
import {
    planExternalPagePlan,
    publishExternalPagePlan,
} from './core/external-page-plan.mjs';
import { QUERY_MEMBER_KINDS } from './renderers/angular-page-composition-api.mjs';
import {
    publication,
    publish,
    sessionApp,
} from './test-support/external-publication-fixture.mjs';
import {
    SESSION_FIXTURE_DOMAINS,
    writeExternalQueryDefinition,
} from './test-support/external-session-fixture.mjs';

const native = () => ({ run: () => undefined });

// Produit fictif : coque avec session, lecture publiée, plan de la page à
// lecture publié.
async function queryPage(t, domain) {
    const product = await sessionApp(t, domain);
    const definitionPath = await writeExternalQueryDefinition(
        product.root,
        domain
    );
    const read = { ...product.base, definitionPath };
    const plan = await planExternalListQuery(read);
    await publishExternalListQuery(
        { ...read, expectedPlanId: plan.plan_id },
        native()
    );
    const page = product.input.design.pages.find(
        (entry) => entry.loads.length > 0
    );
    const options = { ...product.base, pageId: page.id };
    const pagePlan = await planExternalPagePlan(options);
    await publishExternalPagePlan(
        { ...options, expectedPlanId: pagePlan.plan_id },
        native()
    );
    return { product, page, options, queryId: plan.query_id };
}

const compositionFile = (plan, name) =>
    plan.files[
        Object.keys(plan.files).find((path) =>
            path.endsWith(`/composition/src/${name}`)
        )
    ];

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

// X5 C4/C5 : produit fictif à page de lecture (coque avec session, lecture
// publiée, plan de page publié), partagé par les tests de composition.
// `edit` (facultatif) modifie le contrat et la conception avant leur empreinte.
import {
    planExternalListQuery,
    publishExternalListQuery,
} from '../core/external-list-query.mjs';
import {
    planExternalPagePlan,
    publishExternalPagePlan,
} from '../core/external-page-plan.mjs';
import { sessionApp } from './external-publication-fixture.mjs';
import { writeExternalQueryDefinition } from './external-session-fixture.mjs';

const native = () => ({ run: () => undefined });

// Produit fictif : coque avec session, lecture publiée, plan de la page à
// lecture publié.
export async function queryPage(t, domain, edit) {
    const product = await sessionApp(t, domain, edit);
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

export const compositionFile = (plan, name) =>
    plan.files[
        Object.keys(plan.files).find((path) =>
            path.endsWith(`/composition/src/${name}`)
        )
    ];

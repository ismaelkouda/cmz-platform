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
import {
    planExternalPageComposition,
    publishExternalPageComposition,
} from '../core/external-page-composition.mjs';
import { planExternalPageRealizationWorkOrder } from '../core/external-page-realization.mjs';
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

// X5 C6 (B) : modèle et chemin de la liaison de lignes, depuis la réponse.
function collectionBinding(contract, domain) {
    const operation = contract.operations.find(
        (entry) => entry.id === `${domain}-catalogue`
    );
    const responseId = operation.responses[0].body.model_id;
    const response = contract.models.find((model) => model.id === responseId);
    if (response.kind !== 'object') return { model_id: responseId };
    const items = response.fields.find((field) => field.name === 'items');
    return { model_id: items.type.items.model_id, source_path: ['items'] };
}

// Contrat : `label` nullable. Conception : une liaison de la lecture, avec ou
// sans texte d'absence.
export const nullableLabel =
    (domain, absentText) =>
    ({ contract, design }) => {
        const item = contract.models.find(
            (model) => model.id === `${domain}-item`
        );
        item.fields.find((field) => field.name === 'label').nullable = true;
        const page = design.pages.find((entry) => entry.loads.length > 0);
        page.data_bindings.push({
            id: 'catalogue-rows',
            operation_ref: structuredClone(page.loads[0].operation_ref),
            response_status: 200,
            // X5 C6 (B) : la liaison nomme la COLLECTION de la lecture : la
            // liste elle-même (equipment-hire), ou, pour une page, le modèle
            // d'élément de son champ `items`, avec ce chemin source
            // (observatory). Règle : assertQueryOutputBinding.
            ...collectionBinding(contract, domain),
            field_names: [],
            visible_in_state_ids: [page.loads[0].success_state_id],
            ...(absentText === undefined ? {} : { absent_text: absentText }),
        });
        page.regions[0].elements.push({
            id: 'catalogue-list',
            kind: 'list',
            accessible_name: 'Catalogue',
            content: 'Catalogue rows',
            control_ids: [],
            action_ids: [],
            data_binding_ids: ['catalogue-rows'],
        });
    };

export async function readWorkOrderOf(options) {
    const composition = await planExternalPageComposition(options);
    await publishExternalPageComposition(
        { ...options, expectedPlanId: composition.plan_id },
        native()
    );
    const plan = await planExternalPageRealizationWorkOrder(options);
    const path = plan.changes
        .map((change) => change.path)
        .find((entry) => entry.endsWith('work-order.json'));
    return { composition, workOrder: JSON.parse(plan.files[path]) };
}

// X5, D-X5-1 : résolveur unique des éléments d'une réponse de liste.
//
// Une page porte ses éléments dans un champ, sous l'une de deux formes :
// - nommée : le champ référence un modèle tableau, dont les éléments sont un
//   modèle objet ;
// - en ligne : le champ est lui-même un tableau d'éléments modèles.
// Le validateur, le compilateur et la liaison de données passent tous par ce
// module ; aucun autre site ne résout le modèle élément.
//
// La représentation commune ne sérialise rien de nouveau : `bindingModelId`
// est le modèle que référence une liaison de données (le modèle tableau pour
// la forme nommée, inchangée ; le modèle élément pour la forme en ligne).

// `resolveModel` : id → modèle du contrat, fourni par l'appelant.
export function contractModels(contract) {
    return (modelId) => contract.models?.find((model) => model.id === modelId);
}

function itemOf(resolveModel, items, form) {
    if (items?.kind === 'array')
        return { error: `${form} collection items cannot be arrays` };
    if (items?.kind !== 'model')
        return { error: `${form} collection items must be a model` };
    const item = resolveModel(items.model_id);
    if (item?.kind !== 'object')
        return { error: `${form} collection item must be an object model` };
    return { item };
}

// Éléments d'une liste directe : le corps de réponse est un modèle tableau.
export function resolveListCollection(resolveModel, responseModel) {
    if (responseModel?.kind !== 'array')
        return { error: 'response model must be an array' };
    const resolved = itemOf(resolveModel, responseModel.items, 'named');
    if (resolved.error) return resolved;
    return {
        form: 'named',
        bindingModelId: responseModel.id,
        item: resolved.item,
    };
}

// Éléments d'une page : le champ `itemsFieldName` du modèle de page.
export function resolvePageCollection(resolveModel, pageModel, itemsFieldName) {
    if (pageModel?.kind !== 'object')
        return { error: 'paginated response model must be an object' };
    const field = (pageModel.fields ?? []).find(
        (candidate) => candidate.name === itemsFieldName
    );
    if (!field) return { error: 'items field is not declared' };
    if (field.required !== true || field.nullable !== false)
        return { error: 'items field must be required and non-null' };
    if (field.type?.kind === 'model') {
        const collection = resolveModel(field.type.model_id);
        if (collection?.kind !== 'array')
            return { error: 'items field must resolve to an array model' };
        const resolved = itemOf(resolveModel, collection.items, 'named');
        if (resolved.error) return resolved;
        return {
            form: 'named',
            bindingModelId: collection.id,
            item: resolved.item,
        };
    }
    if (field.type?.kind === 'array') {
        const resolved = itemOf(resolveModel, field.type.items, 'inline');
        if (resolved.error) return resolved;
        return {
            form: 'inline',
            bindingModelId: resolved.item.id,
            item: resolved.item,
        };
    }
    return { error: 'items field must be an array or an array model' };
}

// Terminal d'un chemin de liaison : un champ d'éléments en ligne s'arrête
// sur son modèle élément ; tout autre champ doit référencer un modèle.
export function resolveBindingSegment(resolveModel, field) {
    if (field.type?.kind === 'model')
        return { model: resolveModel(field.type.model_id) };
    if (field.type?.kind === 'array' && field.type.items?.kind === 'model') {
        if (field.required !== true || field.nullable !== false)
            return { error: 'items field must be required and non-null' };
        const resolved = itemOf(resolveModel, field.type.items, 'inline');
        return resolved.error ? resolved : { model: resolved.item, last: true };
    }
    return { error: 'field must reference a model' };
}

// Seul accès permis au modèle qu'une liaison doit référencer pour une lecture
// compilée (condition (a) du pilote, P1).
export function queryBindingModelId(operation) {
    return operation.transport.collection_model_id;
}

// X5 C3b : fixture du test de conformité de contrat généré dans le produit
// (D-X5-2, mécanisme 1 ; option (a) du pilote). Une valeur COMPLÈTE et typée
// est SYNTHÉTISÉE depuis les types du contrat, pour chaque champ, lu ou non.
// Rien n'est inventé : une valeur est soit dérivée du contrat (valeurs
// permises, bornes), soit une forme canonique de syntaxe. Ce que l'atelier ne
// sait pas synthétiser est un REFUS NOMMÉ qui dit quel champ et pourquoi.

// Formes canoniques de syntaxe, sans contenu métier.
const CANONICAL = Object.freeze({
    date: '2000-01-01',
    datetime: '2000-01-01T00:00:00Z',
    uuid: '00000000-0000-4000-8000-000000000000',
});
const SYNTHESIZED_CONSTRAINTS = Object.freeze({
    string: ['min_length', 'max_length'],
    integer: ['minimum', 'maximum'],
    number: ['minimum', 'maximum'],
    array: ['min_items', 'max_items'],
});
const TS_PRIMITIVE = Object.freeze({
    string: 'string',
    date: 'string',
    datetime: 'string',
    uuid: 'string',
    integer: 'number',
    number: 'number',
    boolean: 'boolean',
    null: 'null',
});

function refuse(path, reason) {
    throw new Error(
        `LIST_QUERY_CONFORMANCE_UNSYNTHESIZABLE: field ${path} ${reason}`
    );
}

function bounded(path, constraints, integer) {
    const { minimum, maximum } = constraints;
    let value = minimum ?? (maximum === undefined ? 0 : Math.min(0, maximum));
    if (integer) value = Math.ceil(value);
    if (maximum !== undefined && value > maximum)
        refuse(path, 'has an empty numeric range');
    return value;
}

function primitive(path, name, constraints, allowed) {
    if (allowed?.length) return allowed[0];
    if (name === 'string') {
        const { min_length: min = 0, max_length: max } = constraints;
        const length = Math.max(min, max === 0 ? 0 : 1);
        if (max !== undefined && length > max)
            refuse(path, 'has an empty length range');
        return 'x'.repeat(length);
    }
    if (name === 'integer' || name === 'number')
        return bounded(path, constraints, name === 'integer');
    if (name === 'boolean') return false;
    if (name === 'null') return null;
    if (Object.hasOwn(CANONICAL, name)) return CANONICAL[name];
    return refuse(path, `has type ${name} without a canonical form`);
}

// { type, value } : type TypeScript complet et valeur synthétisée d'un type de
// contrat. `stack` : modèles en cours, pour refuser un cycle.
function synthesize(path, type, field, resolveModel, stack) {
    const constraints = field?.constraints ?? {};
    const supported =
        type.kind === 'primitive'
            ? (SYNTHESIZED_CONSTRAINTS[type.name] ?? [])
            : type.kind === 'array'
              ? SYNTHESIZED_CONSTRAINTS.array
              : [];
    const unknown = Object.keys(constraints).find(
        (key) => !supported.includes(key)
    );
    if (unknown) refuse(path, `has constraint ${unknown}`);
    if (type.kind === 'primitive') {
        if (!Object.hasOwn(TS_PRIMITIVE, type.name))
            refuse(path, `has type ${type.name} without a canonical form`);
        return {
            type: TS_PRIMITIVE[type.name],
            value: primitive(
                path,
                type.name,
                constraints,
                field?.allowed_values
            ),
        };
    }
    if (type.kind === 'array') {
        const item = synthesize(
            `${path}[]`,
            type.items,
            undefined,
            resolveModel,
            stack
        );
        const { min_items: min = 0, max_items: max } = constraints;
        if (max !== undefined && min > max)
            refuse(path, 'has an empty item-count range');
        return {
            type: `ReadonlyArray<${item.type}>`,
            value: Array.from({ length: min }, () =>
                structuredClone(item.value)
            ),
        };
    }
    if (type.kind === 'model')
        return synthesizeModel(path, type.model_id, resolveModel, stack);
    return refuse(path, `has unsupported type kind ${type.kind}`);
}

function synthesizeModel(path, modelId, resolveModel, stack) {
    if (stack.includes(modelId)) refuse(path, `forms a model cycle ${modelId}`);
    const model = resolveModel(modelId);
    if (!model) refuse(path, `references an unresolved model ${modelId}`);
    if (model.kind === 'array')
        return synthesize(
            path,
            { kind: 'array', items: model.items },
            model,
            resolveModel,
            [...stack, modelId]
        );
    if (model.kind !== 'object')
        return synthesize(path, model.type, model, resolveModel, [
            ...stack,
            modelId,
        ]);
    return synthesizeObject(path, model, resolveModel, [...stack, modelId]);
}

// Objet complet : TOUS les champs, requis ou non. Un champ nullable reçoit une
// valeur non nulle, plus exigeante pour le décodeur.
export function synthesizeObject(path, model, resolveModel, stack = []) {
    const members = [];
    const value = {};
    for (const field of model.fields ?? []) {
        const member = synthesize(
            `${path}.${field.name}`,
            field.type,
            field,
            resolveModel,
            stack
        );
        const type = field.nullable ? `${member.type} | null` : member.type;
        members.push(
            `readonly ${JSON.stringify(field.name)}${field.required ? '' : '?'}: ${type};`
        );
        value[field.name] = member.value;
    }
    // Objet sans champ (ex. objet-valeur fermé) : `{}`, typé sans `{}` vide.
    return {
        type: members.length
            ? `{ ${members.join(' ')} }`
            : 'Readonly<Record<string, never>>',
        value,
    };
}

// Fixture complète d'un élément de liste, et de la page qui le porte.
export function conformanceFixture({ item, page, itemsField, resolveModel }) {
    const complete = synthesizeObject(item.id, item, resolveModel, [item.id]);
    let pageValue;
    if (page) {
        const others = {
            ...page,
            fields: page.fields.filter((field) => field.name !== itemsField),
        };
        pageValue = synthesizeObject(page.id, others, resolveModel, [
            page.id,
        ]).value;
    }
    return { itemType: complete.type, item: complete.value, page: pageValue };
}

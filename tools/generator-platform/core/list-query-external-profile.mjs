// X5 C2 : profil EXTÉRIEUR d'une lecture list-query v2 (D-X5-2, D-X5-4,
// D-X5-6). Seul site de son contrat ; le compilateur, son validateur et le
// rendu Angular extérieur y passent.
//
// - Projection du fil (D-X5-2) : le décodeur ne porte que les champs LUS,
//   décodés strictement (type, requis, nullable, contraintes) ; les autres
//   champs de l'élément sont ignorés (`unknown_fields: 'ignore'`).
// - Politique honnête (D-X5-4) : la coque extérieure n'a aucun consommateur
//   de cache, donc `cache: host` est refusé et `bypass` exigé.
// - Erreur (D-X5-6) : une lecture en échec efface ses lignes
//   (`on_error: clear`).
//
// Le profil se décrit lui-même dans le modèle : `ignore` n'est valide
// qu'avec TOUTE cette politique. Le profil interne garde `reject` (Π1).

import { isPrototypeName } from './page-grammar/registries.mjs';

export const EXTERNAL_LIST_QUERY_EXECUTION = Object.freeze({
    cache: Object.freeze({ mode: 'bypass' }),
    concurrency: 'latest-wins',
    cancellation: Object.freeze({ on_superseded: true, on_destroy: true }),
    retry: Object.freeze({ mode: 'none' }),
    stale_data: Object.freeze({ on_reload: 'preserve', on_error: 'clear' }),
});

const canonical = (value) =>
    JSON.stringify(value, (key, entry) =>
        entry && typeof entry === 'object' && !Array.isArray(entry)
            ? Object.fromEntries(
                  Object.keys(entry)
                      .sort()
                      .map((name) => [name, entry[name]])
              )
            : entry
    );

// Refus nommé, ou undefined si la politique est celle du profil extérieur.
export function externalExecutionError(execution) {
    if (execution?.cache?.mode === 'host')
        return 'LIST_QUERY_EXTERNAL_CACHE_HOST: the external shell has no cache consumer; declare cache bypass';
    if (canonical(execution) !== canonical(EXTERNAL_LIST_QUERY_EXECUTION))
        return 'LIST_QUERY_EXTERNAL_EXECUTION: the external profile requires cache bypass, latest-wins, cancellation, no retry and on_error clear';
    return undefined;
}

// E5 : chaque colonne reste lisible par la page. Un nom de champ lu ne peut pas
// être un nom de prototype que la grammaire de page refuse (source unique :
// isPrototypeName).
export function externalReadFieldError(readModel) {
    const field = (readModel?.fields ?? []).find((entry) =>
        isPrototypeName(entry.name)
    );
    return field
        ? `LIST_QUERY_EXTERNAL_READ_NAME: read field ${field.name} is a prototype name refused by the page grammar`
        : undefined;
}

// Champs du fil à décoder : ceux que lit le modèle de lecture, dans l'ordre du
// contrat. Appliqué AVANT la vérification de type, pour qu'un champ non lu
// (imbriqué, booléen…) ne bloque pas la page.
export function projectReadFields(wireFields, readModel) {
    const read = new Set(
        (readModel?.fields ?? []).map((field) => field.source_field)
    );
    return wireFields.filter((field) => read.has(field.name));
}

// Invariants d'un modèle compilé qui déclare `unknown_fields: 'ignore'`.
export function externalQueryErrors(query, path) {
    const errors = [];
    const sources = (query.read_model?.fields ?? []).map(
        (field) => field.source_field
    );
    const wire = (query.wire_model?.fields ?? []).map((field) => field.name);
    if (
        new Set(sources).size !== wire.length ||
        wire.some((name) => !sources.includes(name))
    )
        errors.push(
            `${path}.wire_model: an ignoring decoder must decode exactly the read fields`
        );
    const execution = externalExecutionError(query.controller?.execution);
    if (execution) errors.push(`${path}.controller.execution: ${execution}`);
    const name = externalReadFieldError(query.read_model);
    if (name) errors.push(`${path}.read_model: ${name}`);
    return errors;
}

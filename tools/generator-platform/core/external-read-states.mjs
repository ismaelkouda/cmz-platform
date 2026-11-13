// X5 C5 (E8, B-C5-1, B+) : états déclarés des lectures d'une page, section
// `read_states` du bon de travail. Ce sont des DONNÉES du plan scellé et du
// modèle de lecture compilé, sans choix libre :
// - les six états viennent de la source unique EXTERNAL_QUERY_STATES ;
// - chaque état garde le `state_id` déclaré par le plan, ou null ;
// - hors ligne se lit par le signal `online` ;
// - un champ lu qui peut manquer (nullable ou facultatif) est nommé, d'après
//   le modèle de lecture compilé, jamais d'après une déclaration de page ;
// - le texte d'absence est publié par la composition : le bon de travail
//   donne son CHEMIN (`absentText.<liaison>`), jamais le texte (B+).
import { camelCase } from '../renderers/shared.mjs';
import { ABSENT_TEXT_ROOT } from '../renderers/angular-page-composition-api.mjs';
import { EXTERNAL_QUERY_STATES } from './list-query-external-profile.mjs';
import { externalFailure } from './external-application-paths.mjs';
import { READ_ACCESS_SUFFIXES } from './read-access.mjs';

const PRESENTATION = Object.freeze({
    loading: 'loading_state_id',
    success: 'success_state_id',
    empty: 'empty_state_id',
    error: 'error_state_id',
});

export const READ_STATES_RULE =
    'Render one non-empty branch for every state of every read in read_states and one for offline; render rows only in the success branch (only items().length is allowed elsewhere); show a field listed in absent_fields through its binding absent_text_path, never a copy of the text and never a lone symbol.';

// `queries` : nœud de lecture → sa lecture compilée (modèle publié).
export function readStates(plan, queries) {
    return plan.query_nodes.map((node) => {
        const query = queries.get(node.id);
        if (!query) externalFailure(`read ${node.id} has no compiled query`);
        const bindings = (plan.output_bindings ?? [])
            .filter(
                (binding) =>
                    binding.producer_node_id === node.id &&
                    binding.output.kind === 'list'
            )
            .sort((left, right) => (left.id < right.id ? -1 : 1));
        const absentFields = query.read_model.fields
            .filter((field) => field.nullable || !field.required)
            .map((field) => field.name)
            .sort();
        if (absentFields.length > 0) {
            const missing = bindings.length
                ? bindings.filter(
                      (binding) => !Object.hasOwn(binding, 'absent_text')
                  )
                : [undefined];
            for (const binding of missing)
                externalFailure(
                    `PAGE_ABSENT_TEXT_MISSING: data binding ${binding?.id ?? `for ${node.id}`} needs absent_text for ${absentFields.join(', ')}`
                );
        }
        return {
            node_id: node.id,
            member: camelCase(node.id),
            states: Object.fromEntries(
                EXTERNAL_QUERY_STATES.map((state) => [
                    state,
                    node.presentation[PRESENTATION[state]] ?? null,
                ])
            ),
            offline: 'online',
            absent_fields: absentFields,
            // X5 C5b : noms d'accès de la page, depuis la source unique.
            access: {
                state: `${camelCase(node.id)}${READ_ACCESS_SUFFIXES.state}`,
                items: `${camelCase(node.id)}${READ_ACCESS_SUFFIXES.items}`,
            },
            bindings: bindings.map((binding) => {
                const absent = Object.hasOwn(binding, 'absent_text');
                return {
                    binding_id: binding.id,
                    absent_text_path: absent
                        ? `${ABSENT_TEXT_ROOT}.${camelCase(binding.id)}`
                        : null,
                    absent_access: absent
                        ? `${camelCase(binding.id)}${READ_ACCESS_SUFFIXES.absent}`
                        : null,
                };
            }),
        };
    });
}

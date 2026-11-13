// X5 C5b : points d'accès uniques d'une page à lectures. SOURCE UNIQUE des
// noms, partagée par le générateur du bon de travail (`read_states`) et par
// les règles de la page (grammaire LE1–LE6, A1–A4).
//
// Non-collision (conception C5b v2, §2) : les trois suffixes sont deux à deux
// distincts, aucun n'est suffixe d'un autre et `online` ne se termine par
// aucun d'eux ; deux noms d'accès de familles différentes ne peuvent donc pas
// être égaux. Dans une famille, deux bases égales sont déjà refusées à la
// génération (table `api` de la composition). Un test d'invariant casse si un
// suffixe change.
export const READ_ACCESS_SUFFIXES = Object.freeze({
    state: 'State',
    items: 'Items',
    absent: 'Absent',
});

export const ONLINE_ACCESS = 'online';

const ABSENT_PATH = /^absentText\.([a-z][A-Za-z0-9]*)$/;

// Noms d'accès d'une entrée de `read_states.reads` (états, champs absents et
// chemins de texte d'absence déjà calculés).
export function readAccess(read) {
    return {
        member: read.member,
        state: `${read.member}${READ_ACCESS_SUFFIXES.state}`,
        items: `${read.member}${READ_ACCESS_SUFFIXES.items}`,
        states: Object.keys(read.states),
        absentFields: new Set(read.absent_fields),
        bindings: read.bindings.map((binding) => {
            const liaison = ABSENT_PATH.exec(
                binding.absent_text_path ?? ''
            )?.[1];
            return {
                binding_id: binding.binding_id,
                liaison: liaison ?? null,
                absent: liaison
                    ? `${liaison}${READ_ACCESS_SUFFIXES.absent}`
                    : null,
            };
        }),
    };
}

// Règles publiées dans la section `read_states` du bon de travail (et
// seulement là : le bon de travail d'une page de commandes ne change pas).
export const READ_PAGE_RULES = Object.freeze({
    LE1: 'PAGE_READ_MEMBER_ALIAS: the page reads each read state, rows, online and absent text only through one protected computed per access name, whose body is exactly the composition member; no alias, destructuring, index, argument or whole node, and no other use of these access names in the class',
    LE2: 'PAGE_READ_STATE_BRANCH_*: one @if/@else if or @switch/@case per read over its state access; every state of read_states in exactly one non-empty branch; no @default, no final @else; no hiding attribute or binding on an ancestor of a branch',
    LE3: 'PAGE_READ_ROWS_GUARD: the branch that renders rows is guarded by exactly <state>() === "success"',
    LE4: 'PAGE_READ_STATE_OUTSIDE_GUARD: a state access appears only as the left operand of === against a string literal in a branch guard (|| allowed outside success) or as the @switch expression',
    LE5: 'PAGE_READ_ROWS_OUTSIDE_SUCCESS: rows access only as the @for expression inside the success branch; elsewhere only <items>().length; never indexed or passed',
    LE6: 'PAGE_READ_OFFLINE_BRANCH: exactly one branch guarded by online() === false; online() nowhere else',
    A1: 'PAGE_ABSENT_ACCESS: one protected computed per absent text, whose body is exactly the composition absentText member',
    A2: 'PAGE_ABSENT_FIELD_UNGUARDED / PAGE_ABSENT_SINK: a field of absent_fields is read only as {{ row.f ?? <absent>() }} (optional pipe on the left) or under @if (row.f === null || row.f === undefined) { {{ <absent>() }} } @else { … }; the absent access appears only there, as text; an empty string is not absent',
    A3: 'PAGE_ABSENT_TEXT_COPY: no text, attribute or string literal equals an absent text once decoded',
    A4: 'PAGE_ABSENT_HIDDEN: no i18n, i18n-*, hidden, aria-hidden, [hidden], [attr.hidden], [attr.aria-hidden], [style.display], [style.visibility] or [style.opacity] on an ancestor of an absent text',
});

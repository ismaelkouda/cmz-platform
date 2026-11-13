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

// Formes de MASQUAGE refusées (A4, LE2) : source unique de l'enforcement
// (`page-grammar/read-template.mjs`) et du texte publié.
export const READ_HIDING = Object.freeze({
    // métadonnée i18n de l'élément, attribut i18n-*
    metadata: Object.freeze(['i18n', 'i18n-*']),
    // attributs statiques
    attributes: Object.freeze(['hidden', 'aria-hidden']),
    // [<nom>]
    propertyBindings: Object.freeze(['hidden', 'style']),
    // [attr.<nom>]
    attributeBindings: Object.freeze(['hidden', 'aria-hidden', 'style']),
    // [style.<toute propriété>]
    styleBindings: 'any',
});

export function readHidingForms() {
    return [
        ...READ_HIDING.metadata,
        ...READ_HIDING.attributes,
        ...READ_HIDING.propertyBindings.map((name) => `[${name}]`),
        ...READ_HIDING.attributeBindings.map((name) => `[attr.${name}]`),
        ...(READ_HIDING.styleBindings === 'any' ? ['[style.*]'] : []),
    ];
}

// EMPLACEMENTS permis d'un aiguillage d'état (LE2) ; la branche hors ligne se
// place à la racine (LE6). Source unique de l'enforcement et du texte publié.
export const READ_PLACEMENTS = Object.freeze({
    root: 'the page control-flow root (layout elements allowed)',
    'offline-else': 'the @else of the offline branch',
    'read-branch': 'a branch of another read',
});
export const READ_OFFLINE_PLACEMENT = 'root';

const S = READ_ACCESS_SUFFIXES;
const forms = (list) => list.join(', ');

// Règles publiées dans la section `read_states` du bon de travail (et
// seulement là : le bon de travail d'une page de commandes ne change pas).
// Les listes (suffixes, accès hors ligne, formes de masquage, emplacements)
// viennent des constantes de l'enforcement ; les formes STRUCTURELLES (alias,
// garde, F1, F2) sont des chemins de code, décrits en texte et épinglés par
// test (`external-page-read-publication.test.mjs`).
export const READ_PAGE_RULES = Object.freeze({
    LE1: `PAGE_READ_MEMBER_ALIAS: the page reads each read state, rows, ${ONLINE_ACCESS} and absent text only through one protected computed per access name (<read>${S.state}, <read>${S.items}, ${ONLINE_ACCESS}, <binding>${S.absent}), whose body is exactly the composition member; no alias, destructuring, this[...], index, argument or whole node, and no other use of these access names in the class`,
    LE2: `PAGE_READ_STATE_BRANCH_*: one @if/@else if or @switch/@case per read over its <read>${S.state}() access, placed only at ${forms(Object.values(READ_PLACEMENTS))}; a second one, nested or sibling, is refused; every state of read_states in exactly one branch that renders text; no @default, no final @else; none of ${forms(readHidingForms())} on an ancestor of the branches or on any element inside a branch`,
    LE3: `PAGE_READ_ROWS_GUARD: the branch that renders rows is guarded by exactly <read>${S.state}() === 'success', never in || or in a @case group`,
    LE4: `PAGE_READ_STATE_OUTSIDE_GUARD: <read>${S.state}() appears only as the left operand of === against a string literal in a branch guard (|| allowed outside success) or as the @switch expression; never with !, !==, !=, in a ternary, an interpolation, a binding, a @let or an argument`,
    LE5: `PAGE_READ_ROWS_OUTSIDE_SUCCESS / PAGE_READ_ROW_ACCESS / PAGE_READ_LET_ALIAS: <read>${S.items}() only as the @for iterable whose nearest governing guard is the success branch, or as the receiver of .length; a row is read field by field (row.f, row?.f), never indexed, whole or through @let`,
    LE6: `PAGE_READ_OFFLINE_BRANCH: exactly one branch guarded by ${ONLINE_ACCESS}() === false, at ${READ_PLACEMENTS[READ_OFFLINE_PLACEMENT]}; ${ONLINE_ACCESS}() nowhere else`,
    A1: `PAGE_ABSENT_ACCESS: one protected computed <binding>${S.absent} per absent text, whose body is exactly the composition absentText member`,
    A2: `PAGE_ABSENT_FIELD_UNGUARDED / PAGE_ABSENT_SINK: a field of absent_fields is read only as {{ row.f ?? <binding>${S.absent}() }} (optional pipe on the left) or under @if (row.f === null || row.f === undefined) { {{ <binding>${S.absent}() }} } @else { … }; <binding>${S.absent}() appears only there, as text interpolation; an empty string is not absent`,
    A3: 'PAGE_ABSENT_TEXT_COPY: no text, attribute or string literal equals an absent text once decoded',
    A4: `PAGE_ABSENT_HIDDEN: none of ${forms(readHidingForms())} on an ancestor of an absent text, the element that contains it included`,
});

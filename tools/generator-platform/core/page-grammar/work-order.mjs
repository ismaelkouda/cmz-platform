// X4-sécurité-3, G4 : section `grammar` du bon de travail. Le réalisateur lit
// la grammaire positive et ses tables fermées ; le validateur les relit sans
// écrire de sonde. Chaque table est la valeur même qu'utilise l'accepteur.
import ts from 'typescript';

import { applicationRoutePattern } from '../application-route-pattern.mjs';
import { PROTOTYPE_NAMES } from './registries.mjs';
import {
    CSS_AT_RULES,
    CSS_FUNCTIONS,
    CSS_NODE_TYPES,
    CSS_IDENTIFIER_ESCAPES,
    CSS_REFUSED_PROPERTIES,
    CSS_REFUSED_TOKENS,
} from './style.mjs';
import {
    BOUND_ATTRIBUTES,
    BOUND_PROPERTIES,
    ELEMENT_ATTRIBUTES,
    STYLE_PROPERTIES,
    TEMPLATE_ELEMENTS,
    TEMPLATE_PIPES,
} from './template.mjs';
import {
    BINARY_OPERATORS,
    COMPOSITION_IMPORTS,
    DECORATOR_KEYS,
    HOST_KEY,
    IMPORTS,
    TYPESCRIPT_PRODUCTIONS,
} from './typescript.mjs';

export const GRAMMAR_VERSION = '1.0.0';

// Codes de règle (conception v1 §1, §3, §4 ; v2 §3.2 pour S1 et S2).
export const GRAMMAR_RULES = Object.freeze({
    T0: 'every node and token of page.component.ts is approved by a production; parser diagnostics refuse the file',
    T1: 'no comment, shebang, conflict marker or directive: only space, tab, LF and CR between tokens',
    T2: 'ASCII names without escape; quoted strings without backslash, template strings included; no Cf, U+2028, U+2029 or control character in the three files nor in decoded template values (entities, escapes)',
    T3: 'module: imports, then non-exported literal type aliases, then const tables with literal leaves, then one class',
    T4: 'imports: named, without alias or type, from the listed modules only, each name at its fixed position',
    T5: 'one class: @Component(...) export class PageComponent, without extends, implements or type parameters',
    T6: '@Component: an object literal with unique keys read by text, from the closed key table',
    T7: 'fields: private|protected readonly, initialized by signal(), computed(() => E), one private inject(PageComposition), or a table',
    T8: 'methods: private|protected, one body, typed parameters, return void or false',
    T9: 'statements: const, if/else, block, return, or one call; acyclic computed graph',
    T10: 'expressions: literals, bound names, data reads (?.), table reads, listed operators, object and array literals',
    T11: 'seven call forms only: this.s(), this.s.set(E), this.s.update((p) => E), this.m(E), this.composition.<signal>(), this.composition.<command>(O).subscribe({...}), and field initializers',
    T12: 'no free name: every identifier resolves to a parameter, a local const, an update parameter, a module table or undefined',
    T13: 'types: string, number, boolean, null, undefined, literals, unions, readonly T[], Readonly<T>, Record<K, T>, module aliases',
    S1: 'submit method (typed false): if (Es) { … return false; }, const n = Es, this.s.set(Es), this.s.update((p) => Es), this.composition.<command>(Os).subscribe(Obs), then return false',
    S2: 'submit path expressions never throw: optional data reads, strict comparisons, &&, ||, ??, !, conditional, safe acyclic computed; no arithmetic, ordering, array spread or page method call',
    H0: 'every template node is approved; the template parses',
    H1: 'no HTML comment or ICU; i18n markers allowed',
    H2: 'closed element list, namespace included',
    H3: 'static attributes from the global and per-element tables; constrained values',
    H4: 'listed property, attribute, class and style bindings only',
    H5: 'events from the closed list on the element itself; one call of a protected page method; no $event; one (submit) per form, to a method typed false',
    H6: '#ref without value on input, textarea or select, read only as ref.value or ref.checked in event arguments',
    H7: 'template expressions by implicit receiver only, signals called without argument, tables by key or member',
    H8: '@if, @else, @for (track $index, item or item.n), @empty, @switch with literal @case, @let',
    H9: 'listed pipes, each class in imports, literal arguments; routerLink requires RouterLink',
    C0: 'every CSS node type of the compiled stylesheet is approved',
    C1: 'no stylesheet is loaded: only sass:* modules',
    C2: 'closed at-rule list in the compiled CSS',
    C3: 'no url or bad-url token; closed function list',
    C4: 'no ::ng-deep',
});

const kindNames = (names) => [...names];

export function grammarSection({ pageId, pageContract }) {
    // CI #389 : les routes du bon de travail sont exigées (une page extérieure
    // a toujours une session) ; aucun repli silencieux sur une liste vide.
    const declared = pageContract.experience?.session?.routes;
    if (
        !Array.isArray(declared) ||
        declared.length === 0 ||
        declared.some((route) => typeof route?.path !== 'string')
    )
        throw new Error('page grammar: work order without declared routes');
    const routes = declared.map((route) => route.path).sort();
    return {
        version: GRAMMAR_VERSION,
        reviewed_parser: { typescript: ts.version },
        selector: `app-page-${pageId.slice(-8)}`,
        routes,
        route_pattern: applicationRoutePattern().source,
        rules: GRAMMAR_RULES,
        typescript: {
            imports: IMPORTS,
            composition_imports: COMPOSITION_IMPORTS,
            decorator_keys: DECORATOR_KEYS,
            host_key: HOST_KEY.source,
            productions: Object.fromEntries(
                Object.entries(TYPESCRIPT_PRODUCTIONS).map(
                    ([context, names]) => [context, kindNames(names)]
                )
            ),
            binary_operators: BINARY_OPERATORS.map((kind) =>
                ts.tokenToString(kind)
            ),
            prototype_names: PROTOTYPE_NAMES,
        },
        template: {
            elements: TEMPLATE_ELEMENTS,
            element_attributes: ELEMENT_ATTRIBUTES,
            bound_properties: BOUND_PROPERTIES,
            bound_attributes: BOUND_ATTRIBUTES.source,
            style_properties: STYLE_PROPERTIES,
            pipes: TEMPLATE_PIPES,
        },
        style: {
            at_rules: CSS_AT_RULES,
            functions: CSS_FUNCTIONS,
            node_types: CSS_NODE_TYPES,
            refused_tokens: CSS_REFUSED_TOKENS,
            refused_properties: CSS_REFUSED_PROPERTIES,
            identifier_escapes: CSS_IDENTIFIER_ESCAPES,
        },
    };
}

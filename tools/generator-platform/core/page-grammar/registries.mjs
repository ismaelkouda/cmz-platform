// X4-sécurité-3, O-C (§4.1) : registres lus dans les modules installés, jamais
// tenus à la main. Chaque énumération prend son module en paramètre : une
// version qui ajoute un genre change le registre, que le test compare à sa
// copie épinglée (signal de nouvelle revue de version).
import * as angular from '@angular/compiler';
import * as cssTree from 'css-tree';
import ts from 'typescript';

// Noms de prototype : noms propres d'Object.prototype et de
// Function.prototype, plus `prototype`, `constructor` et `__proto__`.
export const PROTOTYPE_NAMES = Object.freeze(
    [
        ...new Set([
            ...Object.getOwnPropertyNames(Object.prototype),
            ...Object.getOwnPropertyNames(Function.prototype),
            'prototype',
            'constructor',
            '__proto__',
        ]),
    ].sort()
);
const PROTOTYPE = new Set(PROTOTYPE_NAMES);
export const isPrototypeName = (name) => PROTOTYPE.has(name);

// Genres TypeScript : valeurs numériques distinctes de `SyntaxKind`, chacune
// nommée par son premier nom non marqueur (`First*`, `Last*`, `Count`).
export function typescriptKinds(module = ts) {
    const kinds = new Map();
    for (const [name, value] of Object.entries(module.SyntaxKind)) {
        if (typeof value !== 'number') continue;
        const marker = /^(?:First|Last)[A-Z]|^Count$/.test(name);
        if (
            !kinds.has(value) ||
            (!marker && /^(?:First|Last)[A-Z]|^Count$/.test(kinds.get(value)))
        )
            kinds.set(value, name);
    }
    return new Map([...kinds].sort(([left], [right]) => left - right));
}

// Expressions Angular : exports d'@angular/compiler dont le prototype descend
// d'`AST` (la classe de base abstraite exclue).
export function angularExpressionClasses(module = angular) {
    return Object.entries(module)
        .filter(
            ([, value]) =>
                typeof value === 'function' &&
                value.prototype instanceof module.AST
        )
        .map(([name]) => name)
        .sort();
}

// Nœuds de gabarit : exports `TmplAst*`, visiteurs exclus (base abstraite
// `TmplAstBlockNode` comprise).
export function templateNodeClasses(module = angular) {
    return Object.keys(module)
        .filter((name) => name.startsWith('TmplAst') && !/Visitor$/.test(name))
        .sort();
}

// Arbre HTML brut : un genre par méthode `visit*` du visiteur récursif de
// l'arbre HTML (`visitChildren` exclu), exporté ou non.
export function htmlNodeKinds(module = angular) {
    return Object.getOwnPropertyNames(module.RecursiveVisitor.prototype)
        .filter((name) => /^visit[A-Z]/.test(name) && name !== 'visitChildren')
        .map((name) => name.slice('visit'.length))
        .sort();
}

// Nœuds et jetons CSS de `css-tree`.
export function cssNodeTypes(module = cssTree) {
    return Object.keys(module.lexer.structure).sort();
}
export function cssTokenTypes(module = cssTree) {
    return Object.keys(module.tokenTypes).sort();
}

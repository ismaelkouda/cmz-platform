// X4-sécurité-3, O-G et O-S (v1 §1.5, §1.6 ; v2 §3.2) : expressions, sept
// formes d'appel, chemins publiés de la composition, graphe des `computed` et
// passe de couverture. Ajouté au prototype de TypeScriptGrammar.
//
// Deux modes : `general` (v1 §1.5) et `safe`, la grammaire sans levée du
// chemin de soumission (v2 §3.2 : accès optionnels, comparaisons strictes,
// `computed` sûrs et acycliques, ni conversion en primitive, ni décomposition
// de tableau, ni appel de méthode de la page).
import ts from 'typescript';

import { isPrototypeName } from './registries.mjs';
import {
    BINARY_OPERATORS,
    TypeScriptGrammar,
    kindName,
} from './typescript.mjs';

const K = ts.SyntaxKind;
const GENERAL_BINARY = new Set(BINARY_OPERATORS);
const SAFE_BINARY = new Set([
    K.EqualsEqualsEqualsToken,
    K.ExclamationEqualsEqualsToken,
    K.AmpersandAmpersandToken,
    K.BarBarToken,
    K.QuestionQuestionToken,
]);
const SUBSCRIBE_KEYS = new Set(['next', 'error', 'complete']);

function lookup(scope, name) {
    for (let current = scope; current; current = current.parent)
        if (current.names.has(name)) return current.names.get(name);
    return undefined;
}
const childScope = (parent, entries = []) => ({
    parent,
    names: new Map(entries),
});
const isThis = (node) => node.kind === K.ThisKeyword;

Object.assign(TypeScriptGrammar.prototype, {
    // Chemin `this.<composition>.a.b` : accès simples seulement.
    compositionPath(node) {
        const parts = [];
        let current = node;
        while (
            ts.isPropertyAccessExpression(current) &&
            !current.questionDotToken
        ) {
            parts.unshift(current.name);
            current = current.expression;
        }
        if (
            !isThis(current) ||
            parts[0]?.text !== this.compositionField ||
            parts.length < 2
        )
            return undefined;
        return {
            path: parts
                .slice(1)
                .map((part) => part.text)
                .join('.'),
            node,
        };
    },

    approveChain(node) {
        let current = node;
        while (ts.isPropertyAccessExpression(current)) {
            this.ok(current);
            this.tokens(current, K.DotToken);
            this.identifier(current.name);
            current = current.expression;
        }
        this.ok(current);
    },

    publishedKind(path) {
        return this.context.api.get(path);
    },

    // Valeur : une table n'est lue que par clé ou par membre.
    value(node, scope, mode) {
        const kind = this.expression(node, scope, mode);
        if (kind === 'table')
            this.bad(node, 'T11', 'a table is read by key or member only');
        return kind;
    },

    expression(node, scope, mode) {
        if (!this.dispatch('expression', node)) return 'invalid';
        this.ok(node);
        switch (node.kind) {
            case K.StringLiteral:
                this.string(node);
                return 'data';
            case K.NumericLiteral:
            case K.TrueKeyword:
            case K.FalseKeyword:
            case K.NullKeyword:
                return 'data';
            case K.Identifier:
                return this.boundName(node, scope);
            case K.ParenthesizedExpression:
                this.tokens(node, K.OpenParenToken, K.CloseParenToken);
                return this.value(node.expression, scope, mode);
            case K.PrefixUnaryExpression: {
                this.tokens(node, K.ExclamationToken, K.MinusToken);
                if (node.operator === K.MinusToken && mode === 'safe')
                    this.bad(
                        node,
                        'S2',
                        'submit path: unary minus converts to a primitive'
                    );
                else if (
                    ![K.ExclamationToken, K.MinusToken].includes(node.operator)
                )
                    this.bad(
                        node,
                        'T10',
                        `operator ${kindName(node.operator)}`
                    );
                this.value(node.operand, scope, mode);
                return 'data';
            }
            case K.BinaryExpression: {
                const operator = node.operatorToken.kind;
                if (!GENERAL_BINARY.has(operator))
                    this.bad(
                        node.operatorToken,
                        'T10',
                        `operator ${kindName(operator)}`
                    );
                else if (mode === 'safe' && !SAFE_BINARY.has(operator))
                    this.bad(
                        node.operatorToken,
                        'S2',
                        `submit path: operator ${kindName(operator)} may throw`
                    );
                else this.ok(node.operatorToken);
                this.value(node.left, scope, mode);
                this.value(node.right, scope, mode);
                return 'data';
            }
            case K.ConditionalExpression:
                this.tokens(node, K.QuestionToken, K.ColonToken);
                this.value(node.condition, scope, mode);
                this.value(node.whenTrue, scope, mode);
                this.value(node.whenFalse, scope, mode);
                return 'data';
            case K.PropertyAccessExpression:
                return this.propertyAccess(node, scope, mode);
            case K.ElementAccessExpression:
                return this.elementAccess(node, scope, mode);
            case K.CallExpression: {
                const kind = this.call(node, scope, mode);
                if (!['read', 'method'].includes(kind))
                    this.bad(
                        node,
                        'T11',
                        'this call is a statement, not a value'
                    );
                return 'data';
            }
            case K.ObjectLiteralExpression:
                return this.objectLiteral(node, scope, mode);
            case K.ArrayLiteralExpression:
                this.tokens(node, K.OpenBracketToken, K.CloseBracketToken);
                this.list(node, node.elements);
                for (const element of node.elements) {
                    if (ts.isSpreadElement(element)) {
                        this.ok(element);
                        this.tokens(element, K.DotDotDotToken);
                        if (mode === 'safe')
                            this.bad(
                                element,
                                'S2',
                                'submit path: array spread may throw'
                            );
                        this.value(element.expression, scope, mode);
                    } else this.value(element, scope, mode);
                }
                return 'data';
            default:
                return (
                    this.bad(node, 'T0', `${kindName(node.kind)}`) || 'invalid'
                );
        }
    },

    // Noms liés (T12) : paramètres, constantes locales, paramètre d'`update`,
    // tables du module et `undefined`. Tout autre nom est libre, donc refusé.
    boundName(node, scope) {
        if (!this.identifier(node, 'T12')) return 'invalid';
        if (node.text === 'undefined') return 'data';
        if (lookup(scope, node.text)) return 'data';
        if (this.tables.has(node.text)) return 'table';
        this.bad(node, 'T12', `free name ${node.text}`);
        return 'invalid';
    },

    propertyAccess(node, scope, mode) {
        this.tokens(node, K.DotToken, K.QuestionDotToken);
        if (!this.identifier(node.name, 'T10')) return 'invalid';
        if (isPrototypeName(node.name.text))
            return (
                this.bad(
                    node.name,
                    'T10',
                    `prototype name ${node.name.text}`
                ) || 'invalid'
            );
        const receiver = node.expression;
        if (isThis(receiver)) {
            this.ok(receiver);
            const field = this.fields.get(node.name.text);
            if (field?.kind === 'table' && !node.questionDotToken)
                return 'table';
            this.bad(
                node,
                'T9',
                `this.${node.name.text} is used only in a call form`
            );
            return 'invalid';
        }
        const published = this.compositionPath(node);
        if (published) {
            this.approveChain(node);
            if (this.publishedKind(published.path) !== 'constant')
                this.bad(
                    node,
                    'T11',
                    `composition path ${published.path} is not a published constant`
                );
            return 'data';
        }
        const kind = this.expression(receiver, scope, mode);
        if (kind === 'table') {
            if (node.questionDotToken)
                this.bad(node, 'T10', 'optional table read');
            return 'data';
        }
        if (kind !== 'data') return 'invalid';
        if (mode === 'safe' && !node.questionDotToken)
            this.bad(node, 'S2', 'submit path: data is read with ?.');
        return 'data';
    },

    elementAccess(node, scope, mode) {
        this.tokens(
            node,
            K.OpenBracketToken,
            K.CloseBracketToken,
            K.QuestionDotToken
        );
        const kind = this.expression(node.expression, scope, mode);
        if (kind === 'table') {
            if (node.questionDotToken)
                this.bad(node, 'T10', 'optional table read');
            this.value(node.argumentExpression, scope, mode);
            return 'data';
        }
        if (kind !== 'data') return 'invalid';
        const key = node.argumentExpression;
        if (!ts.isStringLiteral(key))
            return (
                this.bad(key, 'T10', 'data is read with a string key') ||
                'invalid'
            );
        this.string(key);
        if (isPrototypeName(key.text))
            this.bad(key, 'T10', `prototype name ${key.text}`);
        if (mode === 'safe' && !node.questionDotToken)
            this.bad(node, 'S2', 'submit path: data is read with ?.[]');
        return 'data';
    },

    objectLiteral(node, scope, mode) {
        this.tokens(node, K.OpenBraceToken, K.CloseBraceToken);
        this.list(node, node.properties);
        const keys = new Set();
        const parameter = (name) => lookup(scope, name) === 'parameter';
        for (const property of node.properties) {
            this.ok(property);
            if (ts.isSpreadAssignment(property)) {
                this.tokens(property, K.DotDotDotToken);
                this.value(property.expression, scope, mode);
                continue;
            }
            if (!ts.isPropertyAssignment(property)) {
                this.bad(
                    property,
                    'T10',
                    `${kindName(property.kind)} in an object literal`
                );
                continue;
            }
            this.tokens(property, K.ColonToken);
            const name = property.name;
            if (ts.isComputedPropertyName(name)) {
                this.ok(name);
                this.tokens(name, K.OpenBracketToken, K.CloseBracketToken);
                if (
                    !ts.isIdentifier(name.expression) ||
                    !parameter(name.expression.text)
                )
                    this.bad(
                        name,
                        'T10',
                        'a computed key is a method parameter'
                    );
                else this.identifier(name.expression);
            } else {
                const key = this.key(name, 'T10');
                if (
                    key !== undefined &&
                    (keys.has(key) || isPrototypeName(key))
                )
                    this.bad(name, 'T10', `object key refused: ${key}`);
                keys.add(key);
            }
            this.value(property.initializer, scope, mode);
        }
        return 'data';
    },

    // Sept formes d'appel (v1 §1.5, T11). Rend `read`, `method`, `set`,
    // `update` ou `subscribe`.
    call(node, scope, mode) {
        this.ok(node);
        this.tokens(node, K.OpenParenToken, K.CloseParenToken);
        this.list(node, node.arguments);
        if (node.questionDotToken || node.typeArguments)
            return (
                this.bad(node, 'T11', 'optional or generic call') || 'invalid'
            );
        const callee = node.expression;
        if (!ts.isPropertyAccessExpression(callee) || callee.questionDotToken)
            return (
                this.bad(
                    node,
                    'T11',
                    'call on something other than this or the composition'
                ) || 'invalid'
            );
        // Forme 6 : this.composition.<commande>(O).subscribe({...}).
        if (
            callee.name.text === 'subscribe' &&
            ts.isCallExpression(callee.expression)
        ) {
            const command = callee.expression;
            const published = this.compositionPath(command.expression);
            if (!published || this.publishedKind(published.path) !== 'command')
                return (
                    this.bad(
                        node,
                        'T11',
                        'subscribe only on a published composition command'
                    ) || 'invalid'
                );
            this.ok(callee);
            this.tokens(callee, K.DotToken);
            this.identifier(callee.name);
            this.ok(command);
            this.tokens(command, K.OpenParenToken, K.CloseParenToken);
            this.list(command, command.arguments);
            this.approveChain(command.expression);
            if (
                command.typeArguments ||
                command.questionDotToken ||
                command.arguments.length !== 1 ||
                !ts.isObjectLiteralExpression(command.arguments[0])
            )
                this.bad(command, 'T11', 'a command takes one object literal');
            else {
                this.ok(command.arguments[0]);
                this.objectLiteral(command.arguments[0], scope, mode);
            }
            this.observer(node, scope);
            return 'subscribe';
        }
        // Forme 5 : this.composition.<signal>().
        const published = this.compositionPath(callee);
        if (published) {
            this.approveChain(callee);
            if (
                this.publishedKind(published.path) !== 'signal' ||
                node.arguments.length
            )
                this.bad(
                    node,
                    'T11',
                    `composition path ${published.path} is not a published signal`
                );
            return 'read';
        }
        const receiver = callee.expression;
        // Formes 1 et 4 : this.s() et this.m(E, …).
        if (isThis(receiver)) {
            this.ok(receiver);
            this.ok(callee);
            this.tokens(callee, K.DotToken);
            if (!this.identifier(callee.name, 'T11')) return 'invalid';
            const name = callee.name.text;
            const field = this.fields.get(name);
            if (field && ['signal', 'computed'].includes(field.kind)) {
                if (node.arguments.length)
                    this.bad(node, 'T11', 'a signal is read without argument');
                if (
                    mode === 'safe' &&
                    field.kind === 'computed' &&
                    !this.safeComputed(name)
                )
                    this.bad(
                        node,
                        'S2',
                        `submit path: computed ${name} is not a non-throwing expression`
                    );
                return 'read';
            }
            const method = this.methods.get(name);
            if (method) {
                if (mode === 'safe')
                    this.bad(node, 'S2', 'submit path: no page method call');
                if (node.arguments.length !== method.params.length)
                    this.bad(
                        node,
                        'T11',
                        `${name} takes ${method.params.length} argument(s)`
                    );
                for (const argument of node.arguments)
                    this.value(argument, scope, mode);
                return 'method';
            }
            return (
                this.bad(node, 'T11', `this.${name} is not callable`) ||
                'invalid'
            );
        }
        // Formes 2 et 3 : this.s.set(E) et this.s.update((p) => E).
        if (
            ts.isPropertyAccessExpression(receiver) &&
            isThis(receiver.expression) &&
            !receiver.questionDotToken
        ) {
            const field = this.fields.get(receiver.name.text);
            const operation = callee.name.text;
            if (
                field?.kind !== 'signal' ||
                !['set', 'update'].includes(operation)
            )
                return (
                    this.bad(
                        node,
                        'T11',
                        'only a page signal has set and update'
                    ) || 'invalid'
                );
            this.approveChain(callee);
            if (node.arguments.length !== 1)
                return (
                    this.bad(node, 'T11', `${operation} takes one argument`) ||
                    'invalid'
                );
            const [argument] = node.arguments;
            if (operation === 'set') {
                this.value(argument, scope, mode);
                return 'set';
            }
            if (
                !ts.isArrowFunction(argument) ||
                argument.parameters.length !== 1 ||
                argument.typeParameters ||
                argument.type ||
                argument.modifiers ||
                ts.isBlock(argument.body)
            )
                return (
                    this.bad(argument, 'T11', 'update((p) => expression)') ||
                    'invalid'
                );
            const [parameter] = argument.parameters;
            this.ok(argument);
            this.tokens(
                argument,
                K.OpenParenToken,
                K.CloseParenToken,
                K.EqualsGreaterThanToken
            );
            this.list(argument, argument.parameters);
            this.ok(parameter);
            if (
                parameter.type ||
                parameter.dotDotDotToken ||
                parameter.questionToken ||
                parameter.initializer ||
                parameter.modifiers ||
                !this.identifier(parameter.name, 'T11')
            )
                return (
                    this.bad(parameter, 'T11', 'update parameter is a name') ||
                    'invalid'
                );
            if (
                isPrototypeName(parameter.name.text) ||
                lookup(scope, parameter.name.text)
            )
                this.bad(
                    parameter.name,
                    'T11',
                    'update parameter name refused'
                );
            this.value(
                argument.body,
                childScope(scope, [[parameter.name.text, 'update']]),
                mode
            );
            return 'update';
        }
        return (
            this.bad(node, 'T11', 'call on data or on an unknown receiver') ||
            'invalid'
        );
    },

    // Rappels de `subscribe` : flèches sans paramètre ; hors du chemin
    // synchrone de la soumission, ils suivent la grammaire générale.
    observer(node, scope) {
        const [argument] = node.arguments;
        if (
            node.arguments.length !== 1 ||
            !ts.isObjectLiteralExpression(argument)
        )
            return this.bad(
                node,
                'T11',
                'subscribe({ next, error, complete })'
            );
        this.ok(argument);
        this.tokens(argument, K.OpenBraceToken, K.CloseBraceToken);
        this.list(argument, argument.properties);
        const seen = new Set();
        for (const property of argument.properties) {
            if (
                !ts.isPropertyAssignment(property) ||
                !ts.isIdentifier(property.name) ||
                !SUBSCRIBE_KEYS.has(property.name.text) ||
                seen.has(property.name.text)
            ) {
                this.bad(
                    property,
                    'T11',
                    'observer keys are next, error, complete, once'
                );
                continue;
            }
            seen.add(property.name.text);
            this.ok(property);
            this.tokens(property, K.ColonToken);
            this.identifier(property.name);
            const handler = property.initializer;
            if (
                !ts.isArrowFunction(handler) ||
                handler.parameters.length ||
                handler.typeParameters ||
                handler.type ||
                handler.modifiers
            ) {
                this.bad(handler, 'T11', 'observer is () => …');
                continue;
            }
            this.ok(handler);
            this.tokens(
                handler,
                K.OpenParenToken,
                K.CloseParenToken,
                K.EqualsGreaterThanToken
            );
            if (ts.isBlock(handler.body))
                this.statement(handler.body, childScope(scope), 'general');
            else if (ts.isCallExpression(handler.body))
                this.call(handler.body, childScope(scope), 'general');
            else
                this.bad(
                    handler.body,
                    'T11',
                    'observer body is a call or a block'
                );
        }
    },

    // `calcul_sûr` : un computed dont l'expression est elle-même sans levée.
    safeComputed(name, visiting = new Set()) {
        this.safety ??= new Map();
        if (this.safety.has(name)) return this.safety.get(name);
        const field = this.fields.get(name);
        if (!field?.body || visiting.has(name)) return false;
        visiting.add(name);
        const mark = this.found.length;
        this.value(field.body, { parent: undefined, names: new Map() }, 'safe');
        const safe = this.found.length === mark;
        this.found.length = mark;
        this.safety.set(name, safe);
        return safe;
    },

    // Le graphe des computed est acyclique (une lecture cyclique lève).
    computedGraph() {
        const edges = new Map();
        for (const [name, field] of this.fields) {
            if (field.kind !== 'computed' || !field.body) continue;
            const targets = [];
            const visit = (node) => {
                if (
                    ts.isCallExpression(node) &&
                    ts.isPropertyAccessExpression(node.expression) &&
                    isThis(node.expression.expression)
                )
                    targets.push(node.expression.name.text);
                ts.forEachChild(node, visit);
            };
            visit(field.body);
            edges.set(
                name,
                targets.filter(
                    (target) => this.fields.get(target)?.kind === 'computed'
                )
            );
        }
        const state = new Map();
        const walk = (name) => {
            if (state.get(name) === 'done') return false;
            if (state.get(name) === 'open') return true;
            state.set(name, 'open');
            const cyclic = (edges.get(name) ?? []).some(walk);
            state.set(name, 'done');
            return cyclic;
        };
        for (const name of edges.keys())
            if (walk(name)) {
                this.bad(
                    this.fields.get(name).node,
                    'T9',
                    `computed graph is cyclic at ${name}`
                );
                return;
            }
    },

    // Passe de couverture (T0) : tout nœud et tout jeton approuvés.
    cover(node) {
        for (const child of node.getChildren(this.file)) {
            if (child.kind === K.SyntaxList) {
                this.cover(child);
                continue;
            }
            if (!this.approved.has(child)) {
                this.bad(
                    child,
                    'T0',
                    `${kindName(child.kind)} is not approved`
                );
                continue;
            }
            this.cover(child);
        }
    },
});

// X4-sécurité-3, O-G (v1 §1.2 à §1.6, v2 §3.2) : classe, décorateur, membres,
// instructions, expressions et sept formes d'appel de la page, puis passe de
// couverture. Ajouté au prototype de TypeScriptGrammar.
import ts from 'typescript';

import { isPrototypeName } from './registries.mjs';
import {
    DECORATOR_KEYS,
    HOST_KEY,
    TypeScriptGrammar,
    kindName,
} from './typescript.mjs';

const K = ts.SyntaxKind;
const VISIBILITY = new Map([
    [K.PrivateKeyword, 'private'],
    [K.ProtectedKeyword, 'protected'],
]);

const scopeOf = (parent, entries = []) => ({
    parent,
    names: new Map(entries),
});
function lookup(scope, name) {
    for (let current = scope; current; current = current.parent)
        if (current.names.has(name)) return current.names.get(name);
    return undefined;
}

// Genre d'un champ d'après la seule forme de son initialiseur.
function fieldKind(node) {
    const value = node.initializer;
    if (!value) return 'invalid';
    if (ts.isCallExpression(value) && ts.isIdentifier(value.expression)) {
        const callee = value.expression.text;
        if (callee === 'signal') return 'signal';
        if (callee === 'computed') return 'computed';
        if (callee === 'inject') return 'composition';
    }
    const inner = ts.isAsExpression(value) ? value.expression : value;
    if (
        ts.isObjectLiteralExpression(inner) ||
        ts.isArrayLiteralExpression(inner)
    )
        return 'table';
    return 'invalid';
}

Object.assign(TypeScriptGrammar.prototype, {
    importedFrom(node, name, module) {
        const entry = this.imports.get(name);
        if (
            !ts.isIdentifier(node) ||
            node.text !== name ||
            !entry ||
            entry.module !== module
        )
            return this.bad(
                node,
                'T4',
                `${name} from ${module} is required here`
            );
        return this.identifier(node);
    },

    // ---------------------------------------------------------------- classe
    classDeclaration(node) {
        this.ok(node);
        this.tokens(node, K.ClassKeyword, K.OpenBraceToken, K.CloseBraceToken);
        const modifiers = node.modifiers ?? [];
        if (
            modifiers.length !== 2 ||
            !ts.isDecorator(modifiers[0]) ||
            modifiers[1].kind !== K.ExportKeyword
        )
            this.bad(
                node,
                'T5',
                'class is @Component(...) export class PageComponent'
            );
        else this.ok(modifiers[1]);
        if (node.name?.text !== 'PageComponent' || !this.identifier(node.name))
            this.bad(node.name ?? node, 'T5', 'class name is PageComponent');
        if (node.typeParameters) this.bad(node, 'T5', 'type parameters');
        if (node.heritageClauses)
            this.bad(node.heritageClauses[0], 'T5', 'extends or implements');
        // Première passe : noms et genres des membres, avant toute expression.
        for (const member of node.members) {
            if (
                !ts.isPropertyDeclaration(member) &&
                !ts.isMethodDeclaration(member)
            )
                continue;
            const name = member.name?.text;
            if (
                !ts.isIdentifier(member.name) ||
                this.fields.has(name) ||
                this.methods.has(name)
            ) {
                this.bad(
                    member.name ?? member,
                    'T7',
                    'member name is not unique'
                );
                continue;
            }
            if (ts.isPropertyDeclaration(member))
                this.fields.set(name, {
                    node: member,
                    kind: fieldKind(member),
                });
            else
                this.methods.set(name, {
                    node: member,
                    params: member.parameters.map(
                        (parameter) => parameter.name?.text
                    ),
                });
        }
        const compositions = [...this.fields.values()].filter(
            ({ kind }) => kind === 'composition'
        );
        if (compositions.length > 1)
            this.bad(
                compositions[1].node,
                'T7',
                'only one inject(PageComposition) field'
            );
        this.compositionField = [...this.fields].find(
            ([, field]) => field.kind === 'composition'
        )?.[0];
        if (modifiers[0] && ts.isDecorator(modifiers[0]))
            this.decorator(modifiers[0]);
        for (const member of node.members) {
            if (!this.dispatch('member', member)) continue;
            if (ts.isPropertyDeclaration(member)) this.field(member);
            else this.method(member);
        }
    },

    approveSubtree(node) {
        this.ok(node);
        for (const child of node.getChildren(this.file))
            this.approveSubtree(child);
    },

    modifiersOf(node, expected) {
        const modifiers = node.modifiers ?? [];
        const visibility = VISIBILITY.get(modifiers[0]?.kind);
        const rest = modifiers.slice(1).map((modifier) => modifier.kind);
        if (!visibility || JSON.stringify(rest) !== JSON.stringify(expected)) {
            this.bad(
                node,
                ts.isMethodDeclaration(node) ? 'T8' : 'T7',
                'modifiers are private|protected' +
                    (expected.length ? ' readonly' : '')
            );
            return undefined;
        }
        for (const modifier of modifiers) this.ok(modifier);
        return visibility;
    },

    // --------------------------------------------------------- décorateur
    decorator(node) {
        this.ok(node);
        this.tokens(node, K.AtToken);
        const call = node.expression;
        if (
            !ts.isCallExpression(call) ||
            call.typeArguments ||
            call.arguments.length !== 1
        )
            return this.bad(node, 'T6', 'decorator is @Component({...})');
        this.ok(call);
        this.tokens(call, K.OpenParenToken, K.CloseParenToken);
        this.importedFrom(call.expression, 'Component', '@angular/core');
        const object = call.arguments[0];
        if (!ts.isObjectLiteralExpression(object))
            return this.bad(
                object,
                'T6',
                'decorator argument is an object literal'
            );
        this.ok(object);
        this.tokens(object, K.OpenBraceToken, K.CloseBraceToken);
        this.list(object, object.properties);
        // Clés lues par leur texte, uniques, vérifiées avant toute valeur.
        const entries = new Map();
        let duplicate = false;
        for (const property of object.properties) {
            if (!ts.isPropertyAssignment(property)) {
                this.bad(
                    property,
                    'T6',
                    `${kindName(property.kind)} in @Component`
                );
                continue;
            }
            const key = this.key(property.name, 'T6');
            if (key === undefined) continue;
            if (entries.has(key)) {
                duplicate = true;
                this.bad(
                    property.name,
                    'T6',
                    `duplicate @Component key ${key}`
                );
                continue;
            }
            entries.set(key, property);
        }
        // Clé en double : la page est refusée par T6 sur la clé répétée, et
        // aucune valeur n'est lue. Le sous-arbre est marqué couvert pour que
        // le refus reste situé sur la répétition.
        if (duplicate) return this.approveSubtree(object);
        for (const [key, required] of Object.entries(DECORATOR_KEYS))
            if (required && !entries.has(key))
                this.bad(object, 'T6', `@Component key ${key} is required`);
        for (const [key, property] of entries) {
            if (!Object.hasOwn(DECORATOR_KEYS, key)) {
                this.bad(
                    property.name,
                    'T6',
                    `@Component key ${key} is not allowed`
                );
                continue;
            }
            this.ok(property);
            this.tokens(property, K.ColonToken);
            this.decoratorValue(key, property.initializer);
        }
    },

    exactString(node, expected) {
        if (!this.string(node, 'T6')) return;
        if (node.text !== expected)
            this.bad(node, 'T6', `expected ${JSON.stringify(expected)}`);
    },

    decoratorValue(key, value) {
        if (key === 'selector') {
            this.exactString(value, this.context.selector);
            this.facts.selector = value.text;
        } else if (key === 'templateUrl')
            this.exactString(value, './page.component.html');
        else if (key === 'styleUrl')
            this.exactString(value, './page.component.scss');
        else if (key === 'changeDetection') {
            if (
                !ts.isPropertyAccessExpression(value) ||
                value.questionDotToken ||
                value.name.text !== 'OnPush'
            )
                return this.bad(
                    value,
                    'T6',
                    'changeDetection is ChangeDetectionStrategy.OnPush'
                );
            this.ok(value);
            this.tokens(value, K.DotToken);
            this.identifier(value.name);
            this.importedFrom(
                value.expression,
                'ChangeDetectionStrategy',
                '@angular/core'
            );
        } else if (key === 'providers') {
            if (
                !ts.isArrayLiteralExpression(value) ||
                value.elements.length !== 1
            )
                return this.bad(
                    value,
                    'T6',
                    'providers is [PAGE_COMPOSITION_PROVIDERS]'
                );
            this.ok(value);
            this.tokens(value, K.OpenBracketToken, K.CloseBracketToken);
            this.list(value, value.elements);
            let [element] = value.elements;
            if (ts.isSpreadElement(element)) {
                this.ok(element);
                this.tokens(element, K.DotDotDotToken);
                element = element.expression;
            }
            this.importedFrom(
                element,
                'PAGE_COMPOSITION_PROVIDERS',
                this.context.compositionModule
            );
        } else if (key === 'imports') {
            if (!ts.isArrayLiteralExpression(value))
                return this.bad(value, 'T6', 'imports is an array of names');
            this.ok(value);
            this.tokens(value, K.OpenBracketToken, K.CloseBracketToken);
            this.list(value, value.elements);
            const seen = new Set();
            for (const element of value.elements) {
                const entry = ts.isIdentifier(element)
                    ? this.imports.get(element.text)
                    : undefined;
                if (
                    !entry ||
                    !['@angular/common', '@angular/router'].includes(
                        entry.module
                    ) ||
                    seen.has(element.text)
                ) {
                    this.bad(
                        element,
                        'T6',
                        'imports lists @angular/common pipes and RouterLink, once'
                    );
                    continue;
                }
                seen.add(element.text);
                this.identifier(element);
                this.facts.decoratorImports.push(element.text);
            }
        } else if (key === 'host') {
            if (!ts.isObjectLiteralExpression(value))
                return this.bad(value, 'T6', 'host is an object literal');
            this.ok(value);
            this.tokens(value, K.OpenBraceToken, K.CloseBraceToken);
            this.list(value, value.properties);
            const seen = new Set();
            for (const property of value.properties) {
                if (!ts.isPropertyAssignment(property)) {
                    this.bad(property, 'T6', 'host entry is key: string');
                    continue;
                }
                const hostKey = this.key(property.name, 'T6');
                if (hostKey === undefined) continue;
                if (seen.has(hostKey) || !HOST_KEY.test(hostKey)) {
                    this.bad(
                        property.name,
                        'T6',
                        `host key refused: ${hostKey}`
                    );
                    continue;
                }
                seen.add(hostKey);
                this.ok(property);
                this.tokens(property, K.ColonToken);
                if (!this.string(property.initializer, 'T6')) continue;
                this.facts.host.push({
                    key: hostKey,
                    value: property.initializer.text,
                    start: property.initializer.getStart(this.file) + 1,
                });
            }
        }
    },

    // ----------------------------------------------------------- membres
    field(node) {
        const field = this.fields.get(node.name?.text);
        this.ok(node);
        this.tokens(node, K.EqualsToken, K.SemicolonToken);
        const visibility = this.modifiersOf(node, [K.ReadonlyKeyword]);
        if (field) field.visibility = visibility;
        this.memberName(node.name);
        if (node.questionToken || node.exclamationToken || node.type)
            this.bad(node, 'T7', 'field without ?, ! or type annotation');
        const value = node.initializer;
        if (!value || !field || field.kind === 'invalid')
            return this.bad(
                value ?? node,
                'T7',
                'field is signal(), computed(), inject(PageComposition) or a table'
            );
        if (field.kind === 'table') return this.tableValue(value);
        this.ok(value);
        this.tokens(
            value,
            K.OpenParenToken,
            K.CloseParenToken,
            K.LessThanToken,
            K.GreaterThanToken
        );
        this.list(value, value.typeArguments);
        this.list(value, value.arguments);
        if (value.questionDotToken) this.bad(value, 'T11', 'optional call');
        if (
            (value.typeArguments?.length ?? 0) >
            (field.kind === 'composition' ? 0 : 1)
        )
            this.bad(value, 'T13', 'too many type arguments');
        for (const argument of value.typeArguments ?? []) this.type(argument);
        if (value.arguments.length !== 1)
            return this.bad(value, 'T7', 'initializer takes one argument');
        const [argument] = value.arguments;
        if (field.kind === 'signal') {
            this.importedFrom(value.expression, 'signal', '@angular/core');
            if (
                ts.isAsExpression(argument) ||
                ts.isObjectLiteralExpression(argument) ||
                ts.isArrayLiteralExpression(argument)
            )
                this.tableValue(argument);
            else this.table(argument);
        } else if (field.kind === 'computed') {
            this.importedFrom(value.expression, 'computed', '@angular/core');
            if (
                !ts.isArrowFunction(argument) ||
                argument.parameters.length ||
                argument.typeParameters ||
                argument.type ||
                argument.modifiers ||
                ts.isBlock(argument.body)
            )
                return this.bad(argument, 'T9', 'computed(() => expression)');
            this.ok(argument);
            this.tokens(
                argument,
                K.OpenParenToken,
                K.CloseParenToken,
                K.EqualsGreaterThanToken
            );
            field.body = argument.body;
            this.value(argument.body, scopeOf(undefined), 'general');
        } else {
            this.importedFrom(value.expression, 'inject', '@angular/core');
            this.importedFrom(
                argument,
                'PageComposition',
                this.context.compositionModule
            );
            if (visibility !== 'private')
                this.bad(node, 'T7', 'the composition field is private');
        }
    },

    method(node) {
        const method = this.methods.get(node.name?.text);
        this.ok(node);
        this.tokens(node, K.OpenParenToken, K.CloseParenToken, K.ColonToken);
        const visibility = this.modifiersOf(node, []);
        if (method) method.visibility = visibility;
        this.memberName(node.name);
        if (
            node.asteriskToken ||
            node.questionToken ||
            node.typeParameters ||
            node.exclamationToken
        )
            this.bad(node, 'T8', 'method without *, ?, ! or type parameters');
        if (!node.body)
            return this.bad(node, 'T8', 'method has exactly one body');
        this.list(node, node.parameters);
        const scope = scopeOf(undefined);
        for (const parameter of node.parameters) {
            this.ok(parameter);
            this.tokens(parameter, K.ColonToken);
            this.noModifiers(parameter, 'T8');
            if (
                parameter.dotDotDotToken ||
                parameter.questionToken ||
                parameter.initializer ||
                !parameter.type
            )
                this.bad(parameter, 'T8', 'parameter is name: type');
            if (!this.identifier(parameter.name, 'T8')) continue;
            if (
                isPrototypeName(parameter.name.text) ||
                scope.names.has(parameter.name.text)
            )
                this.bad(parameter.name, 'T8', 'parameter name refused');
            scope.names.set(parameter.name.text, 'parameter');
            if (parameter.type) this.type(parameter.type);
        }
        const returns = node.type
            ? this.type(node.type, { returnType: true })
            : undefined;
        if (returns === 'value')
            this.bad(node.type, 'T8', 'return type is void or false');
        if (method) method.returns = returns;
        this.statement(
            node.body,
            scope,
            returns === 'false' ? 'safe' : 'general',
            { methodBody: true }
        );
    },

    // ------------------------------------------------------ instructions
    statement(node, scope, mode, { methodBody = false, last = false } = {}) {
        if (!this.dispatch('statement', node)) return;
        this.ok(node);
        if (ts.isBlock(node)) {
            this.tokens(node, K.OpenBraceToken, K.CloseBraceToken);
            if (mode === 'safe' && !methodBody && !last)
                return this.bad(
                    node,
                    'S1',
                    'submit path: a block only follows if'
                );
            const inner = scopeOf(scope);
            node.statements.forEach((statement, index) =>
                this.statement(statement, inner, mode, {
                    last: index === node.statements.length - 1,
                })
            );
            if (mode === 'safe') {
                const final = node.statements[node.statements.length - 1];
                if (
                    !final ||
                    !ts.isReturnStatement(final) ||
                    final.expression?.kind !== K.FalseKeyword
                )
                    this.bad(
                        node,
                        'S1',
                        'submit path: every block ends with return false;'
                    );
            }
            return;
        }
        if (ts.isVariableStatement(node)) {
            this.tokens(node, K.SemicolonToken);
            this.noModifiers(node, 'T9');
            const list = node.declarationList;
            this.ok(list);
            this.tokens(list, K.ConstKeyword);
            if (
                !(list.flags & ts.NodeFlags.Const) ||
                list.declarations.length !== 1
            )
                return this.bad(node, 'T9', 'local is one const declaration');
            const [declaration] = list.declarations;
            this.ok(declaration);
            this.tokens(declaration, K.ColonToken, K.EqualsToken);
            if (declaration.exclamationToken || !declaration.initializer)
                return this.bad(declaration, 'T9', 'const name = value;');
            if (declaration.type) this.type(declaration.type);
            this.value(declaration.initializer, scope, mode);
            if (!this.identifier(declaration.name, 'T9')) return;
            const name = declaration.name.text;
            if (
                isPrototypeName(name) ||
                lookup(scope, name) ||
                name === 'undefined'
            )
                this.bad(declaration.name, 'T9', `local name refused: ${name}`);
            scope.names.set(name, 'local');
            return;
        }
        if (ts.isIfStatement(node)) {
            this.tokens(
                node,
                K.IfKeyword,
                K.OpenParenToken,
                K.CloseParenToken,
                K.ElseKeyword
            );
            this.value(node.expression, scope, mode);
            if (mode === 'safe') {
                if (node.elseStatement)
                    this.bad(node.elseStatement, 'S1', 'submit path: no else');
                if (!ts.isBlock(node.thenStatement))
                    return this.bad(
                        node.thenStatement,
                        'S1',
                        'submit path: if (…) { … return false; }'
                    );
                return this.statement(node.thenStatement, scope, mode, {
                    last: true,
                });
            }
            this.statement(node.thenStatement, scope, mode);
            if (node.elseStatement)
                this.statement(node.elseStatement, scope, mode);
            return;
        }
        if (ts.isReturnStatement(node)) {
            this.tokens(node, K.ReturnKeyword, K.SemicolonToken);
            if (mode === 'safe') {
                if (!last || node.expression?.kind !== K.FalseKeyword)
                    return this.bad(
                        node,
                        'S1',
                        'submit path: only a final return false;'
                    );
                return this.ok(node.expression);
            }
            if (node.expression) this.value(node.expression, scope, mode);
            return;
        }
        // Instruction formée d'un seul appel.
        this.tokens(node, K.SemicolonToken);
        if (!ts.isCallExpression(node.expression))
            return this.bad(
                node.expression,
                'T9',
                'a statement is a single call'
            );
        const kind = this.call(node.expression, scope, mode);
        if (mode === 'safe' && !['set', 'update', 'subscribe'].includes(kind))
            this.bad(
                node.expression,
                'S1',
                'submit path: set, update or command subscribe'
            );
    },
});

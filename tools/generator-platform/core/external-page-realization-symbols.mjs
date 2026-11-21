// X4-sécurité 2 : monde fermé par symbole résolu. Chaque référence de la page
// (identifiant, propriété, crochets, élément de déstructuration) est résolue
// par le vérificateur dans le programme réel de la page ; c'est la
// déclaration du symbole qui décide, pas le nom écrit. Sources permises : la
// page, la composition générée, rxjs, et des listes fermées pour Angular, la
// lib ES et la lib DOM. Tout autre symbole, et tout symbole non résolu, est
// refusé.
import { relative, sep } from 'node:path';
import ts from 'typescript';

import { COMPOSITION_NAMES } from './external-page-realization-structure.mjs';

// Lib ES : globaux permis, interfaces dont les membres sont permis, et
// membres refusés malgré leur interface (`*` : toute interface).
export const ES_GLOBALS = Object.freeze([
    'Array',
    'Boolean',
    'Date',
    'Error',
    'Infinity',
    'Intl',
    'JSON',
    'Map',
    'Math',
    'NaN',
    'Number',
    'Object',
    'Promise',
    'RegExp',
    'Set',
    'String',
    'isFinite',
    'isNaN',
    'parseFloat',
    'parseInt',
]);
export const ES_INTERFACES = Object.freeze([
    'Array',
    'ArrayConstructor',
    'ArrayLike',
    'Boolean',
    'ConcatArray',
    'Date',
    'DateConstructor',
    'Error',
    'Intl',
    'Intl.Collator',
    'Intl.DateTimeFormat',
    'Intl.ListFormat',
    'Intl.NumberFormat',
    'Intl.PluralRules',
    'Intl.RelativeTimeFormat',
    'Iterator',
    'IteratorReturnResult',
    'IteratorYieldResult',
    'JSON',
    'Map',
    'Math',
    'Number',
    'NumberConstructor',
    'Object',
    'ObjectConstructor',
    'Promise',
    'PromiseConstructor',
    'PromiseLike',
    'ReadonlyArray',
    'ReadonlyMap',
    'ReadonlySet',
    'RegExp',
    'RegExpExecArray',
    'RegExpMatchArray',
    'Set',
    'String',
]);
export const ES_EXCLUDED = Object.freeze([
    '*.constructor',
    '*.prototype',
    'ObjectConstructor.assign',
    'ObjectConstructor.defineProperties',
    'ObjectConstructor.defineProperty',
    'ObjectConstructor.getOwnPropertyDescriptor',
    'ObjectConstructor.getOwnPropertyDescriptors',
    'ObjectConstructor.getPrototypeOf',
    'ObjectConstructor.setPrototypeOf',
    'StringConstructor.fromCharCode',
    'StringConstructor.fromCodePoint',
    'StringConstructor.raw',
]);

// Lib DOM : seulement ce que la page de référence utilise. Aucun puits de
// navigation, de stockage ou de réseau.
export const DOM_GLOBALS = Object.freeze(['HTMLInputElement', 'navigator']);
export const DOM_MEMBERS = Object.freeze([
    'Event.preventDefault',
    'Event.target',
    'HTMLInputElement.value',
    'KeyboardEvent.key',
    'NavigatorOnLine.onLine',
]);

// Angular, par paquet installé : liste fermée. Les refusés explicites sont
// documentaires (hors de la liste, donc refusés) et vérifiés disjoints.
export const ANGULAR_SYMBOLS = Object.freeze({
    '@angular/common': [
        'AsyncPipe',
        'CurrencyPipe',
        'DatePipe',
        'DecimalPipe',
        'LowerCasePipe',
        'PercentPipe',
        'SlicePipe',
        'TitleCasePipe',
        'UpperCasePipe',
    ],
    '@angular/core': [
        'ChangeDetectionStrategy',
        'ChangeDetectionStrategy.OnPush',
        'ChangeDetectorRef',
        'ChangeDetectorRef.markForCheck',
        'Component',
        'DestroyRef',
        'DestroyRef.onDestroy',
        'Injector',
        'Injector.get',
        'WritableSignal.asReadonly',
        'WritableSignal.set',
        'WritableSignal.update',
        'computed',
        'effect',
        'inject',
        'signal',
        'takeUntilDestroyed',
    ],
    '@angular/router': [
        'Router',
        'Router.navigate',
        'Router.navigateByUrl',
        'RouterLink',
    ],
});
export const ANGULAR_REFUSED = Object.freeze([
    'DOCUMENT',
    'DomSanitizer',
    'ElementRef',
    'Location',
    'PlatformLocation',
    'Renderer2',
    'RendererFactory2',
    'ViewContainerRef',
]);
for (const name of ANGULAR_REFUSED)
    if (Object.values(ANGULAR_SYMBOLS).flat().includes(name))
        throw new Error(`Angular symbol both allowed and refused: ${name}`);

// Jetons que `inject` accepte, en plus de ceux de la composition.
const INJECTABLE = new Set([
    '@angular/core:ChangeDetectorRef',
    '@angular/core:DestroyRef',
    '@angular/core:Injector',
    '@angular/router:Router',
]);
const APPLICATION_PATH = /^\/(?!\/)[A-Za-z0-9_\-/.~%]*$/;

const PACKAGE =
    /[\\/]node_modules[\\/](@angular[\\/][^\\/]+|rxjs|typescript)[\\/](.*)$/;

// Source d'une déclaration : page, composition générée, paquet ou lib.
function sourceOf(declaration, environment) {
    const path = declaration.getSourceFile().fileName;
    if (path === environment.pagePath) return { kind: 'page' };
    const owned = relative(environment.ownedRoot, path);
    if (!owned.startsWith('..') && !owned.startsWith(sep))
        return { kind: 'owned' };
    const found = PACKAGE.exec(path);
    if (!found) return { kind: 'other' };
    const [, name, rest] = found;
    const pkg = name.replaceAll('\\', '/');
    if (pkg === 'typescript') {
        if (/^lib[\\/]lib\.es[\w.]*\.d\.ts$/.test(rest)) return { kind: 'es' };
        if (/^lib[\\/]lib\.dom[\w.]*\.d\.ts$/.test(rest))
            return { kind: 'dom' };
        return { kind: 'other' };
    }
    if (pkg === 'rxjs')
        return /(?:^|[\\/])(?:ajax|fetch)[\\/]/.test(rest)
            ? { kind: 'other' }
            : { kind: 'rxjs' };
    return { kind: 'angular', pkg };
}

const isModule = (symbol) =>
    !symbol || String(symbol.escapedName).startsWith('"');

function describe(checker, symbol, environment) {
    const declaration = symbol.declarations?.[0];
    if (!declaration) return undefined;
    const source = sourceOf(declaration, environment);
    const name = String(symbol.escapedName);
    const owner = isModule(symbol.parent)
        ? undefined
        : checker.getFullyQualifiedName(symbol.parent);
    return { ...source, name, owner, key: owner ? `${owner}.${name}` : name };
}

function allowed(entry) {
    switch (entry.kind) {
        case 'page':
        case 'rxjs':
            return true;
        case 'owned':
            return (
                Boolean(entry.owner) || COMPOSITION_NAMES.includes(entry.name)
            );
        case 'angular':
            return Boolean(ANGULAR_SYMBOLS[entry.pkg]?.includes(entry.key));
        case 'es':
            return entry.owner
                ? ES_INTERFACES.includes(entry.owner) &&
                      !ES_EXCLUDED.includes(entry.key) &&
                      !ES_EXCLUDED.includes(`*.${entry.name}`)
                : ES_GLOBALS.includes(entry.name);
        case 'dom':
            return entry.owner
                ? DOM_MEMBERS.includes(entry.key)
                : DOM_GLOBALS.includes(entry.name);
        default:
            return false;
    }
}

const label = (entry) =>
    entry.kind === 'angular' ? `${entry.pkg}:${entry.key}` : entry.key;

// Type porteur d'un objet de l'hôte (DOM ou autre source non permise).
function hostType(checker, environment, type, depth = 0) {
    if (!type || depth > 3) return false;
    if (type.isUnionOrIntersection())
        return type.types.some((part) =>
            hostType(checker, environment, part, depth + 1)
        );
    const symbol = type.aliasSymbol ?? type.getSymbol();
    if (
        symbol?.declarations?.some((declaration) =>
            ['dom', 'other'].includes(sourceOf(declaration, environment).kind)
        )
    )
        return true;
    if (type.flags & ts.TypeFlags.Object) {
        if (type.objectFlags & ts.ObjectFlags.Reference)
            for (const argument of checker.getTypeArguments(type))
                if (hostType(checker, environment, argument, depth + 1))
                    return true;
        for (const signature of type.getCallSignatures())
            if (
                hostType(
                    checker,
                    environment,
                    signature.getReturnType(),
                    depth + 1
                )
            )
                return true;
    }
    return false;
}

// Chaîne assemblée de valeurs littérales (`+`, gabarit, `join`, `concat`) :
// elle ne sert qu'à masquer un littéral interdit (chemin, adresse).
const ASSEMBLERS = new Set([
    'es:Array.join',
    'es:ReadonlyArray.join',
    'es:String.concat',
]);
const literalType = (type) =>
    (type.isUnion() ? type.types : [type]).every(
        (part) => part.isStringLiteral() || part.isNumberLiteral()
    );

const literalTypes = (type) => {
    const parts = type.isUnion() ? type.types : [type];
    return parts.every(
        (part) => part.isStringLiteral() || part.isNumberLiteral()
    )
        ? parts.map((part) => String(part.value))
        : undefined;
};

// Un objet de l'hôte n'est que lu par un membre listé, comparé ou passé
// entier à une fonction de la page dont le paramètre porte un type DOM.
const TRANSPARENT = new Set([
    ts.SyntaxKind.AmpersandAmpersandToken,
    ts.SyntaxKind.BarBarToken,
    ts.SyntaxKind.QuestionQuestionToken,
]);
const COMPARISON = new Set([
    ts.SyntaxKind.EqualsEqualsEqualsToken,
    ts.SyntaxKind.ExclamationEqualsEqualsToken,
    ts.SyntaxKind.EqualsEqualsToken,
    ts.SyntaxKind.ExclamationEqualsToken,
    ts.SyntaxKind.InstanceOfKeyword,
]);

export function domTypeNode(checker, environment, node) {
    if (ts.isUnionTypeNode(node))
        return (
            node.types.some((part) => !ts.isLiteralTypeNode(part)) &&
            node.types.every(
                (part) =>
                    ts.isLiteralTypeNode(part) ||
                    part.kind === ts.SyntaxKind.UndefinedKeyword ||
                    domTypeNode(checker, environment, part)
            )
        );
    if (!ts.isTypeReferenceNode(node) || node.typeArguments) return false;
    // Une interface DOM peut être augmentée par un paquet permis (Angular
    // ajoute un membre à `Event`), jamais par la page.
    const kinds = (
        checker.getSymbolAtLocation(node.typeName)?.declarations ?? []
    ).map((declaration) => sourceOf(declaration, environment).kind);
    return (
        kinds.includes('dom') &&
        kinds.every((kind) => ['dom', 'angular', 'rxjs', 'es'].includes(kind))
    );
}

function hostContext(checker, environment, node) {
    let top = node;
    for (;;) {
        const parent = top.parent;
        if (
            ts.isParenthesizedExpression(parent) ||
            ts.isNonNullExpression(parent) ||
            (ts.isConditionalExpression(parent) && parent.condition !== top) ||
            (ts.isBinaryExpression(parent) &&
                TRANSPARENT.has(parent.operatorToken.kind))
        )
            top = parent;
        else break;
    }
    const parent = top.parent;
    if (
        (ts.isPropertyAccessExpression(parent) ||
            ts.isElementAccessExpression(parent)) &&
        parent.expression === top
    )
        return true;
    if (ts.isCallExpression(parent) && parent.expression === top) return true;
    if (
        ts.isBinaryExpression(parent) &&
        COMPARISON.has(parent.operatorToken.kind)
    )
        return true;
    if (
        ts.isTypeOfExpression(parent) ||
        ts.isVoidExpression(parent) ||
        ts.isExpressionStatement(parent) ||
        (ts.isPrefixUnaryExpression(parent) &&
            parent.operator === ts.SyntaxKind.ExclamationToken) ||
        ((ts.isIfStatement(parent) ||
            ts.isWhileStatement(parent) ||
            ts.isDoStatement(parent)) &&
            parent.expression === top) ||
        (ts.isConditionalExpression(parent) && parent.condition === top)
    )
        return true;
    if (
        ts.isVariableDeclaration(parent) &&
        parent.initializer === top &&
        !parent.type
    )
        return true;
    if (ts.isCallExpression(parent) && parent.arguments.includes(top)) {
        const declaration = checker.getResolvedSignature(parent)?.declaration;
        const index = parent.arguments.indexOf(top);
        const parameter = declaration?.parameters?.[index];
        return Boolean(
            declaration &&
            declaration.getSourceFile().fileName === environment.pagePath &&
            parameter?.type &&
            !parameter.dotDotDotToken &&
            domTypeNode(checker, environment, parameter.type)
        );
    }
    return false;
}

const VALUE_EXCLUDED = new Set([
    ts.SyntaxKind.PropertyAssignment,
    ts.SyntaxKind.PropertyDeclaration,
    ts.SyntaxKind.MethodDeclaration,
    ts.SyntaxKind.GetAccessor,
    ts.SyntaxKind.SetAccessor,
    ts.SyntaxKind.Parameter,
    ts.SyntaxKind.VariableDeclaration,
    ts.SyntaxKind.FunctionDeclaration,
    ts.SyntaxKind.ClassDeclaration,
    ts.SyntaxKind.TypeAliasDeclaration,
    ts.SyntaxKind.InterfaceDeclaration,
    ts.SyntaxKind.TypeParameter,
    ts.SyntaxKind.EnumDeclaration,
    ts.SyntaxKind.EnumMember,
    ts.SyntaxKind.LabeledStatement,
    ts.SyntaxKind.BreakStatement,
    ts.SyntaxKind.ContinueStatement,
    ts.SyntaxKind.ImportClause,
    ts.SyntaxKind.NamespaceImport,
]);

function valueIdentifier(node) {
    const parent = node.parent;
    if (ts.isPropertyAccessExpression(parent) && parent.name === node)
        return false;
    if (ts.isQualifiedName(parent) || ts.isMetaProperty(parent)) return false;
    if (VALUE_EXCLUDED.has(parent.kind) && parent.name === node) return false;
    if (ts.isBindingElement(parent)) return false;
    if (ts.isImportSpecifier(parent)) return parent.name === node;
    if (ts.isExportSpecifier(parent)) return false;
    for (let current = parent; current; current = current.parent) {
        if (ts.isTypeNode(current) || ts.isHeritageClause(current))
            return (
                ts.isHeritageClause(current) &&
                current.token === ts.SyntaxKind.ExtendsKeyword &&
                ts.isClassLike(current.parent)
            );
        if (ts.isStatement(current) || ts.isClassElement(current)) break;
    }
    return true;
}

// Violations de la page dans son programme. `opaque` : appels du gabarit
// qui passent `$event` ou une référence entière ({ method, index }).
export function symbolViolations({
    name,
    checker,
    file,
    environment,
    opaque = [],
}) {
    const violations = [];
    const add = (text) => {
        if (!violations.includes(text)) violations.push(text);
    };
    const host = (type) => hostType(checker, environment, type);
    const refuse = (entry) =>
        add(`symbol not allowed in ${name}: ${entry.kind} ${label(entry)}`);
    const resolved = (symbol) =>
        symbol && symbol.flags & ts.SymbolFlags.Alias
            ? checker.getAliasedSymbol(symbol)
            : symbol;
    const member = (symbol, receiver, text) => {
        if (!symbol) {
            if (
                receiver &&
                !host(receiver) &&
                checker.getIndexInfosOfType(receiver).length
            )
                return;
            add(`unresolved symbol in ${name}: ${text}`);
            return;
        }
        for (const root of checker.getRootSymbols(symbol)) {
            const entry = describe(checker, root, environment);
            if (!entry) {
                // Propriété synthétique (type projeté) : donnée de la page,
                // jamais sur un objet de l'hôte.
                if (!receiver || host(receiver))
                    add(`unresolved symbol in ${name}: ${text}`);
                continue;
            }
            if (!allowed(entry)) refuse(entry);
        }
    };
    const keyed = (receiver, keys, text) => {
        if (!keys) {
            add(`computed key without a literal type forbidden in ${name}`);
            return;
        }
        for (const key of keys)
            member(
                receiver.getProperty(key) ??
                    checker.getPropertyOfType(receiver, key),
                receiver,
                `${text}[${key}]`
            );
    };
    const rootKey = (expression) => {
        const symbol = checker.getSymbolAtLocation(
            ts.isPropertyAccessExpression(expression)
                ? expression.name
                : expression
        );
        const [root] = symbol ? checker.getRootSymbols(resolved(symbol)) : [];
        const entry = root && describe(checker, root, environment);
        return entry && `${entry.pkg ?? entry.kind}:${entry.key}`;
    };
    const token = (argument) => {
        const symbol = resolved(
            argument && ts.isIdentifier(argument)
                ? checker.getSymbolAtLocation(argument)
                : undefined
        );
        const entry = symbol && describe(checker, symbol, environment);
        return entry && `${entry.pkg ?? entry.kind}:${entry.key}`;
    };
    const visit = (node) => {
        if (ts.isTypePredicateNode(node))
            add(`type predicate forbidden in ${name}`);
        if (
            ts.isBinaryExpression(node) &&
            node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            (ts.isObjectLiteralExpression(node.left) ||
                ts.isArrayLiteralExpression(node.left))
        )
            add(`destructuring assignment forbidden in ${name}`);
        const literal = (child) =>
            literalType(checker.getTypeAtLocation(child));
        if (
            (ts.isBinaryExpression(node) &&
                node.operatorToken.kind === ts.SyntaxKind.PlusToken &&
                literal(node.left) &&
                literal(node.right)) ||
            (ts.isTemplateExpression(node) &&
                node.templateSpans.every((span) => literal(span.expression))) ||
            (ts.isCallExpression(node) &&
                ts.isPropertyAccessExpression(node.expression) &&
                ASSEMBLERS.has(rootKey(node.expression)) &&
                node.arguments.every(literal) &&
                (ts.isArrayLiteralExpression(node.expression.expression)
                    ? node.expression.expression.elements.every(literal)
                    : literal(node.expression.expression)))
        )
            add(`string assembled from literals forbidden in ${name}`);
        if (
            (ts.isPropertyAssignment(node) ||
                ts.isShorthandPropertyAssignment(node)) &&
            node.name.getText(file).replace(/^['"]|['"]$/g, '') === '__proto__'
        )
            add(`prototype assignment forbidden in ${name}`);
        const expression =
            (ts.isIdentifier(node) && valueIdentifier(node)) ||
            ts.isPropertyAccessExpression(node) ||
            ts.isElementAccessExpression(node) ||
            ts.isCallExpression(node) ||
            ts.isNewExpression(node);
        if (expression) {
            const type = checker.getTypeAtLocation(node);
            if (type.flags & ts.TypeFlags.Any)
                add(`expression of type any forbidden in ${name}`);
            else if (
                host(type) &&
                !ts.isImportSpecifier(node.parent) &&
                !hostContext(checker, environment, node)
            )
                add(
                    `host object used outside a listed member access in ${name}`
                );
        }
        if (ts.isIdentifier(node) && valueIdentifier(node)) {
            const symbol = resolved(
                ts.isShorthandPropertyAssignment(node.parent)
                    ? checker.getShorthandAssignmentValueSymbol(node.parent)
                    : checker.getSymbolAtLocation(node)
            );
            const entry = symbol && describe(checker, symbol, environment);
            if (
                !entry &&
                !(
                    symbol?.escapedName === 'undefined' &&
                    node.text === 'undefined'
                )
            )
                add(`unresolved symbol in ${name}: ${node.text}`);
            else if (entry && !allowed(entry)) refuse(entry);
        }
        if (ts.isPropertyAccessExpression(node))
            member(
                checker.getSymbolAtLocation(node.name),
                checker.getTypeAtLocation(node.expression),
                node.name.text
            );
        if (ts.isElementAccessExpression(node))
            keyed(
                checker.getTypeAtLocation(node.expression),
                literalTypes(
                    checker.getTypeAtLocation(node.argumentExpression)
                ),
                '[]'
            );
        if (
            ts.isBindingElement(node) &&
            ts.isObjectBindingPattern(node.parent)
        ) {
            const source = checker.getTypeAtLocation(node.parent);
            if (node.dotDotDotToken) {
                if (host(source))
                    add(
                        `host object used outside a listed member access in ${name}`
                    );
            } else {
                const key = node.propertyName ?? node.name;
                keyed(
                    source,
                    ts.isComputedPropertyName(key)
                        ? literalTypes(
                              checker.getTypeAtLocation(key.expression)
                          )
                        : [key.text],
                    '{}'
                );
            }
        }
        if (
            ts.isArrayBindingPattern(node) &&
            host(checker.getTypeAtLocation(node))
        )
            add(`host object used outside a listed member access in ${name}`);
        if (ts.isCallExpression(node)) {
            const callee = rootKey(node.expression);
            const [first] = node.arguments;
            if (
                callee === '@angular/core:Injector.get' &&
                token(first) !== 'owned:PageComposition'
            )
                add(
                    `injector lookup forbidden in ${name}: only composition tokens`
                );
            if (
                callee === '@angular/core:inject' &&
                token(first) !== 'owned:PageComposition' &&
                !INJECTABLE.has(token(first))
            )
                add(
                    `inject forbidden in ${name}: only composition tokens, Injector, ChangeDetectorRef, DestroyRef and Router`
                );
            if (
                callee === '@angular/router:Router.navigateByUrl' ||
                callee === '@angular/router:Router.navigate'
            ) {
                const path =
                    callee.endsWith('navigate') &&
                    first &&
                    ts.isArrayLiteralExpression(first)
                        ? first.elements[0]
                        : first;
                const literal =
                    node.arguments.length === 1 &&
                    path &&
                    ts.isStringLiteral(path) &&
                    APPLICATION_PATH.test(path.text) &&
                    (!ts.isArrayLiteralExpression(first) ||
                        first.elements.every(ts.isStringLiteral));
                if (!literal)
                    add(
                        `router navigation must use one literal application path in ${name}`
                    );
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(file);
    // `$event` et les références passées par le gabarit : paramètre typé DOM.
    const component = file.statements.find(
        (statement) =>
            ts.isClassDeclaration(statement) &&
            ts.getDecorators(statement)?.length
    );
    for (const { method, index } of opaque) {
        const declaration = component?.members.find(
            (entry) =>
                ts.isMethodDeclaration(entry) &&
                entry.name.getText(file) === method
        );
        const parameter = declaration?.parameters[index];
        if (
            !parameter?.type ||
            parameter.dotDotDotToken ||
            !domTypeNode(checker, environment, parameter.type)
        )
            add(
                `component method must type its $event or reference parameter with a DOM type in ${name}: ${method}`
            );
    }
    return violations;
}

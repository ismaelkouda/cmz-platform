// X4-sécurité-3, O-G et O-C : grammaire fermée de `page.component.ts`
// (conception v1 §1, v2 §3 à §5). Le fichier est lu par le seul analyseur
// (`ts.createSourceFile`), sans programme ni vérificateur de types. Chaque
// production approuve son nœud et ses jetons ; une seconde passe exige que
// tout nœud et tout jeton de `getChildren` soient approuvés (T0). Les puits du
// navigateur sont inexprimables : aucun global n'est nommable, il n'existe que
// sept formes d'appel, et seuls les chemins publiés de la composition sont
// atteignables.
import ts from 'typescript';

import { isPrototypeName, typescriptKinds } from './registries.mjs';
import { characterViolations, triviaViolations, violation } from './text.mjs';

const K = ts.SyntaxKind;
const KIND_NAMES = typescriptKinds();
// Nom canonique d'un genre (jamais un marqueur `First*` ou `Last*`).
export const kindName = (kind) => KIND_NAMES.get(kind) ?? String(kind);

// Noms importables, chacun à sa position fixe (T4).
export const IMPORTS = Object.freeze({
    '@angular/core': Object.freeze([
        'ChangeDetectionStrategy',
        'Component',
        'computed',
        'inject',
        'signal',
    ]),
    '@angular/common': Object.freeze([
        'CurrencyPipe',
        'DatePipe',
        'DecimalPipe',
        'LowerCasePipe',
        'PercentPipe',
        'SlicePipe',
        'TitleCasePipe',
        'UpperCasePipe',
    ]),
    '@angular/router': Object.freeze(['RouterLink']),
});
export const COMPOSITION_IMPORTS = Object.freeze([
    'PAGE_COMPOSITION_PROVIDERS',
    'PageComposition',
]);
// Clés de `@Component` (T6) : requises ou non.
export const DECORATOR_KEYS = Object.freeze({
    selector: true,
    changeDetection: true,
    templateUrl: true,
    styleUrl: true,
    providers: true,
    imports: false,
    host: false,
});
export const HOST_KEY =
    /^(?:class|role|\[class\.[a-z][a-z0-9-]*\]|\[attr\.aria-[a-z]+\])$/;
// Opérateurs binaires : général (T10), puis chemin de soumission (S2).
export const BINARY_OPERATORS = Object.freeze([
    K.EqualsEqualsEqualsToken,
    K.ExclamationEqualsEqualsToken,
    K.LessThanToken,
    K.LessThanEqualsToken,
    K.GreaterThanToken,
    K.GreaterThanEqualsToken,
    K.AmpersandAmpersandToken,
    K.BarBarToken,
    K.QuestionQuestionToken,
    K.PlusToken,
    K.MinusToken,
    K.AsteriskToken,
    K.SlashToken,
    K.PercentToken,
]);

// Tables de dispatch par contexte : tout genre absent est refusé (T0). Elles
// sont publiées dans le bon de travail et épinglées par les tests.
export const TYPESCRIPT_PRODUCTIONS = Object.freeze({
    module: Object.freeze([
        'ImportDeclaration',
        'TypeAliasDeclaration',
        'VariableStatement',
        'ClassDeclaration',
    ]),
    member: Object.freeze(['PropertyDeclaration', 'MethodDeclaration']),
    statement: Object.freeze([
        'Block',
        'ExpressionStatement',
        'IfStatement',
        'ReturnStatement',
        'VariableStatement',
    ]),
    expression: Object.freeze([
        'ArrayLiteralExpression',
        'BinaryExpression',
        'CallExpression',
        'ConditionalExpression',
        'ElementAccessExpression',
        'FalseKeyword',
        'Identifier',
        'NullKeyword',
        'NumericLiteral',
        'ObjectLiteralExpression',
        'ParenthesizedExpression',
        'PrefixUnaryExpression',
        'PropertyAccessExpression',
        'StringLiteral',
        'TrueKeyword',
    ]),
    type: Object.freeze([
        'BooleanKeyword',
        'LiteralType',
        'NumberKeyword',
        'StringKeyword',
        'TypeOperator',
        'TypeReference',
        'UndefinedKeyword',
        'UnionType',
    ]),
    table: Object.freeze([
        'ArrayLiteralExpression',
        'FalseKeyword',
        'NullKeyword',
        'NumericLiteral',
        'ObjectLiteralExpression',
        'StringLiteral',
        'TrueKeyword',
    ]),
});
const TABLES = Object.fromEntries(
    Object.entries(TYPESCRIPT_PRODUCTIONS).map(([context, names]) => [
        context,
        new Set(names.map((name) => K[name])),
    ])
);

const ASCII_NAME = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const STRING_TEXT = /^(?:'[^'\\\n\r]*'|"[^"\\\n\r]*")$/;

export class TypeScriptGrammar {
    constructor({ name, text, context }) {
        this.name = name;
        this.text = text;
        this.context = context;
        this.file = ts.createSourceFile(
            name,
            text,
            ts.ScriptTarget.Latest,
            true,
            ts.ScriptKind.TS
        );
        this.approved = new Set();
        this.found = [];
        this.imports = new Map();
        this.aliases = new Set();
        this.tables = new Set();
        this.fields = new Map();
        this.methods = new Map();
        this.facts = {
            selector: undefined,
            decoratorImports: [],
            host: [],
        };
    }

    bad(node, code, message) {
        const start =
            node.pos === node.end ? node.pos : node.getStart(this.file);
        this.found.push(
            violation(code, this.name, this.text, start, node.end, message)
        );
        return false;
    }

    ok(node) {
        this.approved.add(node);
        return true;
    }

    // Jetons enfants directs (mots-clés, ponctuation) permis par la production.
    tokens(node, ...kinds) {
        for (const child of node.getChildren(this.file))
            if (
                child.getChildCount(this.file) === 0 &&
                kinds.includes(child.kind)
            )
                this.approved.add(child);
    }

    // Liste : ses séparateurs, virgule finale comprise.
    list(node, array, separator = K.CommaToken) {
        if (!array) return;
        for (const child of node.getChildren(this.file))
            if (
                child.kind === K.SyntaxList &&
                child.pos === array.pos &&
                child.end === array.end
            )
                for (const token of child.getChildren(this.file))
                    if (token.kind === separator) this.approved.add(token);
    }

    dispatch(context, node) {
        if (TABLES[context].has(node.kind)) return true;
        return this.bad(
            node,
            'T0',
            `${kindName(node.kind)} is not allowed as ${context}`
        );
    }

    identifier(node, code = 'T2') {
        if (!ts.isIdentifier(node))
            return this.bad(node, code, `${kindName(node.kind)} is not a name`);
        if (!ASCII_NAME.test(node.getText(this.file)))
            return this.bad(node, 'T2', 'name must be ASCII without escape');
        return this.ok(node);
    }

    memberName(node) {
        if (!this.identifier(node, 'T7')) return false;
        if (node.text.startsWith('ng') || isPrototypeName(node.text))
            return this.bad(node, 'T7', `member name refused: ${node.text}`);
        return true;
    }

    string(node, code = 'T2') {
        if (!ts.isStringLiteral(node))
            return this.bad(
                node,
                code,
                `${kindName(node.kind)} is not a string literal`
            );
        if (!STRING_TEXT.test(node.getText(this.file)))
            return this.bad(
                node,
                'T2',
                'string literal must be quoted without backslash'
            );
        return this.ok(node);
    }

    noModifiers(node, code) {
        if (node.modifiers?.length)
            return this.bad(node.modifiers[0], code, 'modifier not allowed');
        return true;
    }

    // ---------------------------------------------------------------- types
    type(node, { returnType = false } = {}) {
        if (returnType && node.kind === K.VoidKeyword) {
            this.ok(node);
            return 'void';
        }
        if (
            returnType &&
            ts.isLiteralTypeNode(node) &&
            node.literal.kind === K.FalseKeyword
        ) {
            this.ok(node);
            this.ok(node.literal);
            return 'false';
        }
        if (!this.dispatch('type', node)) return undefined;
        this.ok(node);
        if (ts.isLiteralTypeNode(node)) {
            const literal = node.literal;
            if (ts.isStringLiteral(literal)) this.string(literal, 'T13');
            else if (
                [K.NullKeyword, K.TrueKeyword, K.NumericLiteral].includes(
                    literal.kind
                )
            )
                this.ok(literal);
            else
                this.bad(
                    literal,
                    'T13',
                    `${kindName(literal.kind)} type literal`
                );
        } else if (ts.isUnionTypeNode(node)) {
            this.tokens(node, K.BarToken);
            this.list(node, node.types, K.BarToken);
            for (const member of node.types) this.type(member);
        } else if (ts.isTypeOperatorNode(node)) {
            this.tokens(node, K.ReadonlyKeyword);
            if (
                node.operator !== K.ReadonlyKeyword ||
                !ts.isArrayTypeNode(node.type)
            )
                this.bad(node, 'T13', 'only readonly T[] is allowed');
            else {
                this.ok(node.type);
                this.tokens(node.type, K.OpenBracketToken, K.CloseBracketToken);
                this.type(node.type.elementType);
            }
        } else if (ts.isTypeReferenceNode(node)) {
            this.tokens(node, K.LessThanToken, K.GreaterThanToken);
            this.list(node, node.typeArguments);
            const target = node.typeName;
            if (!ts.isIdentifier(target))
                return this.bad(target, 'T13', 'qualified type name');
            this.identifier(target);
            const count = node.typeArguments?.length ?? 0;
            if (target.text === 'Readonly' && count === 1) {
                /* Readonly<T> */
            } else if (target.text === 'Record' && count === 2) {
                /* Record<K, T> */
            } else if (this.aliases.has(target.text) && count === 0) {
                /* alias du module */
            } else
                return this.bad(
                    node,
                    'T13',
                    `type ${target.text} is not allowed`
                );
            for (const argument of node.typeArguments ?? [])
                this.type(argument);
        }
        return 'value';
    }

    // ----------------------------------------------------------- constantes
    // Littéral à feuilles littérales : chaîne, nombre, booléen ou null (§1.2).
    table(node) {
        if (!this.dispatch('table', node)) return false;
        this.ok(node);
        if (ts.isStringLiteral(node)) return this.string(node);
        if (ts.isObjectLiteralExpression(node)) {
            this.tokens(node, K.OpenBraceToken, K.CloseBraceToken);
            this.list(node, node.properties);
            const keys = new Set();
            for (const property of node.properties) {
                if (!ts.isPropertyAssignment(property)) {
                    this.bad(
                        property,
                        'T3',
                        'table entry must be key: literal'
                    );
                    continue;
                }
                this.ok(property);
                this.tokens(property, K.ColonToken);
                const key = this.key(property.name, 'T3');
                if (key === undefined) continue;
                if (keys.has(key) || isPrototypeName(key))
                    this.bad(property.name, 'T3', `table key refused: ${key}`);
                keys.add(key);
                this.table(property.initializer);
            }
        } else if (ts.isArrayLiteralExpression(node)) {
            this.tokens(node, K.OpenBracketToken, K.CloseBracketToken);
            this.list(node, node.elements);
            for (const element of node.elements) this.table(element);
        }
        return true;
    }

    // Clé lue par son texte : identifiant ou chaîne.
    key(node, code) {
        if (ts.isIdentifier(node))
            return this.identifier(node) ? node.text : undefined;
        if (ts.isStringLiteral(node))
            return this.string(node) ? node.text : undefined;
        this.bad(node, code, `${kindName(node.kind)} key`);
        return undefined;
    }

    // ---------------------------------------------------------------- module
    check() {
        const file = this.file;
        this.ok(file);
        this.tokens(file, K.EndOfFileToken);
        const order = [
            K.ImportDeclaration,
            K.TypeAliasDeclaration,
            K.VariableStatement,
            K.ClassDeclaration,
        ];
        let rank = 0;
        let classes = 0;
        for (const statement of file.statements) {
            if (!this.dispatch('module', statement)) continue;
            const position = order.indexOf(statement.kind);
            if (position < rank)
                this.bad(
                    statement,
                    'T3',
                    'module order is imports, type aliases, tables, class'
                );
            rank = Math.max(rank, position);
            if (ts.isImportDeclaration(statement))
                this.importDeclaration(statement);
            else if (ts.isTypeAliasDeclaration(statement))
                this.alias(statement);
            else if (ts.isVariableStatement(statement))
                this.moduleTable(statement);
            else if (++classes > 1)
                this.bad(
                    statement,
                    'T5',
                    'the module declares exactly one class'
                );
            else this.classDeclaration(statement);
        }
        if (classes === 0)
            this.bad(file, 'T5', 'the module declares exactly one class');
        this.computedGraph();
        this.cover(file);
        this.found.push(...triviaViolations(file, this.name));
        this.found.push(...characterViolations(this.name, this.text));
        for (const diagnostic of file.parseDiagnostics ?? [])
            this.found.push(
                violation(
                    'T0',
                    this.name,
                    this.text,
                    diagnostic.start ?? 0,
                    (diagnostic.start ?? 0) + (diagnostic.length ?? 0),
                    `parser diagnostic TS${diagnostic.code}`
                )
            );
        return this;
    }

    importDeclaration(node) {
        this.ok(node);
        this.tokens(node, K.ImportKeyword, K.FromKeyword, K.SemicolonToken);
        this.noModifiers(node, 'T4');
        if (node.attributes)
            this.bad(node.attributes, 'T4', 'import attributes');
        if (!this.string(node.moduleSpecifier, 'T4')) return;
        const module = node.moduleSpecifier.text;
        const allowed =
            module === this.context.compositionModule
                ? COMPOSITION_IMPORTS
                : IMPORTS[module];
        if (!allowed)
            return this.bad(
                node.moduleSpecifier,
                'T4',
                `module ${module} is not allowed`
            );
        if ([...this.imports.values()].some((entry) => entry.module === module))
            this.bad(
                node.moduleSpecifier,
                'T4',
                `module ${module} imported twice`
            );
        const clause = node.importClause;
        if (!clause || clause.isTypeOnly || clause.name || clause.phaseModifier)
            return this.bad(
                node,
                'T4',
                'import must be named, without default or type'
            );
        this.ok(clause);
        const named = clause.namedBindings;
        if (!named || !ts.isNamedImports(named))
            return this.bad(clause, 'T4', 'import must use named bindings');
        this.ok(named);
        this.tokens(named, K.OpenBraceToken, K.CloseBraceToken);
        this.list(named, named.elements);
        for (const specifier of named.elements) {
            this.ok(specifier);
            if (specifier.isTypeOnly || specifier.propertyName)
                this.bad(specifier, 'T4', 'import alias or type modifier');
            if (!this.identifier(specifier.name, 'T4')) continue;
            const imported = specifier.name.text;
            if (!allowed.includes(imported) || this.imports.has(imported))
                this.bad(
                    specifier,
                    'T4',
                    `import ${imported} from ${module} is not allowed`
                );
            else this.imports.set(imported, { module, node: specifier.name });
        }
    }

    alias(node) {
        this.ok(node);
        this.tokens(node, K.TypeKeyword, K.EqualsToken, K.SemicolonToken);
        this.noModifiers(node, 'T3');
        if (node.typeParameters) this.bad(node, 'T3', 'generic type alias');
        if (!this.identifier(node.name)) return;
        if (
            this.aliases.has(node.name.text) ||
            this.imports.has(node.name.text)
        )
            this.bad(node.name, 'T3', 'duplicate name');
        const literal = (type) =>
            ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal);
        const types = ts.isUnionTypeNode(node.type)
            ? node.type.types
            : [node.type];
        if (!types.every(literal))
            this.bad(node.type, 'T3', "type alias must be 'a' | 'b' | …");
        else this.type(node.type);
        this.aliases.add(node.name.text);
    }

    moduleTable(node) {
        this.ok(node);
        this.tokens(node, K.SemicolonToken);
        this.noModifiers(node, 'T3');
        const declarations = node.declarationList;
        this.ok(declarations);
        this.tokens(declarations, K.ConstKeyword);
        if (
            !(declarations.flags & ts.NodeFlags.Const) ||
            declarations.declarations.length !== 1
        )
            return this.bad(
                node,
                'T3',
                'module table is one const declaration'
            );
        const [declaration] = declarations.declarations;
        this.ok(declaration);
        this.tokens(declaration, K.ColonToken, K.EqualsToken);
        if (!this.identifier(declaration.name, 'T3')) return;
        const name = declaration.name.text;
        if (
            isPrototypeName(name) ||
            this.tables.has(name) ||
            this.imports.has(name)
        )
            this.bad(declaration.name, 'T3', `table name refused: ${name}`);
        if (declaration.exclamationToken)
            this.bad(declaration, 'T3', 'definite assignment');
        if (declaration.type) this.type(declaration.type);
        const initializer = declaration.initializer;
        if (!initializer)
            return this.bad(declaration, 'T3', 'table without value');
        this.tableValue(initializer);
        this.tables.add(name);
    }

    tableValue(initializer) {
        if (ts.isAsExpression(initializer)) {
            this.ok(initializer);
            this.tokens(initializer, K.AsKeyword);
            if (!ts.isConstTypeReference(initializer.type))
                return this.bad(
                    initializer.type,
                    'T10',
                    'only as const is allowed on a table'
                );
            this.ok(initializer.type);
            this.ok(initializer.type.typeName);
            initializer = initializer.expression;
        }
        if (
            !ts.isObjectLiteralExpression(initializer) &&
            !ts.isArrayLiteralExpression(initializer)
        )
            return this.bad(
                initializer,
                'T3',
                'table must be an object or array literal'
            );
        return this.table(initializer);
    }
}

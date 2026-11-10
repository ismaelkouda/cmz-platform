// X4-sécurité : contrôles structurels d'une réalisation de page extérieure.
// Ils ferment ce que la politique de sécurité de contenu de la coque ne voit
// pas (navigation, stockage, accès au document, usage détourné de la
// composition, sélecteurs inventés). Le réseau, les scripts en ligne, le code
// dynamique et les ressources d'autres origines sont gouvernés par cette
// politique, mesurée dans le navigateur. Ce sont des listes : elles sont
// écrites comme telles et publiées dans le bon de travail.
import * as angular from '@angular/compiler';
import ts from 'typescript';

// Noms que la page peut importer depuis sa composition (I-2) : la page la
// monte et l'obtient ; elle n'atteint jamais un nœud de commande.
export const COMPOSITION_NAMES = Object.freeze([
    'PAGE_COMPOSITION_PROVIDERS',
    'PageComposition',
]);

// Noms refusés depuis les paquets permis : accès direct au document, au rendu
// ou à la navigation hors routeur.
export const FORBIDDEN_IMPORT_NAMES = Object.freeze({
    '@angular/core': [
        'DOCUMENT',
        'ElementRef',
        'Renderer2',
        'RendererFactory2',
    ],
    '@angular/common': [
        'DOCUMENT',
        'HashLocationStrategy',
        'Location',
        'LocationStrategy',
        'NgOptimizedImage',
        'PathLocationStrategy',
        'PlatformLocation',
    ],
});

// Globaux permis à la page ; tout autre global est refusé. `navigator` n'est
// permis que pour `navigator.onLine` et `typeof navigator`.
export const ALLOWED_GLOBALS = Object.freeze([
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
    'undefined',
]);

// Propriétés refusées sur tout objet, en TypeScript et dans le gabarit : elles
// mènent au document, à la fenêtre, à la navigation, au stockage, à l'écriture
// HTML ou d'attributs, ou à un constructeur.
export const DENIED_PROPERTIES = Object.freeze([
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__proto__',
    'action',
    'attributes',
    'caches',
    'constructor',
    'contentDocument',
    'contentWindow',
    'cookie',
    'createElement',
    'createElementNS',
    'dataset',
    'defaultView',
    'document',
    'eval',
    'fetch',
    'formAction',
    'frames',
    'getAttributeNode',
    'globalThis',
    'href',
    'importScripts',
    'indexedDB',
    'innerHTML',
    'insertAdjacentHTML',
    'localStorage',
    'location',
    'nativeElement',
    'open',
    'opener',
    'outerHTML',
    'ownerDocument',
    'parent',
    'ping',
    'postMessage',
    'poster',
    'prototype',
    'sendBeacon',
    'serviceWorker',
    'sessionStorage',
    'setAttribute',
    'setAttributeNS',
    'setAttributeNode',
    'src',
    'srcdoc',
    'srcset',
    'top',
    'window',
]);

// Gabarit : éléments refusés, attributs porteurs de ressource ou de navigation.
export const FORBIDDEN_ELEMENTS = Object.freeze([
    'applet',
    'base',
    'embed',
    'frame',
    'frameset',
    'iframe',
    'link',
    'meta',
    'object',
    'portal',
    'script',
    'style',
]);
export const RESOURCE_ATTRIBUTES = Object.freeze([
    'action',
    'archive',
    'background',
    'classid',
    'codebase',
    'data',
    'formaction',
    'href',
    'longdesc',
    'lowsrc',
    'manifest',
    'ngsrc',
    'ngsrcset',
    'ping',
    'poster',
    'src',
    'srcdoc',
    'srcset',
    'xlink:href',
]);
const HTML_PROPERTIES = new Set(['innerhtml', 'outerhtml', 'routerlink']);
// Seules valeurs statiques permises pour ces attributs : un fragment de la page
// (lien d'évitement) et une image en ligne. Le réalisateur n'a aucun fichier à
// référencer : le bon de travail ne lui en accorde pas.
const STATIC_ALLOWED = {
    href: /^#[A-Za-z][\w:.-]*$/,
    src: /^data:image\/(?:png|gif|jpeg|webp|svg\+xml)[;,]/,
};
const ROUTER_LINK = /^(?:\/(?!\/)|\.{1,2}\/|[A-Za-z0-9_-])[A-Za-z0-9_\-/.~%]*$/;
// Clés permises dans `host` : écouteurs, classes, styles, attributs aria.
const HOST_KEY =
    /^(?:\((?:window:|document:)?[a-zA-Z][\w.-]*\)|\[(?:class|style)\.[\w-]+\]|\[attr\.aria-[\w-]+\]|class|role)$/;

const DENIED = new Set(DENIED_PROPERTIES);
const deniedName = (name) =>
    DENIED.has(name) || name.startsWith('bypassSecurityTrust');

// --- TypeScript ---------------------------------------------------------

function checkedProgram(name, text) {
    const file = ts.createSourceFile(name, text, ts.ScriptTarget.ES2022, true);
    const host = {
        getSourceFile: (path) => (path === name ? file : undefined),
        getDefaultLibFileName: () => 'lib.d.ts',
        writeFile: () => undefined,
        getCurrentDirectory: () => '/',
        getCanonicalFileName: (path) => path,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => '\n',
        fileExists: (path) => path === name,
        readFile: (path) => (path === name ? text : undefined),
    };
    // Sans bibliothèque ni résolution : un identifiant qui ne se résout pas
    // dans le fichier est un global, quelle que soit sa portée.
    const program = ts.createProgram({
        rootNames: [name],
        options: {
            noLib: true,
            noResolve: true,
            types: [],
            target: ts.ScriptTarget.ES2022,
        },
        host,
    });
    return { file, checker: program.getTypeChecker() };
}

const DECLARATION_NAME = new Set([
    ts.SyntaxKind.VariableDeclaration,
    ts.SyntaxKind.Parameter,
    ts.SyntaxKind.FunctionDeclaration,
    ts.SyntaxKind.FunctionExpression,
    ts.SyntaxKind.ClassDeclaration,
    ts.SyntaxKind.ClassExpression,
    ts.SyntaxKind.MethodDeclaration,
    ts.SyntaxKind.PropertyDeclaration,
    ts.SyntaxKind.GetAccessor,
    ts.SyntaxKind.SetAccessor,
    ts.SyntaxKind.PropertyAssignment,
    ts.SyntaxKind.PropertySignature,
    ts.SyntaxKind.MethodSignature,
    ts.SyntaxKind.EnumDeclaration,
    ts.SyntaxKind.EnumMember,
    ts.SyntaxKind.BindingElement,
    ts.SyntaxKind.ImportSpecifier,
    ts.SyntaxKind.ImportClause,
    ts.SyntaxKind.NamespaceImport,
    ts.SyntaxKind.ImportEqualsDeclaration,
    ts.SyntaxKind.ExportSpecifier,
    ts.SyntaxKind.TypeAliasDeclaration,
    ts.SyntaxKind.InterfaceDeclaration,
    ts.SyntaxKind.TypeParameter,
    ts.SyntaxKind.ModuleDeclaration,
    ts.SyntaxKind.LabeledStatement,
    ts.SyntaxKind.BreakStatement,
    ts.SyntaxKind.ContinueStatement,
]);

function inTypePosition(node) {
    for (let current = node.parent; current; current = current.parent) {
        if (ts.isTypeNode(current)) return true;
        if (
            ts.isHeritageClause(current) &&
            current.token === ts.SyntaxKind.ImplementsKeyword
        )
            return true;
        if (
            ts.isInterfaceDeclaration(current) ||
            ts.isTypeAliasDeclaration(current)
        )
            return true;
        if (ts.isStatement(current) || ts.isClassElement(current)) break;
    }
    return false;
}

// Identifiant en position de valeur, hors nom de propriété ou de déclaration.
function isValueReference(node) {
    const parent = node.parent;
    if (ts.isPropertyAccessExpression(parent) && parent.name === node)
        return false;
    if (ts.isQualifiedName(parent)) return false;
    if (
        DECLARATION_NAME.has(parent.kind) &&
        (parent.name === node || parent.label === node)
    )
        return false;
    if (ts.isBindingElement(parent) && parent.propertyName === node)
        return false;
    if (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent))
        return false;
    if (ts.isMetaProperty(parent)) return false;
    return !inTypePosition(node);
}

function stripped(expression) {
    let current = expression;
    while (
        current &&
        (ts.isParenthesizedExpression(current) ||
            ts.isAsExpression(current) ||
            ts.isSatisfiesExpression(current) ||
            ts.isTypeAssertionExpression(current) ||
            ts.isNonNullExpression(current))
    )
        current = current.expression;
    return current;
}

function localDeclaration(checker, file, identifier) {
    const symbol = ts.isShorthandPropertyAssignment(identifier.parent)
        ? checker.getShorthandAssignmentValueSymbol(identifier.parent)
        : checker.getSymbolAtLocation(identifier);
    return symbol?.declarations?.find(
        (declaration) => declaration.getSourceFile() === file
    );
}

// Table de correspondance : constante locale initialisée par un littéral
// d'objet ou de tableau. Seul receveur permis pour une clé calculée.
function isLookupTable(checker, file, receiver) {
    const target = stripped(receiver);
    if (!target || !ts.isIdentifier(target)) return false;
    const declaration = localDeclaration(checker, file, target);
    if (!declaration || !ts.isVariableDeclaration(declaration)) return false;
    if (!(ts.getCombinedNodeFlags(declaration) & ts.NodeFlags.Const))
        return false;
    const initializer = stripped(declaration.initializer);
    return Boolean(
        initializer &&
        (ts.isObjectLiteralExpression(initializer) ||
            ts.isArrayLiteralExpression(initializer))
    );
}

function literalKey(expression) {
    const key = stripped(expression);
    if (
        ts.isStringLiteral(key) ||
        ts.isNoSubstitutionTemplateLiteral(key) ||
        ts.isNumericLiteral(key)
    )
        return key.text;
    return undefined;
}

function isLiteralString(expression) {
    const value = stripped(expression);
    if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))
        return true;
    return (
        ts.isBinaryExpression(value) &&
        value.operatorToken.kind === ts.SyntaxKind.PlusToken &&
        isLiteralString(value.left) &&
        isLiteralString(value.right)
    );
}

function importModule(declaration) {
    let current = declaration;
    while (current && !ts.isImportDeclaration(current))
        current = current.parent;
    return current && ts.isStringLiteral(current.moduleSpecifier)
        ? current.moduleSpecifier.text
        : undefined;
}

function objectProperty(literal, name) {
    return literal.properties.find(
        (property) =>
            ts.isPropertyAssignment(property) &&
            (ts.isIdentifier(property.name) ||
                ts.isStringLiteral(property.name)) &&
            property.name.text === name
    );
}

// Décorateur unique `@Component`, gabarit et styles dans les fichiers de la
// page, composition fournie par le décorateur (M-2), `host` restreint.
function componentViolations(file, composition, violations, templateCheck) {
    const decorators = [];
    const visit = (node) => {
        if (ts.isDecorator(node)) decorators.push(node);
        ts.forEachChild(node, visit);
    };
    visit(file);
    const components = decorators.filter((decorator) => {
        const call = decorator.expression;
        return (
            ts.isCallExpression(call) &&
            ts.isIdentifier(call.expression) &&
            call.expression.text === 'Component' &&
            ts.isClassDeclaration(decorator.parent)
        );
    });
    if (decorators.length !== 1 || components.length !== 1) {
        violations.push(
            'page.component.ts must declare exactly one @Component and no other decorator'
        );
        if (components.length !== 1) return;
    }
    const [argument] = components[0].expression.arguments;
    if (!argument || !ts.isObjectLiteralExpression(argument)) {
        violations.push('@Component metadata must be an object literal');
        return;
    }
    for (const property of argument.properties)
        if (
            !ts.isPropertyAssignment(property) ||
            !(
                ts.isIdentifier(property.name) ||
                ts.isStringLiteral(property.name)
            )
        )
            violations.push(
                '@Component metadata must use plain named properties'
            );
    const text = (name) => {
        const value = objectProperty(argument, name)?.initializer;
        return value && ts.isStringLiteral(value) ? value.text : undefined;
    };
    for (const name of ['template', 'styles', 'styleUrls'])
        if (objectProperty(argument, name))
            violations.push(
                `@Component ${name} is not allowed; use the page files`
            );
    if (text('templateUrl') !== './page.component.html')
        violations.push(
            "@Component templateUrl must be './page.component.html'"
        );
    if (text('styleUrl') !== './page.component.scss')
        violations.push("@Component styleUrl must be './page.component.scss'");
    const providers = objectProperty(argument, 'providers')?.initializer;
    const mounted =
        providers &&
        ts.isArrayLiteralExpression(providers) &&
        providers.elements.some((element) => {
            const value = ts.isSpreadElement(element)
                ? element.expression
                : element;
            return (
                ts.isIdentifier(value) &&
                value.text === 'PAGE_COMPOSITION_PROVIDERS' &&
                composition.has('PAGE_COMPOSITION_PROVIDERS')
            );
        });
    if (!mounted)
        violations.push(
            'page does not mount its composition (PAGE_COMPOSITION_PROVIDERS in @Component providers)'
        );
    const host = objectProperty(argument, 'host')?.initializer;
    if (host) {
        if (!ts.isObjectLiteralExpression(host)) {
            violations.push('@Component host must be an object literal');
            return;
        }
        for (const property of host.properties) {
            const key =
                ts.isPropertyAssignment(property) &&
                (ts.isStringLiteral(property.name) ||
                    ts.isIdentifier(property.name))
                    ? property.name.text
                    : undefined;
            const value =
                key !== undefined && ts.isStringLiteral(property.initializer)
                    ? property.initializer.text
                    : undefined;
            if (
                key === undefined ||
                value === undefined ||
                !HOST_KEY.test(key)
            ) {
                violations.push(
                    `@Component host key not allowed: ${JSON.stringify(key ?? '?')}`
                );
                continue;
            }
            if (!/^[([]/.test(key)) continue;
            // L'expression liée est lue comme un gabarit.
            const quote = value.includes('"') ? "'" : '"';
            if (value.includes(quote)) {
                violations.push('@Component host value mixes quotes');
                continue;
            }
            const attribute = key.replace(/^\((?:window|document):/, '(');
            templateCheck(
                `<cmz-host ${attribute}=${quote}${value}${quote}></cmz-host>`,
                'page.component.ts host'
            );
        }
    }
}

export function typescriptViolations({
    name,
    text,
    compositionModule,
    page,
    templateCheck,
}) {
    const violations = [];
    const { file, checker } = checkedProgram(name, text);
    const composition = new Set();
    for (const statement of file.statements) {
        if (ts.isExportDeclaration(statement) && statement.moduleSpecifier)
            violations.push(`re-export forbidden in ${name}`);
        if (!ts.isImportDeclaration(statement)) continue;
        const specifier = statement.moduleSpecifier.text;
        const clause = statement.importClause;
        const bindings = clause?.namedBindings;
        if (bindings && ts.isNamespaceImport(bindings))
            violations.push(
                `namespace import forbidden in ${name}: ${JSON.stringify(specifier)}`
            );
        if (clause?.name)
            violations.push(
                `default import forbidden in ${name}: ${JSON.stringify(specifier)}`
            );
        const names =
            bindings && ts.isNamedImports(bindings)
                ? bindings.elements.map(
                      (element) => (element.propertyName ?? element.name).text
                  )
                : [];
        if (specifier === compositionModule) {
            for (const imported of names)
                if (!COMPOSITION_NAMES.includes(imported))
                    violations.push(
                        `composition name not importable in ${name}: ${imported}`
                    );
                else composition.add(imported);
        }
        if (!page) continue;
        for (const imported of names)
            if (
                imported.startsWith('ɵ') ||
                FORBIDDEN_IMPORT_NAMES[specifier]?.includes(imported)
            )
                violations.push(
                    `import name forbidden in ${name}: ${imported} from ${JSON.stringify(specifier)}`
                );
    }
    if (!page) return violations;
    const globals = new Set(ALLOWED_GLOBALS);
    const visit = (node) => {
        if (ts.isIdentifier(node) && isValueReference(node)) {
            const local = localDeclaration(checker, file, node);
            const parent = node.parent;
            const navigatorUse =
                node.text === 'navigator' &&
                (ts.isTypeOfExpression(parent) ||
                    (ts.isPropertyAccessExpression(parent) &&
                        parent.expression === node &&
                        parent.name.text === 'onLine'));
            if (!local && !globals.has(node.text) && !navigatorUse)
                violations.push(
                    `global access forbidden in ${name}: ${node.text}`
                );
        }
        if (ts.isPropertyAccessExpression(node) && deniedName(node.name.text))
            violations.push(
                `property access forbidden in ${name}: ${node.name.text}`
            );
        if (ts.isElementAccessExpression(node)) {
            const key = literalKey(node.argumentExpression);
            if (key !== undefined) {
                if (deniedName(key))
                    violations.push(
                        `property access forbidden in ${name}: ${key}`
                    );
            } else if (!isLookupTable(checker, file, node.expression))
                violations.push(
                    `computed member access forbidden in ${name} (only on a local constant table)`
                );
        }
        // Une chaîne assemblée de littéraux ne sert qu'à masquer un littéral
        // interdit (chemin de commande, adresse).
        if (
            (ts.isBinaryExpression(node) &&
                node.operatorToken.kind === ts.SyntaxKind.PlusToken &&
                isLiteralString(node.left) &&
                isLiteralString(node.right)) ||
            (ts.isTemplateExpression(node) &&
                node.templateSpans.every((span) =>
                    isLiteralString(span.expression)
                ))
        )
            violations.push(
                `string assembled from literals forbidden in ${name}`
            );
        // L'injecteur ne livre que les jetons de la composition.
        if (
            ts.isCallExpression(node) &&
            ts.isPropertyAccessExpression(node.expression) &&
            node.expression.name.text === 'get' &&
            node.arguments.length > 0 &&
            ts.isIdentifier(stripped(node.arguments[0]))
        ) {
            const declaration = localDeclaration(
                checker,
                file,
                stripped(node.arguments[0])
            );
            if (
                declaration &&
                ts.isImportSpecifier(declaration) &&
                importModule(declaration) !== compositionModule
            )
                violations.push(
                    `injector lookup forbidden in ${name}: only composition tokens`
                );
        }
        ts.forEachChild(node, visit);
    };
    visit(file);
    componentViolations(file, composition, violations, templateCheck);
    return violations;
}

// --- Gabarit Angular ----------------------------------------------------

const elementName = (name) => name.replace(/^:[a-z]+:/, '').toLowerCase();

export function templateViolations({ name, text, declaredIds }) {
    const violations = [];
    const parsed = angular.parseTemplate(text, name, {
        preserveWhitespaces: false,
    });
    for (const error of parsed.errors ?? [])
        violations.push(
            `template does not parse in ${name}: ${String(error.msg).split('\n')[0]}`
        );
    const ids = [];
    const seen = new Set();
    const expression = (node) => {
        if (
            node instanceof angular.PropertyRead ||
            node instanceof angular.SafePropertyRead
        ) {
            if (deniedName(node.name))
                violations.push(
                    `property access forbidden in ${name}: ${node.name}`
                );
        }
        if (
            node instanceof angular.KeyedRead ||
            node instanceof angular.SafeKeyedRead
        ) {
            const key = node.key;
            const literal =
                key instanceof angular.LiteralPrimitive &&
                ['string', 'number'].includes(typeof key.value);
            if (!literal)
                violations.push(`computed member access forbidden in ${name}`);
            else if (deniedName(String(key.value)))
                violations.push(
                    `property access forbidden in ${name}: ${key.value}`
                );
        }
    };
    const attribute = (node) => {
        const key = node.name.toLowerCase();
        if (key.startsWith('on'))
            violations.push(
                `event handler attribute forbidden in ${name}: ${node.name}`
            );
        if (key === 'data-cmz-id') ids.push(node.value);
        if (key === 'routerlink' && !ROUTER_LINK.test(node.value))
            violations.push(
                `routerLink must be an application path in ${name}: ${JSON.stringify(node.value)}`
            );
        if (
            RESOURCE_ATTRIBUTES.includes(key) &&
            !STATIC_ALLOWED[key]?.test(node.value)
        )
            violations.push(
                `resource attribute forbidden in ${name}: ${node.name}`
            );
    };
    const binding = (node) => {
        const key = node.name.toLowerCase();
        const type = node.type;
        if (type === angular.BindingType.Attribute) {
            if (!key.startsWith('aria-'))
                violations.push(
                    `attribute binding forbidden in ${name}: attr.${node.name} (aria-* only)`
                );
            return;
        }
        if (
            type === angular.BindingType.Class ||
            type === angular.BindingType.Style ||
            type === angular.BindingType.Animation ||
            type === angular.BindingType.LegacyAnimation
        )
            return;
        if (
            key.startsWith('on') ||
            key === 'data-cmz-id' ||
            RESOURCE_ATTRIBUTES.includes(key) ||
            HTML_PROPERTIES.has(key)
        )
            violations.push(
                `property binding forbidden in ${name}: ${node.name}`
            );
    };
    const walk = (value) => {
        if (!value || typeof value !== 'object' || seen.has(value)) return;
        seen.add(value);
        if (value instanceof angular.AST) expression(value);
        if (value instanceof angular.TmplAstTextAttribute) attribute(value);
        if (value instanceof angular.TmplAstBoundAttribute) binding(value);
        for (const [key, child] of Object.entries(value)) {
            if (/span$/i.test(key) || key === 'i18n') continue;
            if (Array.isArray(child)) child.forEach(walk);
            else walk(child);
        }
    };
    parsed.nodes.forEach(walk);
    // Le compilateur retire <script> et extrait <style> avant l'arbre du
    // gabarit : les éléments sont donc lus dans l'arbre HTML brut.
    const raw = new angular.HtmlParser().parse(text, name, {
        tokenizeExpansionForms: true,
        tokenizeBlocks: true,
    });
    const elements = (node) => {
        if (typeof node.name === 'string' && Array.isArray(node.children)) {
            const element = elementName(node.name);
            if (FORBIDDEN_ELEMENTS.includes(element))
                violations.push(`element forbidden in ${name}: <${element}>`);
        }
        for (const child of node.children ?? []) elements(child);
    };
    raw.rootNodes.forEach(elements);
    for (const id of ids)
        if (declaredIds && !declaredIds.has(id))
            violations.push(
                `data-cmz-id not declared by the page contract in ${name}: ${JSON.stringify(id)}`
            );
    return { violations, ids };
}

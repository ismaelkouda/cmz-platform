// X4-sécurité : contrôles de syntaxe d'une réalisation de page extérieure.
// TypeScript : imports, métadonnées de `@Component`, `declare`, assertions de
// type, chaînes assemblées ; les références sont jugées par symbole résolu
// (external-page-realization-symbols.mjs). Gabarit : langage d'expression
// réduit, éléments et attributs de ressource refusés. Le réseau, les scripts
// en ligne, le code dynamique et les ressources d'autres origines sont
// gouvernés par la politique de la coque, mesurée dans le navigateur.
import * as angular from '@angular/compiler';
import ts from 'typescript';
import { parserList } from './page-grammar/parser-contract.mjs';

// Noms que la page peut importer depuis sa composition (I-2) : la page la
// monte et l'obtient ; elle n'atteint jamais un nœud de commande.
export const COMPOSITION_NAMES = Object.freeze([
    'PAGE_COMPOSITION_PROVIDERS',
    'PageComposition',
]);

// Propriétés refusées dans le gabarit, sur toute valeur du composant : elles
// mènent au document, à la fenêtre, à la navigation, au stockage, à l'écriture
// HTML ou d'attributs, ou à un constructeur. En TypeScript, le symbole résolu
// gouverne.
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
    'animate',
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
    'set',
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
]);
// Pipes permis dans le gabarit (@angular/common).
export const TEMPLATE_PIPES = Object.freeze([
    'async',
    'currency',
    'date',
    'lowercase',
    'number',
    'percent',
    'slice',
    'titlecase',
    'uppercase',
]);
const HTML_PROPERTIES = new Set(['innerhtml', 'outerhtml', 'routerlink']);
// Un attribut à espace de noms (`xlink:href`, que le compilateur nomme
// `:xlink:href`) est jugé par son nom local.
const attributeName = (name) => name.toLowerCase().replace(/^:?[^:]+:/, '');
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
    const file = ts.createSourceFile(name, text, ts.ScriptTarget.ES2022, true);
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
    }
    if (!page) return violations;
    // Une directive à triple barre ajoute des types au programme de la page
    // (`types="node"`, `lib="esnext"`) : elle élargirait les listes.
    if (
        file.referencedFiles.length +
            file.typeReferenceDirectives.length +
            file.libReferenceDirectives.length >
        0
    )
        violations.push(`triple-slash reference forbidden in ${name}`);
    const visit = (node) => {
        // `declare` n'émet rien : le nom déclaré reste le global de
        // l'exécution. Une assertion de type trompe le vérificateur.
        if (node.kind === ts.SyntaxKind.DeclareKeyword)
            violations.push(
                `ambient declaration (declare) forbidden in ${name}`
            );
        if (
            (ts.isAsExpression(node) && !ts.isConstTypeReference(node.type)) ||
            ts.isTypeAssertionExpression(node)
        )
            violations.push(
                `type assertion forbidden in ${name} (only as const)`
            );
        ts.forEachChild(node, visit);
    };
    visit(file);
    componentViolations(file, composition, violations, templateCheck);
    return violations;
}

// --- Gabarit Angular ----------------------------------------------------

const elementName = (name) => name.replace(/^:[a-z]+:/, '').toLowerCase();
const implicit = (receiver) =>
    receiver instanceof angular.ImplicitReceiver ||
    receiver instanceof angular.ThisReceiver;

export function templateViolations({ name, text, declaredIds }) {
    const violations = [];
    const parsed = angular.parseTemplate(text, name, {
        preserveWhitespaces: false,
    });
    for (const error of parserList(parsed.errors, 'template errors', {
        nullable: true,
    }))
        violations.push(
            `template does not parse in ${name}: ${String(error.msg).split('\n')[0]}`
        );
    const ids = [];
    const seen = new Set();
    const references = new Set();
    const reads = [];
    const expression = (node, parent) => {
        if (node instanceof angular.PropertyRead && implicit(node.receiver))
            reads.push([node, parent]);
        if (
            node instanceof angular.BindingPipe &&
            !TEMPLATE_PIPES.includes(node.name)
        )
            violations.push(`pipe not allowed in ${name}: ${node.name}`);
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
        const key = attributeName(node.name);
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
        const key = attributeName(node.name);
        const type = node.type;
        if (type === angular.BindingType.Attribute) {
            if (!node.name.toLowerCase().startsWith('aria-'))
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
    const walk = (value, parent) => {
        if (!value || typeof value !== 'object' || seen.has(value)) return;
        seen.add(value);
        if (value instanceof angular.AST) expression(value, parent);
        if (value instanceof angular.TmplAstTextAttribute) attribute(value);
        if (value instanceof angular.TmplAstBoundAttribute) binding(value);
        if (value instanceof angular.TmplAstReference)
            references.add(value.name);
        for (const [key, child] of Object.entries(value)) {
            if (/span$/i.test(key) || key === 'i18n') continue;
            if (Array.isArray(child))
                child.forEach((item) => walk(item, value));
            else walk(child, value);
        }
    };
    parsed.nodes.forEach((node) => walk(node));
    // `$event` et une variable de référence (`#ref`), y compris par un alias
    // `@let`, ne sont jamais lus dans le gabarit : ils sont passés entiers en
    // argument d'une méthode du composant, où le symbole résolu gouverne.
    // `$any` est une assertion de type.
    const opaque = (read) =>
        read.name === '$event' || references.has(read.name);
    const method = (receiver) =>
        receiver instanceof angular.PropertyRead &&
        implicit(receiver.receiver) &&
        receiver.name !== '$any' &&
        !opaque(receiver);
    const calls = [];
    for (const [read, parent] of reads) {
        if (read.name === '$any') {
            violations.push(`type assertion $any forbidden in ${name}`);
            continue;
        }
        if (!opaque(read)) continue;
        // X4-sécurité-3 (H6) : une référence se lit `ref.value` ou
        // `ref.checked` ; la grammaire fermée en gouverne la position.
        if (
            references.has(read.name) &&
            parent instanceof angular.PropertyRead &&
            parent.receiver === read &&
            ['value', 'checked'].includes(parent.name)
        )
            continue;
        const argument =
            parent instanceof angular.Call &&
            parent.args.includes(read) &&
            method(parent.receiver);
        if (argument)
            calls.push({
                method: parent.receiver.name,
                index: parent.args.indexOf(read),
            });
        else
            violations.push(
                `${read.name} must be passed whole to a component method in ${name}`
            );
    }
    // Le compilateur retire <script> et extrait <style> avant l'arbre du
    // gabarit : les éléments sont donc lus dans l'arbre HTML brut.
    const raw = new angular.HtmlParser().parse(text, name, {
        tokenizeExpansionForms: true,
        tokenizeBlocks: true,
    });
    // CI #389 : parcours par le visiteur récursif d'Angular. Un parcours fait à
    // la main sur `children` sautait les cas d'expansion ICU. Dans 22.2.4, le
    // visiteur natif ne descend pas non plus dans un cas
    // (`visitExpansionCase` vide) : seule cette méthode est complétée.
    const forbidden = (tag) => {
        const element = elementName(tag);
        if (FORBIDDEN_ELEMENTS.includes(element))
            violations.push(`element forbidden in ${name}: <${element}>`);
    };
    class ForbiddenElements extends angular.RecursiveVisitor {
        visitElement(node, context) {
            forbidden(node.name);
            return super.visitElement(node, context);
        }
        visitComponent(node, context) {
            forbidden(node.tagName ?? node.componentName);
            return super.visitComponent(node, context);
        }
        visitExpansionCase(node, context) {
            return this.visitChildren(context, (visit) =>
                visit(node.expression)
            );
        }
    }
    angular.visitAll(new ForbiddenElements(), raw.rootNodes);
    for (const id of ids)
        if (declaredIds && !declaredIds.has(id))
            violations.push(
                `data-cmz-id not declared by the page contract in ${name}: ${JSON.stringify(id)}`
            );
    return { violations, ids, calls };
}

// X4-sécurité-3, O-G et O-C : grammaire fermée de `page.component.html`
// (conception v1 §3, v2 §5). Le gabarit est lu deux fois : arbre HTML brut
// (commentaires, ICU, syntaxe sans sélecteur) et arbre R3 (éléments,
// attributs, liaisons, événements, blocs). Les deux parcours passent par des
// visiteurs fermés : toute méthode de visite non approuvée refuse (H0).
import * as angular from '@angular/compiler';

import { characterViolations, violation } from './text.mjs';
import { decodedValueViolations } from './decoded-values.mjs';
import { parserList } from './parser-contract.mjs';

const FILE = 'page.component.html';

// H2 : éléments, l'espace de noms compte (`:svg:` pour le SVG).
const HTML_ELEMENTS = [
    'main',
    'section',
    'article',
    'aside',
    'header',
    'footer',
    'nav',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hgroup',
    'address',
    'div',
    'p',
    'hr',
    'pre',
    'blockquote',
    'ol',
    'ul',
    'li',
    'dl',
    'dt',
    'dd',
    'figure',
    'figcaption',
    'span',
    'strong',
    'em',
    'b',
    'i',
    'u',
    's',
    'small',
    'mark',
    'abbr',
    'cite',
    'code',
    'kbd',
    'samp',
    'var',
    'sub',
    'sup',
    'time',
    'br',
    'wbr',
    'q',
    'dfn',
    'form',
    'fieldset',
    'legend',
    'label',
    'input',
    'textarea',
    'select',
    'option',
    'optgroup',
    'button',
    'output',
    'progress',
    'meter',
    'table',
    'caption',
    'colgroup',
    'col',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'a',
    'img',
    'ng-container',
];
const SVG_ELEMENTS = [
    'svg',
    'g',
    'path',
    'circle',
    'ellipse',
    'line',
    'polyline',
    'polygon',
    'rect',
    'title',
    'desc',
    'defs',
    'linearGradient',
    'radialGradient',
    'stop',
];
export const TEMPLATE_ELEMENTS = Object.freeze([
    ...HTML_ELEMENTS,
    ...SVG_ELEMENTS.map((name) => `:svg:${name}`),
]);
const ELEMENTS = new Set(TEMPLATE_ELEMENTS);

// H3 : attributs statiques, globaux puis par élément.
const SVG_PRESENTATION = [
    'viewBox',
    'width',
    'height',
    'fill',
    'stroke',
    'stroke-width',
    'stroke-linecap',
    'stroke-linejoin',
    'opacity',
    'fill-opacity',
    'stroke-opacity',
    'transform',
    'focusable',
    'xmlns',
];
export const ELEMENT_ATTRIBUTES = Object.freeze({
    a: ['href', 'routerLink'],
    img: ['src', 'alt', 'width', 'height'],
    input: [
        'type',
        'name',
        'autocomplete',
        'required',
        'min',
        'max',
        'step',
        'minlength',
        'maxlength',
        'placeholder',
        'readonly',
        'disabled',
        'checked',
        'value',
        'size',
        'inputmode',
    ],
    textarea: [
        'name',
        'autocomplete',
        'required',
        'rows',
        'cols',
        'minlength',
        'maxlength',
        'placeholder',
        'readonly',
        'disabled',
        'wrap',
    ],
    select: [
        'name',
        'autocomplete',
        'required',
        'disabled',
        'multiple',
        'size',
    ],
    option: ['value', 'selected', 'disabled', 'label'],
    optgroup: ['label', 'disabled'],
    button: ['type', 'disabled'],
    label: ['for'],
    output: ['for', 'name'],
    progress: ['value', 'max'],
    meter: ['value', 'min', 'max', 'low', 'high', 'optimum'],
    form: ['novalidate'],
    fieldset: ['disabled'],
    td: ['colspan', 'rowspan', 'headers'],
    th: ['colspan', 'rowspan', 'headers', 'scope'],
    col: ['span'],
    colgroup: ['span'],
    ol: ['start', 'reversed'],
    li: ['value'],
    time: ['datetime'],
    ':svg:svg': SVG_PRESENTATION,
    ':svg:g': SVG_PRESENTATION,
    ':svg:path': [...SVG_PRESENTATION, 'd'],
    ':svg:circle': [...SVG_PRESENTATION, 'cx', 'cy', 'r'],
    ':svg:ellipse': [...SVG_PRESENTATION, 'cx', 'cy', 'rx', 'ry'],
    ':svg:line': [...SVG_PRESENTATION, 'x1', 'y1', 'x2', 'y2'],
    ':svg:polyline': [...SVG_PRESENTATION, 'points'],
    ':svg:polygon': [...SVG_PRESENTATION, 'points'],
    ':svg:rect': [...SVG_PRESENTATION, 'x', 'y', 'rx', 'ry'],
    ':svg:linearGradient': [
        'x1',
        'y1',
        'x2',
        'y2',
        'gradientUnits',
        'gradientTransform',
    ],
    ':svg:radialGradient': [
        'cx',
        'cy',
        'r',
        'fx',
        'fy',
        'gradientUnits',
        'gradientTransform',
    ],
    ':svg:stop': ['offset', 'stop-color', 'stop-opacity'],
});

// H4 : liaisons de propriété permises.
export const BOUND_PROPERTIES = Object.freeze([
    'disabled',
    'readOnly',
    'required',
    'checked',
    'selected',
    'value',
    'hidden',
    'id',
    'tabIndex',
    'title',
    'min',
    'max',
    'step',
    'placeholder',
]);
export const BOUND_ATTRIBUTES = /^(?:aria-[a-z]+|role|for|colspan|rowspan)$/;
export const STYLE_PROPERTIES = Object.freeze([
    'width',
    'height',
    'min-width',
    'max-width',
    'min-height',
    'max-height',
    'margin',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'padding',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'color',
    'background-color',
    'border-color',
    'opacity',
    'order',
    'flex',
    'flex-grow',
    'flex-shrink',
    'flex-basis',
    'flex-direction',
    'flex-wrap',
    'grid-column',
    'grid-row',
    'grid-template-columns',
    'grid-template-rows',
    'z-index',
    'font-size',
    'font-weight',
    'display',
    'visibility',
    'transform',
]);
// H9 : tuyaux, avec la classe qui doit figurer dans `imports`.
export const TEMPLATE_PIPES = Object.freeze({
    currency: 'CurrencyPipe',
    date: 'DatePipe',
    lowercase: 'LowerCasePipe',
    number: 'DecimalPipe',
    percent: 'PercentPipe',
    slice: 'SlicePipe',
    titlecase: 'TitleCasePipe',
    uppercase: 'UpperCasePipe',
});

// Genres approuvés (publiés et épinglés par les tests de clôture).
export const RAW_HTML_NODES = Object.freeze([
    'Attribute',
    'Block',
    'BlockParameter',
    'Element',
    'LetDeclaration',
    'Text',
]);
export const TEMPLATE_VISITED_NODES = Object.freeze([
    'BoundText',
    'Element',
    'ForLoopBlock',
    'IfBlock',
    'LetDeclaration',
    'SwitchBlock',
    'Text',
]);
export const TEMPLATE_EXPRESSIONS = Object.freeze([
    'ASTWithSource',
    'Binary',
    'BindingPipe',
    'Call',
    'Conditional',
    'Interpolation',
    'KeyedRead',
    'LiteralArray',
    'LiteralMap',
    'LiteralPrimitive',
    'ParenthesizedExpression',
    'PrefixNot',
    'PropertyRead',
    'SafeKeyedRead',
    'SafePropertyRead',
    'Unary',
]);

// Visiteur fermé : seules les méthodes données existent ; toute autre visite
// refuse avec le nom du genre (H0).
function closedVisitor(methods, refuse) {
    return new Proxy(methods, {
        get(target, key) {
            if (Object.hasOwn(target, key)) return target[key];
            // `visit` seul est la sonde générique de `visitAll` : absente.
            if (typeof key === 'string' && /^visit[A-Z]/.test(key))
                return (node) => refuse(node, key.slice('visit'.length));
            return undefined;
        },
    });
}

export class TemplateGrammar {
    constructor({ text, facts, contract, name = FILE }) {
        this.text = text;
        this.name = name;
        this.facts = facts;
        this.contract = contract;
        this.found = [];
        this.ids = new Set();
        this.references = new Map();
        this.fragments = [];
        this.submits = 0;
        this.forms = [];
    }

    bad(span, code, message) {
        const start = span?.start?.offset ?? span?.start ?? 0;
        const end = span?.end?.offset ?? span?.end ?? start;
        this.found.push(
            violation(code, this.name, this.text, start, end, message)
        );
        return false;
    }

    check() {
        this.raw();
        const parsed = angular.parseTemplate(this.text, this.name, {
            preserveWhitespaces: false,
        });
        for (const error of parserList(parsed.errors, 'template errors', {
            nullable: true,
        }))
            this.bad(
                error.span,
                'H0',
                `template does not parse: ${String(error.msg).split('\n')[0]}`
            );
        this.parsedNodes = parsed.nodes;
        this.nodes(parsed.nodes, new Map());
        for (const [id, span] of this.fragments)
            if (!this.ids.has(id))
                this.bad(span, 'H3', `href #${id} names no id of the template`);
        for (const form of this.forms)
            if (form.submits !== 1)
                this.bad(
                    form.span,
                    'H5',
                    'every form has exactly one (submit)'
                );
        for (const entry of this.facts.host) this.host(entry);
        this.found.push(...characterViolations(this.name, this.text));
        // « T2 décodé » : les valeurs qu'Angular décode (entités, échappements).
        this.found.push(
            ...decodedValueViolations(this.name, this.text, parsed.nodes)
        );
        return this;
    }

    // H0, H1 : arbre HTML brut. Commentaires, ICU et syntaxe sans sélecteur
    // sont refusés ; les autres genres se vérifient dans l'arbre R3.
    raw() {
        const parsed = new angular.HtmlParser().parse(this.text, this.name, {
            tokenizeExpansionForms: true,
            tokenizeBlocks: true,
            tokenizeLet: true,
        });
        angular.visitAll(this.rawVisitor(), parsed.rootNodes);
    }

    // Visiteur fermé de l'arbre HTML brut ; publié pour les tests de clôture.
    rawVisitor() {
        const visitor = closedVisitor(
            {
                visitElement: (node) => {
                    // H2 ici : le compilateur retire <script> et extrait
                    // <style> avant l'arbre R3.
                    if (!ELEMENTS.has(node.name))
                        this.bad(
                            node.startSourceSpan,
                            'H2',
                            `element ${node.name} is not allowed`
                        );
                    angular.visitAll(visitor, node.attrs);
                    angular.visitAll(
                        visitor,
                        parserList(node.directives, 'element directives')
                    );
                    angular.visitAll(visitor, node.children);
                },
                visitAttribute: () => undefined,
                visitText: () => undefined,
                visitBlock: (node) => {
                    angular.visitAll(visitor, node.parameters);
                    angular.visitAll(visitor, node.children);
                },
                visitBlockParameter: () => undefined,
                visitLetDeclaration: () => undefined,
            },
            (node, kind) =>
                this.bad(
                    node.sourceSpan,
                    [
                        'Comment',
                        'StartTagComment',
                        'Expansion',
                        'ExpansionCase',
                    ].includes(kind)
                        ? 'H1'
                        : 'H0',
                    `raw template node ${kind} is not allowed`
                )
        );
        return visitor;
    }

    nodes(list, scope) {
        for (const node of list) node.visit(this.visitor(scope));
    }

    visitor(scope) {
        return closedVisitor(
            {
                visitElement: (node) => this.element(node, scope),
                visitText: () => undefined,
                visitBoundText: (node) => this.expression(node.value, scope),
                visitIfBlock: (node) => {
                    for (const branch of node.branches) {
                        if (branch.expressionAlias)
                            this.bad(branch.sourceSpan, 'H8', '@if alias');
                        if (branch.expression)
                            this.expression(branch.expression, scope);
                        this.nodes(branch.children, scope);
                    }
                },
                visitForLoopBlock: (node) => this.forLoop(node, scope),
                visitSwitchBlock: (node) => {
                    this.expression(node.expression, scope);
                    if (node.exhaustiveCheck)
                        this.bad(
                            node.exhaustiveCheck.sourceSpan,
                            'H8',
                            'exhaustive check'
                        );
                    for (const block of parserList(
                        node.unknownBlocks,
                        'switch unknown blocks'
                    ))
                        this.bad(
                            block.sourceSpan,
                            'H8',
                            `unknown block @${block.name}`
                        );
                    for (const group of node.groups) {
                        for (const entry of group.cases) {
                            const value = entry.expression?.ast;
                            if (!(value instanceof angular.LiteralPrimitive))
                                this.bad(
                                    entry.sourceSpan,
                                    'H8',
                                    '@case takes a literal'
                                );
                        }
                        this.nodes(group.children, scope);
                    }
                },
                visitLetDeclaration: (node) => {
                    if (scope.has(node.name) || this.isMember(node.name))
                        this.bad(
                            node.sourceSpan,
                            'H8',
                            `@let ${node.name} shadows a name`
                        );
                    this.expression(node.value, scope);
                    scope.set(node.name, 'let');
                },
            },
            (node, kind) =>
                this.bad(
                    node.sourceSpan,
                    'H0',
                    `template node ${kind} is not allowed`
                )
        );
    }

    isMember(name) {
        return this.facts.fields.has(name) || this.facts.methods.has(name);
    }
}

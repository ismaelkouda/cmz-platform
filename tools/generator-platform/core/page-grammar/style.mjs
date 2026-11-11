// X4-sécurité-3, O-G et O-C : `page.component.scss` (conception v1 §4).
// C1 : le `sass` de l'atelier compile sans chemin de chargement, avec un
//      importeur qui refuse tout ; seuls les modules `sass:*` se chargent.
// C2 : at-rules du CSS compilé en liste fermée.
// C3 : valeurs découpées par `css-tree` (CSS Syntax 3) : aucun jeton `url`
//      ni `bad-url`, fonctions en liste fermée.
// C4 : `::ng-deep` refusé.
// C0 : tout type de nœud CSS non approuvé est refusé.
// Le CSS compilé est jugé, puis chaque violation est replacée dans la source
// par la carte de sources de Sass.
import * as cssTree from 'css-tree';
import * as sass from 'sass';

import { characterViolations, violation } from './text.mjs';

const FILE = 'page.component.scss';

export const CSS_AT_RULES = Object.freeze([
    'container',
    'keyframes',
    'layer',
    'media',
    'starting-style',
    'supports',
]);
export const CSS_NODE_TYPES = Object.freeze([
    'AnPlusB',
    'Atrule',
    'AtrulePrelude',
    'AttributeSelector',
    'Block',
    'Brackets',
    'ClassSelector',
    'Combinator',
    'Comment',
    'Condition',
    'Declaration',
    'DeclarationList',
    'Dimension',
    'Feature',
    'FeatureFunction',
    'FeatureRange',
    'Function',
    'Hash',
    'IdSelector',
    'Identifier',
    'Layer',
    'LayerList',
    'MediaQuery',
    'MediaQueryList',
    'NestingSelector',
    'Nth',
    'Number',
    'Operator',
    'Parentheses',
    'Percentage',
    'PseudoClassSelector',
    'PseudoElementSelector',
    'Ratio',
    'Rule',
    'Selector',
    'SelectorList',
    'String',
    'StyleSheet',
    'SupportsDeclaration',
    'TypeSelector',
    'Value',
    'WhiteSpace',
]);
export const CSS_REFUSED_TOKENS = Object.freeze([
    'BadUrl',
    'CDC',
    'CDO',
    'Url',
]);
// Fonctions sans adresse : calcul, variables, couleurs, dégradés,
// transformations, filtres, minutage, grille, formes et compteurs.
export const CSS_FUNCTIONS = Object.freeze([
    'abs',
    'acos',
    'asin',
    'atan',
    'atan2',
    'calc',
    'clamp',
    'cos',
    'exp',
    'hypot',
    'log',
    'max',
    'min',
    'mod',
    'pow',
    'rem',
    'round',
    'sign',
    'sin',
    'sqrt',
    'tan',
    'var',
    'color',
    'color-mix',
    'hsl',
    'hsla',
    'hwb',
    'lab',
    'lch',
    'light-dark',
    'oklab',
    'oklch',
    'rgb',
    'rgba',
    'conic-gradient',
    'linear-gradient',
    'radial-gradient',
    'repeating-conic-gradient',
    'repeating-linear-gradient',
    'repeating-radial-gradient',
    'matrix',
    'matrix3d',
    'perspective',
    'rotate',
    'rotate3d',
    'rotateX',
    'rotateY',
    'rotateZ',
    'scale',
    'scale3d',
    'scaleX',
    'scaleY',
    'scaleZ',
    'skew',
    'skewX',
    'skewY',
    'translate',
    'translate3d',
    'translateX',
    'translateY',
    'translateZ',
    'blur',
    'brightness',
    'contrast',
    'drop-shadow',
    'grayscale',
    'hue-rotate',
    'invert',
    'opacity',
    'saturate',
    'sepia',
    'cubic-bezier',
    'linear',
    'steps',
    'fit-content',
    'minmax',
    'repeat',
    'circle',
    'ellipse',
    'inset',
    'polygon',
    'counter',
    'counters',
]);
const AT_RULES = new Set(CSS_AT_RULES);
const NODE_TYPES = new Set(CSS_NODE_TYPES);
const FUNCTIONS = new Set(CSS_FUNCTIONS.map((name) => name.toLowerCase()));
const REFUSED_TOKENS = new Set(
    CSS_REFUSED_TOKENS.map((name) => cssTree.tokenTypes[name])
);

// Importeur qui refuse tout chargement de fichier (C1).
const REFUSING_IMPORTER = Object.freeze({
    canonicalize(url) {
        throw new Error(
            `C1: stylesheet ${JSON.stringify(url)} cannot be loaded`
        );
    },
    load() {
        return null;
    },
});
const LOAD = /@(?:use|forward|import)\b|\bload-css\b/g;

// Carte de sources : position compilée (ligne, colonne, base 0) → position
// source. Décodage VLQ base64 des « mappings » de la version 3.
const BASE64 =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function decodeMappings(mappings) {
    const lines = [];
    let sourceLine = 0;
    let sourceColumn = 0;
    let source = 0;
    for (const line of mappings.split(';')) {
        const segments = [];
        let column = 0;
        for (const segment of line.split(',')) {
            if (!segment) continue;
            const values = [];
            let value = 0;
            let shift = 0;
            for (const character of segment) {
                const digit = BASE64.indexOf(character);
                value += (digit & 31) << shift;
                if (digit & 32) shift += 5;
                else {
                    values.push(value & 1 ? -(value >> 1) : value >> 1);
                    value = 0;
                    shift = 0;
                }
            }
            column += values[0];
            if (values.length >= 4) {
                source += values[1];
                sourceLine += values[2];
                sourceColumn += values[3];
                segments.push([column, source, sourceLine, sourceColumn]);
            }
        }
        lines.push(segments);
    }
    return lines;
}

export class StyleGrammar {
    constructor({ text, name = FILE }) {
        this.text = text;
        this.name = name;
        this.found = [];
    }

    bad(start, end, code, message) {
        this.found.push(
            violation(code, this.name, this.text, start, end, message)
        );
    }

    sourceOffset(line, column) {
        // repli justifié : localisation d'une violation seulement ; une ligne sans segment de carte n'en a aucun, le verdict ne change pas.
        const segments = this.map?.[line] ?? [];
        let best;
        for (const segment of segments)
            if (segment[0] <= column) best = segment;
        if (!best) return [0, this.text.length];
        const lines = this.text.split('\n');
        let offset = 0;
        for (let index = 0; index < best[2]; index++)
            offset += lines[index].length + 1;
        offset += best[3];
        return [offset, offset + 1];
    }

    // Violation trouvée dans le CSS compilé, replacée dans la source.
    compiledBad(location, code, message) {
        const [start, end] = this.sourceOffset(
            (location?.start?.line ?? 1) - 1,
            (location?.start?.column ?? 1) - 1
        );
        this.bad(start, end, code, message);
    }

    check() {
        this.found.push(...characterViolations(this.name, this.text));
        for (const match of this.text.matchAll(LOAD)) {
            const rest = this.text.slice(
                match.index + match[0].length,
                match.index + match[0].length + 200
            );
            if (
                match[0].startsWith('@use') &&
                /^\s*(['"])sass:[a-z]+\1/.test(rest)
            )
                continue;
            this.bad(
                match.index,
                match.index + match[0].length,
                'C1',
                `${match[0]} loads a stylesheet`
            );
        }
        let compiled;
        try {
            compiled = sass.compileString(this.text, {
                syntax: 'scss',
                style: 'expanded',
                charset: false,
                loadPaths: [],
                importers: [REFUSING_IMPORTER],
                sourceMap: true,
                logger: sass.Logger.silent,
            });
        } catch (error) {
            const start = error.span?.start?.offset ?? 0;
            this.bad(
                start,
                error.span?.end?.offset ?? start,
                'C1',
                `stylesheet does not compile: ${String(error.sassMessage ?? error.message).split('\n')[0]}`
            );
            return this;
        }
        if (compiled.loadedUrls.length > 0)
            this.bad(0, 0, 'C1', 'a stylesheet was loaded');
        this.map = decodeMappings(compiled.sourceMap.mappings);
        this.css(compiled.css);
        return this;
    }

    css(css) {
        cssTree.tokenize(css, (type, start, end) => {
            const position = (offset) => {
                const before = css.slice(0, offset).split('\n');
                return {
                    start: {
                        line: before.length,
                        column: before[before.length - 1].length + 1,
                    },
                };
            };
            if (REFUSED_TOKENS.has(type))
                this.compiledBad(
                    position(start),
                    'C3',
                    `CSS token ${cssTree.tokenNames?.[type] ?? type} is not allowed`
                );
            if (type === cssTree.tokenTypes.Function) {
                const name = css.slice(start, end - 1).toLowerCase();
                if (!FUNCTIONS.has(name))
                    this.compiledBad(
                        position(start),
                        'C3',
                        `CSS function ${name}() is not allowed`
                    );
            }
        });
        const ast = cssTree.parse(css, {
            positions: true,
            parseValue: true,
            parseCustomProperty: true,
            parseAtrulePrelude: true,
        });
        cssTree.walk(ast, (node) => this.node(node));
    }

    // Un nœud CSS : genre approuvé (C0), at-rule permise (C2), pas de
    // `::ng-deep` (C4).
    node(node) {
        if (!NODE_TYPES.has(node.type))
            return this.compiledBad(
                node.loc,
                'C0',
                `CSS node ${node.type} is not allowed`
            );
        if (
            node.type === 'Atrule' &&
            !AT_RULES.has(String(node.name).toLowerCase())
        )
            this.compiledBad(node.loc, 'C2', `@${node.name} is not allowed`);
        if (
            ['PseudoElementSelector', 'PseudoClassSelector'].includes(
                node.type
            ) &&
            String(node.name).toLowerCase() === 'ng-deep'
        )
            this.compiledBad(node.loc, 'C4', 'ng-deep is not allowed');
    }
}

export function styleGrammar({ text }) {
    return new StyleGrammar({ text }).check();
}

// X4-sécurité-3, O-G (v1 §3 H2 à H9, v2 §5) : éléments, attributs statiques,
// liaisons, événements, références, `@for`, expressions du gabarit et liaisons
// d'hôte. Ajouté au prototype de TemplateGrammar.
import * as angular from '@angular/compiler';

import { applicationRoutePattern } from '../application-route-pattern.mjs';
import { isPrototypeName } from './registries.mjs';
import {
    BOUND_ATTRIBUTES,
    BOUND_PROPERTIES,
    ELEMENT_ATTRIBUTES,
    STYLE_PROPERTIES,
    TEMPLATE_PIPES,
    TemplateGrammar,
} from './template.mjs';
import { violation } from './text.mjs';
import { parserList } from './parser-contract.mjs';

const GLOBAL_ATTRIBUTES = new Set([
    'id',
    'class',
    'role',
    'title',
    'lang',
    'dir',
    'hidden',
    'tabindex',
    'data-cmz-id',
]);
const INPUT_TYPES = new Set([
    'text',
    'password',
    'email',
    'number',
    'tel',
    'url',
    'search',
    'checkbox',
    'radio',
    'date',
    'time',
    'datetime-local',
    'month',
    'week',
    'range',
    'color',
    'hidden',
    'button',
    'reset',
]);
const BUTTON_TYPES = new Set(['button', 'submit', 'reset']);
const STYLE_UNITS = new Set(['px', '%', 'em', 'rem', 'vh', 'vw', 'ch', 'deg']);
const STYLES = new Set(STYLE_PROPERTIES);
const PROPERTIES = new Set([...BOUND_PROPERTIES, 'class']);
const EVENT_NAME =
    /^(?:click|dblclick|input|change|submit|focus|blur|focusin|focusout|mouseenter|mouseleave|(?:keydown|keyup)(?:\.(?:shift|control|alt|meta))*(?:\.[a-z0-9]+)?)$/;
const BINARY = new Set([
    '===',
    '!==',
    '<',
    '<=',
    '>',
    '>=',
    '&&',
    '||',
    '??',
    '+',
    '-',
    '*',
    '/',
    '%',
]);
const CLASS_NAME = /^[A-Za-z][A-Za-z0-9_-]*$/;
const FRAGMENT = /^#([A-Za-z][\w:.-]*)$/;
const IMAGE = /^data:image\/(?:png|gif|jpeg|webp|svg\+xml)[;,]/;
const REFERENCE_HOSTS = new Set(['input', 'textarea', 'select']);
const CONTEXT = new Set([
    '$index',
    '$first',
    '$last',
    '$even',
    '$odd',
    '$count',
]);

Object.assign(TemplateGrammar.prototype, {
    element(node, scope) {
        const name = node.name;
        const form =
            name === 'form'
                ? { span: node.startSourceSpan, submits: 0 }
                : undefined;
        if (form) this.forms.push(form);
        for (const directive of parserList(
            node.directives,
            'element directives'
        ))
            this.bad(directive.sourceSpan, 'H0', 'selectorless directive');
        for (const reference of node.references) {
            if (
                reference.value ||
                !REFERENCE_HOSTS.has(name) ||
                this.references.has(reference.name) ||
                this.isMember(reference.name) ||
                scope.has(reference.name)
            )
                this.bad(
                    reference.sourceSpan,
                    'H6',
                    `#${reference.name} is a bare reference on input, textarea or select`
                );
            else this.references.set(reference.name, name);
        }
        for (const attribute of node.attributes)
            this.attribute(name, attribute);
        for (const input of node.inputs) this.binding(name, input, scope);
        for (const output of node.outputs)
            this.event(name, output, scope, form);
        this.nodes(node.children, scope);
    },

    // H3 : attributs statiques et valeurs imposées.
    attribute(element, node) {
        const { name, value } = node;
        const span = node.sourceSpan;
        const allowed =
            name.startsWith('aria-') ||
            GLOBAL_ATTRIBUTES.has(name) ||
            // repli justifié : élément hors table : aucun attribut permis (repli fermé).
            (ELEMENT_ATTRIBUTES[element] ?? []).includes(name);
        if (!allowed)
            return this.bad(
                span,
                'H3',
                `attribute ${name} is not allowed on ${element}`
            );
        if (
            /url\s*\(|javascript:/i.test(value) &&
            !/^url\(#[A-Za-z][\w-]*\)$/.test(value)
        )
            return this.bad(span, 'H3', `attribute ${name} names a resource`);
        if (name === 'data-cmz-id' && !this.contract.ids.has(value))
            this.bad(
                span,
                'H3',
                `data-cmz-id ${JSON.stringify(value)} is not a contract id`
            );
        if (name === 'id') this.ids.add(value);
        if (name === 'dir' && !['ltr', 'rtl', 'auto'].includes(value))
            this.bad(span, 'H3', 'dir value');
        if (name === 'tabindex' && !/^-?\d+$/.test(value))
            this.bad(span, 'H3', 'tabindex value');
        if (element === 'input' && name === 'type' && !INPUT_TYPES.has(value))
            this.bad(span, 'H3', `input type ${value}`);
        if (element === 'button' && name === 'type' && !BUTTON_TYPES.has(value))
            this.bad(span, 'H3', `button type ${value}`);
        if (element === 'img' && name === 'src' && !IMAGE.test(value))
            this.bad(span, 'H3', 'img src is an inline data:image');
        if (element === 'a' && name === 'href') {
            const fragment = FRAGMENT.exec(value);
            if (!fragment)
                this.bad(span, 'H3', 'href is #<id of the template>');
            else this.fragments.push([fragment[1], span]);
        }
        if (element === 'a' && name === 'routerLink') {
            if (!this.facts.decoratorImports.includes('RouterLink'))
                this.bad(
                    span,
                    'H9',
                    'routerLink requires RouterLink in imports'
                );
            if (
                !applicationRoutePattern().regexp.test(value) ||
                !this.contract.routes.has(value)
            )
                this.bad(
                    span,
                    'H3',
                    `routerLink ${JSON.stringify(value)} is not a declared application route`
                );
        }
        if (/url\(#([A-Za-z][\w-]*)\)/.test(value))
            this.fragments.push([
                /url\(#([A-Za-z][\w-]*)\)/.exec(value)[1],
                span,
            ]);
    },

    // H4 : liaisons de propriété.
    binding(element, node, scope) {
        const span = node.sourceSpan;
        const type = node.type;
        let allowed = false;
        if (type === angular.BindingType.Property)
            allowed = PROPERTIES.has(node.name) && !node.unit;
        else if (type === angular.BindingType.Attribute)
            allowed = BOUND_ATTRIBUTES.test(node.name) && !node.unit;
        else if (type === angular.BindingType.Class)
            allowed = CLASS_NAME.test(node.name) && !node.unit;
        else if (type === angular.BindingType.Style)
            allowed =
                STYLES.has(node.name) &&
                (!node.unit || STYLE_UNITS.has(node.unit));
        if (!allowed)
            return this.bad(
                span,
                'H4',
                `binding [${node.keySpan ? this.text.slice(node.keySpan.start.offset, node.keySpan.end.offset) : node.name}] is not allowed on ${element}`
            );
        this.expression(node.value, scope);
    },

    // H5 : un seul appel d'une méthode déclarée, sans `$event`.
    event(element, node, scope, form) {
        const span = node.sourceSpan;
        if (
            node.type !== angular.ParsedEventType.Regular ||
            node.target ||
            !EVENT_NAME.test(node.name)
        )
            return this.bad(
                span,
                'H5',
                `event (${node.target ? node.target + ':' : ''}${node.name}) is not allowed`
            );
        if (node.name === 'submit' && element !== 'form')
            return this.bad(span, 'H5', '(submit) belongs to form');
        const call =
            node.handler instanceof angular.ASTWithSource
                ? node.handler.ast
                : node.handler;
        const receiver =
            call instanceof angular.Call ? call.receiver : undefined;
        if (
            !(receiver instanceof angular.PropertyRead) ||
            !(receiver.receiver instanceof angular.ImplicitReceiver) ||
            receiver.receiver instanceof angular.ThisReceiver
        )
            return this.bad(
                span,
                'H5',
                'event handler is one call of a page method'
            );
        const method = this.facts.methods.get(receiver.name);
        if (!method || method.visibility !== 'protected')
            return this.bad(
                receiver.sourceSpan,
                'H5',
                `${receiver.name} is not a protected page method`
            );
        if (call.args.length !== method.params.length)
            this.bad(
                call.sourceSpan,
                'H5',
                `${receiver.name} takes ${method.params.length} argument(s)`
            );
        for (const argument of call.args) this.eventArgument(argument);
        if (node.name === 'submit') {
            if (method.returns !== 'false')
                this.bad(span, 'H5', '(submit) calls a method typed false');
            if (form) form.submits++;
        }
    },

    // H6 : argument littéral, ou `ref.value` / `ref.checked`.
    eventArgument(node) {
        if (node instanceof angular.LiteralPrimitive) return;
        if (
            node instanceof angular.PropertyRead &&
            ['value', 'checked'].includes(node.name) &&
            node.receiver instanceof angular.PropertyRead &&
            node.receiver.receiver instanceof angular.ImplicitReceiver &&
            !(node.receiver.receiver instanceof angular.ThisReceiver) &&
            this.references.has(node.receiver.name)
        )
            return;
        this.bad(
            node.sourceSpan,
            'H6',
            'event argument is a literal, ref.value or ref.checked'
        );
    },

    forLoop(node, scope) {
        this.expression(node.expression, scope);
        const inner = new Map(scope);
        for (const variable of [node.item, ...node.contextVariables]) {
            if (variable !== node.item && !CONTEXT.has(variable.value))
                this.bad(variable.sourceSpan, 'H8', '@for variable');
            if (
                this.isMember(variable.name) ||
                this.references.has(variable.name)
            )
                this.bad(
                    variable.sourceSpan,
                    'H8',
                    `@for name ${variable.name} shadows a member`
                );
            inner.set(variable.name, 'for');
        }
        const track =
            node.trackBy instanceof angular.ASTWithSource
                ? node.trackBy.ast
                : node.trackBy;
        const implicit = (read) =>
            read instanceof angular.PropertyRead &&
            read.receiver instanceof angular.ImplicitReceiver &&
            !(read.receiver instanceof angular.ThisReceiver);
        const tracked =
            (implicit(track) &&
                ['$index', node.item.name].includes(track.name)) ||
            (track instanceof angular.PropertyRead &&
                implicit(track.receiver) &&
                track.receiver.name === node.item.name &&
                !isPrototypeName(track.name));
        if (!tracked)
            this.bad(
                track.sourceSpan,
                'H8',
                'track is $index, the item, or item.n'
            );
        this.nodes(node.children, inner);
        if (node.empty) this.nodes(node.empty.children, scope);
    },

    value(ast, scope) {
        const kind = this.classify(ast, scope);
        if (kind === 'table')
            this.bad(
                ast.sourceSpan,
                'H7',
                'a table is read by key or member only'
            );
        return kind;
    },

    expression(ast, scope) {
        return this.value(
            ast instanceof angular.ASTWithSource ? ast.ast : ast,
            scope
        );
    },

    // H7 : formes de v1 §1.5, par receveur implicite seul ; dispatch fermé.
    classify(node, scope) {
        const span = node.sourceSpan;
        const implicit = (receiver) =>
            receiver instanceof angular.ImplicitReceiver &&
            !(receiver instanceof angular.ThisReceiver);
        if (node instanceof angular.ThisReceiver)
            return this.bad(span, 'H7', 'this. is not allowed') || 'invalid';
        if (node instanceof angular.ASTWithSource)
            return this.classify(node.ast, scope);
        if (node instanceof angular.Interpolation) {
            for (const expression of node.expressions)
                this.value(expression, scope);
            return 'data';
        }
        if (node instanceof angular.LiteralPrimitive) return 'data';
        if (node instanceof angular.LiteralArray) {
            for (const expression of node.expressions)
                this.value(expression, scope);
            return 'data';
        }
        if (node instanceof angular.LiteralMap) {
            const keys = new Set();
            for (const key of node.keys) {
                if (key.kind !== undefined && key.kind !== 'property')
                    this.bad(span, 'H7', 'spread in a literal map');
                if (keys.has(key.key) || isPrototypeName(key.key))
                    this.bad(span, 'H7', `map key refused: ${key.key}`);
                keys.add(key.key);
            }
            for (const value of node.values) this.value(value, scope);
            return 'data';
        }
        if (node instanceof angular.PropertyRead && implicit(node.receiver)) {
            const name = node.name;
            if (scope.has(name)) return 'data';
            if (this.references.has(name))
                return (
                    this.bad(
                        span,
                        'H6',
                        `#${name} is read only as ref.value in an event`
                    ) || 'invalid'
                );
            const field = this.facts.fields.get(name);
            if (field && field.visibility === 'protected') {
                if (field.kind === 'table') return 'table';
                return (
                    this.bad(span, 'H7', `${name} is a signal: call it`) ||
                    'invalid'
                );
            }
            if (this.facts.methods.has(name))
                return (
                    this.bad(
                        span,
                        'H7',
                        `method ${name} is used in an event only`
                    ) || 'invalid'
                );
            return this.bad(span, 'H7', `free name ${name}`) || 'invalid';
        }
        if (
            node instanceof angular.PropertyRead ||
            node instanceof angular.SafePropertyRead
        ) {
            if (isPrototypeName(node.name))
                return (
                    this.bad(span, 'H7', `prototype name ${node.name}`) ||
                    'invalid'
                );
            const kind = this.classify(node.receiver, scope);
            if (kind === 'table' && node instanceof angular.SafePropertyRead)
                this.bad(span, 'H7', 'optional table read');
            return kind === 'table' || kind === 'data' ? 'data' : 'invalid';
        }
        if (
            node instanceof angular.KeyedRead ||
            node instanceof angular.SafeKeyedRead
        ) {
            const kind = this.classify(node.receiver, scope);
            if (kind === 'table') {
                this.value(node.key, scope);
                return 'data';
            }
            if (kind !== 'data') return 'invalid';
            const key = node.key;
            if (
                !(key instanceof angular.LiteralPrimitive) ||
                !['string', 'number'].includes(typeof key.value) ||
                isPrototypeName(String(key.value))
            )
                return (
                    this.bad(
                        key.sourceSpan ?? span,
                        'H7',
                        'data is read with a literal key'
                    ) || 'invalid'
                );
            return 'data';
        }
        if (node instanceof angular.Call) {
            const receiver = node.receiver;
            const field =
                receiver instanceof angular.PropertyRead &&
                implicit(receiver.receiver) &&
                !scope.has(receiver.name)
                    ? this.facts.fields.get(receiver.name)
                    : undefined;
            if (
                !field ||
                !['signal', 'computed'].includes(field.kind) ||
                field.visibility !== 'protected' ||
                node.args.length
            )
                return (
                    this.bad(
                        span,
                        'H7',
                        'only a protected page signal is called, without argument'
                    ) || 'invalid'
                );
            return 'data';
        }
        // `Unary` hérite de `Binary` : il est jugé d'abord.
        if (node instanceof angular.Unary) {
            if (node.operator !== '-')
                this.bad(span, 'H7', `unary ${node.operator}`);
            this.value(node.expr, scope);
            return 'data';
        }
        if (node instanceof angular.Binary) {
            if (!BINARY.has(node.operation))
                this.bad(span, 'H7', `operator ${node.operation}`);
            this.value(node.left, scope);
            this.value(node.right, scope);
            return 'data';
        }
        if (node instanceof angular.PrefixNot) {
            this.value(node.expression, scope);
            return 'data';
        }
        if (node instanceof angular.Conditional) {
            this.value(node.condition, scope);
            this.value(node.trueExp, scope);
            this.value(node.falseExp, scope);
            return 'data';
        }
        if (node instanceof angular.ParenthesizedExpression)
            return this.value(node.expression, scope);
        if (node instanceof angular.BindingPipe) {
            const required = TEMPLATE_PIPES[node.name];
            if (!required)
                this.bad(span, 'H9', `pipe ${node.name} is not allowed`);
            else if (!this.facts.decoratorImports.includes(required))
                this.bad(
                    span,
                    'H9',
                    `pipe ${node.name} requires ${required} in imports`
                );
            this.value(node.exp, scope);
            for (const argument of node.args)
                if (!(argument instanceof angular.LiteralPrimitive))
                    this.bad(
                        argument.sourceSpan ?? span,
                        'H9',
                        'pipe arguments are literals'
                    );
            return 'data';
        }
        return (
            this.bad(
                span,
                'H7',
                `expression ${node.constructor.name} is not allowed`
            ) || 'invalid'
        );
    },

    // Liaisons d'hôte de `@Component` : même grammaire d'expression, situées
    // dans page.component.ts.
    host(entry) {
        if (!entry.key.startsWith('[')) return;
        const parser = new angular.Parser(new angular.Lexer());
        const file = new angular.ParseSourceFile(entry.value, 'host');
        const location = new angular.ParseLocation(file, 0, 0, 0);
        const parsed = parser.parseBinding(
            entry.value,
            new angular.ParseSourceSpan(location, location),
            entry.start
        );
        const mark = this.found.length;
        if (parserList(parsed.errors, 'host binding errors').length)
            this.bad(
                { start: entry.start, end: entry.start + entry.value.length },
                'H7',
                'host binding does not parse'
            );
        else this.value(parsed.ast, new Map());
        // Ces violations portent sur page.component.ts.
        for (let index = mark; index < this.found.length; index++) {
            const found = this.found[index];
            this.found[index] = violation(
                found.code,
                'page.component.ts',
                this.facts.text,
                found.start,
                found.end,
                `host ${entry.key}: ${found.message}`
            );
        }
    },
});

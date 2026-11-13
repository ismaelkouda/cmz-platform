// X5 C5b, LE1 et A1 (conception C5b v2, §1-§3) : dans la classe d'une page à
// lectures, l'état, les lignes, `online` et chaque texte d'absence se lisent
// par UN point d'accès : un `computed` protégé dont le corps est exactement
// le membre de la composition. Le champ de composition est désigné par son
// SYMBOLE (l'unique `inject(PageComposition)`, T7), jamais par un nom fixé.
// Toute autre lecture de ces membres (alias, déstructuration, accès indexé,
// argument, nœud entier, calcul dérivé d'un point d'accès) est refusée.
import ts from 'typescript';

import { violation } from './text.mjs';

const compact = (text) => text.replace(/\s+/g, '');

export function readClassViolations(grammar, reads) {
    const found = [];
    const file = grammar.name ?? 'page.component.ts';
    const text = grammar.text;
    const bad = (node, code, message) =>
        found.push(
            violation(
                code,
                file,
                text,
                node ? node.getStart() : 0,
                node ? node.getEnd() : 0,
                message
            )
        );
    const field = grammar.compositionField;
    if (!field) {
        bad(
            undefined,
            'LE1',
            'PAGE_READ_MEMBER_ALIAS: a page with reads has one inject(PageComposition) field'
        );
        return found;
    }
    // Points d'accès attendus : nom → corps exact.
    const expected = new Map([
        [reads.online, { code: 'LE1', body: `this.${field}.online()` }],
    ]);
    const readMembers = new Set();
    for (const read of reads.reads) {
        readMembers.add(read.member);
        expected.set(read.state, {
            code: 'LE1',
            body: `this.${field}.${read.member}.state()`,
        });
        expected.set(read.items, {
            code: 'LE1',
            body: `this.${field}.${read.member}.items()`,
        });
        for (const binding of read.bindings)
            if (binding.absent)
                expected.set(binding.absent, {
                    code: 'A1',
                    body: `this.${field}.absentText.${binding.liaison}`,
                });
    }
    const accessOf = new Map();
    for (const [name, { code, body }] of expected) {
        const entry = grammar.fields.get(name);
        if (
            entry?.kind !== 'computed' ||
            entry.visibility !== 'protected' ||
            !entry.body ||
            compact(entry.body.getText()) !== body
        ) {
            bad(
                entry?.node,
                code,
                `${code === 'A1' ? 'PAGE_ABSENT_ACCESS' : 'PAGE_READ_MEMBER_ALIAS'}: declare protected readonly ${name} = computed(() => ${body})`
            );
            continue;
        }
        accessOf.set(entry.body, name);
    }
    const isAccess = (node, name) =>
        accessOf.get(node) === name && expected.has(name);
    const alias = (node, code = 'LE1') =>
        bad(
            node,
            code,
            `${code === 'A1' ? 'PAGE_ABSENT_ACCESS' : 'PAGE_READ_MEMBER_ALIAS'}: read this member only through its access computed`
        );
    const callOf = (node) =>
        ts.isCallExpression(node.parent) &&
        node.parent.expression === node &&
        node.parent.arguments.length === 0
            ? node.parent
            : undefined;
    // `this.<champ>.<racine>…` : chaque occurrence du champ de composition.
    const composition = (node) => {
        const root = node.parent;
        if (!ts.isPropertyAccessExpression(root) || root.expression !== node)
            return alias(node);
        const name = root.name.text;
        if (name === 'online') {
            const call = callOf(root);
            if (!call || !isAccess(call, reads.online)) alias(root);
            return undefined;
        }
        if (name === 'absentText') {
            const member = root.parent;
            if (
                !ts.isPropertyAccessExpression(member) ||
                member.expression !== root ||
                !accessOf.has(member)
            )
                alias(root, 'A1');
            return undefined;
        }
        if (!readMembers.has(name)) return undefined;
        const member = root.parent;
        if (
            !ts.isPropertyAccessExpression(member) ||
            member.expression !== root
        )
            return alias(root);
        const kind = member.name.text;
        if (kind !== 'state' && kind !== 'items') return undefined;
        const call = callOf(member);
        const target = reads.reads.find((read) => read.member === name)[kind];
        if (!call || !isAccess(call, target)) alias(member);
        return undefined;
    };
    // Aucun usage d'un point d'accès dans la classe : il n'est lu que par le
    // gabarit (pas de calcul dérivé des lignes, de l'état ou du texte).
    const accessNames = new Set(expected.keys());
    const visit = (node) => {
        if (
            ts.isElementAccessExpression(node) &&
            node.expression.kind === ts.SyntaxKind.ThisKeyword
        )
            alias(node);
        if (
            ts.isPropertyAccessExpression(node) &&
            node.expression.kind === ts.SyntaxKind.ThisKeyword
        ) {
            if (node.name.text === field) composition(node);
            else if (accessNames.has(node.name.text))
                bad(
                    node,
                    expected.get(node.name.text).code,
                    `${expected.get(node.name.text).code === 'A1' ? 'PAGE_ABSENT_ACCESS' : 'PAGE_READ_MEMBER_ALIAS'}: ${node.name.text} is read by the template only`
                );
        }
        ts.forEachChild(node, visit);
    };
    for (const entry of [
        ...grammar.fields.values(),
        ...grammar.methods.values(),
    ])
        visit(entry.node);
    return found;
}

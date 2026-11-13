// X5 C5b, LE2–LE6 et A2–A4 (conception C5b v2) : gabarit d'une page à
// lectures. Les usages PERMIS des points d'accès sont marqués pendant le
// parcours de l'arbre R3 (gardes d'aiguillage, `@for` des lignes, formes F1 et
// F2 du texte d'absence) ; toute autre occurrence est refusée, nommée.
// Limite écrite : le masquage par classe ou par la feuille de style relève de
// N5-navigateur (visibilité calculée, C6).
import * as angular from '@angular/compiler';

import { violation } from './text.mjs';

const ABSENT_CODES = {
    A2: 'PAGE_ABSENT_FIELD_UNGUARDED',
    A4: 'PAGE_ABSENT_HIDDEN',
};
const HIDDEN_ATTRIBUTES = new Set(['hidden', 'aria-hidden']);
// B-C5b-1 : [hidden], [style], [attr.hidden], [attr.aria-hidden], [attr.style],
// et TOUTE liaison de style (`[style.<prop>]`) : la liste des propriétés de
// style admises par la grammaire en contient d'autres qui masquent.
const HIDDEN_INPUTS = new Map([
    [angular.BindingType.Property, new Set(['hidden', 'style'])],
    [
        angular.BindingType.Attribute,
        new Set(['hidden', 'aria-hidden', 'style']),
    ],
]);

const unwrap = (ast) => (ast instanceof angular.ASTWithSource ? ast.ast : ast);
// Nom appelé sans argument par receveur implicite : `name()`.
const calledName = (ast) =>
    ast instanceof angular.Call &&
    ast.args.length === 0 &&
    ast.receiver instanceof angular.PropertyRead &&
    ast.receiver.receiver instanceof angular.ImplicitReceiver
        ? ast.receiver.name
        : undefined;
const isLiteral = (ast, value) =>
    ast instanceof angular.LiteralPrimitive && ast.value === value;

// Parcours générique d'une expression, avec son parent.
function eachAst(ast, parent, visit) {
    ast = unwrap(ast);
    if (!(ast instanceof angular.AST)) return;
    visit(ast, parent);
    for (const [key, value] of Object.entries(ast)) {
        if (key === 'sourceSpan' || key === 'span' || key.endsWith('Span'))
            continue;
        for (const child of Array.isArray(value) ? value : [value])
            if (child instanceof angular.AST) eachAst(child, ast, visit);
    }
}

// Premier attribut ou liaison de masquage sur les ancêtres.
function hiding(elements) {
    for (const element of elements) {
        if (element.i18n) return [element, 'i18n'];
        for (const attribute of element.attributes ?? [])
            if (
                HIDDEN_ATTRIBUTES.has(attribute.name) ||
                attribute.i18n ||
                attribute.name.startsWith('i18n')
            )
                return [element, attribute.name];
        for (const input of element.inputs ?? [])
            if (
                input.type === angular.BindingType.Style ||
                HIDDEN_INPUTS.get(input.type)?.has(input.name)
            )
                return [
                    element,
                    `[${input.keySpan?.toString() ?? input.name}]`,
                ];
    }
    return undefined;
}

export function readTemplateViolations(file, text, nodes, reads) {
    const found = [];
    const at = (span, code, message) =>
        found.push(violation(code, file, text, span.start, span.end, message));
    const r3 = (node) => ({
        start: node.sourceSpan.start.offset,
        end: node.sourceSpan.end.offset,
    });
    const byState = new Map(reads.reads.map((read) => [read.state, read]));
    const byItems = new Map(reads.reads.map((read) => [read.items, read]));
    const byAbsent = new Map();
    for (const read of reads.reads)
        for (const binding of read.bindings)
            if (binding.absent) byAbsent.set(binding.absent, read);
    const absentTexts = new Set(reads.absentTexts);
    const valid = new Set();
    const sites = [];
    const structures = new Map();
    let offline = 0;

    // Garde d'état : `<state>() === 'x'` ou `||` de telles égalités.
    const guardStates = (ast, read) => {
        ast = unwrap(ast);
        if (ast instanceof angular.Binary && ast.operation === '||') {
            const left = guardStates(ast.left, read);
            const right = guardStates(ast.right, read);
            return left && right ? [...left, ...right] : undefined;
        }
        if (
            ast instanceof angular.Binary &&
            ast.operation === '===' &&
            calledName(ast.left) === read.state &&
            ast.right instanceof angular.LiteralPrimitive &&
            typeof ast.right.value === 'string'
        ) {
            valid.add(ast.left);
            return [ast.right.value];
        }
        return undefined;
    };
    const readOfGuard = (ast) => {
        let read;
        eachAst(ast, undefined, (node) => {
            read ??= byState.get(calledName(node));
        });
        return read;
    };
    // D-C5b-1 : une branche non vide REND du texte (texte non blanc ou
    // interpolation) ; un élément vide décoratif ne suffit pas.
    const nonEmpty = (children) =>
        children.some(
            (child) =>
                (child instanceof angular.TmplAstText && child.value.trim()) ||
                child instanceof angular.TmplAstBoundText ||
                nonEmpty([
                    ...(child.children ?? []),
                    ...(child.branches ?? []).flatMap(
                        (entry) => entry.children
                    ),
                    ...(child.groups ?? []).flatMap((entry) => entry.children),
                ])
        );
    // Un seul aiguillage par lecture : un second, imbriqué (doublon) ou voisin
    // (code mort ou doublon), est refusé ; ses gardes tombent sous LE4.
    const duplicate = (node, read) =>
        at(
            r3(node),
            'LE2',
            `PAGE_READ_STATE_BRANCH_DUPLICATE: a second @if or @switch over ${read.state}() (nested or sibling)`
        );
    // Aiguillage d'une lecture : branches, couverture, masquage (LE2, LE3).
    const structure = (node, read, branches, env) => {
        if (structures.has(read.member)) return false;
        structures.set(read.member, node);
        if (env.placement === 'other')
            at(
                r3(node),
                'LE2',
                `PAGE_READ_STATE_BRANCH_PLACEMENT: the branches of ${read.state} sit at the page root, in the offline @else or in a branch of another read`
            );
        const seen = new Map();
        for (const { span, states, children, isDefault } of branches) {
            if (isDefault) {
                at(
                    span,
                    'LE2',
                    `PAGE_READ_STATE_BRANCH_DEFAULT: ${read.state} has no @default or final @else`
                );
                continue;
            }
            if (!states) continue;
            if (!nonEmpty(children))
                at(
                    span,
                    'LE2',
                    `PAGE_READ_STATE_BRANCH_EMPTY: branch ${states.join(', ')} of ${read.state} is empty`
                );
            if (states.includes('success') && states.length !== 1)
                at(
                    span,
                    'LE3',
                    `PAGE_READ_ROWS_GUARD: the success branch of ${read.state} is guarded by === 'success' alone`
                );
            for (const state of states)
                if (seen.has(state) || !read.states.includes(state))
                    at(
                        span,
                        'LE2',
                        `PAGE_READ_STATE_BRANCH_DUPLICATE: state ${state} of ${read.state} is in more than one branch or unknown`
                    );
                else seen.set(state, true);
        }
        const missing = read.states.filter((state) => !seen.has(state));
        if (missing.length)
            at(
                r3(node),
                'LE2',
                `PAGE_READ_STATE_BRANCH_MISSING: ${read.state} has no branch for ${missing.join(', ')}`
            );
        const hidden = hiding(env.elements);
        if (hidden)
            at(
                r3(hidden[0]),
                'LE2',
                `PAGE_READ_STATE_BRANCH_HIDDEN: ${hidden[1]} on an ancestor of the branches of ${read.state}`
            );
        return true;
    };
    // F2 : `@if (r.f === null || r.f === undefined) { … } @else { … }`.
    const f2 = (node, env) => {
        const [then, other] = node.branches;
        if (node.branches.length !== 2 || other.expression) return undefined;
        const ast = unwrap(then.expression);
        if (!(ast instanceof angular.Binary) || ast.operation !== '||')
            return undefined;
        const side = (equality, value) =>
            equality instanceof angular.Binary &&
            equality.operation === '===' &&
            isLiteral(equality.right, value)
                ? fieldRead(equality.left, env)
                : undefined;
        const left = side(ast.left, null);
        const right = side(ast.right, undefined);
        if (!left || !right || left.key !== right.key) return undefined;
        valid.add(ast.left.left);
        valid.add(ast.right.left);
        return left;
    };
    // `alias.f` d'une ligne, f champ absent de sa lecture.
    const fieldRead = (ast, env) => {
        ast = unwrap(ast);
        if (
            !(
                ast instanceof angular.PropertyRead ||
                ast instanceof angular.SafePropertyRead
            ) ||
            !(ast.receiver instanceof angular.PropertyRead) ||
            !(ast.receiver.receiver instanceof angular.ImplicitReceiver)
        )
            return undefined;
        const read = env.aliases.get(ast.receiver.name);
        if (!read?.absentFields.has(ast.name)) return undefined;
        return { read, key: `${ast.receiver.name}.${ast.name}` };
    };

    const walk = (list, env) => {
        for (const node of list) {
            const site = (ast, kind, extra = env) =>
                ast && sites.push({ ast, kind, env: extra });
            if (node instanceof angular.TmplAstElement) {
                const hidden = env.inBranch && hiding([node]);
                if (hidden)
                    at(
                        r3(node),
                        'LE2',
                        `PAGE_READ_STATE_BRANCH_HIDDEN: ${hidden[1]} inside a state or offline branch`
                    );
                for (const input of node.inputs) site(input.value, 'attr');
                for (const output of node.outputs)
                    site(output.handler, 'event');
                walk(node.children, {
                    ...env,
                    elements: [...env.elements, node],
                });
            } else if (node instanceof angular.TmplAstBoundText) {
                site(node.value, 'text');
            } else if (node instanceof angular.TmplAstIfBlock) {
                const first = unwrap(node.branches[0].expression);
                const guarded = readOfGuard(first);
                // Un second aiguillage de la même lecture n'est pas marqué :
                // ses lectures d'état tombent sous LE4.
                const read =
                    guarded && !structures.has(guarded.member)
                        ? guarded
                        : undefined;
                if (guarded && !read) duplicate(node, guarded);
                const isOffline =
                    first instanceof angular.Binary &&
                    first.operation === '===' &&
                    calledName(first.left) === reads.online &&
                    isLiteral(first.right, false);
                const absent =
                    !guarded && !isOffline ? f2(node, env) : undefined;
                if (read) {
                    const branches = node.branches.map((branch) => ({
                        span: r3(branch),
                        states: branch.expression
                            ? guardStates(branch.expression, read)
                            : undefined,
                        isDefault: !branch.expression,
                        children: branch.children,
                    }));
                    const main = structure(node, read, branches, env);
                    node.branches.forEach((branch, index) => {
                        site(branch.expression, 'if');
                        walk(
                            branch.children,
                            main
                                ? {
                                      ...env,
                                      placement: 'governed',
                                      inBranch: true,
                                      branch: {
                                          read,
                                          states: branches[index].states ?? [],
                                      },
                                  }
                                : { ...env, placement: 'other', branch: null }
                        );
                    });
                    continue;
                }
                const offlineMain = isOffline && offline++ === 0;
                if (offlineMain) {
                    valid.add(first.left);
                    if (env.placement !== 'root')
                        at(
                            r3(node),
                            'LE6',
                            'PAGE_READ_OFFLINE_BRANCH: the offline branch sits at the page root'
                        );
                    const hidden = hiding(env.elements);
                    if (hidden)
                        at(
                            r3(hidden[0]),
                            'LE2',
                            `PAGE_READ_STATE_BRANCH_HIDDEN: ${hidden[1]} on an ancestor of the offline branch`
                        );
                    if (!nonEmpty(node.branches[0].children))
                        at(
                            r3(node.branches[0]),
                            'LE6',
                            'PAGE_READ_OFFLINE_BRANCH: the offline branch is empty'
                        );
                }
                node.branches.forEach((branch, index) => {
                    site(branch.expression, 'if');
                    // Garde gouvernante la plus proche : pas celle du succès.
                    // Hors ligne : la branche ALORS est un état ; son @else
                    // peut porter l'aiguillage d'une lecture.
                    const governed = !offlineMain
                        ? { ...env, placement: 'other', branch: null }
                        : index === 0
                          ? {
                                ...env,
                                placement: 'other',
                                inBranch: true,
                                branch: null,
                            }
                          : { ...env, placement: 'governed', branch: null };
                    const inner = !absent
                        ? governed
                        : index === 0
                          ? { ...governed, f2Then: absent }
                          : {
                                ...governed,
                                f2Else: new Set([...env.f2Else, absent.key]),
                            };
                    walk(branch.children, inner);
                });
                if (
                    absent &&
                    !inner2Sink(node.branches[0].children, absent.read)
                )
                    at(
                        r3(node.branches[0]),
                        'A2',
                        `${ABSENT_CODES.A2}: the absent branch of ${absent.key} shows its absent text`
                    );
            } else if (node instanceof angular.TmplAstSwitchBlock) {
                site(node.expression, 'switch');
                const candidate = byState.get(
                    calledName(unwrap(node.expression))
                );
                const read =
                    candidate && !structures.has(candidate.member)
                        ? candidate
                        : undefined;
                if (candidate && !read) duplicate(node, candidate);
                let main = false;
                if (read) {
                    valid.add(unwrap(node.expression));
                    main = structure(
                        node,
                        read,
                        node.groups.map((group) => ({
                            span: r3(group),
                            isDefault: group.cases.some(
                                (entry) => !entry.expression
                            ),
                            states: group.cases.every(
                                (entry) =>
                                    entry.expression &&
                                    typeof unwrap(entry.expression).value ===
                                        'string'
                            )
                                ? group.cases.map(
                                      (entry) => unwrap(entry.expression).value
                                  )
                                : undefined,
                            children: group.children,
                        })),
                        env
                    );
                }
                for (const group of node.groups) {
                    for (const entry of group.cases)
                        site(entry.expression, 'case');
                    const states = group.cases.map(
                        (entry) => unwrap(entry.expression)?.value
                    );
                    walk(
                        group.children,
                        main
                            ? {
                                  ...env,
                                  placement: 'governed',
                                  inBranch: true,
                                  branch: { read, states },
                              }
                            : { ...env, placement: 'other', branch: null }
                    );
                }
            } else if (node instanceof angular.TmplAstForLoopBlock) {
                const expression = unwrap(node.expression);
                const read = byItems.get(calledName(expression));
                const rows =
                    read &&
                    env.branch?.read === read &&
                    env.branch.states.length === 1 &&
                    env.branch.states[0] === 'success';
                if (rows) valid.add(expression);
                site(node.expression, 'for');
                site(node.trackBy, 'track');
                walk(
                    node.children,
                    rows
                        ? {
                              ...env,
                              placement: 'other',
                              aliases: new Map([
                                  ...env.aliases,
                                  [node.item.name, read],
                              ]),
                          }
                        : { ...env, placement: 'other' }
                );
                if (node.empty)
                    walk(node.empty.children, { ...env, placement: 'other' });
            } else if (node instanceof angular.TmplAstLetDeclaration) {
                site(node.value, 'let');
            } else if (node.children) {
                walk(node.children, env);
            }
        }
    };
    // La branche « absent » de F2 montre le texte d'absence de sa lecture.
    const inner2Sink = (children, read) => {
        let shown = false;
        const look = (list) => {
            for (const child of list) {
                if (child instanceof angular.TmplAstBoundText) {
                    const interpolation = unwrap(child.value);
                    if (
                        interpolation.expressions?.length === 1 &&
                        byAbsent.get(
                            calledName(interpolation.expressions[0])
                        ) === read
                    )
                        shown = true;
                }
                if (child.children) look(child.children);
            }
        };
        look(children);
        return shown;
    };
    // `placement` : où un aiguillage peut se placer (racine, @else du hors
    // ligne, branche d'une autre lecture) ; `inBranch` : dans une branche
    // d'état ou hors ligne, où aucun élément ne peut masquer.
    walk(nodes, {
        elements: [],
        placement: 'root',
        inBranch: false,
        branch: null,
        aliases: new Map(),
        f2Then: null,
        f2Else: new Set(),
    });

    for (const read of reads.reads)
        if (!structures.has(read.member))
            at(
                { start: 0, end: 0 },
                'LE2',
                `PAGE_READ_STATE_BRANCH_MISSING: no @if or @switch over ${read.state}()`
            );
    if (offline === 0)
        at(
            { start: 0, end: 0 },
            'LE6',
            `PAGE_READ_OFFLINE_BRANCH: one branch guarded by ${reads.online}() === false`
        );

    // Expressions : chaque occurrence d'un point d'accès ou d'un champ absent.
    for (const { ast, kind, env } of sites)
        eachAst(ast, undefined, (node, parent) => {
            if (
                node instanceof angular.LiteralPrimitive &&
                typeof node.value === 'string' &&
                absentTexts.has(node.value.trim())
            )
                at(
                    node.sourceSpan,
                    'A3',
                    'PAGE_ABSENT_TEXT_COPY: a string literal copies an absent text'
                );
            const field = fieldRead(node, env);
            if (
                node instanceof angular.TemplateLiteralElement &&
                absentTexts.has(node.text.trim())
            )
                at(
                    node.sourceSpan,
                    'A3',
                    'PAGE_ABSENT_TEXT_COPY: a template literal copies an absent text'
                );
            if (
                field &&
                !valid.has(node) &&
                !env.f2Else.has(field.key) &&
                !f1(node, parent, kind, field.read, env)
            )
                at(
                    node.sourceSpan,
                    'A2',
                    `${ABSENT_CODES.A2}: ${field.key} can be absent; show it as ${field.key} ?? <absent>() or under its null/undefined @if`
                );
            if (
                !(node instanceof angular.PropertyRead) ||
                !(node.receiver instanceof angular.ImplicitReceiver)
            )
                return;
            // B-C5b-2 : une ligne se lit champ par champ (`row.f`, `row?.f`) ;
            // accès indexé, ligne entière et alias `@let` refusés.
            if (env.aliases.has(node.name)) {
                const field =
                    (parent instanceof angular.PropertyRead ||
                        parent instanceof angular.SafePropertyRead) &&
                    parent.receiver === node;
                if (kind === 'let')
                    at(
                        node.sourceSpan,
                        'LE5',
                        `PAGE_READ_LET_ALIAS: no @let of a row or of its fields (${node.name})`
                    );
                else if (!field && kind !== 'track')
                    at(
                        node.sourceSpan,
                        'LE5',
                        `PAGE_READ_ROW_ACCESS: the row ${node.name} is read field by field, never indexed or whole`
                    );
            }
            const call =
                parent instanceof angular.Call &&
                parent.receiver === node &&
                parent.args.length === 0
                    ? parent
                    : undefined;
            const span = (call ?? node).sourceSpan;
            const name = node.name;
            if (byState.has(name) && !valid.has(call))
                at(
                    span,
                    'LE4',
                    `PAGE_READ_STATE_OUTSIDE_GUARD: ${name}() only in a branch guard or as the @switch expression`
                );
            if (
                byItems.has(name) &&
                !valid.has(call) &&
                !(call && lengthOf(call))
            )
                at(
                    span,
                    'LE5',
                    `PAGE_READ_ROWS_OUTSIDE_SUCCESS: ${name}() only as the @for of the success branch, or ${name}().length`
                );
            if (name === reads.online && !valid.has(call))
                at(
                    span,
                    'LE6',
                    `PAGE_READ_OFFLINE_BRANCH: ${name}() only in the offline guard`
                );
            if (byAbsent.has(name) && !valid.has(call)) {
                const sink =
                    call &&
                    kind === 'text' &&
                    env.f2Then?.read === byAbsent.get(name) &&
                    parent &&
                    isSoleInterpolation(ast, call);
                if (!sink)
                    at(
                        span,
                        'A2',
                        `PAGE_ABSENT_SINK: ${name}() only as text, right of ?? on its field or alone in the absent branch`
                    );
                else markSink(call, env);
            }
        });

    // `<items>().length` : parent PropertyRead `length` de l'appel.
    function lengthOf(call) {
        let ok = false;
        for (const { ast } of sites)
            eachAst(ast, undefined, (node) => {
                if (
                    node instanceof angular.PropertyRead &&
                    node.receiver === call &&
                    node.name === 'length'
                )
                    ok = true;
            });
        return ok;
    }
    function isSoleInterpolation(root, call) {
        const interpolation = unwrap(root);
        return (
            interpolation instanceof angular.Interpolation &&
            interpolation.expressions.length === 1 &&
            interpolation.expressions[0] === call
        );
    }
    function markSink(call, env) {
        valid.add(call);
        const hidden = hiding(env.elements);
        if (hidden)
            at(
                call.sourceSpan,
                'A4',
                `${ABSENT_CODES.A4}: ${hidden[1]} on an ancestor of an absent text`
            );
    }
    // F1 : `{{ r.f ?? <absent>() }}`, pipe permis sur r.f, interpolation de texte.
    function f1(node, parent, kind, read, env) {
        if (kind !== 'text') return false;
        // Gauche : le champ, éventuellement sous un pipe et des parenthèses.
        let left = node;
        let binary = parent;
        while (
            (binary instanceof angular.BindingPipe && binary.exp === left) ||
            (binary instanceof angular.ParenthesizedExpression &&
                binary.expression === left)
        ) {
            left = binary;
            binary = parentOf(binary);
        }
        if (
            !(binary instanceof angular.Binary) ||
            binary.operation !== '??' ||
            binary.left !== left
        )
            return false;
        const name = calledName(binary.right);
        if (byAbsent.get(name) !== read) return false;
        if (!(parentOf(binary) instanceof angular.Interpolation)) return false;
        markSink(binary.right, env);
        return true;
    }
    function parentOf(target) {
        let found;
        for (const { ast } of sites)
            eachAst(ast, undefined, (node, parent) => {
                if (node === target) found = parent;
            });
        return found;
    }

    // A3 : textes et attributs statiques, valeurs décodées.
    const statics = (list) => {
        for (const node of list) {
            if (
                node instanceof angular.TmplAstText &&
                absentTexts.has(node.value.trim())
            )
                at(
                    r3(node),
                    'A3',
                    'PAGE_ABSENT_TEXT_COPY: a text copies an absent text'
                );
            for (const attribute of node.attributes ?? [])
                if (absentTexts.has(String(attribute.value).trim()))
                    at(
                        r3(attribute),
                        'A3',
                        'PAGE_ABSENT_TEXT_COPY: an attribute copies an absent text'
                    );
            for (const child of [
                ...(node.children ?? []),
                ...(node.branches ?? []).flatMap((branch) => branch.children),
                ...(node.groups ?? []).flatMap((group) => group.children),
                ...(node.empty?.children ?? []),
            ])
                statics([child]);
        }
    };
    statics(nodes);
    return found;
}

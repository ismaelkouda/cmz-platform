// X4-sécurité-3, O-C (§4.3) : contrôles hors bande, sur le texte brut.
// Les trivia ne sont pas des nœuds : elles sont jugées entre les jetons, genre
// par genre, et les caractères invisibles le sont dans les trois fichiers.
import ts from 'typescript';

// Violation située d'une page : code de règle, fichier, intervalle et texte.
export function violation(code, file, text, start, end, message) {
    const before = text.slice(0, start).split('\n');
    const line = before.length;
    const column = before[before.length - 1].length + 1;
    return Object.freeze({ code, file, start, end, line, column, message });
}

export const formatViolation = (entry) =>
    `grammar:${entry.code} ${entry.file}:${entry.line}:${entry.column} @${entry.start}-${entry.end} ${entry.message}`;

// Sous-classes de caractères refusés, nommées pour les tests (C-3).
export const REFUSED_CHARACTER_CLASSES = Object.freeze({
    format: /\p{Cf}/u,
    'line-separator': /[\u2028\u2029]/u,
    control: /(?![\t\n\r])\p{Cc}/u,
});

// T2 : catégorie Unicode Cf, séparateurs U+2028 et U+2029, contrôles C0 et C1
// hors tabulation, saut de ligne et retour chariot. La base Unicode est celle
// de Node, épinglée par `engines`.
export function characterViolations(file, text) {
    const found = [];
    let offset = 0;
    for (const character of text) {
        for (const [label, pattern] of Object.entries(
            REFUSED_CHARACTER_CLASSES
        ))
            if (pattern.test(character)) {
                const code = character
                    .codePointAt(0)
                    .toString(16)
                    .toUpperCase();
                found.push(
                    violation(
                        'T2',
                        file,
                        text,
                        offset,
                        offset + character.length,
                        `invisible or control character U+${code.padStart(4, '0')} (${label})`
                    )
                );
                break;
            }
        offset += character.length;
    }
    return found;
}

// Genres de trivia de l'énuméré réel de TypeScript, itérés et non recopiés.
export function triviaKinds(module = ts) {
    return Object.keys(module.SyntaxKind)
        .filter(
            (name) =>
                Number.isNaN(Number(name)) &&
                /Trivia$/.test(name) &&
                !/^(?:First|Last)/.test(name)
        )
        .map((name) => ({ name, kind: module.SyntaxKind[name] }))
        .sort((left, right) => left.kind - right.kind);
}

const ALLOWED_TRIVIA = new Set(['WhitespaceTrivia', 'NewLineTrivia']);
const WHITESPACE = /^[ \t\n\r]*$/;

// Feuilles de l'arbre, jetons compris, dans l'ordre du texte. Les nœuds JSDoc
// sont des commentaires : ils restent dans les écarts, jugés comme trivia.
const isJSDoc = (node) =>
    node.kind >= ts.SyntaxKind.FirstJSDocNode &&
    node.kind <= ts.SyntaxKind.LastJSDocNode;
export function leaves(file) {
    const found = [];
    const visit = (node) => {
        if (isJSDoc(node)) return;
        const children = node.getChildren(file);
        if (children.length === 0) found.push(node);
        else for (const child of children) visit(child);
    };
    visit(file);
    return found;
}

// T1 : entre deux jetons, seules les trivia d'espacement sont permises, et
// leurs caractères sont U+0020, U+0009, U+000A et U+000D. Chaque autre genre
// est refusé par son nom, sans liste de directives.
export function triviaViolations(file, name) {
    const text = file.text;
    const found = [];
    const kinds = new Map(
        triviaKinds().map(({ name: label, kind }) => [kind, label])
    );
    let previous = 0;
    for (const leaf of leaves(file)) {
        const start = previous;
        const end =
            leaf.kind === ts.SyntaxKind.EndOfFileToken
                ? leaf.end
                : leaf.getStart(file);
        previous = Math.max(previous, leaf.end);
        if (end <= start) continue;
        const gap = text.slice(start, end);
        const scanner = ts.createScanner(
            ts.ScriptTarget.Latest,
            false,
            ts.LanguageVariant.Standard,
            gap
        );
        // Le balayeur ne reconnaît le shebang qu'en tête : le texte de l'écart
        // part bien de la position réelle.
        let kind;
        while ((kind = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
            const label = kinds.get(kind) ?? ts.SyntaxKind[kind];
            const from = start + scanner.getTokenStart();
            const to = start + scanner.getTokenEnd();
            if (
                !ALLOWED_TRIVIA.has(label) ||
                !WHITESPACE.test(text.slice(from, to))
            )
                found.push(
                    violation(
                        'T1',
                        name,
                        text,
                        from,
                        to,
                        `trivia not allowed: ${label}`
                    )
                );
        }
    }
    for (const [label, value] of [
        ['pragmas', file.pragmas?.size ?? 0],
        ['referencedFiles', file.referencedFiles.length],
        ['typeReferenceDirectives', file.typeReferenceDirectives.length],
        ['libReferenceDirectives', file.libReferenceDirectives.length],
    ])
        if (value !== 0)
            found.push(
                violation('T1', name, text, 0, 0, `${label} must be empty`)
            );
    return found;
}

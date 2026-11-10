// X4 : règles d'une réalisation de page extérieure, vérifiées avant toute
// publication. Apparence libre ; aucun réseau direct, aucune règle ni contrôle
// inventés, mécanique générée seulement (la page passe par sa composition).
import ts from 'typescript';

import { validatePageRealizationEvidence } from './page-realization-verification.mjs';

// Mêmes interdits que le mode atelier, étendus au stockage et à l'évaluation :
// la session et le réseau appartiennent à la mécanique générée.
export const FORBIDDEN_PATTERNS = Object.freeze([
    ['direct network access', /\bHttpClient\b/],
    ['direct network access', /\bXMLHttpRequest\b/],
    ['direct network access', /\bfetch\s*\(/],
    ['direct network access', /\baxios\b/],
    ['direct network access', /\bWebSocket\b/],
    ['direct network access', /\bEventSource\b/],
    ['direct network access', /\bsendBeacon\b/],
    ['direct network access', /https?:\/\//],
    ['browser storage', /\blocalStorage\b/],
    ['browser storage', /\bsessionStorage\b/],
    ['browser storage', /\bindexedDB\b/],
    ['browser storage', /\bdocument\.cookie\b/],
    ['dynamic code', /\beval\s*\(/],
    ['dynamic code', /\bnew\s+Function\s*\(/],
    ['security bypass', /\bbypassSecurityTrust/],
]);

export const PAGE_PACKAGES = Object.freeze([
    '@angular/common',
    '@angular/core',
    '@angular/core/rxjs-interop',
    '@angular/router',
    'rxjs',
]);
export const TEST_PACKAGES = Object.freeze([
    '@angular/core/testing',
    '@angular/platform-browser',
    'vitest',
]);

const CMZ_ID = /data-cmz-id\s*=\s*["']([^"']*)["']/g;

function contractIds(page) {
    return new Set([
        ...page.states.map((entry) => entry.id),
        ...page.controls.map((entry) => entry.id),
        ...page.actions.map((entry) => entry.id),
        ...page.data_bindings.map((entry) => entry.id),
        ...page.regions.map((entry) => entry.id),
        ...page.regions.flatMap((region) =>
            region.elements.map((entry) => entry.id)
        ),
    ]);
}

// Spécificateurs de module d'un fichier TypeScript : imports, réexportations,
// imports dynamiques et `require`, lus dans la syntaxe.
export function moduleSpecifiers(name, source) {
    const file = ts.createSourceFile(
        name,
        source,
        ts.ScriptTarget.ES2022,
        true
    );
    const found = [];
    const visit = (node) => {
        if (
            (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
            node.moduleSpecifier &&
            ts.isStringLiteral(node.moduleSpecifier)
        )
            found.push({ specifier: node.moduleSpecifier.text, node });
        else if (ts.isImportEqualsDeclaration(node))
            found.push({ specifier: null, dynamic: true });
        else if (
            ts.isCallExpression(node) &&
            (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
                (ts.isIdentifier(node.expression) &&
                    node.expression.text === 'require'))
        )
            found.push({ specifier: null, dynamic: true });
        ts.forEachChild(node, visit);
    };
    visit(file);
    return found;
}

function importedNames(node) {
    const bindings = node.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) return [];
    return bindings.elements.map(
        (element) => (element.propertyName ?? element.name).text
    );
}

// Violations d'un brouillon de réalisation au regard de son bon de travail.
// `files` : nom → octets (Buffer). Chaque violation est un texte fermé.
export function realizationViolations({
    files,
    workOrder,
    pageContract,
    pageContractSha256,
    evidenceSchema,
}) {
    const violations = [];
    const names = Object.keys(files).sort();
    const allowed = workOrder.allowed_files;
    for (const name of names)
        if (!allowed.includes(name))
            violations.push(
                `file not allowed by the work order: ${JSON.stringify(name)}`
            );
    for (const name of allowed)
        if (!names.includes(name))
            violations.push(`page file is missing: ${name}`);
    const text = {};
    for (const name of names.filter((entry) => allowed.includes(entry))) {
        try {
            text[name] = new TextDecoder('utf-8', { fatal: true }).decode(
                files[name]
            );
        } catch {
            violations.push(`page file is not UTF-8 text: ${name}`);
        }
    }
    const code = Object.keys(text).filter((name) =>
        /\.(?:ts|html|scss)$/.test(name)
    );
    for (const name of code)
        for (const [label, pattern] of FORBIDDEN_PATTERNS)
            if (pattern.test(text[name]))
                violations.push(`${label} forbidden in ${name}: ${pattern}`);
    for (const name of code)
        for (const literal of workOrder.forbidden_literals)
            if (text[name].includes(literal))
                violations.push(
                    `endpoint literal forbidden in ${name}: ${literal}`
                );
    // Mécanique générée seulement : imports fermés, composition montée.
    const local = new Set(
        allowed
            .filter((name) => /\.ts$/.test(name) && !/\.spec\.ts$/.test(name))
            .map((name) => `./${name.replace(/\.ts$/, '')}`)
    );
    const composition = workOrder.composition.module;
    let mounted = false;
    for (const name of Object.keys(text).filter((entry) =>
        entry.endsWith('.ts')
    )) {
        const test = name.endsWith('.spec.ts');
        for (const found of moduleSpecifiers(name, text[name])) {
            if (found.dynamic) {
                violations.push(`dynamic import forbidden in ${name}`);
                continue;
            }
            const { specifier } = found;
            const allowedSpecifier =
                specifier === composition ||
                local.has(specifier) ||
                workOrder.allowed_imports.page.includes(specifier) ||
                (test && workOrder.allowed_imports.tests.includes(specifier));
            if (!allowedSpecifier)
                violations.push(
                    `import not allowed by the work order in ${name}: ${JSON.stringify(specifier)}`
                );
            if (
                name === 'page.component.ts' &&
                specifier === composition &&
                ts.isImportDeclaration(found.node) &&
                importedNames(found.node).includes('PAGE_COMPOSITION_PROVIDERS')
            )
                mounted = true;
        }
    }
    if (text['page.component.ts'] !== undefined && !mounted)
        violations.push(
            'page does not mount its composition (PAGE_COMPOSITION_PROVIDERS)'
        );
    // Aucun contrôle, état ou action inventé : chaque sélecteur est statique et
    // déclaré par le contrat de page.
    const ids = contractIds(pageContract.page);
    const markupFiles = Object.keys(text).filter(
        (name) => /\.(?:ts|html)$/.test(name) && !name.endsWith('.spec.ts')
    );
    for (const name of markupFiles) {
        if (/attr\.data-cmz-id|\[data-cmz-id\]\s*=/.test(text[name]))
            violations.push(`data-cmz-id must be static in ${name}`);
        for (const [, id] of text[name].matchAll(CMZ_ID))
            if (!ids.has(id))
                violations.push(
                    `data-cmz-id not declared by the page contract in ${name}: ${JSON.stringify(id)}`
                );
    }
    if (text['realization-evidence.json'] !== undefined) {
        let evidence;
        try {
            evidence = JSON.parse(text['realization-evidence.json']);
        } catch {
            violations.push('realization evidence is not JSON');
        }
        if (evidence)
            violations.push(
                ...validatePageRealizationEvidence({
                    evidence,
                    schema: evidenceSchema,
                    pageContract,
                    contractHash: pageContractSha256,
                    markup: markupFiles.map((name) => text[name]).join('\n'),
                })
            );
    }
    return violations;
}

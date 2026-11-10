// X4 : règles d'une réalisation de page extérieure, vérifiées avant toute
// publication. Apparence libre ; mécanique générée seulement (la page passe
// par sa composition). Ces règles sont des filtres, pas la barrière : le
// réseau, les scripts et les ressources d'autres origines sont bloqués dans le
// navigateur par la politique de sécurité de contenu de la coque, et les
// commandes du produit tournent confinées (X4-sécurité). Dans la page, chaque
// référence est jugée par son symbole résolu dans le programme réel du
// produit (monde fermé, X4-sécurité 2).
import { realpathSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

import {
    pageProgram,
    typeEnvironmentViolations,
} from './external-page-realization-program.mjs';
import { symbolViolations } from './external-page-realization-symbols.mjs';

import {
    templateViolations,
    typescriptViolations,
} from './external-page-realization-structure.mjs';
import { validatePageRealizationEvidence } from './page-realization-verification.mjs';

// Motifs lexicaux de première intention, sur tous les fichiers de code : ils
// nomment l'erreur ordinaire d'un réalisateur de bonne foi.
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

// Valeurs décodées des chaînes et morceaux de gabarit d'un fichier.
function stringValues(name, source) {
    const file = ts.createSourceFile(
        name,
        source,
        ts.ScriptTarget.ES2022,
        true
    );
    const values = [];
    const visit = (node) => {
        if (
            ts.isStringLiteralLike(node) ||
            ts.isTemplateHead(node) ||
            ts.isTemplateMiddle(node) ||
            ts.isTemplateTail(node)
        )
            values.push(node.text);
        ts.forEachChild(node, visit);
    };
    visit(file);
    return values;
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const endpointLiteral = (literal) =>
    new RegExp(`${escapeRegExp(literal)}(?![A-Za-z0-9_~-])`);

// Page dans son programme : versions revues, typage sans erreur, puis
// chaque référence par symbole. `calls` : appels du gabarit qui passent
// `$event` ou une référence entière.
function pageSymbols(environment, workOrder, text, calls) {
    const name = 'page.component.ts';
    if (!environment) return [`type environment is required to check ${name}`];
    const versions = typeEnvironmentViolations(environment.productRoot);
    if (versions.length > 0) return versions;
    let built;
    let pagePath;
    let appRoot;
    try {
        appRoot = realpathSync(environment.appRoot);
        pagePath = join(appRoot, workOrder.publication_root, name);
        built = pageProgram({
            productRoot: realpathSync(environment.productRoot),
            appRoot,
            pagePath,
            text,
        });
    } catch (error) {
        return [`type environment unavailable: ${error.message}`];
    }
    const diagnostics = [
        ...built.program.getSyntacticDiagnostics(built.file),
        ...built.program.getSemanticDiagnostics(built.file),
    ].map(
        (diagnostic) =>
            `page does not type-check in ${name}: TS${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ').split(appRoot).join('<app>')}`
    );
    return [
        ...diagnostics,
        ...symbolViolations({
            name,
            checker: built.checker,
            file: built.file,
            environment: {
                pagePath,
                ownedRoot: join(appRoot, 'src', 'app', 'generated'),
            },
            opaque: calls,
        }),
    ];
}

// Violations d'un brouillon de réalisation au regard de son bon de travail.
// `files` : nom → octets (Buffer). `environment` : racines du produit et de
// l'application, où la page est vérifiée. Chaque violation est un texte fermé.
export function realizationViolations({
    files,
    workOrder,
    pageContract,
    pageContractSha256,
    evidenceSchema,
    environment,
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
    // M-5 : un chemin de commande est refusé sur ses frontières de segment.
    for (const name of code)
        for (const literal of workOrder.forbidden_literals)
            if (endpointLiteral(literal).test(text[name]))
                violations.push(
                    `endpoint literal forbidden in ${name}: ${literal}`
                );
    // Même règle sur la valeur décodée des chaînes TypeScript (échappements).
    for (const name of code.filter((entry) => entry.endsWith('.ts')))
        for (const value of stringValues(name, text[name]))
            for (const literal of workOrder.forbidden_literals)
                if (endpointLiteral(literal).test(value))
                    violations.push(
                        `endpoint literal forbidden in ${name}: ${literal}`
                    );
    // Mécanique générée seulement : imports fermés, lus dans la syntaxe.
    const local = new Set(
        allowed
            .filter((name) => /\.ts$/.test(name) && !/\.spec\.ts$/.test(name))
            .map((name) => `./${name.replace(/\.ts$/, '')}`)
    );
    const composition = workOrder.composition.module;
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
        }
    }
    // Contrôles structurels : la spec ne s'exécute que dans l'oracle confiné ;
    // la page, elle, est lue dans sa syntaxe et son gabarit.
    const ids = contractIds(pageContract.page);
    const calls = [];
    const templateCheck = (source, name) => {
        const checked = templateViolations({ name, text: source });
        violations.push(...checked.violations);
        calls.push(...checked.calls);
    };
    for (const name of ['page.component.ts', 'page.component.spec.ts'])
        if (text[name] !== undefined)
            violations.push(
                ...typescriptViolations({
                    name,
                    text: text[name],
                    compositionModule: composition,
                    page: name === 'page.component.ts',
                    templateCheck,
                })
            );
    if (text['page.component.html'] !== undefined) {
        const checked = templateViolations({
            name: 'page.component.html',
            text: text['page.component.html'],
            declaredIds: ids,
        });
        violations.push(...checked.violations);
        calls.push(...checked.calls);
    }
    if (text['page.component.ts'] !== undefined)
        violations.push(
            ...pageSymbols(
                environment,
                workOrder,
                text['page.component.ts'],
                calls
            )
        );
    if (
        text['page.component.ts'] !== undefined &&
        /data-cmz-id/i.test(text['page.component.ts'])
    )
        violations.push(
            'data-cmz-id belongs to the template, not page.component.ts'
        );
    const markupFiles = Object.keys(text).filter(
        (name) => /\.(?:ts|html)$/.test(name) && !name.endsWith('.spec.ts')
    );
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

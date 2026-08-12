#!/usr/bin/env node
/**
 * check-framework-purity.mjs
 *
 * Chantier Q — Q-6/Q-7 (`strategie-cross-stack-revue.md` §3), suite du
 * Chantier Q de découplage DI (ADR-0024). Rend exécutable le *layering
 * test* posé par la revue :
 *
 *   « Peut-on supprimer Angular de `package.json` et compiler encore le
 *     cœur ? »
 *
 * Règle vérifiée sur toutes les libs taguées `type:domain` ou
 * `type:constants` (`project.json`) :
 *
 *   1. **0 import `@angular/*`** (tout sous-chemin — `@angular/core`,
 *      `@angular/common/http`, etc.).
 *   2. **0 décorateur Angular** (`@Component`, `@Injectable`, `@Pipe`,
 *      `@Directive`, `@NgModule`, et le décorateur custom `@Service`
 *      observé côté `type:application`/`type:ui` de ce dépôt).
 *
 * RxJS (`import ... from 'rxjs'`) est explicitement **autorisé** —
 * décision actée et justifiée dans ADR-0025 (primitive réactive
 * framework-agnostique, pas un point de couplage Angular ; interdire
 * RxJS ferait échouer ce garde sur ~90 sites de signature de repository
 * sans qu'aucune migration `Observable → Promise` n'ait été mandatée).
 *
 * Usage:
 *   node tools/check-framework-purity.mjs
 *   bun run check:framework-purity
 *
 * CI: job guardrails. Script npm: check:framework-purity.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const LIBS = join(ROOT, 'libs');

const SKIP_DIRS = new Set([
    'node_modules',
    'dist',
    'out-tsc',
    'coverage',
    '.git',
    '.angular',
]);

const SOURCE_EXT = /\.(mts|cts|tsx|ts)$/;
const TARGET_TAGS = new Set(['type:domain', 'type:constants']);

/** Décorateurs Angular (natifs + `@Service`, convention custom de ce dépôt). */
const FORBIDDEN_DECORATORS = [
    'Component',
    'Injectable',
    'Pipe',
    'Directive',
    'NgModule',
    'Service',
];

function findProjectJsons(dir, results = []) {
    for (const entry of readdirSync(dir)) {
        if (SKIP_DIRS.has(entry)) continue;
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            findProjectJsons(full, results);
        } else if (entry === 'project.json') {
            results.push(full);
        }
    }
    return results;
}

function walkSourceFiles(dir, results = []) {
    for (const entry of readdirSync(dir)) {
        if (SKIP_DIRS.has(entry)) continue;
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) {
            walkSourceFiles(full, results);
        } else if (SOURCE_EXT.test(entry) && !entry.endsWith('.spec.ts')) {
            results.push(full);
        }
    }
    return results;
}

/** @returns {{ name: string, sourceRoot: string, tags: string[] } | null} */
function readTargetProject(projectJsonPath) {
    let json;
    try {
        json = JSON.parse(readFileSync(projectJsonPath, 'utf8'));
    } catch {
        return null;
    }
    const tags = Array.isArray(json.tags) ? json.tags : [];
    if (!tags.some((t) => TARGET_TAGS.has(t))) return null;
    if (!json.sourceRoot) return null;
    return {
        name: json.name ?? relative(ROOT, projectJsonPath),
        sourceRoot: join(ROOT, json.sourceRoot),
        tags,
    };
}

function stripCommentsAndStrings(source) {
    // Retire commentaires (pas les template strings — suffisant ici : les
    // faux négatifs éventuels dans un template string sont un risque
    // accepté, jamais rencontré en pratique sur ce dépôt : cf.
    // check-declared-deps.mjs, même simplification).
    return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const ANGULAR_IMPORT_RE = /\bfrom\s*['"](@angular\/[^'"]+)['"]/g;
const ANGULAR_SIDE_EFFECT_RE = /\bimport\s*['"](@angular\/[^'"]+)['"]/g;

function findAngularImports(source) {
    const found = new Set();
    for (const re of [ANGULAR_IMPORT_RE, ANGULAR_SIDE_EFFECT_RE]) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(source)) !== null) found.add(m[1]);
    }
    return [...found];
}

function findDecorators(source) {
    const found = new Set();
    for (const name of FORBIDDEN_DECORATORS) {
        const re = new RegExp(`(^|[^\\w])@${name}\\s*\\(`, 'm');
        if (re.test(source)) found.add(`@${name}`);
    }
    return [...found];
}

const projectJsons = findProjectJsons(LIBS);
const targetProjects = projectJsons
    .map(readTargetProject)
    .filter((p) => p !== null);

if (targetProjects.length === 0) {
    console.error(
        'FAIL  0 lib taguée type:domain/type:constants trouvée — ' +
            'le garde ne peut rien vérifier, probable régression du scan lui-même.'
    );
    process.exit(1);
}

/** @type {{ project: string, file: string, angularImports: string[], decorators: string[] }[]} */
const violations = [];
let filesScanned = 0;

for (const project of targetProjects) {
    const files = walkSourceFiles(project.sourceRoot);
    for (const file of files) {
        filesScanned += 1;
        const raw = readFileSync(file, 'utf8');
        const cleaned = stripCommentsAndStrings(raw);

        const angularImports = findAngularImports(cleaned);
        const decorators = findDecorators(cleaned);

        if (angularImports.length > 0 || decorators.length > 0) {
            violations.push({
                project: project.name,
                file: relative(ROOT, file),
                angularImports,
                decorators,
            });
        }
    }
}

if (violations.length > 0) {
    console.error(
        `FAIL  ${violations.length} fichier(s) couplé(s) à Angular dans ` +
            `type:domain/type:constants (layering test cassé) :`
    );
    for (const v of violations) {
        console.error(`  ${v.file}  (${v.project})`);
        if (v.angularImports.length > 0) {
            console.error(
                `    import interdit : ${v.angularImports.join(', ')}`
            );
        }
        if (v.decorators.length > 0) {
            console.error(
                `    décorateur interdit : ${v.decorators.join(', ')}`
            );
        }
    }
    console.error('');
    console.error(
        '  Règle : type:domain/type:constants doit rester compilable ' +
            'sans Angular dans package.json (ADR-0024, ADR-0025). ' +
            'RxJS est autorisé (ADR-0025) — seuls @angular/* et les ' +
            'décorateurs Angular/@Service sont interdits.'
    );
    process.exit(1);
}

console.log(
    `OK  check:framework-purity — ${targetProjects.length} lib(s) ` +
        `(${filesScanned} fichier(s)) type:domain/type:constants, ` +
        `0 import @angular/*, 0 décorateur Angular (ADR-0024/ADR-0025)`
);
process.exit(0);

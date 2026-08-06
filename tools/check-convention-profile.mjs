#!/usr/bin/env node
/**
 * check:convention-profile — chantier J (P0-10, audit-workspace-2026-08-02-
 * addendum.md). `conventions/angular-22.profile.json` est, par ADR-0010, la
 * source unique lisible par machine des conventions de code — mais jusqu'à
 * ce script, **aucun outil du dépôt ne le lisait** ; il violait sa propre
 * règle la plus visible (`forbidExplicitStandaloneTrue`) sur 105 composants
 * sur 105 (mesuré ci-dessous, pas supposé).
 *
 * Ce script LIT le profil (pas de règle dupliquée dans ce fichier — J-7 va
 * plus loin en le faisant lire par la chaîne de génération elle-même,
 * non fait ici) et vérifie sur `libs/**\/*.ts` + `apps/**\/*.ts` les règles
 * mécaniquement contrôlables par analyse statique de texte :
 *
 *   - `component.forbidExplicitStandaloneTrue`
 *   - `component.changeDetection` (« ne pas le déclarer explicitement »)
 *   - `component.hostBindings` (interdit `@HostBinding`/`@HostListener`)
 *   - `templates.forbid` (`*ngIf`/`*ngFor`/`*ngSwitch`/`ngClass`/`ngStyle`)
 *   - `injection.forbid` (constructor injection dans les classes
 *     `@Component`/`@Injectable`/`@Service`)
 *   - `typescript.strict`
 *   - `validation.catalogVersionMustMatch`
 *
 * Hors périmètre, assumé, pas simulé : `accessibility.axe` (nécessite un
 * outil runtime, ex. `@axe-core/playwright` — absent de ce dépôt, cf.
 * audit-workspace-2026-08-03.md) et `forms.preferred` (Signal Forms —
 * distinction sémantique, pas syntaxique, entre Reactive Forms et Signal
 * Forms non fiable par regex).
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const PROFILE_FILE = join(ROOT, 'conventions/angular-22.profile.json');
const PACKAGE_JSON_FILE = join(ROOT, 'package.json');
const TSCONFIG_BASE_FILE = join(ROOT, 'tsconfig.base.json');

const SCAN_GLOBS = ['apps/**/*.ts', 'libs/**/*.ts'];
const EXCLUDE_SEGMENTS = ['node_modules', '.spec.ts', '.test.ts'];

function listSourceFiles() {
    const files = new Set();
    for (const pattern of SCAN_GLOBS) {
        for (const file of globSync(pattern, { cwd: ROOT })) {
            if (EXCLUDE_SEGMENTS.some((seg) => file.includes(seg))) continue;
            files.add(file);
        }
    }
    return [...files].sort();
}

/** Extrait chaque bloc `@Component({ ... })` d'un fichier (texte brut, pas d'AST). */
function extractComponentDecorators(content) {
    const blocks = [];
    const re = /@Component\s*\(\s*\{/g;
    let m;
    while ((m = re.exec(content))) {
        const start = m.index;
        let depth = 0;
        let i = content.indexOf('{', start);
        const blockStart = i;
        for (; i < content.length; i++) {
            if (content[i] === '{') depth++;
            else if (content[i] === '}') {
                depth--;
                if (depth === 0) break;
            }
        }
        blocks.push(content.slice(blockStart, i + 1));
    }
    return blocks;
}

function checkStandalone(files) {
    const violations = [];
    for (const file of files) {
        const content = readFileSync(join(ROOT, file), 'utf8');
        for (const block of extractComponentDecorators(content)) {
            if (/\bstandalone\s*:\s*true\b/.test(block)) {
                violations.push(file);
            }
        }
    }
    return violations;
}

function checkChangeDetection(files) {
    const violations = [];
    for (const file of files) {
        const content = readFileSync(join(ROOT, file), 'utf8');
        for (const block of extractComponentDecorators(content)) {
            if (
                /changeDetection\s*:\s*ChangeDetectionStrategy\.OnPush/.test(
                    block
                )
            ) {
                violations.push(file);
            }
        }
    }
    return violations;
}

function checkHostBindings(files) {
    const violations = [];
    for (const file of files) {
        const content = readFileSync(join(ROOT, file), 'utf8');
        const matches = content.match(/@HostBinding|@HostListener/g);
        if (matches) violations.push({ file, count: matches.length });
    }
    return violations;
}

function checkLegacyTemplateSyntax(files) {
    const forbidden = /\*ngIf\b|\*ngFor\b|\*ngSwitch\b|\[ngClass\]|\[ngStyle\]/;
    const violations = [];
    for (const file of files) {
        const content = readFileSync(join(ROOT, file), 'utf8');
        if (forbidden.test(content)) violations.push(file);
    }
    return violations;
}

function checkConstructorInjection(files) {
    // Constructeur avec un paramètre à modificateur d'accès
    // (private/public/protected/readonly), dans une classe décorée
    // @Component/@Injectable/@Service — heuristique texte, pas AST complet
    // (cf. audit-workspace-2026-08-02-addendum.md, vérification manuelle des
    // 115 faux positifs déjà écartée pour ce même contrôle).
    const decoratorRe = /@(Component|Injectable|Service)\s*\(/;
    const ctorParamRe =
        /constructor\s*\(\s*(private|public|protected|readonly)\b/;
    const violations = [];
    for (const file of files) {
        const content = readFileSync(join(ROOT, file), 'utf8');
        if (decoratorRe.test(content) && ctorParamRe.test(content)) {
            violations.push(file);
        }
    }
    return violations;
}

function checkTypescriptStrict() {
    const tsconfig = JSON.parse(readFileSync(TSCONFIG_BASE_FILE, 'utf8'));
    return tsconfig.compilerOptions?.strict === true;
}

function checkCatalogVersion(profile) {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON_FILE, 'utf8'));
    const catalogVersion = pkg.workspaces?.catalog?.['@angular/core'];
    const expected = profile.validation?.catalogVersionMustMatch; // ex. "22.0.x"
    if (!catalogVersion || !expected) {
        return { ok: false, catalogVersion, expected };
    }
    const expectedMajorMinor = expected.split('.').slice(0, 2).join('.');
    const actualMajorMinor = catalogVersion.split('.').slice(0, 2).join('.');
    return {
        ok: expectedMajorMinor === actualMajorMinor,
        catalogVersion,
        expected,
    };
}

function main() {
    const profile = JSON.parse(readFileSync(PROFILE_FILE, 'utf8'));
    const files = listSourceFiles();

    console.log(
        `check:convention-profile — lit ${PROFILE_FILE.replace(ROOT, '')}, ${files.length} fichiers scannés (apps/ + libs/, hors specs).\n`
    );

    let failed = false;

    const standaloneViolations = checkStandalone(files);
    report(
        'component.forbidExplicitStandaloneTrue',
        standaloneViolations.length === 0,
        `${standaloneViolations.length} composant(s) avec "standalone: true" explicite (attendu : implicite, 0)`
    );
    if (standaloneViolations.length > 0) failed = true;

    const cdViolations = checkChangeDetection(files);
    report(
        'component.changeDetection',
        cdViolations.length === 0,
        `${cdViolations.length} composant(s) déclarant "changeDetection: ChangeDetectionStrategy.OnPush" explicitement (attendu : implicite, 0)`
    );
    if (cdViolations.length > 0) failed = true;

    const hostViolations = checkHostBindings(files);
    const hostCount = hostViolations.reduce((n, v) => n + v.count, 0);
    report(
        'component.hostBindings',
        hostCount === 0,
        `${hostCount} usage(s) de @HostBinding/@HostListener dans ${hostViolations.length} fichier(s) (attendu : objet "host" du décorateur, 0)`
    );
    if (hostCount > 0) failed = true;

    const templateViolations = checkLegacyTemplateSyntax(files);
    report(
        'templates.forbid',
        templateViolations.length === 0,
        `${templateViolations.length} fichier(s) avec *ngIf/*ngFor/*ngSwitch/ngClass/ngStyle (attendu : @if/@for/@switch, 0)`
    );
    if (templateViolations.length > 0) failed = true;

    const ctorViolations = checkConstructorInjection(files);
    report(
        'injection.forbid (constructor injection)',
        ctorViolations.length === 0,
        `${ctorViolations.length} classe(s) @Component/@Injectable/@Service avec injection par constructeur (attendu : inject(), 0)`
    );
    if (ctorViolations.length > 0) failed = true;

    const strictOk = checkTypescriptStrict();
    report(
        'typescript.strict',
        strictOk,
        strictOk
            ? 'tsconfig.base.json : strict: true'
            : 'tsconfig.base.json : strict !== true'
    );
    if (!strictOk) failed = true;

    const catalog = checkCatalogVersion(profile);
    report(
        'validation.catalogVersionMustMatch',
        catalog.ok,
        `profil attend "${catalog.expected}", catalog déclare "${catalog.catalogVersion}"`
    );
    if (!catalog.ok) failed = true;

    console.log(
        '\nHors périmètre de ce script (non simulé) : accessibility.axe ' +
            '(outil runtime absent du dépôt), forms.preferred (Signal Forms ' +
            'vs Reactive Forms — distinction sémantique, pas syntaxique).'
    );

    if (failed) {
        console.log(
            '\nDétail des fichiers en violation disponible via --verbose.'
        );
        if (process.argv.includes('--verbose')) {
            printVerbose({
                standaloneViolations,
                cdViolations,
                hostViolations,
                templateViolations,
                ctorViolations,
            });
        }
        process.exitCode = 1;
    }
}

function report(rule, ok, detail) {
    console.log(`${ok ? '✅' : '❌'} ${rule} — ${detail}`);
}

function printVerbose({
    standaloneViolations,
    cdViolations,
    hostViolations,
    templateViolations,
    ctorViolations,
}) {
    const section = (title, list) => {
        if (list.length === 0) return;
        console.log(`\n${title} :`);
        for (const item of list) {
            console.log(`  ${typeof item === 'string' ? item : item.file}`);
        }
    };
    section('standalone: true', standaloneViolations);
    section('changeDetection explicite', cdViolations);
    section('@HostBinding/@HostListener', hostViolations);
    section('*ngIf/*ngFor/ngClass/ngStyle', templateViolations);
    section('constructor injection', ctorViolations);
}

main();

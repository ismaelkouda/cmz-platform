#!/usr/bin/env node
/**
 * check-framework-purity-destructive.mjs
 *
 * Chantier Q — Q-8 (`strategie-cross-stack-revue.md` §3), test destructif
 * du *layering test* déjà vérifié statiquement par
 * `check-framework-purity.mjs` (Q-6/Q-7, ADR-0024/ADR-0025) :
 *
 *   « Peut-on supprimer Angular de `package.json` et compiler encore le
 *     cœur ? »
 *
 * Q-6 vérifie l'**absence de trace textuelle** d'Angular dans les sources
 * (`grep`-like sur imports/décorateurs). Q-8 va plus loin : il retire
 * **physiquement** les paquets `@angular/*` de la résolution de modules,
 * puis compile chaque lib `type:domain`/`type:constants` avec `tsc
 * --noEmit`. Une régression où une lib du domaine importerait Angular
 * *transitivement* (via un type ré-exporté par une lib tierce, par exemple)
 * échapperait à Q-6 (qui ne scanne que le texte source de la lib elle-même)
 * mais serait détectée ici (la compilation échouerait réellement).
 *
 * Test de significativité intégré : deux libs connues pour dépendre
 * réellement d'Angular (`@cmz/core`, `@cmz/shared-application`) sont
 * compilées dans les mêmes conditions et **doivent échouer** — sans quoi
 * le test ne prouverait rien (un test destructif qui ne peut jamais
 * détecter la régression qu'il prétend détecter est un test mort).
 *
 * Mécanique de retrait : ce monorepo utilise `bun`, qui matérialise
 * `node_modules/@angular/*` en symlinks vers un store `node_modules/.bun/
 * @angular+<pkg>@<version>+<hash>/`. Renommer uniquement le dossier
 * `node_modules/@angular` ne suffit PAS à faire échouer une compilation
 * `tsc` déjà en cache de résolution — vérifié empiriquement (`core`
 * compilait encore avec `node_modules/@angular` renommé, TypeScript
 * retrouvant le paquet via une résolution `--traceResolution` remontant
 * directement au store `.bun/`). Le retrait doit donc porter sur les deux :
 * le lien `node_modules/@angular` ET les répertoires `.bun/@angular+*`.
 *
 * **Toute manipulation de `node_modules` est temporaire et restaurée dans
 * un `finally`, plus un handler `process.on('exit', ...)` en filet de
 * sécurité** (interruption Ctrl+C, crash) — jamais de suppression, toujours
 * un renommage réversible (`.disabled` suffix), sur le modèle du nettoyage
 * garanti de `check-boundary-negative.mjs` (fichier sonde), adapté ici à un
 * ensemble de répertoires réels plutôt qu'un seul fichier synthétique.
 *
 * Usage:
 *   node tools/check-framework-purity-destructive.mjs
 *   bun run check:framework-purity:destructive
 *
 * Volontairement PAS branché en CI bloquant à chaque commit (Q-6/Q-7 déjà
 * bloquant couvre le cas courant) : ce test manipule `node_modules` et est
 * plus lent (~20 compilations `tsc` complètes). Recommandé en job
 * périodique / avant release, pas sur chaque PR — cf. note dans
 * taches-restantes.md.
 */

import { execFileSync } from 'node:child_process';
import {
    existsSync,
    readdirSync,
    readFileSync,
    renameSync,
    statSync,
} from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const LIBS = join(ROOT, 'libs');
const NODE_MODULES = join(ROOT, 'node_modules');
const BUN_STORE = join(NODE_MODULES, '.bun');

const SKIP_DIRS = new Set(['node_modules', 'dist', 'out-tsc', '.git']);
const TARGET_TAGS = new Set(['type:domain', 'type:constants']);
/** Doivent échouer sans Angular — preuve que le test est significatif. */
const CONTROL_LIBS = ['libs/core', 'libs/shared/application'];

function findProjectJsons(dir, results = []) {
    for (const entry of readdirSync(dir)) {
        if (SKIP_DIRS.has(entry)) continue;
        const full = join(dir, entry);
        if (!existsSync(full)) continue;
        const st = statSync(full);
        if (st.isDirectory()) {
            findProjectJsons(full, results);
        } else if (entry === 'project.json') {
            results.push(full);
        }
    }
    return results;
}

/** @returns {{ name: string, libDir: string, tsconfig: string } | null} */
function readTargetProject(projectJsonPath) {
    let json;
    try {
        json = JSON.parse(readFileSync(projectJsonPath, 'utf8'));
    } catch {
        return null;
    }
    const tags = Array.isArray(json.tags) ? json.tags : [];
    if (!tags.some((t) => TARGET_TAGS.has(t))) return null;
    const libDir = join(projectJsonPath, '..');
    const tsconfig = join(libDir, 'tsconfig.json');
    if (!existsSync(tsconfig)) return null;
    return { name: json.name ?? relative(ROOT, libDir), libDir, tsconfig };
}

// ─── Retrait physique d'Angular (réversible) ───────────────────────────

const renamedPaths = [];

function disable(path) {
    if (!existsSync(path)) return;
    const disabledPath = `${path}.disabled`;
    if (existsSync(disabledPath)) {
        throw new Error(
            `Résidu détecté : ${disabledPath} existe déjà — un run précédent ` +
                `a probablement été interrompu avant restauration. Nettoyer ` +
                `manuellement avant de relancer (renommer .disabled → nom d'origine).`
        );
    }
    renameSync(path, disabledPath);
    renamedPaths.push([disabledPath, path]);
}

function restoreAll() {
    while (renamedPaths.length > 0) {
        const [from, to] = renamedPaths.pop();
        try {
            if (existsSync(from) && !existsSync(to)) {
                renameSync(from, to);
            }
        } catch (err) {
            console.error(
                `ATTENTION : échec de restauration ${from} → ${to} : ${err.message}`
            );
            console.error(
                `Restaurer manuellement avant tout autre usage du dépôt.`
            );
        }
    }
}

// Filet de sécurité : restaure même sur interruption/crash non capturé.
process.on('exit', restoreAll);
process.on('SIGINT', () => process.exit(130));
process.on('SIGTERM', () => process.exit(143));

function compileProject(tsconfigPath) {
    try {
        execFileSync(
            join(NODE_MODULES, '.bin', 'tsc'),
            ['--noEmit', '--project', tsconfigPath],
            { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
        );
        return { ok: true, output: '' };
    } catch (err) {
        return {
            ok: false,
            output: String(err.stdout || '') + String(err.stderr || ''),
        };
    }
}

// ─── Exécution ──────────────────────────────────────────────────────────

const targetProjects = findProjectJsons(LIBS)
    .map(readTargetProject)
    .filter((p) => p !== null);

if (targetProjects.length === 0) {
    console.error(
        'FAIL  0 lib taguée type:domain/type:constants trouvée — ' +
            'probable régression du scan lui-même.'
    );
    process.exit(1);
}

console.log(
    `Retrait physique d'Angular : node_modules/@angular + ` +
        `node_modules/.bun/@angular+* (bun hoist store)…`
);

disable(join(NODE_MODULES, '@angular'));
if (existsSync(BUN_STORE)) {
    for (const entry of readdirSync(BUN_STORE)) {
        if (entry.startsWith('@angular+')) {
            disable(join(BUN_STORE, entry));
        }
    }
}

const domainFailures = [];
for (const project of targetProjects) {
    const result = compileProject(project.tsconfig);
    if (result.ok) {
        console.log(`  OK    ${project.name}`);
    } else {
        console.log(`  FAIL  ${project.name}`);
        domainFailures.push({ project: project.name, output: result.output });
    }
}

const controlResults = [];
for (const rel of CONTROL_LIBS) {
    const tsconfig = join(ROOT, rel, 'tsconfig.json');
    if (!existsSync(tsconfig)) {
        controlResults.push({
            lib: rel,
            status: 'skip',
            reason: 'tsconfig.json introuvable',
        });
        continue;
    }
    const result = compileProject(tsconfig);
    controlResults.push({
        lib: rel,
        status: result.ok ? 'compiled' : 'failed',
    });
}

restoreAll();

// ─── Verdict ────────────────────────────────────────────────────────────

let exitCode = 0;

if (domainFailures.length > 0) {
    console.error('');
    console.error(
        `FAIL  ${domainFailures.length} lib(s) type:domain/type:constants ` +
            `ne compilent PAS sans Angular (régression du layering test) :`
    );
    for (const f of domainFailures) {
        console.error(`  ${f.project}`);
        console.error(
            f.output
                .split('\n')
                .filter(Boolean)
                .slice(0, 5)
                .map((l) => `    ${l}`)
                .join('\n')
        );
    }
    exitCode = 1;
}

const stillCompilingControls = controlResults.filter(
    (c) => c.status === 'compiled'
);
if (stillCompilingControls.length > 0) {
    console.error('');
    console.error(
        `FAIL  test non significatif : ${stillCompilingControls
            .map((c) => c.lib)
            .join(', ')} compile(nt) encore sans Angular alors qu'` +
            `elles en dépendent réellement (@cmz/core, @cmz/shared-application). ` +
            `Le retrait physique n'a pas fonctionné — ne pas faire confiance au ` +
            `résultat ci-dessus tant que ce point n'est pas corrigé.`
    );
    exitCode = 1;
}

if (exitCode === 0) {
    console.log('');
    console.log(
        `OK  check:framework-purity:destructive — ${targetProjects.length} ` +
            `lib(s) type:domain/type:constants compilent sans @angular/* ` +
            `physiquement présent (layering test Q-8, ADR-0024/ADR-0025). ` +
            `Test de significativité : ${CONTROL_LIBS.join(', ')} échouent ` +
            `bien dans les mêmes conditions.`
    );
}

process.exit(exitCode);

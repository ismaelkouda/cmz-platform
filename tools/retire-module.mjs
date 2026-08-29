#!/usr/bin/env node
/**
 * retire-module.mjs
 *
 * Retire un module applicatif du monorepo — apps/libs, câblage de config,
 * et preuve automatique d'exhaustivité — sans audit manuel humain.
 *
 * Contexte (audit staff, 2026-08-29) : la vision du projet est de
 * minimiser l'action humaine. Avant ce script, retirer un module
 * (ex: newsletter, 2026-08-29) exigeait un grep exhaustif ad hoc dans
 * apps/, libs/, tools/, docs/, eslint.config.mjs, tsconfig.base.json,
 * knip.json, package.json — refait manuellement à chaque suppression, avec
 * un risque réel d'oubli (constaté : ce script a été écrit après qu'un
 * check-no-orphan-references.mjs indépendant ait trouvé une référence
 * orpheline dans transloco.config.ts qu'un audit manuel avait manquée).
 *
 * Ce script mécanise ce qui PEUT l'être en toute sécurité, et rapporte
 * précisément ce qui reste à trancher humainement plutôt que d'éditer à
 * l'aveugle du JavaScript de configuration arbitraire par regex — un choix
 * délibéré : la classe de bug la plus dangereuse ici n'est pas "en faire
 * trop peu" mais "corrompre silencieusement eslint.config.mjs".
 *
 * Étapes automatiques (sûres, dérivées du filesystem — pas de déclaration
 * séparée à maintenir) :
 *   1. Résout le scope réel du module : tout project.json sous
 *      apps/<module>* et libs/<module>*, via le NOM de dossier (pas une
 *      liste déclarée ailleurs — seule source de vérité : le filesystem,
 *      même principe que check-project-names.mjs).
 *   2. Vérifie la fermeture transitive : aucun package HORS de ce scope
 *      ne doit importer un alias @cmz/<module>-* (sinon retrait refusé —
 *      ce serait casser un consommateur réel, pas un POC isolé).
 *   3. Supprime les fichiers (apps/libs résolus à l'étape 1).
 *   4. Relance check-project-names.mjs et check-declared-deps.mjs pour
 *      confirmer que le graphe reste cohérent après suppression physique.
 *
 * Étape assistée (rapportée, jamais appliquée automatiquement) :
 *   5. Scanne les fichiers de config connus pour fragiles-à-la-main
 *      (eslint.config.mjs, tsconfig.base.json, knip.json, package.json) et
 *      rapporte les lignes contenant scope:<module>* ou @cmz/<module>-* —
 *      à retirer à la main (Edit ciblé), PAS par ce script.
 *
 * Étape finale (obligatoire, non contournable) :
 *   6. Appelle check-no-orphan-references.mjs --module <nom> et affiche
 *      son verdict — la preuve d'exhaustivité n'est jamais l'avis de ce
 *      script sur lui-même, c'est un outil indépendant.
 *
 * Un retrait complet, en pratique, prend DEUX commandes séparées — le
 * scope (apps/libs) n'existe déjà plus lors de la seconde, donc ce n'est
 * volontairement PAS la même invocation avec les mêmes arguments :
 *
 *   1. `node tools/retire-module.mjs --module <nom>` — supprime les
 *      fichiers, rapporte les lignes de config à traiter à la main
 *      (étape 5), s'arrête là (n'appelle PAS check-no-orphan-references :
 *      il échouerait à coup sûr tant que le rapport n'est pas traité,
 *      ce n'est pas un signal utile à ce stade).
 *   2. L'humain édite eslint.config.mjs/tsconfig.base.json/knip.json/
 *      package.json selon le rapport.
 *   3. `node tools/retire-module.mjs --finalize --module <nom>` — ne
 *      touche plus au filesystem des apps/libs (déjà supprimées), lance
 *      SI package.json diffère de la version committée (HEAD) `bun
 *      install` pour régénérer bun.lock (sinon `bun install
 *      --frozen-lockfile` casse en CI — constaté plusieurs fois sur ce
 *      repo : "lockfile had changes, but lockfile is frozen"), puis
 *      appelle check-no-orphan-references comme preuve finale.
 *
 * Usage :
 *   node tools/retire-module.mjs --module <nom> [--dry-run]
 *   node tools/retire-module.mjs --finalize --module <nom> [--skip-install]
 *
 * --dry-run : (mode retrait seulement) n'écrit rien, affiche le plan.
 * --skip-install : (mode --finalize seulement) ne lance jamais bun
 *   install même si package.json a changé (utile sans bun disponible —
 *   le rapport reste affiché, bun install reste à lancer à la main).
 *
 * Exit 1 si la fermeture transitive échoue (étape 2), si bun install
 * échoue alors qu'il était requis, ou si check-no-orphan-references
 * échoue en --finalize.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
    existsSync,
    readdirSync,
    readFileSync,
    rmSync,
    statSync,
} from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const CONFIG_FILES_TO_SCAN = [
    'eslint.config.mjs',
    'tsconfig.base.json',
    'knip.json',
    'package.json',
];
const SKIP_DIRS = new Set([
    'node_modules',
    'dist',
    'out-tsc',
    'coverage',
    '.git',
    '.angular',
    '.nx',
    'corpus',
]);

function fail(message) {
    console.error(`\n✖ ${message}\n`);
    process.exit(1);
}

function parseArgs(argv) {
    const options = { dryRun: false, skipInstall: false, finalize: false };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--module') options.module = argv[++i];
        else if (arg === '--dry-run') options.dryRun = true;
        else if (arg === '--skip-install') options.skipInstall = true;
        else if (arg === '--finalize') options.finalize = true;
        else fail(`Argument inconnu : ${arg}`);
    }
    if (!options.module) fail('--module <nom> est requis (ex: newsletter).');
    if (options.finalize && options.dryRun)
        fail('--finalize et --dry-run sont incompatibles.');
    return options;
}

/** Hash du contenu ACTUEL (working tree) de package.json. */
function hashPackageJson() {
    const path = join(ROOT, 'package.json');
    if (!existsSync(path)) return null;
    return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/**
 * Hash de package.json tel qu'il existait au dernier commit (HEAD) — pas
 * "au début de ce run" : ce script est invoqué en DEUX temps séparés (voir
 * docstring), donc la seule référence stable entre les deux est l'état
 * committé, pas un hash capturé au lancement du process courant.
 * Retourne null si git est indisponible ou si package.json n'est pas
 * suivi (dégrade en "on ne sait pas" plutôt que de planter).
 */
function hashPackageJsonAtHead() {
    try {
        const content = execFileSync('git', ['show', 'HEAD:package.json'], {
            cwd: ROOT,
            encoding: 'utf8',
        });
        return createHash('sha256').update(content).digest('hex');
    } catch {
        return null;
    }
}

/**
 * Lance `bun install` pour régénérer bun.lock après un changement de
 * package.json. Échoue explicitement si `bun` est introuvable (ex: ce
 * script tournant dans un environnement sandbox sans bun) — jamais un
 * échec silencieux : la conséquence d'un bun.lock désynchronisé n'est
 * visible qu'en CI, bien plus tard, via `bun install --frozen-lockfile`.
 */
function runBunInstall() {
    console.log(
        `\npackage.json a changé depuis le début de ce run — régénération de bun.lock (bun install)...`
    );
    try {
        const out = execFileSync('bun', ['install'], {
            cwd: ROOT,
            encoding: 'utf8',
        });
        console.log(out.trim());
        console.log(`✅  bun.lock régénéré.`);
        return true;
    } catch (error) {
        const message =
            error.code === 'ENOENT'
                ? `bun est introuvable dans cet environnement.`
                : `bun install a échoué :\n${(error.stdout || '') + (error.stderr || '')}`;
        console.error(
            `\n⚠️  ${message}\n` +
                `package.json a changé mais bun.lock n'a PAS été régénéré — ` +
                `lance \`bun install\` manuellement avant de committer, sinon ` +
                `\`bun install --frozen-lockfile\` cassera en CI.`
        );
        return false;
    }
}

/** project.json trouvés récursivement sous un répertoire donné. */
function findProjectJsons(dir, results = []) {
    if (!existsSync(dir)) return results;
    for (const entry of readdirSync(dir)) {
        if (SKIP_DIRS.has(entry)) continue;
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) findProjectJsons(full, results);
        else if (entry === 'project.json') results.push(full);
    }
    return results;
}

/**
 * Résout le scope réel d'un module à partir du NOM de dossier — pas d'une
 * déclaration séparée. Couvre libs/<module> ET libs/<module>-<suffixe>
 * (ex: un module scindé en newsletter-angular/newsletter-react comme
 * ADR-0003 §5d le documente pour les modules multi-stack).
 */
function resolveModuleScope(moduleName) {
    const roots = [];
    for (const base of ['apps', 'libs']) {
        const baseDir = join(ROOT, base);
        if (!existsSync(baseDir)) continue;
        for (const entry of readdirSync(baseDir)) {
            if (entry === moduleName || entry.startsWith(`${moduleName}-`)) {
                roots.push(join(baseDir, entry));
            }
        }
    }
    const projectJsons = roots.flatMap((r) => findProjectJsons(r));
    const packages = projectJsons.map((pj) => {
        const parsed = JSON.parse(readFileSync(pj, 'utf8'));
        return { name: parsed.name, projectJsonPath: pj, root: pj };
    });
    return { roots, packages };
}

/**
 * Vérifie qu'aucun package HORS scope n'importe un alias appartenant au
 * module retiré — même heuristique que check-declared-deps.mjs (grep sur
 * les imports source, pas le graphe Nx lui-même, pour rester indépendant
 * de nx dans un environnement où nx n'est pas toujours disponible).
 */
function findExternalConsumers(moduleName, scope) {
    const scopeRoots = new Set(scope.roots.map((r) => r));
    const aliasPattern = new RegExp(
        `@cmz/${moduleName}(-[a-z0-9-]+)?-(domain|data|application|ui)`
    );
    const allProjectJsons = [
        ...findProjectJsons(join(ROOT, 'apps')),
        ...findProjectJsons(join(ROOT, 'libs')),
    ];
    const externalConsumers = [];
    for (const pj of allProjectJsons) {
        const isInScope = [...scopeRoots].some((root) => pj.startsWith(root));
        if (isInScope) continue;
        const dir = pj.replace(/project\.json$/, '');
        const srcDir = join(dir, 'src');
        if (!existsSync(srcDir)) continue;
        const sourceFiles = [];
        (function walk(d) {
            for (const entry of readdirSync(d)) {
                const full = join(d, entry);
                const st = statSync(full);
                if (st.isDirectory()) walk(full);
                else if (/\.(ts|tsx|mts|cts)$/.test(entry))
                    sourceFiles.push(full);
            }
        })(srcDir);
        for (const file of sourceFiles) {
            const content = readFileSync(file, 'utf8');
            if (aliasPattern.test(content)) {
                externalConsumers.push({
                    consumer: relative(ROOT, file),
                    project: relative(ROOT, pj),
                });
            }
        }
    }
    return externalConsumers;
}

/** Rapporte (sans modifier) les lignes de config à traiter à la main. */
function scanConfigReferences(moduleName) {
    const nameEscaped = moduleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
        new RegExp(`scope:${nameEscaped}(-[a-z0-9-]+)?`),
        new RegExp(
            `@cmz/${nameEscaped}(-[a-z0-9-]+)?-(domain|data|application|ui)`
        ),
        new RegExp(`apps/${nameEscaped}(-[a-z0-9-]+)?`),
        new RegExp(`libs/${nameEscaped}(-[a-z0-9-]+)?`),
    ];
    const report = [];
    for (const relPath of CONFIG_FILES_TO_SCAN) {
        const fullPath = join(ROOT, relPath);
        if (!existsSync(fullPath)) continue;
        const lines = readFileSync(fullPath, 'utf8').split('\n');
        lines.forEach((line, idx) => {
            if (patterns.some((re) => re.test(line))) {
                report.push({
                    file: relPath,
                    line: idx + 1,
                    text: line.trim(),
                });
            }
        });
    }
    return report;
}

function runNode(scriptRelPath, args = []) {
    try {
        const out = execFileSync(
            process.execPath,
            [join(ROOT, scriptRelPath), ...args],
            { cwd: ROOT, encoding: 'utf8' }
        );
        return { ok: true, output: out };
    } catch (error) {
        return {
            ok: false,
            output: (error.stdout || '') + (error.stderr || ''),
        };
    }
}

/** Commande 1 : résout, vérifie, supprime, rapporte. */
function runRetire(moduleName, dryRun) {
    console.log(
        `\n== retire-module: ${moduleName} ${dryRun ? '(dry-run)' : ''} ==\n`
    );

    // Étape 1 — résolution du scope.
    const scope = resolveModuleScope(moduleName);
    if (scope.roots.length === 0) {
        fail(
            `Aucun dossier apps/${moduleName}* ou libs/${moduleName}* trouvé — ` +
                `rien à retirer, ou le nom ne correspond à aucun module existant.`
        );
    }
    console.log(`Scope résolu (${scope.roots.length} racines) :`);
    for (const root of scope.roots) console.log(`  - ${relative(ROOT, root)}`);
    console.log(
        `\n${scope.packages.length} package(s) Nx dans ce scope : ` +
            scope.packages.map((p) => p.name).join(', ')
    );

    // Étape 2 — fermeture transitive.
    const externalConsumers = findExternalConsumers(moduleName, scope);
    if (externalConsumers.length > 0) {
        console.error(
            `\n❌  ${externalConsumers.length} consommateur(s) EXTERNE(S) au scope trouvé(s) :`
        );
        for (const c of externalConsumers) {
            console.error(
                `  ${c.consumer} (dans ${c.project}) importe un alias de ce module`
            );
        }
        fail(
            `Retrait refusé : ce module a des consommateurs réels en dehors de son propre scope. ` +
                `Ce n'est pas un module isolé (POC/démo) — le retirer casserait du code fonctionnel. ` +
                `Traite d'abord ces dépendances.`
        );
    }
    console.log(
        `\n✅  Fermeture transitive vérifiée : aucun consommateur externe au scope.`
    );

    // Étape 5 (rapport, avant suppression pour que les numéros de ligne
    // restent valides si dry-run) — config à traiter à la main.
    const configReport = scanConfigReferences(moduleName);

    if (dryRun) {
        console.log(`\n-- dry-run : rien n'a été écrit --`);
        printConfigReport(configReport);
        process.exit(0);
    }

    // Étape 3 — suppression physique.
    console.log(`\nSuppression de ${scope.roots.length} racine(s)...`);
    for (const root of scope.roots) {
        rmSync(root, { recursive: true, force: true });
        console.log(`  - supprimé : ${relative(ROOT, root)}`);
    }

    // Étape 4 — re-vérification du graphe.
    console.log(
        `\nVérification post-suppression (check-project-names, check-declared-deps)...`
    );
    const namesCheck = runNode('tools/check-project-names.mjs');
    console.log(namesCheck.output.trim());
    const depsCheck = runNode('tools/check-declared-deps.mjs');
    console.log(depsCheck.output.trim());
    if (!namesCheck.ok || !depsCheck.ok) {
        fail(
            `check-project-names ou check-declared-deps échoue après suppression — ` +
                `état du repo incohérent, à investiguer avant de committer.`
        );
    }

    // Rapport de config restant à traiter — c'est la dernière chose que
    // fait CETTE commande. check-no-orphan-references échouerait à coup
    // sûr tant que ce rapport n'est pas traité ; ce n'est pas exécuté ici.
    printConfigReport(configReport);
    console.log(
        `\n== Prochaine étape ==\n` +
            `Traite le rapport ci-dessus (édition manuelle), puis lance :\n` +
            `  node tools/retire-module.mjs --finalize --module ${moduleName}\n`
    );
}

/**
 * Commande 2 : à lancer après avoir traité le rapport de config à la
 * main. Ne touche plus au filesystem des apps/libs (déjà supprimées par
 * runRetire) — régénère bun.lock si besoin, puis appelle
 * check-no-orphan-references comme preuve finale indépendante.
 */
function runFinalize(moduleName, skipInstall) {
    console.log(`\n== retire-module --finalize: ${moduleName} ==\n`);

    const packageJsonHashAtHead = hashPackageJsonAtHead();
    const packageJsonHashNow = hashPackageJson();
    const packageJsonChanged =
        packageJsonHashAtHead !== null &&
        packageJsonHashNow !== null &&
        packageJsonHashNow !== packageJsonHashAtHead;

    if (packageJsonChanged && !skipInstall) {
        const installed = runBunInstall();
        if (!installed) {
            fail(
                `bun install requis mais indisponible/échoué — corrige puis relance ` +
                    `(ou relance avec --skip-install si tu géreras bun.lock toi-même).`
            );
        }
    } else if (packageJsonChanged && skipInstall) {
        console.log(
            `\n⚠️  package.json a changé mais --skip-install est actif — ` +
                `n'oublie pas de lancer bun install toi-même avant de committer.`
        );
    } else {
        console.log(
            `package.json inchangé depuis HEAD — bun install non requis.`
        );
    }

    // Preuve finale, obligatoire, par un outil indépendant.
    console.log(`\n== Vérification finale (check-no-orphan-references) ==\n`);
    const orphanCheck = runNode('tools/check-no-orphan-references.mjs', [
        '--module',
        moduleName,
    ]);
    console.log(orphanCheck.output.trim());
    if (!orphanCheck.ok) {
        console.error(
            `\n⚠️  Des références orphelines subsistent. Traite-les, puis relance : ` +
                `node tools/check-no-orphan-references.mjs --module ${moduleName} ` +
                `(avec --allow / --allow-active-fixture pour les mentions historiques légitimes), ` +
                `ou directement node tools/retire-module.mjs --finalize --module ${moduleName}.`
        );
        process.exit(1);
    }
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    const { module: moduleName, dryRun, skipInstall, finalize } = options;

    if (finalize) runFinalize(moduleName, skipInstall);
    else runRetire(moduleName, dryRun);
}

function printConfigReport(report) {
    if (report.length === 0) {
        console.log(
            `\n✅  Aucune référence trouvée dans les fichiers de config surveillés.`
        );
        return;
    }
    console.log(
        `\n⚠️  ${report.length} référence(s) à traiter À LA MAIN dans les fichiers de config ` +
            `(édition volontairement non automatisée — voir docstring de ce script) :\n`
    );
    let currentFile = null;
    for (const entry of report) {
        if (entry.file !== currentFile) {
            currentFile = entry.file;
            console.log(`\n  ${entry.file} :`);
        }
        console.log(`    L${entry.line}: ${entry.text}`);
    }
}

main();

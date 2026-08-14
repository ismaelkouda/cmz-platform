#!/usr/bin/env node
/**
 * check-ci-wiring.mjs
 *
 * Audit Big Tech 2026-08-14 — root cause d'une classe de bug déjà rencontrée
 * 3 fois dans ce dépôt (check:pair-schema/check:corpus-tools en 2026-08-11,
 * check:dto-schema/check:pattern-nx:workflow-action/action-request/
 * read-only-view en 2026-08-14) : un script `check:*` ajouté à `check:all`
 * dans `package.json` est documenté comme "branché" alors que `check:all`
 * lui-même n'est JAMAIS invoqué automatiquement (ni CI, ni husky — c'est un
 * raccourci local pour développeur). Sans step CI ou hook husky dédié qui
 * l'appelle individuellement, un tel script est une pure intention : il ne
 * bloque jamais rien tant que personne ne pense à le lancer à la main.
 *
 * Ce script comble l'angle mort à la racine plutôt que de re-découvrir
 * chaque instance a posteriori par audit manuel : pour CHAQUE script
 * `check:*` référencé dans `check:all` (package.json), il vérifie qu'il
 * apparaît AUSSI dans au moins un des deux mécanismes d'exécution
 * automatique réels du dépôt :
 *   1. Une step `run:` de `.github/workflows/ci.yml` (ou tout autre workflow
 *      sous `.github/workflows/`) qui invoque ce script — directement
 *      (`node tools/check-x.mjs`) ou via bun (`bun run check:x`).
 *   2. Un hook `.husky/*` qui l'invoque (`bun run check:x`).
 *
 * `check:all` lui-même est délibérément exclu de l'analyse (c'est
 * l'agrégateur, pas une des feuilles à vérifier).
 *
 * Usage : bun run check:ci-wiring
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadCheckAllScripts() {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    const checkAll = pkg.scripts?.['check:all'];
    if (!checkAll) {
        console.error(
            'Erreur : package.json ne déclare plus de script "check:all" — ce script dépend de son existence pour connaître la liste des gates attendus.'
        );
        process.exit(2);
    }
    // "bun run check:x" répété, chaîné par " && "
    const re = /bun run (check:[a-zA-Z0-9:_-]+)/g;
    const scripts = [];
    let m;
    while ((m = re.exec(checkAll))) {
        scripts.push(m[1]);
    }
    if (scripts.length === 0) {
        console.error(
            'Erreur : aucun "bun run check:*" trouvé dans check:all — regex désynchronisée de la forme réelle de la commande ?'
        );
        process.exit(2);
    }
    return scripts;
}

function loadAutomationSources() {
    const sources = [];

    const workflowsDir = join(ROOT, '.github/workflows');
    let workflowFiles = [];
    try {
        workflowFiles = readdirSync(workflowsDir).filter(
            (f) => f.endsWith('.yml') || f.endsWith('.yaml')
        );
    } catch {
        // dossier absent — pas fatal ici, juste aucune source CI.
    }
    for (const file of workflowFiles) {
        sources.push({
            label: `.github/workflows/${file}`,
            content: readFileSync(join(workflowsDir, file), 'utf8'),
        });
    }

    for (const hook of ['pre-commit', 'pre-push', 'commit-msg']) {
        const path = join(ROOT, '.husky', hook);
        try {
            sources.push({
                label: `.husky/${hook}`,
                content: readFileSync(path, 'utf8'),
            });
        } catch {
            // hook absent — pas fatal, juste aucune source pour celui-là.
        }
    }

    return sources;
}

/**
 * Un script est "câblé" si son nom apparaît dans une source d'automatisation
 * — soit en toutes lettres (`bun run check:x`), soit via l'appel direct au
 * fichier node sous-jacent (on tolère cette forme : plusieurs jobs CI
 * appellent `node tools/check-x.mjs` plutôt que `bun run check:x` pour
 * éviter une installation `bun` complète dans des jobs qui n'en ont pas
 * besoin par ailleurs — même résultat, forme différente, cf. jobs
 * `docs-freshness`/`secrets` existants).
 */
function isWired(scriptName, pkgScripts, sources) {
    for (const { content } of sources) {
        if (content.includes(`bun run ${scriptName}`)) return true;
        if (content.includes(`bunx nx run ${scriptName}`)) return true;
    }
    // Repli : le script package.json appelle-t-il directement un fichier
    // tools/*.mjs dont le nom de fichier est mentionné dans une source ?
    const def = pkgScripts[scriptName] ?? '';
    const fileMatch = def.match(/tools\/[a-zA-Z0-9/_.-]+\.mjs/);
    if (fileMatch) {
        const toolPath = fileMatch[0];
        for (const { content } of sources) {
            if (content.includes(toolPath)) return true;
        }
    }
    return false;
}

function main() {
    const scripts = loadCheckAllScripts();
    const sources = loadAutomationSources();
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

    const orphans = scripts.filter((s) => !isWired(s, pkg.scripts, sources));

    console.log(
        `[check:ci-wiring] ${scripts.length} script(s) déclaré(s) dans check:all, sources d'automatisation scannées : ${sources.map((s) => s.label).join(', ')}.`
    );

    if (orphans.length > 0) {
        console.error(
            "\n✖ Script(s) présent(s) dans check:all mais jamais invoqué(s) individuellement par CI ou husky (donc jamais réellement bloquant, quoi qu'affirme la documentation) :\n"
        );
        for (const s of orphans) {
            console.error(`  ${s}`);
        }
        console.error(
            '\nAjouter une step CI (.github/workflows/ci.yml) ou un hook husky (.husky/*) ' +
                'qui invoque ce script individuellement — "branché dans check:all" seul ne ' +
                "rend rien bloquant, check:all lui-même n'est jamais exécuté automatiquement."
        );
        process.exit(1);
    }

    console.log(
        "\n✔ Tous les scripts de check:all sont câblés à au moins un mécanisme d'exécution automatique (CI ou husky)."
    );
}

main();

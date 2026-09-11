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
 * `check:*` référencé dans `check:all` (package.json), plus les gates coûteuses
 * explicitement obligatoires hors agrégateur, il vérifie que le script est
 * réellement invoqué par au moins un des deux mécanismes d'exécution
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

import { parse as parseYaml } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED_STANDALONE_SCRIPTS = [
    'check:library-candidate-isolation',
    'check:library-setup-integration',
    'check:bundle-metrics-freshness',
];

export function workflowRunCommands(content, label = 'workflow') {
    let workflow;
    try {
        workflow = parseYaml(content);
    } catch (error) {
        throw new Error(`${label}: YAML invalide (${error.message})`, {
            cause: error,
        });
    }
    const commands = [];
    for (const job of Object.values(workflow?.jobs ?? {})) {
        for (const step of job?.steps ?? []) {
            if (typeof step?.run === 'string') commands.push(step.run);
        }
    }
    return commands;
}

export function hookCommands(content) {
    return content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'));
}

export function commandInvokes(command, invocation) {
    return command
        .split(/\r?\n/)
        .flatMap((line) => line.split(/\s*(?:&&|\|\||;)\s*/))
        .map((segment) => segment.trim())
        .some(
            (segment) =>
                segment === invocation || segment.startsWith(`${invocation} `)
        );
}

export function packageToolInvocations(definition) {
    return definition
        .split(/\s*&&\s*/)
        .map((command) => command.trim())
        .filter((command) =>
            /^node(?:\s+--test)?\s+tools\/.+\.mjs(?:\s|$)/.test(command)
        );
}

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
        const label = `.github/workflows/${file}`;
        sources.push({
            label,
            commands: workflowRunCommands(
                readFileSync(join(workflowsDir, file), 'utf8'),
                label
            ),
        });
    }

    for (const hook of ['pre-commit', 'pre-push', 'commit-msg']) {
        const path = join(ROOT, '.husky', hook);
        try {
            sources.push({
                label: `.husky/${hook}`,
                commands: hookCommands(readFileSync(path, 'utf8')),
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
    for (const { commands } of sources) {
        if (
            commands.some((command) =>
                commandInvokes(command, `bun run ${scriptName}`)
            )
        )
            return true;
        if (
            commands.some((command) =>
                commandInvokes(command, `bunx nx run ${scriptName}`)
            )
        )
            return true;
    }
    // Repli : lorsqu'une step développe le script package.json au lieu de
    // l'appeler par son nom, TOUTES ses commandes Node feuilles doivent être
    // réellement exécutées. Une seule mention de fichier ne suffit pas.
    const def = pkgScripts[scriptName] ?? '';
    const leaves = packageToolInvocations(def);
    if (leaves.length > 0) {
        return leaves.every((leaf) =>
            sources.some(({ commands }) =>
                commands.some((command) => commandInvokes(command, leaf))
            )
        );
    }
    return false;
}

function main() {
    const scripts = [
        ...new Set([...loadCheckAllScripts(), ...REQUIRED_STANDALONE_SCRIPTS]),
    ];
    const sources = loadAutomationSources();
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

    const undefinedScripts = REQUIRED_STANDALONE_SCRIPTS.filter(
        (script) => typeof pkg.scripts?.[script] !== 'string'
    );
    if (undefinedScripts.length) {
        console.error(
            `✖ Gate(s) CI obligatoire(s) absente(s) de package.json : ${undefinedScripts.join(', ')}`
        );
        process.exit(1);
    }

    const orphans = scripts.filter((s) => !isWired(s, pkg.scripts, sources));

    console.log(
        `[check:ci-wiring] ${scripts.length} gate(s) obligatoire(s), dont ${REQUIRED_STANDALONE_SCRIPTS.length} hors check:all ; sources d'automatisation scannées : ${sources.map((s) => s.label).join(', ')}.`
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
        "\n✔ Toutes les gates obligatoires sont câblées à au moins un mécanisme d'exécution automatique (CI ou husky)."
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();

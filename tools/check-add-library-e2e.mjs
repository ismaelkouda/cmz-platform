#!/usr/bin/env node
/**
 * check:add-library-e2e — exerce la commande NOMINALE de bout en bout.
 *
 * Les gates existantes prouvent des morceaux : `check:library-setup` valide les
 * contrats sans rien installer, `check:library-candidate-isolation` attaque le
 * bac à sable sans exercer le métier. Aucune ne lance `add-library`. Or tous les
 * défauts sérieux de ce lot — `node_modules` imbriqués, cache natif Nx, sockets
 * de plugins, réécriture du package.json par le schematic, syntaxe `--mount`
 * invalide, résolution contextuelle Bun, polices Google en build de production —
 * ont été trouvés en EXÉCUTANT, jamais par les tests unitaires.
 *
 * Ce que cette gate exerce : résolution Bun réelle en trois temps, schematic
 * officiel, normalisations, oracles runtime (compilation Material, cascade
 * compilée, moteur de rendu, build de production hors réseau), coexistence, et
 * le change-set produit.
 *
 * Ce qu'elle N'exerce PAS, et il faut le dire : `--dry-run` s'arrête avant la
 * transaction de publication. La publication, sa reprise après crash et la
 * synchronisation branche/index/worktree restent couvertes par
 * `publication-transaction.test.mjs` uniquement.
 *
 * L'assertion ne porte PAS sur le `plan_id` : il agrège `runner_sha256`, donc il
 * change à chaque modification de l'outillage — l'épingler rendrait la gate
 * rouge à chaque commit légitime. Elle porte sur l'ensemble des chemins du
 * change-set, qui lui ne doit pas bouger.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const APP = process.env.CMZ_E2E_APP ?? 'backoffice-angular';
const LIBRARY = process.env.CMZ_E2E_LIBRARY ?? 'angular-material';

/** Chemins que l'ajout de Material à une app Angular doit toucher, et eux seuls. */
const EXPECTED_PATHS = [
    `apps/${APP}/.cmz/libraries.json`,
    `apps/${APP}/src/index.html`,
    `apps/${APP}/src/styles.scss`,
    'bun.lock',
    'package.json',
];

function fail(message, detail) {
    console.error(`\n❌ check:add-library-e2e — ${message}`);
    if (detail) console.error(detail.slice(0, 4000));
    process.exit(1);
}

const started = Date.now();
const result = spawnSync(
    process.execPath,
    ['tools/add-library.mjs', '--app', APP, '--library', LIBRARY, '--dry-run'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
);
const elapsed = Math.round((Date.now() - started) / 1000);

if (result.error) fail(`exécution impossible (${result.error.message})`);
if (result.status !== 0) {
    fail(`la commande a échoué (code ${result.status})`, result.stderr);
}

const start = result.stdout.indexOf('{');
const end = result.stdout.lastIndexOf('}');
if (start < 0 || end <= start) fail('sortie JSON introuvable', result.stdout);
let report;
try {
    report = JSON.parse(result.stdout.slice(start, end + 1));
} catch (error) {
    fail(`sortie JSON illisible (${error.message})`, result.stdout);
}

if (report.published !== false) fail('un --dry-run ne doit rien publier');
if (!/^library-plan:[a-f0-9]{64}$/.test(report.plan?.plan_id ?? '')) {
    fail('plan_id absent ou malformé');
}
const observed = report.changeSet?.changes?.map(({ path }) => path).sort();
if (JSON.stringify(observed) !== JSON.stringify([...EXPECTED_PATHS].sort())) {
    fail(
        'change-set différent de l’ensemble attendu',
        `attendu : ${EXPECTED_PATHS.join(', ')}\nobtenu  : ${(observed ?? []).join(', ')}`
    );
}
if (report.changeSet.changes.some(({ op }) => op !== 'modify')) {
    fail('un ajout de bibliothèque ne crée ni ne supprime de fichier gouverné');
}

console.log(
    `✔ check:add-library-e2e — ${LIBRARY} sur ${APP} : ${observed.length} fichiers, ` +
        `${report.plan.plan_id.slice(0, 26)}…, ${elapsed} s. ` +
        `Publication NON exercée (--dry-run).`
);

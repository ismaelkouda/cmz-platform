import { execFileSync } from 'node:child_process';

const TEST_IDENTITY = Object.freeze({
    GIT_AUTHOR_NAME: 'CMZ Test',
    GIT_AUTHOR_EMAIL: 'cmz-test@example.invalid',
    GIT_COMMITTER_NAME: 'CMZ Test',
    GIT_COMMITTER_EMAIL: 'cmz-test@example.invalid',
});

/**
 * Exécute `git` dans un dépôt de fixture jetable, avec l'identité de test.
 */
export function fixtureGit(root, args) {
    return execFileSync('git', ['-C', root, ...args], {
        encoding: 'utf8',
        env: { ...process.env, ...TEST_IDENTITY },
    }).trim();
}

/**
 * `git init` d'un dépôt de fixture jetable, avec l'auto-gc forcé en avant-plan.
 *
 * Copier `tools/`, `conventions/` et `apps/` dans un fixture puis `git add .`
 * crée assez d'objets pour franchir le seuil de `gc --auto`. Par défaut
 * (`gc.autoDetach=true`), ce gc part en tâche de fond : il continue d'écrire
 * sous `.git/objects` après le retour de la commande git, entre en course avec
 * le teardown `fs.rm` et le fait échouer en `ENOTEMPTY` sur le runner Linux.
 *
 * FLAKE-GIT-AUTOMAINT-01 (D1) a observé ce mécanisme sur Git 2.55.0 avec un
 * seuil abaissé dans une fixture possédée : une maintenance détachée réécrivait
 * les packs après le retour du commit, et ce helper la maintenait en
 * avant-plan. Pour les `ENOTEMPTY` des tests `page-realization-v5` (petite
 * fixture, seuil non franchi dans les observations réelles), la cause reste
 * inconnue. Appeler ce helper avant le premier commit : un réglage posé après
 * ne couvre pas la maintenance déclenchée par ce commit.
 *
 * `gc.autoDetach=false` NE DÉSACTIVE PAS l'auto-gc : `gc.auto` n'est jamais
 * écrit, donc git garde son seuil par défaut et l'auto-gc reste couvert. Le
 * réglage force seulement le gc en avant-plan (bloquant) : la commande qui le
 * déclenche attend sa fin, aucun processus ne survit à la commande.
 *
 * Le réglage est PERSISTÉ dans `.git/config` local — pas passé en `-c` — parce
 * que le code de production sous test (`compatibility-promotion.mjs`,
 * `publication-transaction.mjs`, `git-tree.mjs`) fait ses propres appels git
 * hermétiques : ils neutralisent les config system/global mais lisent toujours
 * le `.git/config` local. Un `-c` ne couvrirait que les appels du test.
 */
export function initFixtureRepo(root) {
    fixtureGit(root, ['init', '--quiet']);
    fixtureGit(root, ['config', 'gc.autoDetach', 'false']);
    fixtureGit(root, ['config', 'maintenance.autoDetach', 'false']);
}

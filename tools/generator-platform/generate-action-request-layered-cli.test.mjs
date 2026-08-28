/**
 * generate-action-request-layered-cli.test.mjs — étape 4 (additive) du
 * chantier « générateur en couches » (ADR-0003 §5d).
 *
 * generateActionRequest() / --target acceptaient jusque-là exactement 4
 * valeurs (all, angular, react, reactjs). Cette étape ajoute les 6
 * targets en couches (angular-{domain,data,application},
 * react-{domain,data,application}) plus un raccourci `all-layered`,
 * sans changer le comportement de `all` (rétrocompatibilité stricte —
 * un appelant existant utilisant --target all ne doit pas voir
 * apparaître de nouveaux répertoires de sortie).
 *
 * Garde-fous vérifiés ici, exécutables (publication réelle sur disque
 * dans un répertoire temporaire, pas de golden test) :
 *   1. --target all continue de ne produire que angular/reactjs (aucune
 *      régression de portée pour les appelants existants).
 *   2. --target all-layered produit réellement les 6 packages en
 *      couches sur disque, chacun avec son generation-manifest.json.
 *   3. Un target en couches unique (ex. react-domain) fonctionne seul,
 *      sans dépendre de la présence d'angular dans la sélection (preuve
 *      que la référence de hash partagée n'est plus câblée en dur sur
 *      'angular').
 *   4. Une valeur --target inconnue reste rejetée.
 */
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

import { generateActionRequest } from './generate-action-request.mjs';

const definitionPath = new URL(
    'sources/newsletter-subscribe.definition.json',
    import.meta.url
).pathname;

async function withTempDir(run) {
    const parent = await mkdtemp(resolve(tmpdir(), 'cmz-layered-cli-'));
    // createGenerationOutput refuse tout outputRoot déjà existant, même
    // vide (protection contre l'écrasement accidentel d'une sortie non
    // gérée par le générateur) — mkdtemp crée le dossier lui-même, donc
    // on descend d'un niveau vers un chemin qui n'existe pas encore.
    const dir = resolve(parent, 'out');
    try {
        await run(dir);
    } finally {
        await rm(parent, { recursive: true, force: true });
    }
}

test('--target all still only produces angular/reactjs (no scope regression)', async () => {
    await withTempDir(async (outputRoot) => {
        const result = await generateActionRequest({
            definitionPath,
            outputRoot,
            target: 'all',
            dryRun: true,
        });
        assert.deepEqual(result.targets.sort(), ['angular', 'reactjs']);
    });
});

test('--target all-layered publishes the 6 layered packages for real, on disk', async () => {
    await withTempDir(async (outputRoot) => {
        const result = await generateActionRequest({
            definitionPath,
            outputRoot,
            target: 'all-layered',
        });
        assert.deepEqual(result.targets.sort(), [
            'angular-application',
            'angular-data',
            'angular-domain',
            'react-application',
            'react-data',
            'react-domain',
        ]);
        assert.equal(result.publication.status, 'created');
        for (const targetId of result.targets) {
            const entries = await readdir(resolve(outputRoot, targetId));
            assert.ok(
                entries.includes('generation-manifest.json'),
                `${targetId}: missing generation-manifest.json on disk`
            );
        }
    });
});

test('a single layered target (react-domain) publishes on its own, independent of angular', async () => {
    await withTempDir(async (outputRoot) => {
        const result = await generateActionRequest({
            definitionPath,
            outputRoot,
            target: 'react-domain',
        });
        assert.deepEqual(result.targets, ['react-domain']);
        assert.equal(result.publication.status, 'created');
        assert.ok(result.semanticSha256);
        const entries = await readdir(resolve(outputRoot, 'react-domain'));
        assert.ok(entries.includes('src'));
    });
});

test('--target angular (flat, single-package) still publishes exactly as before this step', async () => {
    await withTempDir(async (outputRoot) => {
        const result = await generateActionRequest({
            definitionPath,
            outputRoot,
            target: 'angular',
        });
        assert.deepEqual(result.targets, ['angular']);
        assert.equal(result.publication.status, 'created');
        const entries = await readdir(resolve(outputRoot, 'angular', 'src'));
        // Sortie plate historique : un seul package, pas de sous-dossier
        // par couche — preuve que le chemin typecheckGenerated (isolé)
        // reste emprunté pour les targets hors groupe de couches.
        assert.ok(entries.includes('action-request-client.ts'));
    });
});

test('an unknown --target value is rejected before doing any work', async () => {
    await withTempDir(async (outputRoot) => {
        await assert.rejects(
            () =>
                generateActionRequest({
                    definitionPath,
                    outputRoot,
                    target: 'bogus',
                    dryRun: true,
                }),
            // generateActionRequest() ne valide pas --target lui-même
            // (c'est parseArguments(), au niveau CLI, qui le fait) — un
            // target absent des clés calculées par render-targets.mjs
            // se traduit par une sélection vide, rejetée explicitement.
            /no matching target found/
        );
    });
});

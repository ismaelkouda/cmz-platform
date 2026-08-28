/**
 * render-targets-layered.test.mjs — étape 3 (additive) du chantier
 * « générateur en couches » (ADR-0003 §5d).
 *
 * L'étape 2 a produit renderAngularNxLayered, une capacité isolée
 * (exercée uniquement par renderers-layered.test.mjs). Cette étape la
 * branche à render-targets.mjs (computeTargetsForSemantic expose 3
 * targets angular-{domain,data,application} en plus de angular/react)
 * ET au pipeline de publication transactionnel réel
 * (core/generation-change-set.mjs, core/generation-publication.mjs),
 * qui restait jusque-là verrouillé sur exactement 2 targets
 * (targetProfiles figé + boucle littérale ['angular','reactjs']).
 *
 * Portée strictement additive : angular/react (plat) restent identiques
 * bit-à-bit (voir renderers.test.mjs, golden manifests inchangés).
 * React et workflow-action restent hors périmètre de cette étape.
 *
 * Garde-fous vérifiés ici, dans le même esprit exécutable que
 * renderers-layered.test.mjs (pas de golden manifest figé pour les
 * couches — la preuve est la compilation + le passage réel par le
 * pipeline de changement transactionnel) :
 *   1. computeTargets() expose bien les 3 nouvelles clés, chacune avec
 *      un manifest valide selon generation-manifest.schema.json.
 *   2. buildGenerationChangeSet accepte ces 3 targets et les planifie
 *      tous — preuve que la boucle de planification (étape 3) n'ignore
 *      plus silencieusement les targets ajoutés à targetProfiles.
 *   3. Le change-set produit est valide selon change-set.schema.json.
 *   4. Un targetId inconnu reste rejeté (le garde-fou
 *      "unsupported targets" n'a pas été affaibli par l'extension).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildGenerationChangeSet } from './core/generation-change-set.mjs';
import { computeTargets } from './render-targets.mjs';
import { loadJson, validateJsonSchema } from './validate-ir.mjs';

const root = new URL('./', import.meta.url);
const layeredTargetIds = [
    'angular-domain',
    'angular-data',
    'angular-application',
];

test('computeTargets exposes the 3 Angular layered targets in addition to angular/react', async () => {
    const targets = await computeTargets();
    assert.deepEqual(
        Object.keys(targets).sort(),
        [
            'angular',
            'angular-application',
            'angular-data',
            'angular-domain',
            'artifactPlan',
            'react',
        ].sort()
    );
    const manifestSchema = await loadJson(
        new URL('schemas/generation-manifest.schema.json', root)
    );
    for (const targetId of layeredTargetIds) {
        const target = targets[targetId];
        assert.ok(target.files, `${targetId}: missing files`);
        assert.ok(target.manifest, `${targetId}: missing manifest`);
        assert.deepEqual(
            validateJsonSchema(target.manifest, manifestSchema),
            [],
            `${targetId}: manifest violates its schema`
        );
    }
    // Les 3 couches partagent le même modèle sémantique que angular/react
    // (même sha256 d'input) — elles ne sont pas calculées à partir d'un
    // fixture différent.
    for (const targetId of layeredTargetIds) {
        assert.equal(
            targets[targetId].manifest.input.sha256,
            targets.angular.manifest.input.sha256,
            `${targetId}: input sha256 diverges from the flat targets`
        );
    }
});

test('buildGenerationChangeSet plans all 3 layered targets through the real transactional pipeline', async () => {
    const targets = await computeTargets();
    const selected = Object.fromEntries(
        layeredTargetIds.map((targetId) => [targetId, targets[targetId]])
    );
    const outputRoot = new URL('.render-targets-layered-test-dry-run/', root)
        .pathname;
    const changeSet = await buildGenerationChangeSet({
        outputRoot,
        targets: selected,
        controlFiles: undefined,
    });

    // Preuve que la boucle de planification (core/generation-change-set.mjs)
    // ne se limite plus à ['angular', 'reactjs'] : les 3 targets en
    // couches, absents de cette liste littérale avant l'étape 3,
    // apparaissent bien dans le plan.
    assert.deepEqual(
        changeSet.targets.map((target) => target.id).sort(),
        [...layeredTargetIds].sort()
    );
    // Rien n'existe encore sous outputRoot (dry-run jamais matérialisé) :
    // toutes les actions doivent être des créations.
    assert.equal(changeSet.summary.replace, 0);
    assert.equal(changeSet.summary.delete, 0);
    assert.equal(changeSet.summary.unchanged, 0);
    assert.ok(changeSet.summary.create > 0);

    const changeSetSchema = await loadJson(
        new URL('schemas/change-set.schema.json', root)
    );
    assert.deepEqual(
        validateJsonSchema(changeSet, changeSetSchema),
        [],
        'change set violates its schema'
    );
});

test('an unknown targetId is still rejected (the additive extension did not weaken this guard)', async () => {
    await assert.rejects(
        () =>
            buildGenerationChangeSet({
                outputRoot: new URL(
                    '.render-targets-layered-test-dry-run-bogus/',
                    root
                ).pathname,
                targets: { 'angular-domain-bogus': {} },
                controlFiles: undefined,
            }),
        /unsupported targets: angular-domain-bogus/
    );
});

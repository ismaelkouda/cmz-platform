/**
 * render-targets-layered.test.mjs — étape 3 (additive) du chantier
 * « générateur en couches » (ADR-0003 §5d) — Angular puis React.
 *
 * L'étape 2 a produit renderAngularNxLayered puis
 * renderReactTypescriptLayered, deux capacités isolées (exercées
 * respectivement par renderers-layered.test.mjs et
 * renderers-layered-react.test.mjs). Cette étape les branche à
 * render-targets.mjs (computeTargetsForSemantic expose 6 targets
 * {angular,react}-{domain,data,application} en plus de angular/react)
 * ET au pipeline de publication transactionnel réel
 * (core/generation-change-set.mjs, core/generation-publication.mjs),
 * qui restait jusque-là verrouillé sur exactement 2 targets
 * (targetProfiles figé + boucle littérale ['angular','reactjs']).
 *
 * Portée strictement additive : angular/react (plat) restent identiques
 * bit-à-bit (voir renderers.test.mjs, golden manifests inchangés).
 * workflow-action reste hors périmètre de cette étape.
 *
 * Garde-fous vérifiés ici, dans le même esprit exécutable que
 * renderers-layered{,-react}.test.mjs (pas de golden manifest figé pour
 * les couches — la preuve est la compilation + le passage réel par le
 * pipeline de changement transactionnel) :
 *   1. computeTargets() expose bien les 6 nouvelles clés, chacune avec
 *      un manifest valide selon generation-manifest.schema.json.
 *   2. buildGenerationChangeSet accepte ces 6 targets (Angular seuls,
 *      React seuls, et les deux ensemble) et les planifie tous —
 *      preuve que la boucle de planification n'ignore plus
 *      silencieusement les targets ajoutés à targetProfiles.
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
const angularLayeredTargetIds = [
    'angular-domain',
    'angular-data',
    'angular-application',
];
const reactLayeredTargetIds = [
    'react-domain',
    'react-data',
    'react-application',
];
const allLayeredTargetIds = [
    ...angularLayeredTargetIds,
    ...reactLayeredTargetIds,
];

test('computeTargets exposes the 6 layered targets (Angular + React) in addition to angular/react', async () => {
    const targets = await computeTargets();
    assert.deepEqual(
        Object.keys(targets).sort(),
        ['angular', 'artifactPlan', 'react', ...allLayeredTargetIds].sort()
    );
    const manifestSchema = await loadJson(
        new URL('schemas/generation-manifest.schema.json', root)
    );
    for (const targetId of allLayeredTargetIds) {
        const target = targets[targetId];
        assert.ok(target.files, `${targetId}: missing files`);
        assert.ok(target.manifest, `${targetId}: missing manifest`);
        assert.deepEqual(
            validateJsonSchema(target.manifest, manifestSchema),
            [],
            `${targetId}: manifest violates its schema`
        );
    }
    // Les 6 couches partagent le même modèle sémantique que angular/react
    // (même sha256 d'input) — elles ne sont pas calculées à partir d'un
    // fixture différent.
    for (const targetId of allLayeredTargetIds) {
        assert.equal(
            targets[targetId].manifest.input.sha256,
            targets.angular.manifest.input.sha256,
            `${targetId}: input sha256 diverges from the flat targets`
        );
    }
});

test('buildGenerationChangeSet plans all 6 layered targets (Angular + React together) through the real transactional pipeline', async () => {
    const targets = await computeTargets();
    const selected = Object.fromEntries(
        allLayeredTargetIds.map((targetId) => [targetId, targets[targetId]])
    );
    const outputRoot = new URL('.render-targets-layered-test-dry-run/', root)
        .pathname;
    const changeSet = await buildGenerationChangeSet({
        outputRoot,
        targets: selected,
        controlFiles: undefined,
    });

    // Preuve que la boucle de planification (core/generation-change-set.mjs)
    // ne se limite plus à ['angular', 'reactjs'] : les 6 targets en
    // couches, absents de cette liste littérale avant l'étape 3,
    // apparaissent bien dans le plan — Angular et React mélangés dans un
    // seul change-set, comme le ferait un futur CLI --target=all-layered.
    assert.deepEqual(
        changeSet.targets.map((target) => target.id).sort(),
        [...allLayeredTargetIds].sort()
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

test('buildGenerationChangeSet plans the React layered targets on their own (independent of Angular)', async () => {
    const targets = await computeTargets();
    const selected = Object.fromEntries(
        reactLayeredTargetIds.map((targetId) => [targetId, targets[targetId]])
    );
    const outputRoot = new URL(
        '.render-targets-layered-test-dry-run-react-only/',
        root
    ).pathname;
    const changeSet = await buildGenerationChangeSet({
        outputRoot,
        targets: selected,
        controlFiles: undefined,
    });
    assert.deepEqual(
        changeSet.targets.map((target) => target.id).sort(),
        [...reactLayeredTargetIds].sort()
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

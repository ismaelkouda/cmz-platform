// PLAT-4bis (2026-08-18) — preuve permanente que le moteur workflow-action
// généralisé accepte un second domaine réel (`content-moderation-workflow`)
// sans aucune modification du core au-delà de la généralisation déjà
// committée. Symétrique à `workflow-action.test.mjs` (qui exerce
// `requests-workflow`), mais avec un vocabulaire, des états et des
// permissions entièrement distincts — c'est la garantie de non-régression
// que le moteur reste paramétrable par le vocabulaire de la définition,
// pas rattaché au cas `requests`.
// @see docs/architecture/taches-restantes.md, entrée PLAT-4bis.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { adaptStructuredWorkflow } from './adapters/structured-workflow-adapter.mjs';
import {
    angularExecutor,
    assertWorkflowOracle,
    reactExecutor,
} from './oracles/workflow-runtime-oracle.mjs';
import { materializeWorkflowRuntime } from './oracles/workflow-runtime-harness.mjs';
import { computeWorkflowTargets } from './workflow-targets.mjs';

const definitionUrl = new URL(
    'sources/content-moderation-workflow.definition.json',
    import.meta.url
);
const definitionSchemaUrl = new URL(
    'schemas/workflow-action-definition.schema.json',
    import.meta.url
);

async function loadJson(url) {
    return JSON.parse(await readFile(url, 'utf8'));
}

test('un second domaine workflow-action (vocabulaire distinct) compile et exécute sur les deux cibles', async () => {
    const definitionSchema = await loadJson(definitionSchemaUrl);
    const { behavior: model } = await adaptStructuredWorkflow(
        fileURLToPath(definitionUrl),
        { definitionSchema }
    );
    assert.equal(model.domain.id, 'content-moderation-workflow');
    assert.deepEqual(
        model.operations.map(({ id }) => id),
        ['claim', 'moderate', 'export']
    );

    const targets = await computeWorkflowTargets(model);
    const runtime = await materializeWorkflowRuntime(targets);
    try {
        await assertWorkflowOracle(
            (ports) => angularExecutor(runtime.angular, ports),
            model
        );
        await assertWorkflowOracle(
            (ports) => reactExecutor(runtime.react, ports),
            model
        );
    } finally {
        await runtime.cleanup();
    }
});

test('une mutation du second domaine est détectée sur les deux cibles', async () => {
    const definitionSchema = await loadJson(definitionSchemaUrl);
    const { behavior: model } = await adaptStructuredWorkflow(
        fileURLToPath(definitionUrl),
        { definitionSchema }
    );
    const mutatedModel = structuredClone(model);
    mutatedModel.operations.find((op) => op.id === 'claim').to = 'published';
    const mutated = await computeWorkflowTargets(mutatedModel);
    const runtime = await materializeWorkflowRuntime(mutated);
    try {
        await assert.rejects(() =>
            assertWorkflowOracle(
                (ports) => angularExecutor(runtime.angular, ports),
                model
            )
        );
        await assert.rejects(() =>
            assertWorkflowOracle(
                (ports) => reactExecutor(runtime.react, ports),
                model
            )
        );
    } finally {
        await runtime.cleanup();
    }
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    assertArtifactPlan,
    bindRenderedArtifacts,
    buildArtifactPlan,
} from './core/artifact-plan.mjs';
import { computeTargets } from './render-targets.mjs';
import { renderAngularNx } from './renderers/angular-nx-renderer.mjs';
import { loadJson, validateJsonSchema } from './validate-ir.mjs';
import { computeWorkflowTargets } from './workflow-targets.mjs';

const root = new URL('./', import.meta.url);

test('artifact plans are deterministic, schema-valid, and target-neutral', async () => {
    const [semantic, schema] = await Promise.all([
        loadJson(new URL('fixtures/action-request.semantic.json', root)),
        loadJson(new URL('schemas/artifact-plan.schema.json', root)),
    ]);
    const plan = buildArtifactPlan(semantic, 'semantic-model');
    assert.deepEqual(validateJsonSchema(plan, schema), []);
    assert.deepEqual(
        plan,
        buildArtifactPlan(structuredClone(semantic), 'semantic-model')
    );
    assert.doesNotMatch(
        JSON.stringify(plan),
        /angular|react|typescript|nx|component|hook|injectable/i
    );
    assertArtifactPlan(plan, semantic, 'semantic-model');
});

test('one shared plan owns every Angular and ReactJS artifact', async () => {
    const targets = await computeTargets();
    assert.equal(
        targets.angular.manifest.plan.sha256,
        targets.react.manifest.plan.sha256
    );
    for (const target of [targets.angular, targets.react]) {
        assert.ok(target.manifest.files.length > 0);
        for (const file of target.manifest.files) {
            const planned = targets.artifactPlan.artifacts.find(
                ({ id }) => id === file.artifact_id
            );
            assert.ok(planned);
            assert.equal(file.owner, planned.owner);
            assert.equal(file.write_policy, planned.write_policy);
        }
        const extensions = target.manifest.files.filter(
            ({ owner }) => owner === 'human-owned'
        );
        assert.deepEqual(
            extensions.map(({ path, write_policy: writePolicy }) => ({
                path,
                writePolicy,
            })),
            [
                {
                    path: 'src/after-success.extension.ts',
                    writePolicy: 'preserve',
                },
            ]
        );
    }
});

test('the workflow slice consumes the same target-neutral planning contract', async () => {
    const [targets, schema] = await Promise.all([
        computeWorkflowTargets(),
        loadJson(new URL('schemas/artifact-plan.schema.json', root)),
    ]);
    assert.deepEqual(validateJsonSchema(targets.artifactPlan, schema), []);
    assert.equal(targets.artifactPlan.input.kind, 'behavior-model');
    assert.equal(
        targets.angular.manifest.plan.sha256,
        targets.react.manifest.plan.sha256
    );
    assert.ok(
        targets.artifactPlan.artifacts.some(
            ({ responsibility }) => responsibility === 'execution-controller'
        )
    );
});

test('renderers fail closed on stale plans and incomplete bindings', async () => {
    const [semantic, angularProfile] = await Promise.all([
        loadJson(new URL('fixtures/action-request.semantic.json', root)),
        loadJson(new URL('profiles/angular-nx.profile.json', root)),
    ]);
    const stalePlan = buildArtifactPlan(semantic, 'semantic-model');
    semantic.integrations[0].path = 'changed-after-planning';
    assert.throws(
        () => renderAngularNx(semantic, stalePlan, angularProfile),
        /artifact plan: model hash mismatch/
    );
    assert.throws(
        () =>
            bindRenderedArtifacts(
                stalePlan,
                { 'src/models.ts': 'export interface Model {}' },
                {}
            ),
        /bindings must cover every file exactly once/
    );
});

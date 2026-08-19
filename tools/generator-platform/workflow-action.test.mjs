import assert from 'node:assert/strict';
import {
    copyFile,
    mkdir,
    mkdtemp,
    readFile,
    rm,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
    adaptRequestsWorkflow,
    workflowEvidenceSources,
} from './adapters/requests-workflow-adapter.mjs';
import { adaptStructuredWorkflow } from './adapters/structured-workflow-adapter.mjs';
import { compileWorkflowActionDefinition } from './core/workflow-action-authoring.mjs';
import {
    angularExecutor,
    assertWorkflowOracle,
    reactExecutor,
} from './oracles/workflow-runtime-oracle.mjs';
import { materializeWorkflowRuntime } from './oracles/workflow-runtime-harness.mjs';
import { generateWorkflowAction } from './generate-workflow-action.mjs';
import {
    loadJson,
    repositoryRoot,
    validateJsonSchema,
} from './validate-ir.mjs';
import {
    computeWorkflowTargets,
    verifyWorkflowTargets,
} from './workflow-targets.mjs';

const definitionUrl = new URL(
    'sources/requests-workflow.definition.json',
    import.meta.url
);
const definitionSchemaUrl = new URL(
    'schemas/workflow-action-definition.schema.json',
    import.meta.url
);
const evidenceSchemaUrl = new URL(
    'schemas/workflow-evidence.schema.json',
    import.meta.url
);

test('l’adaptateur requests produit un Behavior Model neutre et traçable', async () => {
    const { behavior: model, evidence } =
        await adaptRequestsWorkflow(repositoryRoot);
    assert.equal(model.domain.id, 'requests-workflow');
    assert.deepEqual(
        model.operations.map(({ id }) => id),
        ['take', 'qualify', 'export']
    );
    assert.equal(model.operations.at(-1).topology, 'async_callback');
    assert.ok(evidence.sources.every(({ sha256 }) => sha256.length === 64));
    const serialized = JSON.stringify(model);
    assert.doesNotMatch(
        serialized,
        /libs\/|\.ts|@angular|React|Nx|Observable|HttpClient/
    );
});

test('la définition JSON et le code réel convergent sur le même Behavior Model', async () => {
    const [source, structured, definitionSchema, evidenceSchema] =
        await Promise.all([
            adaptRequestsWorkflow(repositoryRoot),
            adaptStructuredWorkflow(fileURLToPath(definitionUrl)),
            loadJson(definitionSchemaUrl),
            loadJson(evidenceSchemaUrl),
        ]);
    assert.deepEqual(structured.behavior, source.behavior);
    assert.deepEqual(
        validateJsonSchema(structured.definition, definitionSchema),
        []
    );
    assert.deepEqual(
        validateJsonSchema(structured.evidence, evidenceSchema),
        []
    );
    assert.notDeepEqual(structured.evidence.sources, source.evidence.sources);
});

test('le contrat auteur refuse les compositions workflow non supportées', async () => {
    const definition = await loadJson(definitionUrl);
    const compile = (value) =>
        compileWorkflowActionDefinition(value, {
            sourceUri: 'invalid-workflow.definition.json',
            sourceSha256: '0'.repeat(64),
        });

    const missingRule = structuredClone(definition);
    missingRule.operations[1].rules = missingRule.operations[1].rules.filter(
        (rule) => rule !== 'callback_requires_type'
    );
    assert.throws(() => compile(missingRule), /unsupported rule set/);

    const wrongTopology = structuredClone(definition);
    wrongTopology.operations[2].topology = 'sequential';
    assert.throws(
        () => compile(wrongTopology),
        /does not match a supported structural role/
    );

    const reorderedEffects = structuredClone(definition);
    reorderedEffects.operations[0].steps.reverse();
    assert.throws(
        () => compile(reorderedEffects),
        /unsupported step composition/
    );
});

test('les manifests workflow sont stables et les deux sorties compilent', async () => {
    const targets = await verifyWorkflowTargets();
    assert.equal(
        targets.angular.manifest.input.sha256,
        targets.react.manifest.input.sha256
    );
    const hashes = (target) =>
        new Map(target.manifest.files.map((file) => [file.path, file.sha256]));
    const angular = hashes(targets.angular);
    const react = hashes(targets.react);
    assert.equal(angular.get('src/models.ts'), react.get('src/models.ts'));
    assert.equal(
        angular.get('src/workflow-action-engine.ts'),
        react.get('src/workflow-action-engine.ts')
    );
});

test('l’adaptateur échoue si une règle observée disparaît de la source', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-workflow-source-')
    );
    try {
        for (const source of workflowEvidenceSources) {
            const destination = resolve(temporaryRoot, source.path);
            await mkdir(dirname(destination), { recursive: true });
            await copyFile(resolve(repositoryRoot, source.path), destination);
        }
        const permissionPath = resolve(
            temporaryRoot,
            workflowEvidenceSources[0].path
        );
        const original = await readFile(permissionPath, 'utf8');
        await writeFile(
            permissionPath,
            original.replace(
                'return permission && props.status === WorkflowDetailsStatus.PENDING;',
                'return permission;'
            )
        );
        await assert.rejects(
            () => adaptRequestsWorkflow(temporaryRoot),
            /take must require permission and pending status/
        );
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('une mutation du graphe change les deux arbres et est visible par l’Oracle', async () => {
    const original = await computeWorkflowTargets();
    const mutatedModel = structuredClone(original.model);
    mutatedModel.operations.find(({ id }) => id === 'take').to = 'approved';
    const mutated = await computeWorkflowTargets(mutatedModel);
    assert.notEqual(
        mutated.angular.manifest.tree_sha256,
        original.angular.manifest.tree_sha256
    );
    assert.notEqual(
        mutated.react.manifest.tree_sha256,
        original.react.manifest.tree_sha256
    );
    const runtime = await materializeWorkflowRuntime(mutated);
    try {
        // L'Oracle vérifie le code généré depuis `mutatedModel` contre les
        // attentes du modèle ORIGINAL (non muté) : c'est cette
        // divergence — comportement généré vs comportement attendu — que
        // le test doit détecter, pas une comparaison du modèle muté avec
        // lui-même (toujours cohérente par construction).
        await assert.rejects(() =>
            assertWorkflowOracle(
                (ports) => angularExecutor(runtime.angular, ports),
                original.model
            )
        );
        await assert.rejects(() =>
            assertWorkflowOracle(
                (ports) => reactExecutor(runtime.react, ports),
                original.model
            )
        );
    } finally {
        await runtime.cleanup();
    }
});

test('le renderer échoue si une règle canonique requise disparaît', async () => {
    const { behavior } = await adaptRequestsWorkflow(repositoryRoot);
    const qualify = behavior.operations.find(({ id }) => id === 'qualify');
    qualify.rules = qualify.rules.filter(
        (rule) => rule !== 'callback_requires_type'
    );
    await assert.rejects(
        () => computeWorkflowTargets(behavior),
        /qualify missing rule callback_requires_type/
    );
});

test('la commande génère une fonctionnalité renommée et refuse l’écrasement', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-workflow-authoring-')
    );
    const definitionPath = resolve(
        temporaryRoot,
        'case-review.definition.json'
    );
    const outputRoot = resolve(temporaryRoot, 'generated-case-review');
    try {
        const definition = await loadJson(definitionUrl);
        definition.feature = {
            id: 'case-review',
            name: 'Case review',
            description: 'Take, decide and export review cases.',
        };
        await writeFile(
            definitionPath,
            `${JSON.stringify(definition, null, 2)}\n`
        );
        const result = await generateWorkflowAction({
            definitionPath,
            outputRoot,
            target: 'all',
        });
        assert.deepEqual(result.targets, ['angular', 'reactjs']);
        assert.equal(result.publication.status, 'created');
        assert.equal(result.publication.recovery_pending, undefined);
        const behavior = JSON.parse(
            await readFile(resolve(outputRoot, 'behavior-model.json'), 'utf8')
        );
        const artifactPlan = JSON.parse(
            await readFile(resolve(outputRoot, 'artifact-plan.json'), 'utf8')
        );
        assert.equal(behavior.domain.id, 'case-review');
        assert.equal(artifactPlan.input.model_id, 'behavior:case-review');
        const angularModels = await readFile(
            resolve(outputRoot, 'angular/src/models.ts'),
            'utf8'
        );
        const reactModels = await readFile(
            resolve(outputRoot, 'reactjs/src/models.ts'),
            'utf8'
        );
        assert.match(angularModels, /readonly itemId: string/);
        assert.equal(angularModels, reactModels);
        assert.doesNotMatch(
            `${angularModels}\n${reactModels}`,
            /requests|uniqId|Angular|React/
        );
        const dryRun = await generateWorkflowAction({
            definitionPath,
            outputRoot,
            target: 'all',
            dryRun: true,
        });
        assert.equal(dryRun.changeSet.summary.unchanged, 17);
        assert.equal(dryRun.changeSet.summary.preserve, 2);
        await assert.rejects(
            () =>
                generateWorkflowAction({
                    definitionPath,
                    outputRoot,
                    target: 'all',
                }),
            /output already exists/
        );

        const invalidDefinitionPath = resolve(
            temporaryRoot,
            'invalid.definition.json'
        );
        await writeFile(
            invalidDefinitionPath,
            `${JSON.stringify({
                schema_version: '1.0.0',
                kind: 'workflow-action',
                feature: definition.feature,
            })}\n`
        );
        await assert.rejects(
            () =>
                generateWorkflowAction({
                    definitionPath: invalidDefinitionPath,
                    outputRoot: resolve(temporaryRoot, 'invalid-output'),
                    target: 'angular',
                }),
            /\$\.state: is required/
        );
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});

test('Angular exécute états, permissions, branches et callback asynchrone', async () => {
    const targets = await computeWorkflowTargets();
    const runtime = await materializeWorkflowRuntime(targets);
    try {
        await assertWorkflowOracle(
            (ports) => angularExecutor(runtime.angular, ports),
            targets.model
        );
    } finally {
        await runtime.cleanup();
    }
});

test('ReactJS exécute le même oracle comportemental', async () => {
    const targets = await computeWorkflowTargets();
    const runtime = await materializeWorkflowRuntime(targets);
    try {
        await assertWorkflowOracle(
            (ports) => reactExecutor(runtime.react, ports),
            targets.model
        );
    } finally {
        await runtime.cleanup();
    }
});

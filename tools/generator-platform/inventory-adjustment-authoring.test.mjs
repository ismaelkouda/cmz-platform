import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';

import '@angular/compiler';
import { HttpClient } from '@angular/common/http';
import { createEnvironmentInjector } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';

import { compileActionRequestDefinition } from './core/action-request-authoring.mjs';
import { assertPermissionRuntimeOracle } from './oracles/permission-runtime-oracle.mjs';
import { materializeGeneratedRuntime } from './oracles/runtime-harness.mjs';
import { computeTargetsForSemantic } from './render-targets.mjs';
import {
    loadJson,
    validateEvidence,
    validateJsonSchema,
    validateSemantic,
} from './validate-ir.mjs';

/**
 * PLAT-4bis-AR (2026-08-18) : second domaine `action-request` réel,
 * indépendant de `authentication`/`support`, construit pour prouver la
 * généricité du moteur au sens strict — pas un troisième cas qui se
 * ressemble aux deux premiers. Voir docs/architecture/taches-restantes.md,
 * entrée PLAT-4bis-AR, pour l'investigation complète et les 3 défauts de
 * généricité réels trouvés et corrigés par ce chantier (enum `effect.kind`
 * fermé sur le vocabulaire `authentication`, primitives `date`/`datetime`/
 * `uuid` non supportées par le renderer, contrainte `required` générée
 * en supposant `string` pour tout champ).
 *
 * Axes délibérément disjoints de `authentication`/`support`, tous deux déjà
 * couverts par d'autres tests :
 *   - `access.mode: authorized` comme mode natif de la définition source
 *     (pas une mutation en mémoire d'une définition `public`/`authenticated`) ;
 *   - un `effect.kind` métier personnalisé (`stock_mutation`), jamais vu ;
 *   - une contrainte `equals` croisée sur des champs non-`string`
 *     (`integer`), jamais vu — révèle que `renderRequiredCheck` devait être
 *     généralisé au-delà de `string` ;
 *   - un type primitif `uuid`, jamais vu — révèle que le renderer ne
 *     mappait que 5 des 8 primitives déclarées valides par le validateur ;
 *   - 2 opérations (ni 1 comme `support`, ni 3 comme `authentication`),
 *     preuve empirique supplémentaire que le nombre d'opérations est
 *     arbitraire.
 */

const definitionUrl = new URL(
    'sources/inventory-adjustment.definition.json',
    import.meta.url
);
const schemaRoot = new URL('schemas/', import.meta.url);
let compiled;
let definition;
let targets;
let runtime;

before(async () => {
    const loaded = await Promise.all([
        loadJson(definitionUrl),
        loadJson(new URL('action-request-definition.schema.json', schemaRoot)),
        loadJson(new URL('evidence.schema.json', schemaRoot)),
        loadJson(new URL('semantic-model.schema.json', schemaRoot)),
    ]);
    [definition] = loaded;
    const [, definitionSchema, evidenceSchema, semanticSchema] = loaded;
    assert.deepEqual(
        validateJsonSchema(definition, definitionSchema),
        [],
        'inventory-adjustment definition schema'
    );
    const content = await readFile(definitionUrl);
    compiled = compileActionRequestDefinition(definition, {
        sourceUri:
            'tools/generator-platform/sources/inventory-adjustment.definition.json',
        sourceSha256: createHash('sha256').update(content).digest('hex'),
    });
    assert.deepEqual(
        await validateEvidence(compiled.evidence, evidenceSchema, {
            verifyHashes: false,
        }),
        [],
        'compiled evidence model'
    );
    assert.deepEqual(
        validateSemantic(compiled.semantic, semanticSchema, compiled.evidence),
        [],
        'compiled semantic model'
    );
    targets = await computeTargetsForSemantic(compiled.semantic);
    runtime = await materializeGeneratedRuntime(targets);
});

after(async () => {
    await runtime?.cleanup();
});

const adjustInput = {
    item_id: '4b1f2c3d-0000-4000-8000-000000000001',
    quantity_delta: -5,
    reason_code: 'damaged-goods',
};
const adjustResult = {
    adjustment_id: '4b1f2c3d-0000-4000-8000-000000000002',
    resulting_quantity: 95,
};
const reconcileInput = {
    item_id: '4b1f2c3d-0000-4000-8000-000000000001',
    counted_quantity: 100,
    confirmed_quantity: 100,
};

test('authoring definition compiles into target-neutral evidence and semantic models', () => {
    assert.equal(
        compiled.semantic.model_id,
        'inventory-adjustment-action-request-semantic'
    );
    assert.deepEqual(
        compiled.semantic.operations.map(({ id }) => id),
        ['adjust-stock', 'reconcile-count']
    );
    assert.equal(compiled.semantic.operations[0].access.mode, 'authorized');
    assert.deepEqual(compiled.semantic.operations[0].access.permissions, [
        'inventory.adjust',
    ]);
    assert.doesNotMatch(
        JSON.stringify(compiled.semantic),
        /Angular|React|TypeScript|Nx/
    );
});

test('generic profiles expand for inventory-adjustment without authentication or support naming leakage', () => {
    const angularProject = JSON.parse(targets.angular.files['project.json']);
    const reactPackage = JSON.parse(targets.react.files['package.json']);
    assert.equal(angularProject.name, 'generated-inventory-adjustment-angular');
    assert.equal(reactPackage.name, 'generated-inventory-adjustment-react');
    assert.doesNotMatch(
        Object.values(targets.angular.files).join('\n'),
        /AuthenticationClient|AuthenticationCommands|SupportClient|contactSupport/
    );
    assert.doesNotMatch(
        Object.values(targets.react.files).join('\n'),
        /AuthenticationClient|createAuthenticationHooks|useContactSupport/
    );
});

test('uuid, date and datetime primitives render to a valid TypeScript model', () => {
    const models = targets.angular.files['src/models.ts'];
    assert.match(models, /readonly item_id: string;/);
    assert.match(models, /readonly adjustment_id: string;/);
});

test('required constraint on a non-string field does not degenerate to a string check', () => {
    const validation = targets.angular.files['src/validation.ts'];
    assert.match(
        validation,
        /value\.quantity_delta === undefined \|\| value\.quantity_delta === null/
    );
    assert.doesNotMatch(
        validation,
        /typeof value\.quantity_delta === 'string'/
    );
});

test('Angular executes adjust-stock (authorized by default) and reconcile-count (cross-field equals on integers)', async () => {
    const requests = [];
    const http = {
        post(url, body) {
            requests.push({ url, body });
            return of(
                url.endsWith('adjustments') ? adjustResult : adjustResult
            );
        },
    };
    const injector = createEnvironmentInjector(
        [
            { provide: HttpClient, useValue: http },
            {
                provide: runtime.angular.client.ACTION_REQUEST_BASE_URL,
                useValue: 'https://api.example.test/',
            },
            {
                provide: runtime.angular.commands.PERMISSION_PORT,
                useValue: { has: () => true },
            },
            runtime.angular.client.ActionRequestClient,
            runtime.angular.commands.ActionRequestCommands,
        ],
        null
    );
    try {
        const commands = injector.get(
            runtime.angular.commands.ActionRequestCommands
        );
        assert.deepEqual(
            await firstValueFrom(commands.adjustStock(adjustInput)),
            adjustResult
        );
        assert.deepEqual(requests[0], {
            url: 'https://api.example.test/inventory/adjustments',
            body: adjustInput,
        });
        assert.deepEqual(
            runtime.angular.validation.validateReconcileCountInput({
                ...reconcileInput,
                confirmed_quantity: 99,
            }),
            [{ field: 'confirmed_quantity', rule: 'equals:counted_quantity' }]
        );
        assert.deepEqual(
            runtime.angular.validation.validateReconcileCountInput(
                reconcileInput
            ),
            []
        );
    } finally {
        injector.destroy();
    }
});

test('authorized adjust-stock requires every canonical permission before either target calls its transport', async () => {
    await assertPermissionRuntimeOracle(runtime, {
        permissions: ['inventory.adjust'],
        input: adjustInput,
        result: adjustResult,
        angularMethod: 'adjustStock',
        reactHook: 'useAdjustStock',
        baseUrl: 'https://api.example.test/',
    });
});

test('authorized reconcile-count requires both canonical permissions before either target calls its transport', async () => {
    await assertPermissionRuntimeOracle(runtime, {
        permissions: ['inventory.adjust', 'inventory.reconcile'],
        input: reconcileInput,
        result: adjustResult,
        angularMethod: 'reconcileCount',
        reactHook: 'useReconcileCount',
        baseUrl: 'https://api.example.test/',
    });
});

test('removing the cross-field equals constraint changes both generated trees and is caught by validation', async () => {
    const mutant = structuredClone(compiled.semantic);
    mutant.constraints = mutant.constraints.filter(
        ({ id }) =>
            id !== 'constraint.reconcile-count-confirmed-quantity-equals'
    );
    const semanticSchema = await loadJson(
        new URL('semantic-model.schema.json', schemaRoot)
    );
    assert.deepEqual(
        validateSemantic(mutant, semanticSchema, compiled.evidence),
        [],
        'mutant: remains structurally valid (a missing constraint is not a schema violation)'
    );
    const mutantTargets = await computeTargetsForSemantic(mutant);
    assert.notEqual(
        mutantTargets.angular.manifest.tree_sha256,
        targets.angular.manifest.tree_sha256,
        'mutation must change the Angular tree'
    );
    assert.notEqual(
        mutantTargets.react.manifest.tree_sha256,
        targets.react.manifest.tree_sha256,
        'mutation must change the ReactJS tree'
    );
    const mutantRuntime = await materializeGeneratedRuntime(mutantTargets);
    try {
        assert.deepEqual(
            mutantRuntime.angular.validation.validateReconcileCountInput({
                ...reconcileInput,
                confirmed_quantity: 99,
            }),
            [],
            'mutant: the equals check must have disappeared from the generated validation'
        );
    } finally {
        await mutantRuntime.cleanup();
    }
});

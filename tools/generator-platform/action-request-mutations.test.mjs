import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import {
    assertAngularNominalOracle,
    assertReactNominalOracle,
    assertValidationOracle,
} from './core/action-request-runtime-oracle.mjs';
import { materializeGeneratedRuntime } from './core/runtime-harness.mjs';
import {
    computeTargets,
    computeTargetsForSemantic,
} from './render-targets.mjs';
import { loadJson, validateSemantic } from './validate-ir.mjs';

const mutationDefinitions = {
    constraint(semantic) {
        semantic.constraints = semantic.constraints.filter(
            ({ id }) => id !== 'constraint.reset-password-confirmation'
        );
    },
    session(semantic) {
        const login = semantic.operations.find(({ id }) => id === 'login');
        login.effects = login.effects.filter(
            ({ kind }) => kind !== 'establish_session'
        );
    },
    access(semantic) {
        const login = semantic.operations.find(({ id }) => id === 'login');
        const integration = semantic.integrations.find(
            ({ id }) => id === 'integration.login'
        );
        login.access.mode = 'authenticated';
        integration.authentication = 'bearer';
    },
};

const runtimes = new Map();
const targetTrees = new Map();

before(async () => {
    const [semantic, schema, evidence, baseline] = await Promise.all([
        loadJson(
            new URL('fixtures/action-request.semantic.json', import.meta.url)
        ),
        loadJson(
            new URL('schemas/semantic-model.schema.json', import.meta.url)
        ),
        loadJson(
            new URL('fixtures/action-request.evidence.json', import.meta.url)
        ),
        computeTargets(),
    ]);

    for (const [name, mutate] of Object.entries(mutationDefinitions)) {
        const mutant = structuredClone(semantic);
        mutate(mutant);
        assert.deepEqual(
            validateSemantic(mutant, schema, evidence),
            [],
            `${name}: mutation must remain structurally valid`
        );
        const targets = await computeTargetsForSemantic(mutant);
        targetTrees.set(name, {
            angular: targets.angular.manifest.tree_sha256,
            react: targets.react.manifest.tree_sha256,
            baselineAngular: baseline.angular.manifest.tree_sha256,
            baselineReact: baseline.react.manifest.tree_sha256,
        });
        runtimes.set(name, await materializeGeneratedRuntime(targets));
    }
});

after(async () => {
    await Promise.all([...runtimes.values()].map(({ cleanup }) => cleanup()));
});

async function expectKilled(action, message, label) {
    let failure;
    try {
        await action();
    } catch (error) {
        failure = error;
    }
    assert.equal(failure?.code, 'ERR_ASSERTION', `${label}: mutant survived`);
    assert.match(failure.message, message, `${label}: wrong oracle failure`);
}

test('every business mutant changes both generated target trees', () => {
    for (const [name, trees] of targetTrees) {
        assert.notEqual(
            trees.angular,
            trees.baselineAngular,
            `${name}: Angular tree must change`
        );
        assert.notEqual(
            trees.react,
            trees.baselineReact,
            `${name}: ReactJS tree must change`
        );
    }
});

test('constraint mutation is killed by both validation oracles', async () => {
    const runtime = runtimes.get('constraint');
    await expectKilled(
        () => assertValidationOracle(runtime.angular.validation, 'Angular'),
        /canonical constraints/,
        'constraint/Angular'
    );
    await expectKilled(
        () => assertValidationOracle(runtime.react.validation, 'ReactJS'),
        /canonical constraints/,
        'constraint/ReactJS'
    );
});

test('session-effect mutation is killed by both runtime oracles', async () => {
    const runtime = runtimes.get('session');
    await expectKilled(
        () => assertAngularNominalOracle(runtime),
        /persist the session before success/,
        'session/Angular'
    );
    await expectKilled(
        () => assertReactNominalOracle(runtime),
        /only session-establishing command/,
        'session/ReactJS'
    );
});

test('access mutation is killed by both transport oracles', async () => {
    const runtime = runtimes.get('access');
    await expectKilled(
        () => assertAngularNominalOracle(runtime),
        /public-access contract/,
        'access/Angular'
    );
    await expectKilled(
        () => assertReactNominalOracle(runtime),
        /authentication contract/,
        'access/ReactJS'
    );
});

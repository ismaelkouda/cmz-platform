import { after, before, test } from 'node:test';

import {
    assertAngularFailureOracle,
    assertAngularNominalOracle,
    assertReactFailureOracle,
    assertReactNominalOracle,
    assertValidationOracle,
} from './core/action-request-runtime-oracle.mjs';
import { materializeGeneratedRuntime } from './core/runtime-harness.mjs';
import { computeTargets } from './render-targets.mjs';

let runtime;

before(async () => {
    runtime = await materializeGeneratedRuntime(await computeTargets());
});

after(async () => {
    await runtime?.cleanup();
});

test('validation matrix is identical on Angular and ReactJS outputs', () => {
    assertValidationOracle(runtime.angular.validation, 'Angular');
    assertValidationOracle(runtime.react.validation, 'ReactJS');
});

test('Angular target satisfies the nominal action-request oracle', async () => {
    await assertAngularNominalOracle(runtime);
});

test('Angular target propagates transport and session failures', async () => {
    await assertAngularFailureOracle(runtime);
});

test('ReactJS target satisfies the nominal action-request oracle', async () => {
    await assertReactNominalOracle(runtime);
});

test('ReactJS target exposes error state and propagates failures', async () => {
    await assertReactFailureOracle(runtime);
});

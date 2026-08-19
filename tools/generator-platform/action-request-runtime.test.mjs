import { after, before, test } from 'node:test';

import {
    assertAngularEnvelopeOracle,
    assertAngularFailureOracle,
    assertAngularNominalOracle,
    assertReactEnvelopeOracle,
    assertReactFailureOracle,
    assertReactNominalOracle,
    assertValidationOracle,
} from './oracles/action-request-runtime-oracle.mjs';
import { materializeGeneratedRuntime } from './oracles/runtime-harness.mjs';
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

test('Angular target unwraps the response_envelope contract (PLAT-7)', async () => {
    await assertAngularEnvelopeOracle(runtime);
});

test('ReactJS target unwraps the response_envelope contract (PLAT-7)', async () => {
    await assertReactEnvelopeOracle(runtime);
});

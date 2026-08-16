import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyPresentationAdvance,
    applyPresentationBack,
    compilePresentationFlow,
    isStepComplete,
    validatePresentationFlow,
} from './core/presentation-flow.mjs';
import { renderPresentationFlowEngine } from './renderers/presentation-flow-renderer.mjs';
import { assertPresentationFlowRuntimeOracle } from './core/presentation-flow-runtime-oracle.mjs';
import { loadJson } from './validate-ir.mjs';
import { directorContractPath } from './check-evolvable-composition.mjs';

const declaration = {
    kind: 'wizard',
    steps: [
        { id: 'request', fields: ['email', 'subject', 'message', 'priority'] },
        { id: 'review', fields: [] },
        { id: 'confirmation', fields: ['request_id'] },
    ],
};

test('validatePresentationFlow accepts the director contract declaration unchanged', () => {
    assert.deepEqual(validatePresentationFlow(declaration), declaration);
});

test('validatePresentationFlow rejects a missing kind', () => {
    assert.throws(
        () => validatePresentationFlow({ ...declaration, kind: '' }),
        /kind must be a non-empty string/
    );
});

test('validatePresentationFlow rejects an empty step list', () => {
    assert.throws(
        () => validatePresentationFlow({ ...declaration, steps: [] }),
        /steps must be a non-empty array/
    );
});

test('validatePresentationFlow rejects a duplicate step id', () => {
    const broken = {
        ...declaration,
        steps: [...declaration.steps, { id: 'request', fields: [] }],
    };
    assert.throws(
        () => validatePresentationFlow(broken),
        /duplicate step id request/
    );
});

test('validatePresentationFlow rejects a non-array fields list', () => {
    const broken = {
        ...declaration,
        steps: [{ id: 'request', fields: 'not-an-array' }],
    };
    assert.throws(
        () => validatePresentationFlow(broken),
        /fields: must be an array/
    );
});

test('validatePresentationFlow rejects a blank field name', () => {
    const broken = {
        ...declaration,
        steps: [{ id: 'request', fields: [''] }],
    };
    assert.throws(
        () => validatePresentationFlow(broken),
        /each field must be a non-empty string/
    );
});

test('compilePresentationFlow produces an order-indexed table covering every declared step', () => {
    const compiled = compilePresentationFlow(declaration);
    assert.equal(compiled.initial, 'request');
    assert.equal(compiled.terminal, 'confirmation');
    assert.deepEqual(compiled.stepIds, ['request', 'review', 'confirmation']);
    assert.equal(compiled.order.get('request'), 0);
    assert.equal(compiled.order.get('review'), 1);
    assert.equal(compiled.order.get('confirmation'), 2);
    assert.deepEqual(compiled.byId.get('request'), [
        'email',
        'subject',
        'message',
        'priority',
    ]);
    assert.deepEqual(compiled.byId.get('review'), []);
});

test('isStepComplete requires every declared field to be present and non-blank', () => {
    const compiled = compilePresentationFlow(declaration);
    assert.equal(
        isStepComplete(compiled, 'request', {
            email: 'a@b.test',
            subject: 's',
            message: 'm',
            priority: 'high',
        }),
        true
    );
    assert.equal(
        isStepComplete(compiled, 'request', { email: 'a@b.test' }),
        false
    );
    assert.equal(
        isStepComplete(compiled, 'request', {
            email: 'a@b.test',
            subject: '   ',
            message: 'm',
            priority: 'high',
        }),
        false,
        'a blank string must not count as complete'
    );
});

test('isStepComplete treats a step with no declared fields as always complete', () => {
    const compiled = compilePresentationFlow(declaration);
    assert.equal(isStepComplete(compiled, 'review', {}), true);
});

test('isStepComplete rejects null/undefined values, accepts other truthy-shaped values', () => {
    const compiled = compilePresentationFlow(declaration);
    assert.equal(
        isStepComplete(compiled, 'confirmation', { request_id: null }),
        false
    );
    assert.equal(
        isStepComplete(compiled, 'confirmation', { request_id: 0 }),
        true,
        'a defined non-string, non-null value (even falsy like 0) counts as present'
    );
});

test('applyPresentationAdvance follows the declared happy path once each step is complete', () => {
    const compiled = compilePresentationFlow(declaration);
    const step1 = applyPresentationAdvance(compiled, 'request', 'review', {
        email: 'a@b.test',
        subject: 's',
        message: 'm',
        priority: 'high',
    });
    assert.deepEqual(step1, { accepted: true, step: 'review' });
    const step2 = applyPresentationAdvance(
        compiled,
        step1.step,
        'confirmation',
        {}
    );
    assert.deepEqual(step2, { accepted: true, step: 'confirmation' });
});

test('applyPresentationAdvance fails closed on skipping ahead past the immediate next step', () => {
    const compiled = compilePresentationFlow(declaration);
    const result = applyPresentationAdvance(
        compiled,
        'request',
        'confirmation',
        {
            email: 'a@b.test',
            subject: 's',
            message: 'm',
            priority: 'high',
        }
    );
    assert.deepEqual(result, { accepted: false, step: 'request' });
});

test('applyPresentationAdvance fails closed on an unknown target step', () => {
    const compiled = compilePresentationFlow(declaration);
    const result = applyPresentationAdvance(
        compiled,
        'request',
        'nonexistent',
        {
            email: 'a@b.test',
            subject: 's',
            message: 'm',
            priority: 'high',
        }
    );
    assert.deepEqual(result, { accepted: false, step: 'request' });
});

test('applyPresentationAdvance fails closed when the current step is incomplete', () => {
    const compiled = compilePresentationFlow(declaration);
    const result = applyPresentationAdvance(compiled, 'request', 'review', {
        email: 'a@b.test',
    });
    assert.deepEqual(result, { accepted: false, step: 'request' });
});

test('applyPresentationAdvance fails closed on a backward target passed as an "advance"', () => {
    const compiled = compilePresentationFlow(declaration);
    const result = applyPresentationAdvance(compiled, 'review', 'request', {});
    assert.deepEqual(result, { accepted: false, step: 'review' });
});

test('applyPresentationBack accepts stepping back exactly one declared step', () => {
    const compiled = compilePresentationFlow(declaration);
    const result = applyPresentationBack(compiled, 'review', 'request');
    assert.deepEqual(result, { accepted: true, step: 'request' });
});

test('applyPresentationBack fails closed on stepping back more than one declared step', () => {
    const compiled = compilePresentationFlow(declaration);
    const result = applyPresentationBack(compiled, 'confirmation', 'request');
    assert.deepEqual(result, { accepted: false, step: 'confirmation' });
});

test('applyPresentationBack fails closed on an unknown target step', () => {
    const compiled = compilePresentationFlow(declaration);
    const result = applyPresentationBack(compiled, 'review', 'nonexistent');
    assert.deepEqual(result, { accepted: false, step: 'review' });
});

test('renderPresentationFlowEngine emits a step union covering exactly the declared steps', () => {
    const source = renderPresentationFlowEngine(declaration);
    for (const step of declaration.steps) {
        assert.ok(
            source.includes(`'${step.id}'`),
            `rendered engine is missing step literal ${step.id}`
        );
    }
    assert.ok(source.includes("INITIAL_STEP: PresentationStep = 'request'"));
});

test('the director contract presentation flow runs end-to-end in both stacks (real execution, not schema validation)', async () => {
    const contract = await loadJson(directorContractPath);
    await assertPresentationFlowRuntimeOracle(contract.evolution.presentation);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyBehaviorEvent,
    compileBehaviorGraph,
    validateBehaviorGraph,
} from './core/behavior-graph.mjs';
import { renderBehaviorGraphEngine } from './renderers/behavior-graph-renderer.mjs';
import { assertBehaviorGraphRuntimeOracle } from './core/behavior-graph-runtime-oracle.mjs';
import { loadJson } from './validate-ir.mjs';
import { directorContractPath } from './check-evolvable-composition.mjs';

const declaration = {
    initial: 'editing',
    nodes: ['editing', 'submitting', 'confirmed', 'business-error'],
    edges: [
        { from: 'editing', event: 'submit', to: 'submitting' },
        { from: 'submitting', event: 'accepted', to: 'confirmed' },
        {
            from: 'submitting',
            event: 'business-rejected',
            to: 'business-error',
        },
    ],
};

test('validateBehaviorGraph accepts the director contract declaration unchanged', () => {
    assert.deepEqual(validateBehaviorGraph(declaration), declaration);
});

test('validateBehaviorGraph rejects an initial state outside the node set', () => {
    assert.throws(
        () => validateBehaviorGraph({ ...declaration, initial: 'unknown' }),
        /initial must reference a declared node/
    );
});

test('validateBehaviorGraph rejects an edge referencing an unknown node', () => {
    const broken = {
        ...declaration,
        edges: [
            ...declaration.edges,
            { from: 'confirmed', event: 'reopen', to: 'nowhere' },
        ],
    };
    assert.throws(() => validateBehaviorGraph(broken), /unknown node nowhere/);
});

test('validateBehaviorGraph rejects a duplicate transition for the same state/event pair', () => {
    const broken = {
        ...declaration,
        edges: [
            ...declaration.edges,
            { from: 'editing', event: 'submit', to: 'confirmed' },
        ],
    };
    assert.throws(
        () => validateBehaviorGraph(broken),
        /duplicate transition for editing\/submit/
    );
});

test('validateBehaviorGraph rejects a node unreachable from initial', () => {
    const broken = {
        ...declaration,
        nodes: [...declaration.nodes, 'orphan'],
    };
    assert.throws(() => validateBehaviorGraph(broken), /unreachable nodes/);
});

test('compileBehaviorGraph produces a lookup table covering every declared edge', () => {
    const compiled = compileBehaviorGraph(declaration);
    assert.equal(compiled.transitions.size, declaration.edges.length);
    assert.equal(compiled.transitions.get('editing submit'), 'submitting');
    assert.equal(compiled.transitions.get('submitting accepted'), 'confirmed');
    assert.equal(
        compiled.transitions.get('submitting business-rejected'),
        'business-error'
    );
    assert.deepEqual(compiled.terminal.sort(), ['business-error', 'confirmed']);
});

test('applyBehaviorEvent follows the declared happy path', () => {
    const compiled = compileBehaviorGraph(declaration);
    const step1 = applyBehaviorEvent(compiled, compiled.initial, 'submit');
    assert.deepEqual(step1, { accepted: true, state: 'submitting' });
    const step2 = applyBehaviorEvent(compiled, step1.state, 'accepted');
    assert.deepEqual(step2, { accepted: true, state: 'confirmed' });
    const step3 = applyBehaviorEvent(
        compiled,
        'submitting',
        'business-rejected'
    );
    assert.deepEqual(step3, { accepted: true, state: 'business-error' });
});

test('applyBehaviorEvent fails closed on an event absent from the graph: same state returned, not thrown, not guessed', () => {
    const compiled = compileBehaviorGraph(declaration);
    const result = applyBehaviorEvent(compiled, 'editing', 'accepted');
    assert.deepEqual(result, { accepted: false, state: 'editing' });
});

test('applyBehaviorEvent fails closed on a declared event from the wrong state', () => {
    const compiled = compileBehaviorGraph(declaration);
    // "accepted" is only declared from "submitting", not from "confirmed".
    const result = applyBehaviorEvent(compiled, 'confirmed', 'accepted');
    assert.deepEqual(result, { accepted: false, state: 'confirmed' });
});

test('renderBehaviorGraphEngine emits a state union covering exactly the declared nodes', () => {
    const source = renderBehaviorGraphEngine(declaration);
    for (const node of declaration.nodes) {
        assert.ok(
            source.includes(`'${node}'`),
            `rendered engine is missing state literal ${node}`
        );
    }
    assert.ok(source.includes("INITIAL_STATE: BehaviorState = 'editing'"));
});

test('the director contract behavior graph runs end-to-end in both stacks (real execution, not schema validation)', async () => {
    const contract = await loadJson(directorContractPath);
    await assertBehaviorGraphRuntimeOracle(contract.evolution.behavior_graph);
});

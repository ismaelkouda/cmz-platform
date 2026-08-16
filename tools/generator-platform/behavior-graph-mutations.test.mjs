import assert from 'node:assert/strict';
import test from 'node:test';

import { assertBehaviorGraphRuntimeOracle } from './core/behavior-graph-runtime-oracle.mjs';
import { renderBehaviorGraphEngine } from './renderers/behavior-graph-renderer.mjs';
import { loadJson } from './validate-ir.mjs';
import { directorContractPath } from './check-evolvable-composition.mjs';

// Proves the fail-closed transition guard rendered by
// renderers/behavior-graph-renderer.mjs is load-bearing: the ORIGINAL
// rendered engine correctly refuses an undeclared event, so the oracle's
// own fail-closed assertions pass and assertBehaviorGraphRuntimeOracle
// resolves cleanly. Once the guard is neutralized in the rendered source,
// the same undeclared event silently succeeds, the oracle's
// "must be refused" assertion fails, and assertBehaviorGraphRuntimeOracle
// throws — proving the guard, not a tautological check, is what keeps the
// oracle green.

const mutants = [
    {
        name: 'garde de transition non déclarée neutralisée',
        before: 'if (next === undefined) {\n            throw new BehaviorGraphViolation(this.currentState, event);\n        }',
        after: '// guard neutralized: an undeclared event no longer throws',
    },
    {
        name: 'événement non déclaré retombe silencieusement sur l’état initial',
        before: 'if (next === undefined) {\n            throw new BehaviorGraphViolation(this.currentState, event);\n        }\n        this.currentState = next;',
        after: 'this.currentState = next === undefined ? INITIAL_STATE : next;',
    },
];

test('mutants against the rendered behavior graph guard are killed', async (t) => {
    const contract = await loadJson(directorContractPath);
    const declaration = contract.evolution.behavior_graph;
    const originalSource = renderBehaviorGraphEngine(declaration);

    for (const mutant of mutants) {
        await t.test(mutant.name, async () => {
            assert.ok(
                originalSource.includes(mutant.before),
                `${mutant.name}: mutation point absent from the rendered source`
            );
            const mutatedSource = originalSource.replace(
                mutant.before,
                mutant.after
            );
            assert.notEqual(
                mutatedSource,
                originalSource,
                `${mutant.name}: mutation had no effect`
            );

            // The original rendered engine correctly refuses the
            // undeclared event, so the oracle resolves without throwing.
            await assert.doesNotReject(
                () => assertBehaviorGraphRuntimeOracle(declaration),
                `${mutant.name}: original engine should not have been rejected`
            );

            // The mutated engine — with the guard neutralized — lets the
            // undeclared event through silently, which the oracle's own
            // "must be refused" assertion catches as a thrown rejection.
            await assert.rejects(
                () =>
                    assertBehaviorGraphRuntimeOracle(declaration, {
                        engineSource: mutatedSource,
                    }),
                `${mutant.name}: mutant should have been caught by the oracle`
            );
        });
    }
});

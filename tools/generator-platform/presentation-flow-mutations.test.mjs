import assert from 'node:assert/strict';
import test from 'node:test';

import { assertPresentationFlowRuntimeOracle } from './oracles/presentation-flow-runtime-oracle.mjs';
import { renderPresentationFlowEngine } from './renderers/presentation-flow-renderer.mjs';
import { loadJson } from './validate-ir.mjs';
import { directorContractPath } from './check-evolvable-composition.mjs';

// Proves the fail-closed progression guards rendered by
// renderers/presentation-flow-renderer.mjs are load-bearing: the ORIGINAL
// rendered engine correctly refuses a skip-ahead / incomplete-step
// advance, so the oracle's own fail-closed assertions pass and
// assertPresentationFlowRuntimeOracle resolves cleanly. Once a guard is
// neutralized in the rendered source, the same request silently succeeds,
// the oracle's "must be refused" assertion fails, and
// assertPresentationFlowRuntimeOracle throws — proving the guards, not a
// tautological check, are what keep the oracle green.

const mutants = [
    {
        name: 'garde anti-saut d’étape neutralisée (skip-ahead accepté)',
        before: "if (targetIndex !== currentIndex + 1) {\n            throw new PresentationFlowViolation(\n                this.currentStep,\n                targetStep,\n                'not the next declared step'\n            );\n        }",
        after: '// skip-ahead guard neutralized: any forward target is now accepted',
    },
    {
        name: 'garde de complétude neutralisée (avance sur étape incomplète)',
        before: "if (!this.isCurrentStepComplete(values)) {\n            throw new PresentationFlowViolation(\n                this.currentStep,\n                targetStep,\n                'current step is incomplete'\n            );\n        }",
        after: '// completeness guard neutralized: advance is allowed even incomplete',
    },
];

test('mutants against the rendered presentation flow guards are killed', async (t) => {
    const contract = await loadJson(directorContractPath);
    const declaration = contract.evolution.presentation;
    const originalSource = renderPresentationFlowEngine(declaration);

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
            // skip-ahead/incomplete advance, so the oracle resolves
            // without throwing.
            await assert.doesNotReject(
                () => assertPresentationFlowRuntimeOracle(declaration),
                `${mutant.name}: original engine should not have been rejected`
            );

            // The mutated engine — with the guard neutralized — lets the
            // disallowed advance through silently, which the oracle's own
            // "must be refused" assertion catches as a thrown rejection.
            await assert.rejects(
                () =>
                    assertPresentationFlowRuntimeOracle(declaration, {
                        engineSource: mutatedSource,
                    }),
                `${mutant.name}: mutant should have been caught by the oracle`
            );
        });
    }
});

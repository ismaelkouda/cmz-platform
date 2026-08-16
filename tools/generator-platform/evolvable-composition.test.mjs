import assert from 'node:assert/strict';
import test from 'node:test';

import {
    assertCharacterization,
    probeEvolvableComposition,
} from './check-evolvable-composition.mjs';

test('the evolvable-composition director contract is honestly characterized', async () => {
    const report = await probeEvolvableComposition();
    assertCharacterization(report);
    assert.equal(report.mode, 'characterization');
    // PLAT-5J closed the last declared gap (presentation.flow): expected_gaps
    // is now []. decision_satisfied is purely a computed fact
    // (regressions.length === 0 && actual_gaps.length === 0) and does NOT
    // mean the contract has been promoted — contract.status stays
    // "characterization" and no promotion mechanism is invoked anywhere in
    // this repo. See promotion_rule in the contract JSON: its "success"
    // condition also requires every invariant to be verified by executable
    // oracles, which this probe does not itself adjudicate.
    assert.equal(report.decision_satisfied, true);
    assert.deepEqual(report.actual_gaps, []);
});

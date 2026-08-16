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
    assert.equal(report.decision_satisfied, false);
});

import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import {
    planPageRealization,
    publishPageRealizationWorkOrder,
    verifyPageRealization,
} from './core/page-realization.mjs';
import {
    evidenceSchema,
    pageRealizationFixture,
    realizeReactPage,
} from './page-realization.fixture.mjs';

test('borne une réalisation React au profil publié et protège son adaptateur host', async () => {
    const data = await pageRealizationFixture('react-spa');
    const hostPath = join(data.pageRoot, 'page-host.ts');
    await writeFile(hostPath, 'export const protectedHost = true;\n');
    const common = {
        workspaceRoot: data.root,
        appName: 'clean-street',
        pageId: data.pageId,
    };
    const plan = planPageRealization(common);

    assert.deepEqual(plan.workOrder.target, {
        profile: 'react-spa',
        archetype_stack: 'reactjs',
    });
    assert.deepEqual(plan.workOrder.allowed_files, [
        'page.module.scss',
        'page.spec.tsx',
        'page.tsx',
        'realization-evidence.json',
    ]);
    assert.equal(
        plan.workOrder.realization_contract.selection.stack,
        'reactjs'
    );
    assert.ok(
        plan.baseline.some((entry) => entry.path.endsWith('/page-host.ts')),
        'the host adapter must remain part of the protected baseline'
    );
    assert.ok(
        !plan.baseline.some(
            (entry) =>
                entry.path ===
                `apps/clean-street/src/app/pages/${data.pageId}/page.tsx`
        ),
        'the explicitly writable page must be excluded from the baseline'
    );
    assert.throws(
        () =>
            planPageRealization({
                ...common,
                additionalFiles: ['page-host.ts'],
            }),
        /do not follow the react-spa page naming convention/
    );

    await publishPageRealizationWorkOrder({
        ...common,
        workOrderId: plan.work_order_id,
    });
    await realizeReactPage(data, plan.pageContractHash);
    const calls = [];
    const report = verifyPageRealization(
        {
            ...common,
            workOrderId: plan.work_order_id,
            evidenceSchema,
        },
        { run: (_command, args) => calls.push(args) }
    );
    assert.equal(report.ok, true, report.violations.join('\n'));
    assert.equal(calls[0][0], 'tsc');

    await writeFile(hostPath, 'export const protectedHost = false;\n');
    let oracleCalled = false;
    const drifted = verifyPageRealization(
        {
            ...common,
            workOrderId: plan.work_order_id,
            evidenceSchema,
        },
        { run: () => (oracleCalled = true) }
    );
    assert.equal(drifted.ok, false);
    assert.equal(oracleCalled, false);
    assert.ok(
        drifted.violations.includes(
            'workspace changed outside the explicitly allowed files'
        )
    );
});

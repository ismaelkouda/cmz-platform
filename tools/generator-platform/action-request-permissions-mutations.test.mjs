import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeEvolvableCompositionTargets } from './check-evolvable-composition.mjs';
import { assertPermissionRuntimeOracle } from './core/permission-runtime-oracle.mjs';
import { materializeGeneratedRuntime } from './core/runtime-harness.mjs';

const mutants = [
    {
        name: 'garde de permission neutralisée',
        before: '(permission) => !permissionPort.has(permission)',
        after: '(_permission) => false',
    },
    {
        name: 'permission requise remplacée',
        before: '["support.submit"]',
        after: '["support.read"]',
    },
];

const paths = {
    angular: 'src/action-request-commands.ts',
    react: 'src/use-action-request-commands.ts',
};

function mutate(targets, target, mutant) {
    const files = { ...targets[target].files };
    const path = paths[target];
    assert.ok(
        files[path].includes(mutant.before),
        `${target}/${mutant.name}: point de mutation absent`
    );
    files[path] = files[path].replace(mutant.before, mutant.after);
    return { ...targets, [target]: { ...targets[target], files } };
}

async function assertOracle(runtime) {
    await assertPermissionRuntimeOracle(runtime, {
        permissions: ['support.submit'],
        input: {
            email: 'person@example.com',
            subject: 'Cannot open a report',
            message: 'The report remains unavailable.',
            priority: 'high',
        },
        result: {
            request_id: 'support-42',
            message: 'Request accepted',
        },
        angularMethod: 'contactSupport',
        reactHook: 'useContactSupport',
    });
}

for (const mutant of mutants) {
    for (const target of ['angular', 'react']) {
        test(`${target} tue le mutant « ${mutant.name} »`, async () => {
            const { targets } = await computeEvolvableCompositionTargets();
            const runtime = await materializeGeneratedRuntime(
                mutate(targets, target, mutant)
            );
            try {
                await assert.rejects(
                    () => assertOracle(runtime),
                    undefined,
                    `${target}: le mutant a survécu`
                );
            } finally {
                await runtime.cleanup();
            }
        });
    }
}

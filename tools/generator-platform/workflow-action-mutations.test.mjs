import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    angularExecutor,
    assertWorkflowOracle,
    reactExecutor,
} from './oracles/workflow-runtime-oracle.mjs';
import { materializeWorkflowRuntime } from './oracles/workflow-runtime-harness.mjs';
import { computeWorkflowTargets } from './workflow-targets.mjs';

const mutants = [
    {
        name: 'permission take supprimée',
        before: "requireValue(context.permissions.take, 'permission.take.denied');",
        after: "requireValue(true, 'permission.take.denied');",
    },
    {
        name: 'garde d’état take supprimée',
        before: "requireValue(context.status === 'pending', 'state.take.invalid');",
        after: "requireValue(true, 'state.take.invalid');",
    },
    {
        name: 'rejet lié à la mauvaise permission',
        before: 'rejected ? context.permissions.reject : context.permissions.qualify,',
        after: 'context.permissions.qualify,',
    },
    {
        name: 'callback accepté sans callbackType',
        before: "requireValue(!!command.callbackType?.trim(), 'qualification.callback-type.required');",
        after: "requireValue(true, 'qualification.callback-type.required');",
    },
    {
        name: 'écriture export lancée sans attente',
        before: 'await this.ports.writeFile(rows);',
        after: 'void this.ports.writeFile(rows);',
    },
];

function mutate(targets, target, mutant) {
    const files = { ...targets[target].files };
    const path = 'src/workflow-action-engine.ts';
    assert.ok(
        files[path].includes(mutant.before),
        `${mutant.name}: point de mutation absent`
    );
    files[path] = files[path].replace(mutant.before, mutant.after);
    return { ...targets, [target]: { ...targets[target], files } };
}

for (const mutant of mutants) {
    for (const target of ['angular', 'react']) {
        test(`${target} tue le mutant « ${mutant.name} »`, async () => {
            const original = await computeWorkflowTargets();
            const mutated = mutate(original, target, mutant);
            const runtime = await materializeWorkflowRuntime(mutated);
            const createExecutor =
                target === 'angular'
                    ? (ports) => angularExecutor(runtime.angular, ports)
                    : (ports) => reactExecutor(runtime.react, ports);
            try {
                await assert.rejects(
                    () => assertWorkflowOracle(createExecutor, original.model),
                    undefined,
                    `${target}: le mutant a survécu`
                );
            } finally {
                await runtime.cleanup();
            }
        });
    }
}

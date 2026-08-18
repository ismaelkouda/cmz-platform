import assert from 'node:assert/strict';
import test from 'node:test';

import {
    assertAngularNominalOracle,
    assertReactNominalOracle,
} from './core/action-request-runtime-oracle.mjs';
import { materializeGeneratedRuntime } from './core/runtime-harness.mjs';
import { typecheckGenerated } from './core/typecheck-generated.mjs';
import {
    angularExecutor,
    assertWorkflowOracle,
    reactExecutor,
} from './core/workflow-runtime-oracle.mjs';
import { materializeWorkflowRuntime } from './core/workflow-runtime-harness.mjs';
import { computeTargets } from './render-targets.mjs';
import { repositoryRoot } from './validate-ir.mjs';
import { computeWorkflowTargets } from './workflow-targets.mjs';

const extensionPath = 'src/after-success.extension.ts';

function instrumentedExtension(target) {
    return `import type { AfterSuccessExtension } from './extension-contract';

declare global {
    var __cmzAfterSuccessEvents: Array<{ target: string; operationId: string }>;
}

export const afterSuccess: AfterSuccessExtension = async ({ operationId }) => {
    globalThis.__cmzAfterSuccessEvents.push({ target: '${target}', operationId });
};
`;
}

function instrumentTargets(targets) {
    const instrumented = structuredClone(targets);
    instrumented.angular.files[extensionPath] =
        instrumentedExtension('angular');
    instrumented.react.files[extensionPath] = instrumentedExtension('reactjs');
    typecheckGenerated(
        instrumented.angular.files,
        'angular-extension-oracle',
        repositoryRoot
    );
    typecheckGenerated(
        instrumented.react.files,
        'react-extension-oracle',
        repositoryRoot
    );
    return instrumented;
}

test('action-request invokes the human after-success slot on Angular and ReactJS', async () => {
    globalThis.__cmzAfterSuccessEvents = [];
    const runtime = await materializeGeneratedRuntime(
        instrumentTargets(await computeTargets())
    );
    try {
        await assertAngularNominalOracle(runtime);
        await assertReactNominalOracle(runtime);
        assert.deepEqual(globalThis.__cmzAfterSuccessEvents, [
            { target: 'angular', operationId: 'login' },
            { target: 'angular', operationId: 'forgot-password' },
            { target: 'angular', operationId: 'reset-password' },
            { target: 'reactjs', operationId: 'login' },
            { target: 'reactjs', operationId: 'forgot-password' },
            { target: 'reactjs', operationId: 'reset-password' },
        ]);
    } finally {
        delete globalThis.__cmzAfterSuccessEvents;
        await runtime.cleanup();
    }
});

test('workflow-action invokes the same semantic slot on Angular and ReactJS', async () => {
    globalThis.__cmzAfterSuccessEvents = [];
    const workflowTargets = await computeWorkflowTargets();
    const runtime = await materializeWorkflowRuntime(
        instrumentTargets(workflowTargets)
    );
    try {
        await assertWorkflowOracle(
            (ports) => angularExecutor(runtime.angular, ports),
            workflowTargets.model
        );
        await assertWorkflowOracle(
            (ports) => reactExecutor(runtime.react, ports),
            workflowTargets.model
        );
        assert.deepEqual(
            globalThis.__cmzAfterSuccessEvents.map(
                ({ target, operationId }) => `${target}:${operationId}`
            ),
            [
                'angular:take',
                'angular:qualify',
                'angular:qualify',
                'angular:export',
                'reactjs:take',
                'reactjs:qualify',
                'reactjs:qualify',
                'reactjs:export',
            ]
        );
    } finally {
        delete globalThis.__cmzAfterSuccessEvents;
        await runtime.cleanup();
    }
});

import {
    assertArtifactPlan,
    bindRenderedArtifacts,
} from '../core/artifact-plan.mjs';

import {
    assertWorkflowRendererInput,
    renderWorkflowEngine,
    renderWorkflowModels,
    workflowTsconfig,
} from './workflow-shared.mjs';
import {
    renderAfterSuccessExtension,
    renderWorkflowAfterSuccessContract,
} from './after-success-slot.mjs';

function renderHooks() {
    return `import { afterSuccess } from './after-success.extension';
import type { WorkflowCommand, WorkflowContext, WorkflowPorts, WorkflowResult } from './models';
import { WorkflowActionEngine } from './workflow-action-engine';

export type StateSetter<T> = (value: T) => void;

export interface ReactHooksPort {
    useState<T>(initial: T): readonly [T, StateSetter<T>];
    useCallback<TArguments extends unknown[], TResult>(
        callback: (...arguments_: TArguments) => TResult,
        dependencies: readonly unknown[]
    ): (...arguments_: TArguments) => TResult;
}

export type WorkflowExecutionState =
    | { readonly status: 'idle' }
    | { readonly status: 'pending' }
    | { readonly status: 'success'; readonly result: WorkflowResult }
    | { readonly status: 'error'; readonly error: unknown };

export function createWorkflowActionHook(hooks: ReactHooksPort, ports: WorkflowPorts) {
    const engine = new WorkflowActionEngine(ports);
    return function useWorkflowAction() {
        const [state, setState] = hooks.useState<WorkflowExecutionState>({ status: 'idle' });
        const execute = hooks.useCallback(
            async (command: WorkflowCommand, context: WorkflowContext) => {
                setState({ status: 'pending' });
                try {
                    const result = await engine.execute(command, context);
                    if (!result.exportOutcome || result.exportOutcome === 'exported') {
                        await afterSuccess({ operationId: command.kind, output: result });
                    }
                    setState({ status: 'success', result });
                    return result;
                } catch (error: unknown) {
                    setState({ status: 'error', error });
                    throw error;
                }
            },
            [engine]
        );
        return { state, execute };
    };
}
`;
}

export function renderReactWorkflow(model, artifactPlan, profile) {
    assertArtifactPlan(artifactPlan, model, 'behavior-model');
    const { packageName } = assertWorkflowRendererInput(
        model,
        profile,
        'react-typescript'
    );
    const files = {
        'package.json': `${JSON.stringify(
            {
                name: `${packageName}-workflow`,
                private: true,
                type: 'module',
                peerDependencies: { react: '>=18' },
            },
            null,
            2
        )}\n`,
        'src/after-success.extension.ts': renderAfterSuccessExtension(),
        'src/extension-contract.ts': renderWorkflowAfterSuccessContract(model),
        'src/index.ts': `export * from './after-success.extension';\nexport * from './extension-contract';\nexport * from './models';\nexport * from './workflow-action-engine';\nexport * from './use-workflow-action';\n`,
        'src/models.ts': renderWorkflowModels(model),
        'src/use-workflow-action.ts': renderHooks(),
        'src/workflow-action-engine.ts': renderWorkflowEngine(model),
        'tsconfig.json': workflowTsconfig(),
    };
    return bindRenderedArtifacts(artifactPlan, files, {
        'package.json': 'package-descriptor',
        'src/after-success.extension.ts': 'after-success-extension',
        'src/extension-contract.ts': 'extension-contract',
        'src/index.ts': 'public-api',
        'src/models.ts': 'domain-model',
        'src/use-workflow-action.ts': 'runtime-binding',
        'src/workflow-action-engine.ts': 'execution-controller',
        'tsconfig.json': 'compiler-configuration',
    });
}

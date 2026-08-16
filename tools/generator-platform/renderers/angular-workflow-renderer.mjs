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

function renderService() {
    return `import { Injectable, InjectionToken, inject } from '@angular/core';
import { afterSuccess } from './after-success.extension';
import type { WorkflowCommand, WorkflowContext, WorkflowPorts, WorkflowResult } from './models';
import { WorkflowActionEngine } from './workflow-action-engine';

export const WORKFLOW_PORTS = new InjectionToken<WorkflowPorts>('WORKFLOW_PORTS');

@Injectable()
export class WorkflowActionService {
    private readonly engine = new WorkflowActionEngine(inject(WORKFLOW_PORTS));

    async execute(command: WorkflowCommand, context: WorkflowContext): Promise<WorkflowResult> {
        const result = await this.engine.execute(command, context);
        if (!result.exportOutcome || result.exportOutcome === 'exported') {
            await afterSuccess({ operationId: command.kind, output: result });
        }
        return result;
    }
}
`;
}

export function renderAngularWorkflow(model, artifactPlan, profile) {
    assertArtifactPlan(artifactPlan, model, 'behavior-model');
    const { outputRoot, packageName } = assertWorkflowRendererInput(
        model,
        profile,
        'angular-nx'
    );
    const files = {
        'project.json': `${JSON.stringify(
            {
                name: `${packageName}-workflow`,
                projectType: 'library',
                sourceRoot: `${outputRoot}/src`,
                tags: [
                    'type:application',
                    'platform:angular',
                    'generated:true',
                ],
                targets: {},
            },
            null,
            2
        )}\n`,
        'src/after-success.extension.ts': renderAfterSuccessExtension(),
        'src/extension-contract.ts': renderWorkflowAfterSuccessContract(model),
        'src/index.ts': `export * from './after-success.extension';\nexport * from './extension-contract';\nexport * from './models';\nexport * from './workflow-action-engine';\nexport * from './workflow-action.service';\n`,
        'src/models.ts': renderWorkflowModels(model),
        'src/workflow-action-engine.ts': renderWorkflowEngine(model),
        'src/workflow-action.service.ts': renderService(),
        'tsconfig.json': workflowTsconfig(),
    };
    return bindRenderedArtifacts(artifactPlan, files, {
        'project.json': 'package-descriptor',
        'src/after-success.extension.ts': 'after-success-extension',
        'src/extension-contract.ts': 'extension-contract',
        'src/index.ts': 'public-api',
        'src/models.ts': 'domain-model',
        'src/workflow-action-engine.ts': 'execution-controller',
        'src/workflow-action.service.ts': 'runtime-binding',
        'tsconfig.json': 'compiler-configuration',
    });
}

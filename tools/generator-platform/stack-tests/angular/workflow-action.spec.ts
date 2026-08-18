import { TestBed } from '@angular/core/testing';
import { afterEach, describe, it } from 'vitest';

import {
    WORKFLOW_PORTS,
    WorkflowActionService,
} from '../../.stack-test-runtime/angular/workflow-action/src/workflow-action.service';
import type {
    WorkflowCommand,
    WorkflowContext,
    WorkflowPorts,
} from '../../.stack-test-runtime/angular/workflow-action/src/models';

import { assertWorkflowOracle } from '../../core/workflow-runtime-oracle.mjs';
import { computeWorkflowTargets } from '../../workflow-targets.mjs';

afterEach(() => {
    TestBed.resetTestingModule();
});

describe('sortie Angular workflow-action', () => {
    it('respecte états, permissions, branches et callback asynchrone via TestBed', async () => {
        // `assertWorkflowOracle` dérive ses attentes du Behavior Model depuis
        // le second paramètre : le code natif compilé ici (via
        // `.stack-test-runtime/`, produit par `prepare-stack-tests.mjs`)
        // provient du modèle par défaut (`requests-workflow`), il faut donc
        // le même modèle ici pour que l'Oracle compare le bon vocabulaire.
        const { model } = await computeWorkflowTargets();
        await assertWorkflowOracle((ports: WorkflowPorts) => {
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                providers: [
                    {
                        provide: WORKFLOW_PORTS,
                        useValue: ports,
                    },
                    WorkflowActionService,
                ],
            });
            const service = TestBed.inject(WorkflowActionService);
            return (command: WorkflowCommand, context: WorkflowContext) =>
                service.execute(command, context);
        }, model);
    });
});

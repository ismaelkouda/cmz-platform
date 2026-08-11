import { describe, expect, it } from 'vitest';
import { WorkflowDetailsQualificationState } from '../enums/workflow-details-qualification-state.enum';
import { WorkflowDetailsStatus } from '../enums/workflow-details-status.enum';
import { WorkflowDetailsProps } from '../props/workflow-details.props';
import {
    workflowDetailsPermissionsQualify,
    workflowDetailsPermissionsReject,
    workflowDetailsPermissionsRejectContext,
    workflowDetailsPermissionsTake,
} from './workflow-details-permissions.util';

function makeProps(
    overrides: Partial<
        Pick<WorkflowDetailsProps, 'status' | 'qualificationState'>
    >
): WorkflowDetailsProps {
    return {
        status: WorkflowDetailsStatus.PENDING,
        qualificationState: null,
        ...overrides,
    } as WorkflowDetailsProps;
}

describe('workflowDetailsPermissionsTake', () => {
    it('autorise take si pending et permission', () => {
        expect(
            workflowDetailsPermissionsTake(
                makeProps({ status: WorkflowDetailsStatus.PENDING }),
                true
            )
        ).toBe(true);
    });

    it('refuse take sans permission ou hors pending', () => {
        expect(
            workflowDetailsPermissionsTake(
                makeProps({ status: WorkflowDetailsStatus.PENDING }),
                false
            )
        ).toBe(false);
        expect(
            workflowDetailsPermissionsTake(
                makeProps({ status: WorkflowDetailsStatus.IN_PROGRESS }),
                true
            )
        ).toBe(false);
    });
});

describe('workflowDetailsPermissionsQualify', () => {
    it('autorise qualify en in-progress avec qualification pending', () => {
        expect(
            workflowDetailsPermissionsQualify(
                makeProps({
                    status: WorkflowDetailsStatus.IN_PROGRESS,
                    qualificationState:
                        WorkflowDetailsQualificationState.PENDING,
                }),
                true
            )
        ).toBe(true);
    });

    it('refuse qualify si qualification completed', () => {
        expect(
            workflowDetailsPermissionsQualify(
                makeProps({
                    status: WorkflowDetailsStatus.IN_PROGRESS,
                    qualificationState:
                        WorkflowDetailsQualificationState.COMPLETED,
                }),
                true
            )
        ).toBe(false);
    });
});

describe('workflowDetailsPermissionsReject', () => {
    it('autorise reject en in-progress avec permission', () => {
        expect(
            workflowDetailsPermissionsReject(
                makeProps({ status: WorkflowDetailsStatus.IN_PROGRESS }),
                true
            )
        ).toBe(true);
    });

    // Comportement intentionnel (P1-5, backlog-llm.md) : contrairement à
    // `*PermissionsQualify` qui exige `qualificationState === PENDING`,
    // `*PermissionsReject` ne vérifie jamais `qualificationState` — le
    // rejet reste possible même après qu'une qualification ait déjà été
    // complétée. Documenté ici pour qu'une future modification ne
    // « corrige » pas ce qui ressemble à un oubli mais n'en est pas un.
    it('autorise reject en in-progress même si qualificationState est COMPLETED (comportement voulu, pas un bug)', () => {
        expect(
            workflowDetailsPermissionsReject(
                makeProps({
                    status: WorkflowDetailsStatus.IN_PROGRESS,
                    qualificationState:
                        WorkflowDetailsQualificationState.COMPLETED,
                }),
                true
            )
        ).toBe(true);
    });
});

describe('workflowDetailsPermissionsRejectContext', () => {
    it('active le contexte approbation dès in-progress', () => {
        expect(
            workflowDetailsPermissionsRejectContext(
                makeProps({ status: WorkflowDetailsStatus.IN_PROGRESS })
            )
        ).toBe(true);
        expect(
            workflowDetailsPermissionsRejectContext(
                makeProps({ status: WorkflowDetailsStatus.PENDING })
            )
        ).toBe(false);
    });
});

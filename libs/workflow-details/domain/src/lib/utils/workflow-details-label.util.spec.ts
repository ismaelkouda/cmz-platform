import { describe, expect, it } from 'vitest';
import { WorkflowDetailsQualificationState } from '../enums/workflow-details-qualification-state.enum';
import { WorkflowDetailsStatus } from '../enums/workflow-details-status.enum';
import { WorkflowDetailsEntity } from '../entities/workflow-details.entity';
import { WorkflowDetailsProps } from '../props/workflow-details.props';
import {
    workflowDetailsSubmitLabel,
    workflowDetailsTitle,
} from './workflow-details-label.util';

function makeEntity(
    status: WorkflowDetailsStatus,
    qualificationState: WorkflowDetailsQualificationState | null,
    permissions: { canTake: boolean; canQualify: boolean }
): WorkflowDetailsEntity {
    const props = {
        status,
        qualificationState,
        uniqId: 'REQ-001',
        updatedAt: '2026-01-01',
    } as WorkflowDetailsProps;

    return new WorkflowDetailsEntity(props, permissions);
}

describe('workflowDetailsTitle', () => {
    it('retourne TAKE quand take autorisé', () => {
        const entity = makeEntity(WorkflowDetailsStatus.PENDING, null, {
            canTake: true,
            canQualify: false,
        });

        expect(entity.titleKey).toBe('MANAGEMENT.STATUS.TAKE');
        expect(
            workflowDetailsTitle({
                props: {
                    status: WorkflowDetailsStatus.PENDING,
                    qualificationState: null,
                } as WorkflowDetailsProps,
                permissions: { canTake: true, canQualify: false },
            })
        ).toBe('MANAGEMENT.STATUS.TAKE');
    });

    it('retourne APPROBATION en contexte qualification', () => {
        const entity = makeEntity(
            WorkflowDetailsStatus.IN_PROGRESS,
            WorkflowDetailsQualificationState.PENDING,
            { canTake: false, canQualify: true }
        );

        expect(entity.titleKey).toBe('MANAGEMENT.STATUS.APPROBATION');
    });

    it('retourne INFORMATION en lecture seule', () => {
        const entity = makeEntity(
            WorkflowDetailsStatus.APPROVED,
            WorkflowDetailsQualificationState.COMPLETED,
            { canTake: false, canQualify: false }
        );

        expect(entity.titleKey).toBe('MANAGEMENT.STATUS.INFORMATION');
        expect(entity.submitLabelKey).toBe('MANAGEMENT.BUTTONS.INFORMATION');
        expect(
            workflowDetailsSubmitLabel({
                props: {
                    status: WorkflowDetailsStatus.APPROVED,
                    qualificationState:
                        WorkflowDetailsQualificationState.COMPLETED,
                } as WorkflowDetailsProps,
                permissions: { canTake: false, canQualify: false },
            })
        ).toBe('MANAGEMENT.BUTTONS.INFORMATION');
    });
});

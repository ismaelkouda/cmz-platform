import { describe, expect, it } from 'vitest';
import { WorkflowDetailsStatus } from '../enums/workflow-details-status.enum';
import { WorkflowDetailsProps } from '../props/workflow-details.props';
import { workflowDetailsWorkflowTimestamps } from './workflow-details-workflow-timestamps.util';

function makeProps(
    overrides: Partial<Pick<WorkflowDetailsProps, 'status' | 'treater'>>
): WorkflowDetailsProps {
    return {
        status: WorkflowDetailsStatus.PENDING,
        treater: {
            acknowledgedAt: null,
            createdAt: '2024-01-01',
            reportedAt: '2024-01-02T10:00:00',
            processedAt: null,
            approvedAt: null,
            finalizedAt: null,
            rejectedAt: null,
            confirmedAt: null,
            abandonedAt: null,
            processedComment: null,
            approvedComment: null,
            rejectedComment: null,
            acknowledgedComment: null,
            confirmedComment: null,
            abandonedComment: null,
            denyCount: 0,
            reason: null,
            callbackType: null,
        },
        ...overrides,
    } as WorkflowDetailsProps;
}

describe('workflowDetailsWorkflowTimestamps', () => {
    it('retourne soumission et qualification avec timestamps null sans treater', () => {
        const steps = workflowDetailsWorkflowTimestamps(
            makeProps({
                treater: null as unknown as WorkflowDetailsProps['treater'],
            })
        );
        expect(steps).toHaveLength(2);
        expect(steps[0]?.labelKey).toBe('MANAGEMENT.STATUS.SUBMISSION');
        expect(steps[0]?.timestamp).toBeNull();
    });

    it('mappe reportedAt depuis treater', () => {
        const steps = workflowDetailsWorkflowTimestamps(makeProps({}));
        expect(steps[0]?.timestamp).toBe('2024-01-02T10:00:00');
    });

    it('utilise approvedAt si statut approved', () => {
        const steps = workflowDetailsWorkflowTimestamps(
            makeProps({
                status: WorkflowDetailsStatus.APPROVED,
                treater: {
                    ...makeProps({}).treater,
                    approvedAt: '2024-01-03T12:00:00',
                    rejectedAt: '2024-01-04T12:00:00',
                },
            })
        );
        expect(steps[1]?.timestamp).toBe('2024-01-03T12:00:00');
    });

    it('utilise rejectedAt si statut rejected', () => {
        const steps = workflowDetailsWorkflowTimestamps(
            makeProps({
                status: WorkflowDetailsStatus.REJECTED,
                treater: {
                    ...makeProps({}).treater,
                    approvedAt: '2024-01-03T12:00:00',
                    rejectedAt: '2024-01-04T12:00:00',
                },
            })
        );
        expect(steps[1]?.timestamp).toBe('2024-01-04T12:00:00');
    });
});

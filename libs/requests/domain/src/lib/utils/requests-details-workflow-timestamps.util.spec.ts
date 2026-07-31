import { describe, expect, it } from 'vitest';
import { RequestsDetailsStatus } from '../enums/requests-details-status.enum';
import { RequestsDetailsProps } from '../props/requests-details.props';
import { requestsDetailsWorkflowTimestamps } from './requests-details-workflow-timestamps.util';

function makeProps(
    overrides: Partial<Pick<RequestsDetailsProps, 'status' | 'treater'>>
): RequestsDetailsProps {
    return {
        status: RequestsDetailsStatus.PENDING,
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
    } as RequestsDetailsProps;
}

describe('requestsDetailsWorkflowTimestamps', () => {
    it('retourne soumission et qualification avec timestamps null sans treater', () => {
        const steps = requestsDetailsWorkflowTimestamps(
            makeProps({
                treater: null as unknown as RequestsDetailsProps['treater'],
            })
        );
        expect(steps).toHaveLength(2);
        expect(steps[0]?.labelKey).toBe('MANAGEMENT.STATUS.SUBMISSION');
        expect(steps[0]?.timestamp).toBeNull();
    });

    it('mappe reportedAt depuis treater', () => {
        const steps = requestsDetailsWorkflowTimestamps(makeProps({}));
        expect(steps[0]?.timestamp).toBe('2024-01-02T10:00:00');
    });

    it('utilise approvedAt si statut approved', () => {
        const steps = requestsDetailsWorkflowTimestamps(
            makeProps({
                status: RequestsDetailsStatus.APPROVED,
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
        const steps = requestsDetailsWorkflowTimestamps(
            makeProps({
                status: RequestsDetailsStatus.REJECTED,
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

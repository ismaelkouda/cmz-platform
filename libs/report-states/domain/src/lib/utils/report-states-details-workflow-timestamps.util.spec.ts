import { describe, expect, it } from 'vitest';
import { ReportStatesDetailsStatus } from '../enums/report-states-details-status.enum';
import { ReportStatesDetailsProps } from '../props/report-states-details.props';
import { reportStatesDetailsWorkflowTimestamps } from './report-states-details-workflow-timestamps.util';

function makeProps(
    overrides: Partial<Pick<ReportStatesDetailsProps, 'status' | 'treater'>>
): ReportStatesDetailsProps {
    return {
        status: ReportStatesDetailsStatus.PENDING,
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
    } as ReportStatesDetailsProps;
}

describe('reportStatesDetailsWorkflowTimestamps', () => {
    it('retourne soumission et qualification avec timestamps null sans treater', () => {
        const steps = reportStatesDetailsWorkflowTimestamps(
            makeProps({
                treater: null as unknown as ReportStatesDetailsProps['treater'],
            })
        );
        expect(steps).toHaveLength(2);
        expect(steps[0]?.labelKey).toBe('MANAGEMENT.STATUS.SUBMISSION');
        expect(steps[0]?.timestamp).toBeNull();
    });

    it('mappe reportedAt depuis treater', () => {
        const steps = reportStatesDetailsWorkflowTimestamps(makeProps({}));
        expect(steps[0]?.timestamp).toBe('2024-01-02T10:00:00');
    });

    it('utilise approvedAt si statut approved', () => {
        const steps = reportStatesDetailsWorkflowTimestamps(
            makeProps({
                status: ReportStatesDetailsStatus.APPROVED,
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
        const steps = reportStatesDetailsWorkflowTimestamps(
            makeProps({
                status: ReportStatesDetailsStatus.REJECTED,
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

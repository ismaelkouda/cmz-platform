import { describe, expect, it } from 'vitest';
import { ReportType } from '@cmz/shared-domain';
import { DashboardEntity } from './dashboard.entity';
import type { DashboardProps } from '../interfaces/dashboard-props.interface';

function makeProps(partial: Partial<DashboardProps> = {}): DashboardProps {
    return {
        totalReports: 10,
        reportsByType: {
            [ReportType.ABI]: 1,
            [ReportType.ZOB]: 2,
            [ReportType.CPS]: 3,
            [ReportType.CPO]: 4,
        },
        totalReportsPending: 0,
        totalReportsInProcessing: 0,
        totalReportsRejected: 0,
        totalReportsFinalized: 0,
        totalReportsEvaluated: 0,
        treatmentRate: 0,
        completionRate: 0,
        averageTreatmentTime: 0,
        responseTime: 0,
        lastRefreshAt: '2026-08-01T12:00:00Z',
        ...partial,
    };
}

describe('DashboardEntity', () => {
    it('with() retourne la même instance si lastRefreshAt inchangé', () => {
        const entity = new DashboardEntity(makeProps());
        const next = entity.with(
            makeProps({ totalReports: 99, lastRefreshAt: entity.lastRefreshAt })
        );
        expect(next).toBe(entity);
    });

    it('with() crée une nouvelle instance si lastRefreshAt change', () => {
        const entity = new DashboardEntity(makeProps());
        const next = entity.with(
            makeProps({ lastRefreshAt: '2026-08-02T12:00:00Z' })
        );
        expect(next).not.toBe(entity);
        expect(next.lastRefreshAt).toBe('2026-08-02T12:00:00Z');
    });
});

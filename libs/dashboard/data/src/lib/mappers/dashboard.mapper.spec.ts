import { describe, expect, it } from 'vitest';
import { ReportType } from '@cmz/shared-domain';
import type { DashboardItemApiDto } from '../dtos/dashboard-response-api.dto';
import { DashboardMapper } from './dashboard.mapper';

function makeItemDto(
    partial: Partial<DashboardItemApiDto> = {}
): DashboardItemApiDto {
    return {
        total_reports: 100,
        total_abi_reports: 10,
        total_zob_reports: 20,
        total_cps_reports: 30,
        total_cpo_reports: 40,
        total_request_report_pending: 5,
        total_reports_in_processing: 6,
        total_request_report_rejected: 7,
        total_reports_finalized: 8,
        total_reports_evaluated: 9,
        treatmentRate: 50,
        completionRate: 60,
        averageTreatmentTime: 3,
        responseTime: 12,
        last_refresh_at: '2026-08-01T12:00:00Z',
        ...partial,
    };
}

function envelope(data: DashboardItemApiDto) {
    return { error: false, message: 'OK', data };
}

describe('DashboardMapper', () => {
    it('mappe le wire vers DashboardEntity (mapping sémantique corrigé)', () => {
        const entity = new DashboardMapper().mapFromDto(
            envelope(makeItemDto())
        );
        expect(entity.totalReports).toBe(100);
        expect(entity.reportsByType[ReportType.ABI]).toBe(10);
        expect(entity.reportsByType[ReportType.ZOB]).toBe(20);
        expect(entity.reportsByType[ReportType.CPS]).toBe(30);
        expect(entity.reportsByType[ReportType.CPO]).toBe(40);
        expect(entity.totalReportsPending).toBe(5);
        // Bug legacy : inverted processing/rejected — fix par nom de champ
        expect(entity.totalReportsInProcessing).toBe(6);
        expect(entity.totalReportsRejected).toBe(7);
        expect(entity.totalReportsFinalized).toBe(8);
        expect(entity.totalReportsEvaluated).toBe(9);
        expect(entity.treatmentRate).toBe(50);
        expect(entity.completionRate).toBe(60);
        expect(entity.averageTreatmentTime).toBe(3);
        expect(entity.responseTime).toBe(12);
        expect(entity.lastRefreshAt).toBe('2026-08-01T12:00:00Z');
    });

    it('default à 0 les compteurs / taux optionnels absents du wire', () => {
        const entity = new DashboardMapper().mapFromDto(
            envelope({
                total_reports: 1,
                last_refresh_at: '2026-08-01T00:00:00Z',
            })
        );
        expect(entity.reportsByType[ReportType.ABI]).toBe(0);
        expect(entity.totalReportsPending).toBe(0);
        expect(entity.totalReportsInProcessing).toBe(0);
        expect(entity.totalReportsRejected).toBe(0);
        expect(entity.treatmentRate).toBe(0);
    });

    it('cache : même lastRefreshAt → même instance entity entre deux map', () => {
        const mapper = new DashboardMapper();
        const a = mapper.mapFromDto(envelope(makeItemDto()));
        const b = mapper.mapFromDto(
            envelope(makeItemDto({ total_reports: 999 }))
        );
        expect(b).toBe(a);
        // with() short-circuit : totalReports inchangé côté identité
        expect(b.totalReports).toBe(100);
    });

    it('cache : lastRefreshAt change → nouvelle entity', () => {
        const mapper = new DashboardMapper();
        const a = mapper.mapFromDto(envelope(makeItemDto()));
        const b = mapper.mapFromDto(
            envelope(
                makeItemDto({
                    last_refresh_at: '2026-08-03T00:00:00Z',
                    total_reports: 50,
                })
            )
        );
        expect(b).not.toBe(a);
        expect(b.totalReports).toBe(50);
        expect(b.lastRefreshAt).toBe('2026-08-03T00:00:00Z');
    });
});

import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { DashboardPageComponent } from '@cmz/dashboard-ui';
import type { DashboardItemApiDto } from '@cmz/dashboard-data';
import {
    configureA11yTestBed,
    expectNoAxeViolations,
    simpleOkEnvelope,
    stabilizeFixture,
} from '../testing/a11y-testbed.harness';
import { provideDashboard } from '../providers/dashboard.providers';

/**
 * Archétype **read-only-view** (T12-8 / M-9) — stats + filtre période +
 * cartes (Certaines navigables). Page de référence : dashboard.
 *
 * Couvre le ROI « lecture seule » du monorepo distinct de la liste crud
 * et du workflow-action ; une régression aria-pressed / aria-label sur
 * le filtre période est détectée ici.
 *
 * `provideDashboard()` passé explicitement (OPS-25) : depuis la migration
 * lazy-provider, ce repository n'est plus dans `appConfig.providers` — voir
 * le docstring de `configureA11yTestBed`.
 */
function makeDashboardItem(
    partial: Partial<DashboardItemApiDto> = {}
): DashboardItemApiDto {
    return {
        total_reports: 42,
        total_abi_reports: 10,
        total_zob_reports: 10,
        total_cps_reports: 10,
        total_cpo_reports: 12,
        total_request_report_pending: 1,
        total_reports_in_processing: 2,
        total_request_report_rejected: 3,
        total_reports_finalized: 4,
        total_reports_evaluated: 5,
        treatmentRate: 80,
        completionRate: 70,
        averageTreatmentTime: 2,
        responseTime: 4,
        last_refresh_at: '2026-08-01T12:00:00Z',
        ...partial,
    };
}

describe('a11y read-only-view — DashboardPageComponent', () => {
    it('0 violation critical|serious sous jsdom (WCAG 2.0/2.1 A+AA)', async () => {
        await configureA11yTestBed(
            [DashboardPageComponent],
            provideDashboard()
        );

        const http = TestBed.inject(HttpTestingController);
        const fixture = TestBed.createComponent(DashboardPageComponent);

        fixture.detectChanges();

        const pending = http.match(() => true);
        expect(pending.length).toBeGreaterThanOrEqual(1);
        for (const req of pending) {
            req.flush(simpleOkEnvelope(makeDashboardItem()));
        }

        await stabilizeFixture(fixture);
        await expectNoAxeViolations(fixture.nativeElement as Element);
        http.verify();
    });
});

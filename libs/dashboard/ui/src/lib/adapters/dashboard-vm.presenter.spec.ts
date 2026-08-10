import { describe, expect, it } from 'vitest';
import { DashboardEntity } from '@cmz/dashboard-domain';
import { ReportType } from '@cmz/shared-domain';
import { DASHBOARD_TASK_STATUS_ROUTES } from '../constants/dashboard-task-status-routes.constant';
import { DashboardPresenter } from './dashboard-vm.presenter';

function makeEntity(): DashboardEntity {
    return new DashboardEntity({
        totalReports: 1_250,
        reportsByType: {
            [ReportType.ABI]: 100,
            [ReportType.ZOB]: 200,
            [ReportType.CPS]: 300,
            [ReportType.CPO]: 400,
        },
        totalReportsPending: 10,
        totalReportsInProcessing: 20,
        totalReportsRejected: 30,
        totalReportsFinalized: 40,
        totalReportsEvaluated: 50,
        treatmentRate: 80,
        completionRate: 70,
        averageTreatmentTime: 2,
        responseTime: 4,
        lastRefreshAt: '2026-08-01T12:00:00Z',
    });
}

describe('DashboardPresenter', () => {
    const t = (key: string) => key;
    const presenter = new DashboardPresenter(t);

    it('mappe entity → typeCards / taskStatusCards / performanceCards', () => {
        const vm = presenter.map(makeEntity());
        expect(vm.lastRefreshAt).toBe('2026-08-01T12:00:00Z');
        expect(vm.typeCards.map((c) => c.key)).toEqual([
            'totalReports',
            `reportsByType.${ReportType.ABI}`,
            `reportsByType.${ReportType.ZOB}`,
            `reportsByType.${ReportType.CPS}`,
            `reportsByType.${ReportType.CPO}`,
        ]);
        expect(vm.taskStatusCards.map((c) => c.key)).toEqual([
            'totalReportsPending',
            'totalReportsInProcessing',
            'totalReportsRejected',
            'totalReportsFinalized',
            'totalReportsEvaluated',
        ]);
        expect(vm.performanceCards.map((c) => c.key)).toEqual([
            'treatmentRate',
            'completionRate',
            'averageTreatmentTime',
            'responseTime',
        ]);
    });

    it('attache les routes statut (sémantique corrigée vs legacy)', () => {
        const vm = presenter.map(makeEntity());
        for (const card of vm.taskStatusCards) {
            expect(card.route).toEqual(DASHBOARD_TASK_STATUS_ROUTES[card.key]);
        }
        const processing = vm.taskStatusCards.find(
            (c) => c.key === 'totalReportsInProcessing'
        );
        const rejected = vm.taskStatusCards.find(
            (c) => c.key === 'totalReportsRejected'
        );
        expect(processing?.icon).toBe('pi-cog pi-spin');
        expect(processing?.color).toBe('warning');
        expect(rejected?.icon).toBe('pi-times-circle');
        expect(rejected?.color).toBe('danger');
    });

    it('formate les perf en unités métier (%)/j/h', () => {
        const vm = presenter.map(makeEntity());
        expect(vm.performanceCards.find((c) => c.key === 'treatmentRate')?.value).toBe(
            '80%'
        );
        expect(
            vm.performanceCards.find((c) => c.key === 'averageTreatmentTime')?.value
        ).toBe('2j');
        expect(vm.performanceCards.find((c) => c.key === 'responseTime')?.value).toBe(
            '4h'
        );
    });
});

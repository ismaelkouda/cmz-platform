import { DashboardEntity } from '@cmz/dashboard-domain';
import { ReportType } from '@cmz/shared-domain';
import { REPORT_TYPE_LABEL, ThousandsSeparatorPipe } from '@cmz/shared-ui';
import { DashboardVm, StatCardVm } from './dashboard-vm-props.interface';

const T = 'DASHBOARD.SECTIONS';

const REPORT_TYPE_CARD_META: Record<
    ReportType,
    { icon: string; color: StatCardVm['color'] }
> = {
    [ReportType.ABI]: { icon: 'pi-ban', color: 'info' },
    [ReportType.ZOB]: { icon: 'pi-times', color: 'danger' },
    [ReportType.CPS]: { icon: 'pi-chart-line', color: 'warning' },
    [ReportType.CPO]: { icon: 'pi-building', color: 'warning' },
};

/**
 * Presenter (UI) : `DashboardEntity` → cartes de statistiques.
 *
 * `taskStatusCards` : icônes/couleurs réalignées suite à la correction du
 * décalage `totalReportsInProcessing`/`totalReportsRejected` (cf. domaine/
 * data, Phase 2/3). Le source assignait `pi-times`/`error` à "IN_PROGRESS"
 * et `pi-cog pi-spin`/`warning` à "TREATED" — des choix cohérents avec ses
 * données (décalées), pas avec leur sens réel. Une fois les données
 * corrigées, `pi-cog pi-spin`/`warning` convient mieux à "en cours de
 * traitement" et un style "danger" à "rejeté".
 */
export class DashboardPresenter {
    private readonly thousands = new ThousandsSeparatorPipe();

    constructor(private readonly t: (key: string) => string) {}

    map(entity: DashboardEntity): DashboardVm {
        return {
            lastRefreshAt: entity.lastRefreshAt,
            typeCards: this.typeCards(entity),
            taskStatusCards: this.taskStatusCards(entity),
            performanceCards: this.performanceCards(entity),
        };
    }

    private typeCards(entity: DashboardEntity): StatCardVm[] {
        const reportTypeCards = (Object.values(ReportType) as ReportType[]).map(
            (type) => ({
                key: `reportsByType.${type}`,
                value: this.thousands.transform(entity.reportsByType[type]),
                label: this.t(REPORT_TYPE_LABEL[type]),
                icon: REPORT_TYPE_CARD_META[type].icon,
                color: REPORT_TYPE_CARD_META[type].color,
            })
        );

        return [
            {
                key: 'totalReports',
                value: this.thousands.transform(entity.totalReports),
                label: this.t(`${T}.TYPE.TOTAL.LABEL`),
                icon: 'pi-chart-bar',
                color: 'primary',
            },
            ...reportTypeCards,
        ];
    }

    private taskStatusCards(entity: DashboardEntity): StatCardVm[] {
        return [
            {
                key: 'totalReportsPending',
                value: this.thousands.transform(entity.totalReportsPending),
                label: this.t(`${T}.TASK_STATUS.PENDING.LABEL`),
                icon: 'pi-clock pi-spin',
                color: 'primary',
            },
            {
                key: 'totalReportsInProcessing',
                value: this.thousands.transform(
                    entity.totalReportsInProcessing
                ),
                label: this.t(`${T}.TASK_STATUS.IN_PROGRESS.LABEL`),
                icon: 'pi-cog pi-spin',
                color: 'warning',
            },
            {
                key: 'totalReportsRejected',
                value: this.thousands.transform(entity.totalReportsRejected),
                label: this.t(`${T}.TASK_STATUS.REJECTED.LABEL`),
                icon: 'pi-times-circle',
                color: 'danger',
            },
            {
                key: 'totalReportsFinalized',
                value: this.thousands.transform(entity.totalReportsFinalized),
                label: this.t(`${T}.TASK_STATUS.FINALIZED.LABEL`),
                icon: 'pi-check-circle',
                color: 'success',
            },
            {
                key: 'totalReportsEvaluated',
                value: this.thousands.transform(entity.totalReportsEvaluated),
                label: this.t(`${T}.TASK_STATUS.EVALUATED.LABEL`),
                icon: 'pi-star-fill',
                color: 'primary',
            },
        ];
    }

    private performanceCards(entity: DashboardEntity): StatCardVm[] {
        return [
            {
                key: 'treatmentRate',
                value: `${entity.treatmentRate}%`,
                label: this.t(`${T}.PERFORMANCE.TREATMENT_RATE.LABEL`),
                icon: 'pi-chart-line',
                color: 'success',
            },
            {
                key: 'completionRate',
                value: `${entity.completionRate}%`,
                label: this.t(`${T}.PERFORMANCE.COMPLETION_RATE.LABEL`),
                icon: 'pi-check-circle',
                color: 'primary',
            },
            {
                key: 'averageTreatmentTime',
                value: `${entity.averageTreatmentTime}j`,
                label: this.t(`${T}.PERFORMANCE.AVERAGE_TREATMENT_TIME.LABEL`),
                icon: 'pi-calendar',
                color: 'info',
            },
            {
                key: 'responseTime',
                value: `${entity.responseTime}h`,
                label: this.t(`${T}.PERFORMANCE.RESPONSE_TIME.LABEL`),
                icon: 'pi-clock',
                color: 'warning',
            },
        ];
    }
}

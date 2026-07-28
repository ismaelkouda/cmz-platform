import { Service } from '@angular/core';
import { DashboardEntity, DashboardProps } from '@cmz/dashboard-domain';
import { ReportType } from '@cmz/shared-domain';
import { SimpleResponseMapper } from '@cmz/shared-data';
import { DashboardItemApiDto } from '../dtos/dashboard-response-api.dto';

const CACHE_KEY = 'dashboard';

/**
 * Bug corrigé (mapper source) : `totalReportsInProcessing` était alimenté
 * par `dto.total_request_report_rejected` et `totalReportsProcessed` (ici
 * renommé `totalReportsRejected`, cf. `dashboard-props.interface.ts`) par
 * `dto.total_reports_in_processing` — décalage d'un cran entre les champs
 * wire `total_request_report_rejected`/`total_reports_in_processing` et
 * les deux champs domaine correspondants. Corrigé par correspondance de
 * nom plutôt que de position : `total_reports_in_processing` alimente
 * `totalReportsInProcessing` (mêmes mots), `total_request_report_rejected`
 * alimente le champ renommé `totalReportsRejected`.
 */
@Service()
export class DashboardMapper extends SimpleResponseMapper<
    DashboardEntity,
    DashboardItemApiDto
> {
    private readonly entityCache = new Map<string, DashboardEntity>();

    protected mapItemFromDto(dto: DashboardItemApiDto): DashboardEntity {
        const props: DashboardProps = {
            totalReports: dto.total_reports,
            reportsByType: {
                [ReportType.ABI]: dto.total_abi_reports ?? 0,
                [ReportType.ZOB]: dto.total_zob_reports ?? 0,
                [ReportType.CPS]: dto.total_cps_reports ?? 0,
                [ReportType.CPO]: dto.total_cpo_reports ?? 0,
            },
            totalReportsPending: dto.total_request_report_pending ?? 0,
            totalReportsInProcessing: dto.total_reports_in_processing ?? 0,
            totalReportsRejected: dto.total_request_report_rejected ?? 0,
            totalReportsFinalized: dto.total_reports_finalized ?? 0,
            totalReportsEvaluated: dto.total_reports_evaluated ?? 0,
            treatmentRate: dto.treatmentRate ?? 0,
            completionRate: dto.completionRate ?? 0,
            averageTreatmentTime: dto.averageTreatmentTime ?? 0,
            responseTime: dto.responseTime ?? 0,
            lastRefreshAt: dto.last_refresh_at,
        };

        const cached = this.entityCache.get(CACHE_KEY);
        const entity = cached ? cached.with(props) : new DashboardEntity(props);
        this.entityCache.set(CACHE_KEY, entity);
        return entity;
    }
}

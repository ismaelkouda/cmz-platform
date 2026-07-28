import { SimpleResponseDto } from '@cmz/shared-data';

/**
 * Wire fidèle au contrat réel (mélange snake_case/camelCase confirmé dans
 * le source, pas une invention de notre part). `uniq_id` absent : ce n'est
 * pas une entité identifiable (statistiques agrégées globales), le source
 * portait bien un `uniq_id` sur ce DTO mais ne l'exploitait jamais (le
 * mapper avait même sa ligne `validateDto(dto, { required: ['uniq_id'] })`
 * commentée) — pas reproduit ici.
 */
export interface DashboardItemApiDto {
    readonly total_reports: number;
    readonly total_cpo_reports?: number;
    readonly total_zob_reports?: number;
    readonly total_cps_reports?: number;
    readonly total_abi_reports?: number;
    readonly total_request_report_pending?: number;
    readonly total_request_report_rejected?: number;
    readonly total_reports_in_processing?: number;
    readonly total_reports_finalized?: number;
    readonly total_reports_evaluated?: number;
    readonly treatmentRate?: number;
    readonly completionRate?: number;
    readonly averageTreatmentTime?: number;
    readonly responseTime?: number;
    readonly last_refresh_at: string;
}

export type DashboardResponseApiDto = SimpleResponseDto<DashboardItemApiDto>;

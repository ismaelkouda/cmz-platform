import { ReportStatesDetailsStatus } from '@cmz/report-states-domain';

/**
 * T12-22 (`docs/architecture/taches-restantes.md`, 2026-08-10) : les 6
 * clés non-`PENDING` empruntaient `REQUESTS.ALL.FILTER.STATUS_*` — même
 * classe de fuite i18n que P1-2 (namespace du mauvais module), prefixe
 * différent. Corrigé en étendant `REPORT_STATES.DETAILS.STATUS.*`
 * (`fr-pack-04.ts`), déjà utilisé pour `PENDING` et déjà le bon namespace
 * — ce constant n'alimente que des vues `details` (`report-states-details-
 * header.component.ts`, `report-states-details-info-panel.component.ts`),
 * jamais un filtre de liste, donc `DETAILS.STATUS.*` est sémantiquement
 * plus juste qu'un éventuel `ALL.FILTER.*`.
 */
export const REPORT_STATES_DETAILS_STATUS_LABEL: Record<
    ReportStatesDetailsStatus,
    string
> = {
    [ReportStatesDetailsStatus.PENDING]: 'REPORT_STATES.DETAILS.STATUS.PENDING',
    [ReportStatesDetailsStatus.APPROVED]:
        'REPORT_STATES.DETAILS.STATUS.APPROVED',
    [ReportStatesDetailsStatus.REJECTED]:
        'REPORT_STATES.DETAILS.STATUS.REJECTED',
    [ReportStatesDetailsStatus.ABANDONED]:
        'REPORT_STATES.DETAILS.STATUS.ABANDONED',
    [ReportStatesDetailsStatus.IN_PROGRESS]:
        'REPORT_STATES.DETAILS.STATUS.IN_PROGRESS',
    [ReportStatesDetailsStatus.TERMINATED]:
        'REPORT_STATES.DETAILS.STATUS.TERMINATED',
    [ReportStatesDetailsStatus.CONFIRMED]:
        'REPORT_STATES.DETAILS.STATUS.CONFIRMED',
};

/**
 * Statut wire-first fiche demande (legacy `Status`).
 *
 * T12-24 (`docs/architecture/taches-restantes.md`, 2026-08-10) : le
 * type-guard `isReportStatesDetailsStatus` qui vivait ici a été supprimé —
 * code mort vérifié (`grep -rn` sur `libs/`/`apps/` ne retournait que sa
 * déclaration et son export, jamais un appel réel). `ReportStatesDetailsMapper`
 * valide le wire via `STATUS_MAP` (`Map.get() ?? ReportStatesDetailsStatus.PENDING`),
 * pas via ce guard — même schéma que T12-21
 * (`report-states-details-qualification-state.enum.ts`).
 */
export const ReportStatesDetailsStatus = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    ABANDONED: 'abandoned',
    IN_PROGRESS: 'in-progress',
    TERMINATED: 'terminated',
    CONFIRMED: 'confirmed',
} as const;

export type ReportStatesDetailsStatus =
    (typeof ReportStatesDetailsStatus)[keyof typeof ReportStatesDetailsStatus];

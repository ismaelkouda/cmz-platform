/**
 * Statut wire-first fiche demande (legacy `Status`).
 *
 * ADR-0020 (Option B, POC 2026-08-11) — extrait de `report-states`/`requests`
 * (`*-details-status.enum.ts`, identiques modulo le nom du module) vers
 * `@cmz/workflow-details-domain`. Historique de la suppression du
 * type-guard : voir `docs/architecture/taches-restantes.md` T12-24.
 */
export const WorkflowDetailsStatus = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    ABANDONED: 'abandoned',
    IN_PROGRESS: 'in-progress',
    TERMINATED: 'terminated',
    CONFIRMED: 'confirmed',
} as const;

export type WorkflowDetailsStatus =
    (typeof WorkflowDetailsStatus)[keyof typeof WorkflowDetailsStatus];

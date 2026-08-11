/**
 * État qualification wire-first (legacy `DetailsQualificationState`).
 *
 * ADR-0020 (Option B, POC 2026-08-11) — extrait de `report-states`/`requests`
 * vers `@cmz/workflow-details-domain`. Historique de la suppression du
 * type-guard : voir `docs/architecture/taches-restantes.md` T12-21.
 */
export const WorkflowDetailsQualificationState = {
    PENDING: 'pending',
    COMPLETED: 'completed',
} as const;

export type WorkflowDetailsQualificationState =
    (typeof WorkflowDetailsQualificationState)[keyof typeof WorkflowDetailsQualificationState];

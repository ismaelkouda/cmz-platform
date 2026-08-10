/**
 * État qualification wire-first (legacy `DetailsQualificationState`).
 *
 * T12-21 (`docs/architecture/taches-restantes.md`, 2026-08-10) : le
 * type-guard `isReportStatesDetailsQualificationState` qui vivait ici a été
 * supprimé — code mort vérifié (`grep -rn` sur `libs/`/`apps/` ne
 * retournait que sa déclaration et son export, jamais un appel réel).
 * `ReportStatesDetailsMapper` valide le wire via `QUALIFICATION_STATE_MAP`
 * (`Map.get() ?? null`), pas via ce guard. Absent côté `requests` par
 * symétrie — l'asymétrie signalée par T12-21 n'était donc pas un oubli
 * côté `requests`, mais un excédent côté `report-states`.
 */
export const ReportStatesDetailsQualificationState = {
    PENDING: 'pending',
    COMPLETED: 'completed',
} as const;

export type ReportStatesDetailsQualificationState =
    (typeof ReportStatesDetailsQualificationState)[keyof typeof ReportStatesDetailsQualificationState];

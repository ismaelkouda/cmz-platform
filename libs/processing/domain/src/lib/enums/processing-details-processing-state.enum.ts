/**
 * État de traitement wire-first (legacy `ProcessingState`).
 *
 * T12-24 (`docs/architecture/taches-restantes.md`, 2026-08-10) : le
 * type-guard `isProcessingDetailsProcessingState` qui vivait ici a été
 * supprimé — code mort vérifié (`grep -rn` sur `libs/`/`apps/` ne
 * retournait que sa déclaration et son export, jamais un appel réel).
 * `ProcessingDetailsMapper` valide le wire via une `Map` dédiée
 * (`Map.get() ?? ProcessingDetailsProcessingState.PENDING`), pas via ce
 * guard — même schéma que T12-21.
 */
export const ProcessingDetailsProcessingState = {
    PENDING: 'pending',
    IN_PROGRESS: 'in-progress',
    TERMINATED: 'terminated',
} as const;

export type ProcessingDetailsProcessingState =
    (typeof ProcessingDetailsProcessingState)[keyof typeof ProcessingDetailsProcessingState];

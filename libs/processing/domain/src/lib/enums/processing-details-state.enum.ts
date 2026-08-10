/**
 * État global signalement (legacy `State`).
 *
 * T12-24 (`docs/architecture/taches-restantes.md`, 2026-08-10) : le
 * type-guard `isProcessingDetailsState` qui vivait ici a été supprimé —
 * code mort vérifié (`grep -rn` sur `libs/`/`apps/` ne retournait que sa
 * déclaration et son export, jamais un appel réel). `ProcessingDetailsMapper`
 * valide le wire via `STATE_MAP` (`Map.get() ?? ProcessingDetailsState.PENDING`),
 * pas via ce guard — même schéma que T12-21.
 */
export const ProcessingDetailsState = {
    PENDING: 'pending',
    IN_PROGRESS: 'in-progress',
    TERMINATED: 'terminated',
    COMPLETED: 'completed',
} as const;

export type ProcessingDetailsState =
    (typeof ProcessingDetailsState)[keyof typeof ProcessingDetailsState];

/** Statut signalement (legacy `DetailsStatus`). */
export const ProcessingDetailsStatus = {
    PENDING: 'pending',
    IN_PROGRESS: 'in-progress',
    TERMINATED: 'terminated',
} as const;

export type ProcessingDetailsStatus =
    (typeof ProcessingDetailsStatus)[keyof typeof ProcessingDetailsStatus];

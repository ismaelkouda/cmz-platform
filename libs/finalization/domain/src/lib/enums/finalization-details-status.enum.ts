/** Statut wire-first fiche demande (legacy `Status`). */
export const FinalizationDetailsStatus = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    ABANDONED: 'abandoned',
    IN_PROGRESS: 'in-progress',
    TERMINATED: 'terminated',
    CONFIRMED: 'confirmed',
} as const;

export type FinalizationDetailsStatus =
    (typeof FinalizationDetailsStatus)[keyof typeof FinalizationDetailsStatus];

export function isFinalizationDetailsStatus(
    value: string
): value is FinalizationDetailsStatus {
    return Object.values(FinalizationDetailsStatus).includes(
        value as FinalizationDetailsStatus
    );
}

/** Statut wire-first fiche demande (legacy `Status`). */
export const RequestsDetailsStatus = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    ABANDONED: 'abandoned',
    IN_PROGRESS: 'in-progress',
    TERMINATED: 'terminated',
    CONFIRMED: 'confirmed',
} as const;

export type RequestsDetailsStatus =
    (typeof RequestsDetailsStatus)[keyof typeof RequestsDetailsStatus];

export function isRequestsDetailsStatus(
    value: string
): value is RequestsDetailsStatus {
    return Object.values(RequestsDetailsStatus).includes(
        value as RequestsDetailsStatus
    );
}

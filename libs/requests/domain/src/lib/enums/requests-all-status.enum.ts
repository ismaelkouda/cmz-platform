/**
 * Statuts wire-first pour le filtre « all » requests.
 * Source : `all-status-api.enum.ts` legacy (pas les clés i18n du domaine legacy).
 */
export const RequestsAllStatus = {
    APPROVED: 'approved',
    REJECTED: 'rejected',
    ABANDONED: 'abandoned',
    IN_PROGRESS: 'in-progress',
    TERMINATED: 'terminated',
    CONFIRMED: 'confirmed',
} as const;

export type RequestsAllStatus =
    (typeof RequestsAllStatus)[keyof typeof RequestsAllStatus];

export function isRequestsAllStatus(value: string): value is RequestsAllStatus {
    return Object.values(RequestsAllStatus).includes(
        value as RequestsAllStatus
    );
}

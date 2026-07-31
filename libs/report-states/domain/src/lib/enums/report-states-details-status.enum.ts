/** Statut wire-first fiche demande (legacy `Status`). */
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

export function isReportStatesDetailsStatus(
    value: string
): value is ReportStatesDetailsStatus {
    return Object.values(ReportStatesDetailsStatus).includes(
        value as ReportStatesDetailsStatus
    );
}

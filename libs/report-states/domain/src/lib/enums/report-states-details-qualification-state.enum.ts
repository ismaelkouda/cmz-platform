/** État qualification wire-first (legacy `DetailsQualificationState`). */
export const ReportStatesDetailsQualificationState = {
    PENDING: 'pending',
    COMPLETED: 'completed',
} as const;

export type ReportStatesDetailsQualificationState =
    (typeof ReportStatesDetailsQualificationState)[keyof typeof ReportStatesDetailsQualificationState];

export function isReportStatesDetailsQualificationState(
    value: string
): value is ReportStatesDetailsQualificationState {
    return Object.values(ReportStatesDetailsQualificationState).includes(
        value as ReportStatesDetailsQualificationState
    );
}

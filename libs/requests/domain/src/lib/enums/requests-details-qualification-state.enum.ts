/** État qualification wire-first (legacy `DetailsQualificationState`). */
export const RequestsDetailsQualificationState = {
    PENDING: 'pending',
    COMPLETED: 'completed',
} as const;

export type RequestsDetailsQualificationState =
    (typeof RequestsDetailsQualificationState)[keyof typeof RequestsDetailsQualificationState];

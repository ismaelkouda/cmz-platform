/** État global signalement (legacy `State`). */
export const ProcessingDetailsState = {
    PENDING: 'pending',
    IN_PROGRESS: 'in-progress',
    TERMINATED: 'terminated',
    COMPLETED: 'completed',
} as const;

export type ProcessingDetailsState =
    (typeof ProcessingDetailsState)[keyof typeof ProcessingDetailsState];

export function isProcessingDetailsState(
    value: string
): value is ProcessingDetailsState {
    return Object.values(ProcessingDetailsState).includes(
        value as ProcessingDetailsState
    );
}

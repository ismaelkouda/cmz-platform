/** État de traitement wire-first (legacy `ProcessingState`). */
export const ProcessingDetailsProcessingState = {
    PENDING: 'pending',
    IN_PROGRESS: 'in-progress',
    TERMINATED: 'terminated',
} as const;

export type ProcessingDetailsProcessingState =
    (typeof ProcessingDetailsProcessingState)[keyof typeof ProcessingDetailsProcessingState];

export function isProcessingDetailsProcessingState(
    value: string
): value is ProcessingDetailsProcessingState {
    return Object.values(ProcessingDetailsProcessingState).includes(
        value as ProcessingDetailsProcessingState
    );
}

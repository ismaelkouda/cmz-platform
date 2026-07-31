/** État wire-first pour le filtre « all » (source : `all-state.enum.ts`). */
export const ProcessingAllState = {
    TERMINATED: 'terminated',
} as const;

export type ProcessingAllState =
    (typeof ProcessingAllState)[keyof typeof ProcessingAllState];

export function isProcessingAllState(
    value: string
): value is ProcessingAllState {
    return Object.values(ProcessingAllState).includes(
        value as ProcessingAllState
    );
}

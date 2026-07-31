/** État wire-first pour le filtre « all » — source legacy `all-state.enum.ts`. */
export const FinalizationAllState = {
    TERMINATED: 'terminated',
} as const;

export type FinalizationAllState =
    (typeof FinalizationAllState)[keyof typeof FinalizationAllState];

export function isFinalizationAllState(
    value: string
): value is FinalizationAllState {
    return Object.values(FinalizationAllState).includes(
        value as FinalizationAllState
    );
}

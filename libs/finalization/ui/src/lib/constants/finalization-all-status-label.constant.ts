import { FinalizationAllState } from '@cmz/finalization-domain';

export const FINALIZATION_ALL_STATE_LABEL: Record<
    FinalizationAllState,
    string
> = {
    [FinalizationAllState.TERMINATED]:
        'FINALIZATION.ALL.FILTER.STATE_TERMINATED',
};

export const FINALIZATION_ALL_STATE_OPTIONS = (
    Object.values(FinalizationAllState) as FinalizationAllState[]
).map((value) => ({
    value,
    label: FINALIZATION_ALL_STATE_LABEL[value],
}));

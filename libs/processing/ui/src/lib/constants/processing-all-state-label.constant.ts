import { ProcessingAllState } from '@cmz/processing-domain';

export const PROCESSING_ALL_STATE_LABEL: Record<ProcessingAllState, string> = {
    [ProcessingAllState.TERMINATED]: 'PROCESSING.ALL.FILTER.STATE_TERMINATED',
};

export const PROCESSING_ALL_STATE_OPTIONS = (
    Object.values(ProcessingAllState) as ProcessingAllState[]
).map((value) => ({
    value,
    label: PROCESSING_ALL_STATE_LABEL[value],
}));

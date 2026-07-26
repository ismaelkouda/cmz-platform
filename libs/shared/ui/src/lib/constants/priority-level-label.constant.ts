import { PriorityLevel } from '@cmz/shared-domain';

/** Clés i18n des libellés priorité — présentation pure. */
export const PRIORITY_LEVEL_LABEL: Record<PriorityLevel, string> = {
    [PriorityLevel.LOW]: 'COMMON.LOW',
    [PriorityLevel.MEDIUM]: 'COMMON.MEDIUM',
    [PriorityLevel.HIGH]: 'COMMON.HIGH',
    [PriorityLevel.CRITICAL]: 'COMMON.CRITICAL',
};

/** Options filtre / select. */
export const PRIORITY_LEVEL_OPTIONS = (
    Object.values(PriorityLevel) as PriorityLevel[]
).map((value) => ({
    value,
    label: PRIORITY_LEVEL_LABEL[value],
}));

import { REGION_FORM_KEYS } from './region-form-keys.constant';

export const REGION_FORM_ERROR_MESSAGES = {
    [REGION_FORM_KEYS.CODE]: { required: 'COMMON.VALIDATION.REQUIRED' },
    [REGION_FORM_KEYS.NAME]: { required: 'COMMON.VALIDATION.REQUIRED' },
    [REGION_FORM_KEYS.POPULATION_SIZE]: {
        required: 'COMMON.VALIDATION.REQUIRED',
    },
    [REGION_FORM_KEYS.INFRASTRUCTURE_COUNT]: {
        required: 'COMMON.VALIDATION.REQUIRED',
    },
} as const;

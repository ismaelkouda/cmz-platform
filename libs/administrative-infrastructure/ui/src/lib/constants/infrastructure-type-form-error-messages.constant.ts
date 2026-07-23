import { INFRASTRUCTURE_TYPE_FORM_KEYS } from './infrastructure-type-form-keys.constant';

export const INFRASTRUCTURE_TYPE_FORM_ERROR_MESSAGES = {
    [INFRASTRUCTURE_TYPE_FORM_KEYS.NAME]: {
        required: 'COMMON.VALIDATION.REQUIRED',
    },
    [INFRASTRUCTURE_TYPE_FORM_KEYS.DESCRIPTION]: {
        required: 'COMMON.VALIDATION.REQUIRED',
    },
} as const;

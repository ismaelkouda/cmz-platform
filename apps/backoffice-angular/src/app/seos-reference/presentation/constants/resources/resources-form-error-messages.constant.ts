import { RESOURCES_FORM_KEYS } from '@pages/seos-reference/presentation/constants/resources/resources-form-keys.constant';

export const RESOURCES_FORM_ERROR_MESSAGES = {
    [RESOURCES_FORM_KEYS.CODE]: {
        required: 'SEOS_REFERENCE.RESOURCES.FORM.ERROR.CODE_REQUIRE',
    },
    [RESOURCES_FORM_KEYS.NAME]: {
        required: 'SEOS_REFERENCE.RESOURCES.FORM.ERROR.NAME_REQUIRE',
    },
    [RESOURCES_FORM_KEYS.DESCRIPTION]: {
        required: 'SEOS_REFERENCE.RESOURCES.FORM.ERROR.DESCRIPTION_REQUIRE',
    },
} as const;

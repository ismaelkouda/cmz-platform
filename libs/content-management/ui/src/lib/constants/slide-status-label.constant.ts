import { SlideStatus } from '@cmz/content-management-domain';

/** Clés i18n des libellés de statut slide — présentation pure. */
export const SLIDE_STATUS_LABEL: Record<SlideStatus, string> = {
    [SlideStatus.ACTIVE]: 'COMMON.ACTIVE',
    [SlideStatus.INACTIVE]: 'COMMON.INACTIVE',
};

import { TermsUseStatus } from '@cmz/content-management-domain';

/** Clés i18n des libellés de statut terms-use — présentation pure. */
export const TERMS_USE_STATUS_LABEL: Record<TermsUseStatus, string> = {
    [TermsUseStatus.PUBLISH]: 'COMMON.PUBLISH',
    [TermsUseStatus.UNPUBLISH]: 'COMMON.UNPUBLISH',
};

import { LegalNoticeStatus } from '@cmz/content-management-domain';

/** Clés i18n des libellés de statut legal-notice — présentation pure. */
export const LEGAL_NOTICE_STATUS_LABEL: Record<LegalNoticeStatus, string> = {
    [LegalNoticeStatus.PUBLISH]: 'COMMON.PUBLISH',
    [LegalNoticeStatus.UNPUBLISH]: 'COMMON.UNPUBLISH',
};

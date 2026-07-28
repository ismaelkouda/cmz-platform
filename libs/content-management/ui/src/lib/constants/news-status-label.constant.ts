import { NewsStatus } from '@cmz/content-management-domain';

/** Clés i18n des libellés de statut news — présentation pure. */
export const NEWS_STATUS_LABEL: Record<NewsStatus, string> = {
    [NewsStatus.PUBLISH]: 'COMMON.PUBLISH',
    [NewsStatus.UNPUBLISH]: 'COMMON.UNPUBLISH',
};

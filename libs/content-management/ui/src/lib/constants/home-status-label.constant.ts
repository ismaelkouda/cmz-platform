import { HomeStatus } from '@cmz/content-management-domain';

/** Clés i18n des libellés de statut home — présentation pure. */
export const HOME_STATUS_LABEL: Record<HomeStatus, string> = {
    [HomeStatus.ACTIVE]: 'COMMON.ACTIVE',
    [HomeStatus.INACTIVE]: 'COMMON.INACTIVE',
};

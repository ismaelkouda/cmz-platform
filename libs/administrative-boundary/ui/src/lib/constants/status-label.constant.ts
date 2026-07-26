import { Status } from '@cmz/administrative-boundary-domain';

/**
 * Clés i18n des libellés de statut — présentation pure (hors domaine).
 * Partagé par region/department/municipality (`Status` unifié).
 */
export const STATUS_LABEL: Record<Status, string> = {
    [Status.ACTIVE]: 'COMMON.ACTIVE',
    [Status.INACTIVE]: 'COMMON.INACTIVE',
};

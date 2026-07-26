import { Status } from '@cmz/administrative-infrastructure-domain';

/** Clés i18n des libellés de statut — présentation pure (hors domaine). */
export const STATUS_LABEL: Record<Status, string> = {
    [Status.ACTIVE]: 'COMMON.ACTIVE',
    [Status.INACTIVE]: 'COMMON.INACTIVE',
};

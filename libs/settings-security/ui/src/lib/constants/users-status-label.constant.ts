import { UsersStatus } from '@cmz/settings-security-domain';

/** Clés i18n des libellés de statut utilisateur — présentation pure. */
export const USERS_STATUS_LABEL: Record<UsersStatus, string> = {
    [UsersStatus.ACTIVE]: 'COMMON.ACTIVE',
    [UsersStatus.INACTIVE]: 'COMMON.INACTIVE',
    [UsersStatus.BLOCKED]: 'COMMON.BLOCKED',
    [UsersStatus.PENDING]: 'COMMON.PENDING',
};

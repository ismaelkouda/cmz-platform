import { ProfilesPermissionsStatus } from '@cmz/settings-security-domain';

/** Clés i18n des libellés de statut profil — présentation pure. */
export const PROFILES_PERMISSIONS_STATUS_LABEL: Record<
    ProfilesPermissionsStatus,
    string
> = {
    [ProfilesPermissionsStatus.ACTIVE]: 'COMMON.ACTIVE',
    [ProfilesPermissionsStatus.INACTIVE]: 'COMMON.INACTIVE',
};

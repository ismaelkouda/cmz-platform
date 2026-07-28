import { ProfilesPermissionsStatus } from '@cmz/settings-security-domain';
import { ProfilesPermissionsStatusStyle } from '../enums/profiles-permissions-status-style.enum';

/** Traduit un `ProfilesPermissionsStatus` (domaine) en style d'affichage — logique UI. */
export function profilesPermissionsStatusStyleOf(
    status: ProfilesPermissionsStatus
): ProfilesPermissionsStatusStyle {
    return status === ProfilesPermissionsStatus.ACTIVE
        ? ProfilesPermissionsStatusStyle.ACTIVE
        : ProfilesPermissionsStatusStyle.INACTIVE;
}

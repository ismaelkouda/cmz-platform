/**
 * 2 états (actif/inactif) — enum local à settings-security, distinct de UsersStatus (« chacun le sien »).
 */
export const ProfilesPermissionsStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

export type ProfilesPermissionsStatus =
    (typeof ProfilesPermissionsStatus)[keyof typeof ProfilesPermissionsStatus];

const PROFILES_PERMISSIONS_STATUS_VALUES = new Set<string>(
    Object.values(ProfilesPermissionsStatus)
);

export function isProfilesPermissionsStatus(
    value: unknown
): value is ProfilesPermissionsStatus {
    return (
        typeof value === 'string' &&
        PROFILES_PERMISSIONS_STATUS_VALUES.has(value)
    );
}

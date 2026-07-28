/**
 * 4 états (comme team-organization/participants) — enum local à settings-security, distinct de ParticipantsStatus (« chacun le sien »).
 */
export const UsersStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    BLOCKED: 'blocked',
    PENDING: 'pending',
} as const;

export type UsersStatus = (typeof UsersStatus)[keyof typeof UsersStatus];

const USERS_STATUS_VALUES = new Set<string>(Object.values(UsersStatus));

export function isUsersStatus(value: unknown): value is UsersStatus {
    return typeof value === 'string' && USERS_STATUS_VALUES.has(value);
}

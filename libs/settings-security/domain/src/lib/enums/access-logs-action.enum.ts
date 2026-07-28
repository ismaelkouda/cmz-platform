/**
 * Type d'action journalisée — codes stables = wire API. Enum local à
 * settings-security (« chacun le sien »), pas de StatusStyle : ce n'est pas
 * un statut actif/inactif mais un type d'événement de sécurité.
 */
export const AccessLogsAction = {
    LOGIN: 'login',
    LOGOUT: 'logout',
    ATTEMPTED_LOGIN: 'attempted_login',
    BLOCKED_ATTEMPTED_LOGIN: 'blocked_attempted_login',
    ATTEMPTS_EXCEEDED: 'attempts_exceeded',
} as const;

export type AccessLogsAction =
    (typeof AccessLogsAction)[keyof typeof AccessLogsAction];

const ACCESS_LOGS_ACTION_VALUES = new Set<string>(
    Object.values(AccessLogsAction)
);

export function isAccessLogsAction(value: unknown): value is AccessLogsAction {
    return typeof value === 'string' && ACCESS_LOGS_ACTION_VALUES.has(value);
}

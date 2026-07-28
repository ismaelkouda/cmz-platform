/**
 * `ACCESS_LOGS` est un chemin nu (`logs`), sans préfixe
 * `settings-and-security/` — cohérent avec le fait qu'il est appelé sur
 * `AUTH_API_URL`, pas `SETTINGS_API_URL` (cf. sources/access-logs.api.ts).
 */
export const SETTINGS_SECURITY_ENDPOINTS = {
    ACCESS_LOGS: 'logs',
    PROFILES_PERMISSIONS: 'settings-and-security/user-profiles',
    USERS: 'settings-and-security/users',
} as const;

/**
 * Rôle organisationnel unifié (ex-Roles / Profiles / Responsibilities).
 * Codes stables métier. Wire API peut diverger (roles: `team-leader` vs
 * profiles/responsibilities: `leader`) — mapping dans @cmz/shared-data.
 * Labels / styles : @cmz/shared-ui.
 */
export const Role = {
    SUPERVISOR: 'supervisor',
    LEADER: 'leader',
    AGENT: 'agent',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

const VALUES = new Set<string>(Object.values(Role));

export function isRole(value: string): value is Role {
    return VALUES.has(value);
}

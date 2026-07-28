/**
 * Statut d'une `team` (actif/inactif) — dérivé de `is_active` côté data
 * (le détail `find-one` n'a d'ailleurs aucun champ statut : seule la liste
 * en porte un). Enum local au module, pas partagé — même précédent que
 * `coverage-areas/site-group` (chacun le sien, décision assumée).
 */
export const TeamsStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

export type TeamsStatus = (typeof TeamsStatus)[keyof typeof TeamsStatus];

const TEAMS_STATUS_VALUES = new Set<string>(Object.values(TeamsStatus));

export function isTeamsStatus(value: unknown): value is TeamsStatus {
    return typeof value === 'string' && TEAMS_STATUS_VALUES.has(value);
}

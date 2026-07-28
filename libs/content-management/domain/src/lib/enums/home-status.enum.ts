/**
 * Statut actif/inactif de la bannière home (dérivé de `is_active`) — enum local au module, pas partagé même quand une autre entité du même module a des valeurs identiques (précédent confirmé : team-organization/teams+participants, coverage-areas/site-group+mobile-network — « chacun le sien », décision assumée, pas re-questionnée).
 */
export const HomeStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

export type HomeStatus = (typeof HomeStatus)[keyof typeof HomeStatus];

const HOME_STATUS_VALUES = new Set<string>(Object.values(HomeStatus));

export function isHomeStatus(value: unknown): value is HomeStatus {
    return typeof value === 'string' && HOME_STATUS_VALUES.has(value);
}

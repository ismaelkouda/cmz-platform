/**
 * Statut actif/inactif du slide (dérivé de `is_active`) — enum local au module, pas partagé même quand une autre entité du même module a des valeurs identiques (précédent confirmé : team-organization/teams+participants, coverage-areas/site-group+mobile-network — « chacun le sien », décision assumée, pas re-questionnée).
 */
export const SlideStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

export type SlideStatus = (typeof SlideStatus)[keyof typeof SlideStatus];

const SLIDE_STATUS_VALUES = new Set<string>(Object.values(SlideStatus));

export function isSlideStatus(value: unknown): value is SlideStatus {
    return typeof value === 'string' && SLIDE_STATUS_VALUES.has(value);
}

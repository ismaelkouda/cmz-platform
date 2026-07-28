/**
 * Statut publié/dépublié de la news (dérivé de `is_published`) — enum local au module, pas partagé même quand une autre entité du même module a des valeurs identiques (précédent confirmé : team-organization/teams+participants, coverage-areas/site-group+mobile-network — « chacun le sien », décision assumée, pas re-questionnée).
 */
export const NewsStatus = {
    PUBLISH: 'publish',
    UNPUBLISH: 'unpublish',
} as const;

export type NewsStatus = (typeof NewsStatus)[keyof typeof NewsStatus];

const NEWS_STATUS_VALUES = new Set<string>(Object.values(NewsStatus));

export function isNewsStatus(value: unknown): value is NewsStatus {
    return typeof value === 'string' && NEWS_STATUS_VALUES.has(value);
}

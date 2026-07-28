/**
 * Statut publié/dépublié du document terms-use (dérivé de `is_published`) — enum local au module, pas partagé même quand une autre entité du même module a des valeurs identiques (précédent confirmé : team-organization/teams+participants, coverage-areas/site-group+mobile-network — « chacun le sien », décision assumée, pas re-questionnée).
 */
export const TermsUseStatus = {
    PUBLISH: 'publish',
    UNPUBLISH: 'unpublish',
} as const;

export type TermsUseStatus =
    (typeof TermsUseStatus)[keyof typeof TermsUseStatus];

const TERMS_USE_STATUS_VALUES = new Set<string>(Object.values(TermsUseStatus));

export function isTermsUseStatus(value: unknown): value is TermsUseStatus {
    return typeof value === 'string' && TERMS_USE_STATUS_VALUES.has(value);
}

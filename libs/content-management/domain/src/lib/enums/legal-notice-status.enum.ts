/**
 * Statut publié/dépublié du document legal-notice (dérivé de `is_published`) — enum local au module, pas partagé même quand une autre entité du même module a des valeurs identiques (précédent confirmé : team-organization/teams+participants, coverage-areas/site-group+mobile-network — « chacun le sien », décision assumée, pas re-questionnée).
 */
export const LegalNoticeStatus = {
    PUBLISH: 'publish',
    UNPUBLISH: 'unpublish',
} as const;

export type LegalNoticeStatus =
    (typeof LegalNoticeStatus)[keyof typeof LegalNoticeStatus];

const LEGAL_NOTICE_STATUS_VALUES = new Set<string>(
    Object.values(LegalNoticeStatus)
);

export function isLegalNoticeStatus(
    value: unknown
): value is LegalNoticeStatus {
    return typeof value === 'string' && LEGAL_NOTICE_STATUS_VALUES.has(value);
}

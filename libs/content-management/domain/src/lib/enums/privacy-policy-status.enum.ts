/**
 * Statut publié/dépublié du document privacy-policy (dérivé de `is_published`) — enum local au module, pas partagé même quand une autre entité du même module a des valeurs identiques (précédent confirmé : team-organization/teams+participants, coverage-areas/site-group+mobile-network — « chacun le sien », décision assumée, pas re-questionnée).
 */
export const PrivacyPolicyStatus = {
    PUBLISH: 'publish',
    UNPUBLISH: 'unpublish',
} as const;

export type PrivacyPolicyStatus =
    (typeof PrivacyPolicyStatus)[keyof typeof PrivacyPolicyStatus];

const PRIVACY_POLICY_STATUS_VALUES = new Set<string>(
    Object.values(PrivacyPolicyStatus)
);

export function isPrivacyPolicyStatus(
    value: unknown
): value is PrivacyPolicyStatus {
    return typeof value === 'string' && PRIVACY_POLICY_STATUS_VALUES.has(value);
}

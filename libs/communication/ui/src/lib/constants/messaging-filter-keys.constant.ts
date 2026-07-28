/**
 * Le formulaire de filtre source n'exposait que `search`/`channels`/
 * `targetType` (pas `region`/`department`/`municipality`/`reportId`
 * malgré leur présence dans le contrat domaine) — `channels` omis ici :
 * `cmz-filter` (`FilterFieldType`) ne supporte que `text`/`number`/
 * `select`/`date`, pas de multi-select, et construire un contrôle dédié
 * pour ce seul besoin serait disproportionné (même esprit que la décision
 * rich-text de `content-management`).
 */
export const MESSAGING_FILTER_KEYS = {
    SEARCH: 'search',
    TARGET_TYPE: 'targetType',
} as const;

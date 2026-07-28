/**
 * Statut d'un `participant` — 4 valeurs (actif/inactif/bloqué/en attente),
 * distinct de tout `Status` partagé au kernel (2 valeurs seulement) et de
 * celui de `teams` (également 2 valeurs) dans ce même module. Vérifié dans
 * le source (`participants-status.enum.ts`) avant de décider : pas de
 * fusion silencieuse d'enums aux cardinalités incompatibles. Valeurs
 * normalisées en minuscules (wire-safe), pas de clé i18n embarquée dans la
 * valeur du domaine — la traduction se fait via une constante de
 * présentation (`PARTICIPANTS_STATUS_LABEL`) côté UI, pas ici.
 */
export const ParticipantsStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    BLOCKED: 'blocked',
    PENDING: 'pending',
} as const;

export type ParticipantsStatus =
    (typeof ParticipantsStatus)[keyof typeof ParticipantsStatus];

const PARTICIPANTS_STATUS_VALUES = new Set<string>(
    Object.values(ParticipantsStatus)
);

export function isParticipantsStatus(
    value: unknown
): value is ParticipantsStatus {
    return typeof value === 'string' && PARTICIPANTS_STATUS_VALUES.has(value);
}

/**
 * Statut d'un `site-group` (actif/inactif) — codes stables (dérivés de
 * `is_active` côté data). Enum local au module, pas partagé au kernel —
 * même précédent que `administrative-boundary`/`administrative-infrastructure`
 * (chacun le sien, décision assumée, cf. plan du module).
 */
export const Status = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

export type Status = (typeof Status)[keyof typeof Status];

const STATUS_VALUES = new Set<string>(Object.values(Status));

export function isStatus(value: string): value is Status {
    return STATUS_VALUES.has(value);
}

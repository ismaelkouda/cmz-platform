/**
 * Statut d'un type d'infrastructure — codes stables (dérivés de `is_active`
 * côté data). Libellés / styles badge : @cmz/administrative-infrastructure-ui
 * (STATUS_LABEL, statusStyleOf).
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

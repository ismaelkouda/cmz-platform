/**
 * Niveau de priorité — codes stables = wire API.
 * Labels : @cmz/shared-ui. Aucune dépendance data (cycle legacy évité).
 */
export const PriorityLevel = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
} as const;

export type PriorityLevel = (typeof PriorityLevel)[keyof typeof PriorityLevel];

const VALUES = new Set<string>(Object.values(PriorityLevel));

export function isPriorityLevel(value: string): value is PriorityLevel {
    return VALUES.has(value);
}

/**
 * Étape du workflow de traitement d'un signalement — codes stables.
 * Ne pas confondre avec ReportType (ABI/ZOB/CPS/CPO).
 * Labels : @cmz/shared-ui. Pas de DTO wire dédié (contexte UI / modules).
 */
export const TypeReport = {
    REQUESTS: 'requests',
    PROCESSING: 'processing',
    FINALIZATION: 'finalization',
} as const;

export type TypeReport = (typeof TypeReport)[keyof typeof TypeReport];

const VALUES = new Set<string>(Object.values(TypeReport));

export function isTypeReport(value: string): value is TypeReport {
    return VALUES.has(value);
}

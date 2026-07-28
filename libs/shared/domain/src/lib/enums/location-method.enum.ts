/**
 * Méthode de saisie de localisation — codes stables = wire API.
 * UNKNOWN = valeur wire légitime (donnée absente). Labels : @cmz/shared-ui.
 */
export const LocationMethod = {
    AUTO: 'auto',
    MANUAL: 'manual',
} as const;

export type LocationMethod =
    (typeof LocationMethod)[keyof typeof LocationMethod];

const VALUES = new Set<string>(Object.values(LocationMethod));

export function isLocationMethod(value: string): value is LocationMethod {
    return VALUES.has(value);
}

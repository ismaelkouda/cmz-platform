/**
 * Type de localisation — codes stables = wire API.
 * UNKNOWN = valeur wire légitime. Labels : @cmz/shared-ui.
 */
export const LocationType = {
    GPS: 'gps',
    NETWORK: 'network',
    MANUAL: 'manual',
    WHAT3WORDS: 'what3words',
    UNKNOWN: 'unknown',
} as const;

export type LocationType = (typeof LocationType)[keyof typeof LocationType];

const VALUES = new Set<string>(Object.values(LocationType));

export function isLocationType(value: string): value is LocationType {
    return VALUES.has(value);
}

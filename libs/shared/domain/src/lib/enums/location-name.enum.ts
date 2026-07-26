/**
 * Catégorie de lieu — codes stables métier (jamais de libellé FR ni i18n).
 * Wire API legacy = français ("Lieu d'habitation") — mapping @cmz/shared-data.
 * Labels i18n : @cmz/shared-ui.
 */
export const LocationName = {
    RESIDENCE_PLACE: 'residence_place',
    ACTIVITY_PLACE: 'activity_place',
    TRANSIT_PLACE: 'transit_place',
    PLACE_NOT_PROVIDED: 'place_not_provided',
} as const;

export type LocationName = (typeof LocationName)[keyof typeof LocationName];

const VALUES = new Set<string>(Object.values(LocationName));

export function isLocationName(value: string): value is LocationName {
    return VALUES.has(value);
}

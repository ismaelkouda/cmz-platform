/**
 * Wire API `location_name` — libellés français figés côté backend legacy.
 * Ne pas utiliser hors couche data.
 */
export const LocationNameDto = {
    RESIDENCE_PLACE: "Lieu d'habitation",
    ACTIVITY_PLACE: "Lieu d'activité",
    TRANSIT_PLACE: 'Lieu de passage',
    PLACE_NOT_PROVIDED: 'Lieu non fourni',
} as const;

export type LocationNameDto =
    (typeof LocationNameDto)[keyof typeof LocationNameDto];

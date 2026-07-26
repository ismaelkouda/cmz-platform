import { LocationName } from '@cmz/shared-domain';

/** Clés i18n des libellés catégorie de lieu — présentation pure. */
export const LOCATION_NAME_LABEL: Record<LocationName, string> = {
    [LocationName.RESIDENCE_PLACE]: 'COMMON.RESIDENCE_PLACE',
    [LocationName.ACTIVITY_PLACE]: 'COMMON.ACTIVITY_PLACE',
    [LocationName.TRANSIT_PLACE]: 'COMMON.TRANSIT_PLACE',
    [LocationName.PLACE_NOT_PROVIDED]: 'COMMON.PLACE_NOT_PROVIDED',
};

/** Options filtre / select (value = code métier, pas le FR wire). */
export const LOCATION_NAME_OPTIONS = (
    Object.values(LocationName) as LocationName[]
).map((value) => ({
    value,
    label: LOCATION_NAME_LABEL[value],
}));

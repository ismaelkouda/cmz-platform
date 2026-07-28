import { LocationType } from '@cmz/shared-domain';

/** Clés i18n des libellés type de localisation — présentation pure. */
export const LOCATION_TYPE_LABEL: Record<LocationType, string> = {
    [LocationType.GPS]: 'COMMON.GPS',
    [LocationType.NETWORK]: 'COMMON.NETWORK',
    [LocationType.MANUAL]: 'COMMON.MANUAL',
    [LocationType.WHAT3WORDS]: 'COMMON.WHAT3WORDS',
};

/** Options filtre / select (sans unknown). */
export const LOCATION_TYPE_OPTIONS = (
    [
        LocationType.GPS,
        LocationType.NETWORK,
        LocationType.MANUAL,
        LocationType.WHAT3WORDS,
    ] as const
).map((value) => ({
    value,
    label: LOCATION_TYPE_LABEL[value],
}));

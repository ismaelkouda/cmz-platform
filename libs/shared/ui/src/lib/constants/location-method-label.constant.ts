import { LocationMethod } from '@cmz/shared-domain';

/** Clés i18n des libellés méthode de localisation — présentation pure. */
export const LOCATION_METHOD_LABEL: Record<LocationMethod, string> = {
    [LocationMethod.AUTO]: 'COMMON.AUTO',
    [LocationMethod.MANUAL]: 'COMMON.MANUAL',
    [LocationMethod.UNKNOWN]: 'COMMON.UNKNOWN',
};

/** Options filtre / select (sans unknown). */
export const LOCATION_METHOD_OPTIONS = (
    [LocationMethod.AUTO, LocationMethod.MANUAL] as const
).map((value) => ({
    value,
    label: LOCATION_METHOD_LABEL[value],
}));

import { Platform } from '@cmz/shared-domain';

/** Clés i18n des libellés plateforme — présentation pure. */
export const PLATFORM_LABEL: Record<Platform, string> = {
    [Platform.MOBILE]: 'COMMON.MOBILE',
    [Platform.WEB]: 'COMMON.WEB',
    [Platform.PWA]: 'COMMON.PWA',
};

/**
 * Clés i18n des tokens de style badge (ex. "info") — hors domaine.
 * Ne pas confondre avec PLATFORM_LABEL.
 */
export const PLATFORM_STYLE: Record<Platform, string> = {
    [Platform.MOBILE]: 'COMMON.MOBILE_STYLE',
    [Platform.WEB]: 'COMMON.WEB_STYLE',
    [Platform.PWA]: 'COMMON.PWA_STYLE',
};

/** Options filtre / select — même précédent que REPORT_TYPE_OPTIONS. */
export const PLATFORM_OPTIONS = (Object.values(Platform) as Platform[]).map(
    (value) => ({
        value,
        label: PLATFORM_LABEL[value],
    })
);

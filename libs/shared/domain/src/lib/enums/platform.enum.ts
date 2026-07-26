/**
 * Canal client cible — codes stables = wire API.
 * Labels / styles badge : @cmz/shared-ui (PLATFORM_LABEL, PLATFORM_STYLE).
 */
export const Platform = {
    MOBILE: 'mobile',
    WEB: 'web',
    PWA: 'pwa',
} as const;

export type Platform = (typeof Platform)[keyof typeof Platform];

const PLATFORM_VALUES = new Set<string>(Object.values(Platform));

export function isPlatform(value: string): value is Platform {
    return PLATFORM_VALUES.has(value);
}

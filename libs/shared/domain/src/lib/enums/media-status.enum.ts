/**
 * Statut média — codes stables métier.
 * Wire API = boolean (MediaStatusDto) ; mapping dans @cmz/shared-data.
 * Labels : @cmz/shared-ui.
 */
export const MediaStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

export type MediaStatus = (typeof MediaStatus)[keyof typeof MediaStatus];

const VALUES = new Set<string>(Object.values(MediaStatus));

export function isMediaStatus(value: string): value is MediaStatus {
    return VALUES.has(value);
}

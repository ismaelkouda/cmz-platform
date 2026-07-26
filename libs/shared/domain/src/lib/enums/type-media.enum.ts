/**
 * Type de média — codes stables = wire API.
 * Labels : @cmz/shared-ui.
 */
export const TypeMedia = {
    IMAGE: 'image',
    VIDEO: 'video',
} as const;

export type TypeMedia = (typeof TypeMedia)[keyof typeof TypeMedia];

const VALUES = new Set<string>(Object.values(TypeMedia));

export function isTypeMedia(value: string): value is TypeMedia {
    return VALUES.has(value);
}

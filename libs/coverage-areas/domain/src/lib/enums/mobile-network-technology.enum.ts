export const Technology = {
    TWO_G: '2G',
    THREE_G: '3G',
    FOUR_G: '4G',
    FIVE_G: '5G',
} as const;
export type Technology = (typeof Technology)[keyof typeof Technology];

const TECHNOLOGY_VALUES = new Set<string>(Object.values(Technology));

export function isTechnology(value: unknown): value is Technology {
    return typeof value === 'string' && TECHNOLOGY_VALUES.has(value);
}

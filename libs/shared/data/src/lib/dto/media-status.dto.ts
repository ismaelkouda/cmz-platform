export const MediaStatusDto = {
    ACTIVE: true,
    INACTIVE: false,
} as const;

export type MediaStatusDto =
    (typeof MediaStatusDto)[keyof typeof MediaStatusDto];

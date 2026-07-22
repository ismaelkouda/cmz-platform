export const MediaPublishDto = {
    ACTIVE: true,
    INACTIVE: false,
} as const;

export type MediaPublishDto =
    (typeof MediaPublishDto)[keyof typeof MediaPublishDto];

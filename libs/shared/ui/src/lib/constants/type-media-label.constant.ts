import { TypeMedia } from '@cmz/shared-domain';

/** Clés i18n des libellés type média — présentation pure. */
export const TYPE_MEDIA_LABEL: Record<TypeMedia, string> = {
    [TypeMedia.IMAGE]: 'COMMON.IMAGE',
    [TypeMedia.VIDEO]: 'COMMON.VIDEO',
};

/** Options filtre / select. */
export const TYPE_MEDIA_OPTIONS = (Object.values(TypeMedia) as TypeMedia[]).map(
    (value) => ({
        value,
        label: TYPE_MEDIA_LABEL[value],
    })
);

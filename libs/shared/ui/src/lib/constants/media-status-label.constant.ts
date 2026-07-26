import { MediaStatus } from '@cmz/shared-domain';

/** Clés i18n des libellés statut média — présentation pure. */
export const MEDIA_STATUS_LABEL: Record<MediaStatus, string> = {
    [MediaStatus.ACTIVE]: 'COMMON.ACTIVE',
    [MediaStatus.INACTIVE]: 'COMMON.INACTIVE',
};

/** Options filtre / select. */
export const MEDIA_STATUS_OPTIONS = (
    Object.values(MediaStatus) as MediaStatus[]
).map((value) => ({
    value,
    label: MEDIA_STATUS_LABEL[value],
}));

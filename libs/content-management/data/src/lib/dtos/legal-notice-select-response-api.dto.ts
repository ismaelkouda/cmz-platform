import { SimpleResponseDto } from '@cmz/shared-data';

/**
 * `id`/`version` — mêmes champs wire que `LegalNoticeItemApiDto`. Pas de
 * champ `title` sur cette entité (document légal versionné, pas un
 * contenu titré comme `home`/`news`/`slide`).
 */
export interface LegalNoticeSelectItemApiDto {
    id: string;
    version: string;
}

export type LegalNoticeSelectResponseApiDto = SimpleResponseDto<
    LegalNoticeSelectItemApiDto[]
>;

import { SimpleResponseDto } from '@cmz/shared-data';

/**
 * `id`/`version` — mêmes champs wire que `TermsUseItemApiDto`. Pas de champ
 * `title`, comme `legal-notice`/`privacy-policy` (documents légaux
 * versionnés).
 */
export interface TermsUseSelectItemApiDto {
    id: string;
    version: string;
}

export type TermsUseSelectResponseApiDto = SimpleResponseDto<
    TermsUseSelectItemApiDto[]
>;

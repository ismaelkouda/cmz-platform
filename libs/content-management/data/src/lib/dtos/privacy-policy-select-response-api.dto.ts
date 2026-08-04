import { SimpleResponseDto } from '@cmz/shared-data';

/**
 * `id`/`version` — mêmes champs wire que `PrivacyPolicyItemApiDto`. Pas de
 * champ `title`, comme `legal-notice`/`terms-use` (documents légaux
 * versionnés).
 */
export interface PrivacyPolicySelectItemApiDto {
    id: string;
    version: string;
}

export type PrivacyPolicySelectResponseApiDto = SimpleResponseDto<
    PrivacyPolicySelectItemApiDto[]
>;

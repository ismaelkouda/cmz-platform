import { SimpleResponseDto } from '@cmz/shared-data';

/** Pas de `published_at` ici — écart réel liste/détail vérifié dans le DTO source. */
export interface PrivacyPolicyFindOneItemApiDto {
    id: string;
    version: string;
    content: string;
    is_published: boolean;
    created_at: string;
    updated_at: string;
}

export type PrivacyPolicyFindOneResponseApiDto =
    SimpleResponseDto<PrivacyPolicyFindOneItemApiDto>;

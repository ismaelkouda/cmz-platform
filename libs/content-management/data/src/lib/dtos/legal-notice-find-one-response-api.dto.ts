import { SimpleResponseDto } from '@cmz/shared-data';

/** Pas de `published_at` ici — écart réel liste/détail vérifié dans le DTO source. */
export interface LegalNoticeFindOneItemApiDto {
    id: string;
    version: string;
    content: string;
    is_published: boolean;
    created_at: string;
    updated_at: string;
}

export type LegalNoticeFindOneResponseApiDto =
    SimpleResponseDto<LegalNoticeFindOneItemApiDto>;

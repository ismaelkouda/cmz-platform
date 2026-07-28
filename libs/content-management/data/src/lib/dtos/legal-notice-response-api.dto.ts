import { PaginatedResponseDto } from '@cmz/shared-data';

export interface LegalNoticeItemApiDto {
    id: string;
    version: string;
    is_published: boolean;
    created_at: string;
    published_at: string;
    updated_at: string;
}

export type LegalNoticeResponseApiDto =
    PaginatedResponseDto<LegalNoticeItemApiDto>;

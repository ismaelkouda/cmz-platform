import { SimpleResponseDto } from '@cmz/shared-data';

export interface SiteGroupFindOneItemApiDto {
    id: string;
    code: string;
    name: string;
    description: string;
    is_active: boolean;
    created_at?: string;
    updated_at: string;
}

export type SiteGroupFindOneResponseApiDto =
    SimpleResponseDto<SiteGroupFindOneItemApiDto>;

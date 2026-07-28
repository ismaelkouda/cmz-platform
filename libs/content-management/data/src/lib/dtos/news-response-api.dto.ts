import { PaginatedResponseDto, SelectDto } from '@cmz/shared-data';

export interface NewsItemApiDto {
    id: string;
    type: string;
    title: string;
    category?: SelectDto;
    sub_category?: SelectDto;
    is_published: boolean;
    created_at: string;
    updated_at: string;
}

export type NewsResponseApiDto = PaginatedResponseDto<NewsItemApiDto>;

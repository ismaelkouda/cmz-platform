import { PaginatedResponseDto } from '@cmz/shared-data';

export interface SlideItemApiDto {
    id: string;
    type: string;
    title: string;
    subtitle: string;
    order: number;
    platforms: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export type SlideResponseApiDto = PaginatedResponseDto<SlideItemApiDto>;

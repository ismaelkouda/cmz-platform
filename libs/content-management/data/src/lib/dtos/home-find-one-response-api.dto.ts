import { SimpleResponseDto } from '@cmz/shared-data';

export interface HomeFindOneItemApiDto {
    id: string;
    title: string;
    resume: string;
    image_url: string;
    order: number;
    platforms: string[];
    content: string;
    time_duration_in_seconds: number;
    button_label: string;
    button_url: string;
    is_active: boolean;
    start_date: string;
    end_date: string;
    created_at: string;
    updated_at: string;
}

export type HomeFindOneResponseApiDto =
    SimpleResponseDto<HomeFindOneItemApiDto>;

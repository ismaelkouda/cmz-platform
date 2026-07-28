import { SimpleResponseDto } from '@cmz/shared-data';

export interface SlideFindOneItemApiDto {
    id: string;
    is_active: boolean;
    order: number;
    time_duration_in_seconds: number;
    type: string;
    image_url: string;
    video_url: string;
    platforms: string[];
    start_date: string;
    end_date: string;
    title: string;
    subtitle: string;
    content: string;
    button_label?: string;
    button_url?: string;
    created_at: string;
    updated_at: string;
}

export type SlideFindOneResponseApiDto =
    SimpleResponseDto<SlideFindOneItemApiDto>;

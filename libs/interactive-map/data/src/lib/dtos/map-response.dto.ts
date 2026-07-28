import { SimpleResponseDto } from '@cmz/shared-data';

export interface MapItemDto {
    mapLink?: string;
    map_link?: string;
}

export type MapResponseDto = SimpleResponseDto<MapItemDto>;

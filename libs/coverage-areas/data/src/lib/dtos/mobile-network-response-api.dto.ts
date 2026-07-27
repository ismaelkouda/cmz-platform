import { PaginatedResponseDto } from '@cmz/shared-data';

export interface MobileNetworkItemApiDto {
    id: string;
    site_id: string;
    site_name: string;
    tower_type_id: string;
    tower_type_name: string;
    tower_size: number;
    technology: string[] | string;
    operator: string;
    radius?: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export type MobileNetworkResponseApiDto =
    PaginatedResponseDto<MobileNetworkItemApiDto>;

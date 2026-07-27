import { PaginatedResponseDto } from '@cmz/shared-data';

export interface OpticalFiberNetworkItemApiDto {
    id: string;
    name: string;
    operator: string;
    fiber_constructor_id: string | number;
    fiber_constructor_name: string;
    type: string;
    is_active: boolean;
    created_at?: string;
    updated_at: string;
}

export type OpticalFiberNetworkResponseApiDto =
    PaginatedResponseDto<OpticalFiberNetworkItemApiDto>;

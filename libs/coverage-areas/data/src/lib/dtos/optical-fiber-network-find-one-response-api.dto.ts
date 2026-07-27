import { SimpleResponseDto } from '@cmz/shared-data';

export interface OpticalFiberNetworkFindOneItemApiDto {
    id: string;
    name: string;
    operator: string;
    fiber_constructor_id: string;
    fiber_constructor_name: string;
    type: string;
    geom_url?: string;
    geom_file_url?: string;
    geom?: object;
    created_at?: string;
    updated_at: string;
}

export type OpticalFiberNetworkFindOneResponseApiDto =
    SimpleResponseDto<OpticalFiberNetworkFindOneItemApiDto>;

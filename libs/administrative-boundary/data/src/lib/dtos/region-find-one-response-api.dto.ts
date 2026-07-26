import { SimpleResponseDto } from '@cmz/shared-data';

export interface RegionFindOneItemApiDto {
    id: string;
    name: string;
    code: string;
    description: string;
    population_size: number;
    infrastructure_size: number;
    departments_count: number;
    municipalities_count: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export type RegionFindOneResponseApiDto =
    SimpleResponseDto<RegionFindOneItemApiDto>;

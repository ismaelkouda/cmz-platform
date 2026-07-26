import { PaginatedResponseDto } from '@cmz/shared-data';

export interface DepartmentsByRegionIdItemApiDto {
    id: string;
    name: string;
    code: string;
    description: string;
    population_size: number;
    municipalities_count: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export type DepartmentsByRegionIdResponseApiDto =
    PaginatedResponseDto<DepartmentsByRegionIdItemApiDto>;

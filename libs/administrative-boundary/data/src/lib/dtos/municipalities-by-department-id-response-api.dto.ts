import { PaginatedResponseDto } from '@cmz/shared-data';

export interface MunicipalitiesByDepartmentIdItemApiDto {
    id: string;
    name: string;
    code: string;
    description: string;
    population_size: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export type MunicipalitiesByDepartmentIdResponseApiDto =
    PaginatedResponseDto<MunicipalitiesByDepartmentIdItemApiDto>;

import {
    AdministrativeBoundaryDto,
    PaginatedResponseDto,
} from '@cmz/shared-data';

export interface DepartmentItemApiDto {
    id: string;
    name: string;
    code: string;
    description: string;
    region: AdministrativeBoundaryDto;
    population_size: number;
    infrastructure_size: number;
    municipalities_count: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export type DepartmentResponseApiDto =
    PaginatedResponseDto<DepartmentItemApiDto>;

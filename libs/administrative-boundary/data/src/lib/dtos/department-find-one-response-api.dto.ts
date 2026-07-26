import { AdministrativeBoundaryDto, SimpleResponseDto } from '@cmz/shared-data';

export interface DepartmentFindOneItemApiDto {
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

export type DepartmentFindOneResponseApiDto =
    SimpleResponseDto<DepartmentFindOneItemApiDto>;

import { AdministrativeBoundaryDto, SimpleResponseDto } from '@cmz/shared-data';

export interface MunicipalityFindOneItemApiDto {
    id: string;
    name: string;
    code: string;
    description: string;
    region: AdministrativeBoundaryDto;
    department: AdministrativeBoundaryDto;
    population_size: number;
    infrastructure_size: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export type MunicipalityFindOneResponseApiDto =
    SimpleResponseDto<MunicipalityFindOneItemApiDto>;

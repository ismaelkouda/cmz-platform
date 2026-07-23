import {
    AdministrativeBoundaryDto,
    PaginatedResponseDto,
} from '@cmz/shared-data';

export interface InfrastructureItemApiDto {
    id: string;
    name: string;
    infrastructure_type: string;
    description: string;
    region: AdministrativeBoundaryDto;
    department: AdministrativeBoundaryDto;
    municipality: AdministrativeBoundaryDto;
    position: string;
    created_at: string;
    updated_at: string;
}

export type InfrastructureResponseApiDto =
    PaginatedResponseDto<InfrastructureItemApiDto>;

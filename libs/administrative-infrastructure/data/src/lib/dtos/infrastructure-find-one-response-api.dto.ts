import { AdministrativeBoundaryDto, SimpleResponseDto } from '@cmz/shared-data';

export interface InfrastructureFindOneItemApiDto {
    id: string;
    name: string;
    type: string;
    description: string;
    region: AdministrativeBoundaryDto;
    department: AdministrativeBoundaryDto;
    municipality: AdministrativeBoundaryDto;
    position: string;
    lat: string;
    long: string;
    created_at: string;
    updated_at: string;
}

export type InfrastructureFindOneResponseApiDto =
    SimpleResponseDto<InfrastructureFindOneItemApiDto>;

import { Service } from '@angular/core';
import { AdministrativeBoundaryEntity } from '@cmz/shared-domain';
import { AdministrativeBoundaryDto } from '../dtos/administrative-boundary.dto';

@Service()
export class AdministrativeBoundaryMapper {
    mapToEntity(
        dtoValue: AdministrativeBoundaryDto | null
    ): AdministrativeBoundaryEntity | null {
        if (!dtoValue) {
            return null;
        }
        return new AdministrativeBoundaryEntity(
            dtoValue.id,
            dtoValue.name,
            dtoValue.code
        );
    }

    mapToDto(
        entityValue: AdministrativeBoundaryEntity | null
    ): AdministrativeBoundaryDto | null {
        if (!entityValue) {
            return null;
        }
        return {
            id: entityValue.id,
            name: entityValue.name,
            code: entityValue.code,
        };
    }
}

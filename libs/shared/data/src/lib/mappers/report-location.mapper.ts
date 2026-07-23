import { Service } from '@angular/core';
import { ReportLocationEntity } from '@cmz/shared-domain';
import { ReportLocationDto } from '../dtos/report-location.dto';

@Service()
export class ReportLocationMapper {
    mapToEntity(
        dtoValue: ReportLocationDto | null
    ): ReportLocationEntity | null {
        if (!dtoValue) {
            return null;
        }
        return new ReportLocationEntity(
            dtoValue.coordinates,
            dtoValue.method,
            dtoValue.type,
            dtoValue.name,
            dtoValue.description
        );
    }

    mapToDto(
        entityValue: ReportLocationEntity | null
    ): ReportLocationDto | null {
        if (!entityValue) {
            return null;
        }
        return {
            coordinates: entityValue.coordinates,
            method: entityValue.method,
            type: entityValue.type,
            name: entityValue.name,
            description: entityValue.description,
        };
    }
}

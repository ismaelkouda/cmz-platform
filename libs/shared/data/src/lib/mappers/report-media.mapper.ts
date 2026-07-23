import { Service } from '@angular/core';
import { ReportMediaEntity } from '@cmz/shared-domain';
import { ReportMediaDto } from '../dtos/report-media.dto';

@Service()
export class ReportMediaMapper {
    mapToEntity(dtoValue: ReportMediaDto | null): ReportMediaEntity | null {
        if (!dtoValue) {
            return null;
        }
        return new ReportMediaEntity(
            dtoValue.place_photo,
            dtoValue.access_place_photo
        );
    }

    mapToDto(entityValue: ReportMediaEntity | null): ReportMediaDto | null {
        if (!entityValue) {
            return null;
        }
        return {
            place_photo: entityValue.placePhoto,
            access_place_photo: entityValue.accessPlacePhoto,
        };
    }
}

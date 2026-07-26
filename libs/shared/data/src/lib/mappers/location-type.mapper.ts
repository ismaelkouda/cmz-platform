import { Service } from '@angular/core';
import { isLocationType, LocationType } from '@cmz/shared-domain';
import { LocationTypeDto } from '../dtos/location-type.dto';
import { ApiError } from '../errors/api.error';

@Service()
export class LocationTypeMapper {
    mapFromDto(dto: LocationTypeDto | null | undefined): LocationType {
        if (dto == null) {
            return LocationType.UNKNOWN;
        }
        if (!isLocationType(dto)) {
            throw ApiError.invalidResponse(
                `LocationType wire inconnue: ${String(dto)}`
            );
        }
        return dto;
    }

    mapToDto(value: LocationType | null | undefined): LocationTypeDto {
        if (value == null) {
            return LocationTypeDto.UNKNOWN;
        }
        return value as LocationTypeDto;
    }

    parse(raw: string): LocationType {
        if (!isLocationType(raw)) {
            throw ApiError.invalidResponse(
                `LocationType wire inconnue: ${raw}`
            );
        }
        return raw;
    }
}

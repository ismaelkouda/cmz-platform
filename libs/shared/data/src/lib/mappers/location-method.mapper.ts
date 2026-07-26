import { Service } from '@angular/core';
import { isLocationMethod, LocationMethod } from '@cmz/shared-domain';
import { LocationMethodDto } from '../dtos/location-method.dto';
import { ApiError } from '../errors/api.error';

@Service()
export class LocationMethodMapper {
    mapFromDto(dto: LocationMethodDto | null | undefined): LocationMethod {
        if (dto == null) {
            return LocationMethod.UNKNOWN;
        }
        if (!isLocationMethod(dto)) {
            throw ApiError.invalidResponse(
                `LocationMethod wire inconnue: ${String(dto)}`
            );
        }
        return dto;
    }

    mapToDto(value: LocationMethod | null | undefined): LocationMethodDto {
        if (value == null) {
            return LocationMethodDto.UNKNOWN;
        }
        return value as LocationMethodDto;
    }

    parse(raw: string): LocationMethod {
        if (!isLocationMethod(raw)) {
            throw ApiError.invalidResponse(
                `LocationMethod wire inconnue: ${raw}`
            );
        }
        return raw;
    }
}

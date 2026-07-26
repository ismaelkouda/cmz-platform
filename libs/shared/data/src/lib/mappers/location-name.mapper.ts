import { Service } from '@angular/core';
import { LocationName } from '@cmz/shared-domain';
import { LocationNameDto } from '../dtos/location-name.dto';
import { ApiError } from '../errors/api.error';

@Service()
export class LocationNameMapper {
    private static readonly FROM_WIRE: Record<LocationNameDto, LocationName> = {
        [LocationNameDto.RESIDENCE_PLACE]: LocationName.RESIDENCE_PLACE,
        [LocationNameDto.ACTIVITY_PLACE]: LocationName.ACTIVITY_PLACE,
        [LocationNameDto.TRANSIT_PLACE]: LocationName.TRANSIT_PLACE,
        [LocationNameDto.PLACE_NOT_PROVIDED]: LocationName.PLACE_NOT_PROVIDED,
    };

    private static readonly TO_WIRE: Record<LocationName, LocationNameDto> = {
        [LocationName.RESIDENCE_PLACE]: LocationNameDto.RESIDENCE_PLACE,
        [LocationName.ACTIVITY_PLACE]: LocationNameDto.ACTIVITY_PLACE,
        [LocationName.TRANSIT_PLACE]: LocationNameDto.TRANSIT_PLACE,
        [LocationName.PLACE_NOT_PROVIDED]: LocationNameDto.PLACE_NOT_PROVIDED,
    };

    mapFromDto(dto: LocationNameDto): LocationName {
        const name = LocationNameMapper.FROM_WIRE[dto];
        if (!name) {
            throw ApiError.invalidResponse(
                `LocationName wire inconnue: ${dto}`
            );
        }
        return name;
    }

    mapToDto(value: LocationName): LocationNameDto {
        return LocationNameMapper.TO_WIRE[value];
    }

    /** Parse tolérant : wire FR ou code métier (pour forms / query params). */
    parse(raw: string): LocationName {
        const fromWire = LocationNameMapper.FROM_WIRE[raw as LocationNameDto];
        if (fromWire) {
            return fromWire;
        }
        if (Object.values(LocationName).includes(raw as LocationName)) {
            return raw as LocationName;
        }
        throw ApiError.invalidResponse(`LocationName inconnue: ${raw}`);
    }
}

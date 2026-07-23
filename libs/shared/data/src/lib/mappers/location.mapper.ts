import { Service, inject } from '@angular/core';
import { ReportLocationEntity } from '@cmz/shared-domain';
import { LocationMethodDto } from '../dtos/location-method.dto';
import { LocationTypeDto } from '../dtos/location-type.dto';
import { LocationMethodMapper } from './location-method.mapper';
import { LocationTypeMapper } from './location-type.mapper';

interface RawLocationDto {
    lat: string;
    long: string;
    what3words: string;
    location_method: LocationMethodDto;
    location_type: LocationTypeDto;
    location_name: string;
    place_description: string;
}

@Service()
export class LocationMapper {
    private readonly locationMethodMapper = inject(LocationMethodMapper);
    private readonly locationTypeMapper = inject(LocationTypeMapper);

    mapToEntity(dto: RawLocationDto): ReportLocationEntity {
        return new ReportLocationEntity(
            {
                latitude: this.parseCoordinate(dto.lat),
                longitude: this.parseCoordinate(dto.long),
                what3words: dto.what3words,
            },
            this.locationMethodMapper.mapToEnum(dto.location_method),
            this.locationTypeMapper.mapToEnum(dto.location_type),
            dto.location_name,
            dto.place_description
        );
    }

    private parseCoordinate(coord: string): number {
        const parsed = Number.parseFloat(coord);
        return Number.isNaN(parsed) ? 0 : parsed;
    }
}

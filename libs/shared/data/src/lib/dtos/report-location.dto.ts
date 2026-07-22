import {
    CoordinatesProps,
    LocationMethod,
    LocationType,
} from '@cmz/shared-domain';

export interface ReportLocationDto {
    coordinates: CoordinatesProps;
    method: LocationMethod;
    type: LocationType;
    name: string;
    description: string;
}

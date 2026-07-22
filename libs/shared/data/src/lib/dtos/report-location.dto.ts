import { Coordinates, LocationMethod, LocationType } from '@cmz/shared-domain';

export interface ReportLocationDto {
    coordinates: Coordinates;
    method: LocationMethod;
    type: LocationType;
    name: string;
    description: string;
}

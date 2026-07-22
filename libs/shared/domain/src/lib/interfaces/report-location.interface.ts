import { LocationMethod } from '../enums/location-method.enum';
import { LocationType } from '../enums/location-type.enum';
import { Coordinates } from './coordinates.interface';

export interface ReportLocation {
    coordinates: Coordinates;
    method: LocationMethod;
    type: LocationType;
    name: string;
    description: string;
}

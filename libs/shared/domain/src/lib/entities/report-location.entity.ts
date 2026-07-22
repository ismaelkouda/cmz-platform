import { LocationMethod } from '../enums/location-method.enum';
import { LocationType } from '../enums/location-type.enum';
import { Coordinates } from '../interfaces/coordinates.interface';

interface ReportLocation {
    coordinates: Coordinates;
    method: LocationMethod;
    type: LocationType;
    name: string;
    description: string;
}

export class ReportLocationEntity implements ReportLocation {
    constructor(
        public readonly coordinates: Coordinates,
        public readonly method: LocationMethod,
        public readonly type: LocationType,
        public readonly name: string,
        public readonly description: string
    ) {}
}

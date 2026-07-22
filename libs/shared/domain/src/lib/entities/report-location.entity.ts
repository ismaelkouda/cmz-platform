import { LocationMethod } from '../enums/location-method.enum';
import { LocationType } from '../enums/location-type.enum';
import { Coordinates } from '../interfaces/coordinates.interface';
import { ReportLocation } from '../interfaces/report-location.interface';

export class ReportLocationEntity implements ReportLocation {
    constructor(
        public readonly coordinates: Coordinates,
        public readonly method: LocationMethod,
        public readonly type: LocationType,
        public readonly name: string,
        public readonly description: string
    ) {}
}

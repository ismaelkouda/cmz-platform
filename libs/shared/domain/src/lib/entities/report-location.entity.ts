import { LocationMethod } from '../enums/location-method.enum';
import { LocationType } from '../enums/location-type.enum';
import { CoordinatesProps } from '../props/coordinates.props';
import { ReportLocationProps } from '../props/report-location.props';

export class ReportLocationEntity implements ReportLocationProps {
    constructor(
        public readonly coordinates: CoordinatesProps,
        public readonly method: LocationMethod,
        public readonly type: LocationType,
        public readonly name: string,
        public readonly description: string
    ) {}
}

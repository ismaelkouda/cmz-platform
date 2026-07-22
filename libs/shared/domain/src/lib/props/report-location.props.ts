import { LocationMethod } from '../enums/location-method.enum';
import { LocationType } from '../enums/location-type.enum';
import { CoordinatesProps } from './coordinates.props';

export interface ReportLocationProps {
    coordinates: CoordinatesProps;
    method: LocationMethod;
    type: LocationType;
    name: string;
    description: string;
}

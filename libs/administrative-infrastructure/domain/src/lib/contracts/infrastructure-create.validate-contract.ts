import { CoordinatesProps } from '@cmz/shared-domain';

export interface InfrastructureCreateValidateContract {
    name: string;
    type: string;
    position: CoordinatesProps;
    description: string;
}

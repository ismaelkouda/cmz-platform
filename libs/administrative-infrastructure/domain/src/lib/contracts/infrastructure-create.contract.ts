import { CoordinatesProps } from '@cmz/shared-domain';

export interface InfrastructureCreateContract {
    name?: string;
    type?: string;
    position?: CoordinatesProps;
    description?: string;
}

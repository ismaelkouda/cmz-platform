import { CoordinatesProps } from '@cmz/shared-domain';

export interface InfrastructureUpdateContract {
    uniqId?: string;
    name?: string;
    type?: string;
    position?: CoordinatesProps;
    description?: string;
}

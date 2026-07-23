import { CoordinatesProps } from '@cmz/shared-domain';

export interface InfrastructureUpdateValidateContract {
    uniqId: string;
    name: string;
    type: string;
    position: CoordinatesProps;
    description: string;
}

import { Status } from '../enums/infrastructure-type-status.enum';

export interface InfrastructureTypeProps {
    uniqId: string;
    name: string;
    description: string;
    status: Status;
    updatedAt: string;
}

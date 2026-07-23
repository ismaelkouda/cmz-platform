import { Status } from '../enums/infrastructure-type-status.enum';

export interface InfrastructureTypeFilterContract {
    search?: string;
    status?: Status;
    startDate?: Date;
    endDate?: Date;
}

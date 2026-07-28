import { AccessLogsAction } from '../enums/access-logs-action.enum';

export interface AccessLogsFilterContract {
    search?: string;
    action?: AccessLogsAction;
    startDate?: Date;
    endDate?: Date;
}

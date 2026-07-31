import { ReportType, TelecomOperator } from '@cmz/shared-domain';

export interface TasksFinalizationFilterContract {
    initiatorPhoneNumber?: string;
    uniqId?: string;
    reportType?: ReportType;
    operators?: TelecomOperator[];
    source?: string;
    startDate?: Date;
    endDate?: Date;
}

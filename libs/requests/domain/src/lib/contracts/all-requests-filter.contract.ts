import { ReportType, TelecomOperator } from '@cmz/shared-domain';
import { RequestsAllStatus } from '../enums/requests-all-status.enum';

export interface AllRequestsFilterContract {
    initiatorPhoneNumber?: string;
    uniqId?: string;
    reportType?: ReportType;
    operators?: TelecomOperator[];
    source?: string;
    startDate?: Date;
    endDate?: Date;
    status?: RequestsAllStatus;
}

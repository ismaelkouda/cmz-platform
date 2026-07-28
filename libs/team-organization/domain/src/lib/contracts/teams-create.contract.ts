import { ReportType, TelecomOperator } from '@cmz/shared-domain';

export interface TeamsCreateContract {
    name?: string;
    description?: string;
    reportTypes?: ReportType[];
    operators?: TelecomOperator[];
    permissions?: string[];
}

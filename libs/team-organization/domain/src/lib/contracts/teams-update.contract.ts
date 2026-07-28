import { ReportType, TelecomOperator } from '@cmz/shared-domain';

export interface TeamsUpdateContract {
    uniqId?: string;
    name?: string;
    description?: string;
    reportTypes?: ReportType[];
    operators?: TelecomOperator[];
    permissions?: string[];
}

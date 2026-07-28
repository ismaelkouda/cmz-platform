import { ReportType, TelecomOperator } from '@cmz/shared-domain';

export interface TeamsUpdateValidateContract {
    uniqId: string;
    name: string;
    description: string;
    reportTypes: ReportType[];
    operators: TelecomOperator[];
    permissions?: string[];
}

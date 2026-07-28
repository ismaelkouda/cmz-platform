import { ReportType, TelecomOperator } from '@cmz/shared-domain';

export interface TeamsCreateValidateContract {
    name: string;
    description: string;
    reportTypes: ReportType[];
    operators: TelecomOperator[];
    permissions?: string[];
}

import { SimpleResponseDto } from '@cmz/shared-data';

export interface ReportingVariablesItemDto {
    reportReportingLink: string;
    requestReportReportingLink: string;
    reportByChannel: string;
    reportByOperator: string;
}

export type ReportingVariablesResponseDto =
    SimpleResponseDto<ReportingVariablesItemDto>;

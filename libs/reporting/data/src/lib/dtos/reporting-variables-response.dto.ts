import { SimpleResponseDto } from '@cmz/shared-data';

export interface ReportingVariablesItemDto {
    readonly reportReportingLink: string;
    readonly requestReportReportingLink: string;
    readonly reportByChannel: string;
    readonly reportByOperator: string;
}

export type ReportingVariablesResponseDto =
    SimpleResponseDto<ReportingVariablesItemDto>;

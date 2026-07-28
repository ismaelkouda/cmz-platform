import { PaginatedResponseDto } from '@cmz/shared-data';

export interface ReportStateItemApiDto {
    id: string;
    uniq_id?: string;
    report_type?: string;
    operator?: string;
    source?: string;
    created_at?: string;
    status?: string;
}

export type ReportStatesResponseDto =
    PaginatedResponseDto<ReportStateItemApiDto>;

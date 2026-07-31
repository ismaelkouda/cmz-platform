import {
    PaginatedResponseDto,
    ReportSourceDto,
    ReportTypeDto,
    TelecomOperatorDto,
} from '@cmz/shared-data';

/** Wire — item liste volet « Tous » (`AllItemApiDto` legacy). */
export interface AllProcessingItemApiDto {
    uniq_id: string;
    report_type: ReportTypeDto;
    operators: TelecomOperatorDto[];
    source: ReportSourceDto;
    initiator_phone_number: string;
    reported_at: string;
    updated_at: string;
}

export type AllProcessingResponseDto =
    PaginatedResponseDto<AllProcessingItemApiDto>;

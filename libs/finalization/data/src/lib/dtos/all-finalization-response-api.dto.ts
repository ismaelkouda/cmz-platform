import {
    PaginatedResponseDto,
    ReportSourceDto,
    ReportTypeDto,
    TelecomOperatorDto,
} from '@cmz/shared-data';

/** Wire — item liste volet « Demandes qualifiées » (`AllItemApiDto` legacy). */
export interface AllFinalizationItemApiDto {
    uniq_id: string;
    report_type: ReportTypeDto;
    operators: TelecomOperatorDto[];
    source: ReportSourceDto;
    initiator_phone_number: string;
    reported_at: string;
    updated_at: string;
}

export type AllFinalizationResponseDto =
    PaginatedResponseDto<AllFinalizationItemApiDto>;

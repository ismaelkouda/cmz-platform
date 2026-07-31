import {
    PaginatedResponseDto,
    ReportSourceDto,
    ReportTypeDto,
    TelecomOperatorDto,
} from '@cmz/shared-data';

/** Wire — item liste volet « Tâches » (`TasksItemApiDto` legacy). */
export interface TasksFinalizationItemApiDto {
    uniq_id: string;
    report_type: ReportTypeDto;
    operators: TelecomOperatorDto[];
    source: ReportSourceDto;
    initiator_phone_number: string;
    reported_at: string;
    updated_at: string;
}

export type TasksFinalizationResponseDto =
    PaginatedResponseDto<TasksFinalizationItemApiDto>;

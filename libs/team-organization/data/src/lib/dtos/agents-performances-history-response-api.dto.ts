import { PaginatedResponseDto } from '@cmz/shared-data';

/** Wire — item liste `agents-performances-history` (`AgentsPerformancesFindOneItemApiDto` legacy). */
export interface AgentsPerformancesHistoryItemApiDto {
    uniq_id: string;
    report_type: string;
    operators: string;
    source: string;
    initiator_phone_number: string;
    created_at: string;
    updated_at: string;
}

export type AgentsPerformancesHistoryResponseApiDto =
    PaginatedResponseDto<AgentsPerformancesHistoryItemApiDto>;

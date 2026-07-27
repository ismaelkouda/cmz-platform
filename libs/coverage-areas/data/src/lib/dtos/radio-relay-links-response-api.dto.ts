import { PaginatedResponseDto } from '@cmz/shared-data';

export interface RadioRelayLinksItemApiDto {
    id: string;
    name: string;
    operator: string;
    frequency: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export type RadioRelayLinksResponseApiDto =
    PaginatedResponseDto<RadioRelayLinksItemApiDto>;

import { SimpleResponseDto } from '@cmz/shared-data';

export interface RadioRelayLinksFindOneItemApiDto {
    id: string;
    name: string;
    operator: string;
    frequency: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    geom_url?: string;
    geom?: object;
}

export type RadioRelayLinksFindOneResponseApiDto =
    SimpleResponseDto<RadioRelayLinksFindOneItemApiDto>;

import { PaginatedResponseDto } from '@cmz/shared-data';
import { NotificationsStatusApiDto } from './notifications-status-api.dto';
import { TypeReportApiDto } from './notifications-type-report-api.dto';

export interface NotificationsItemApiDto {
    id: string;
    reference: string;
    title: string;
    type: string;
    message: string;
    status: NotificationsStatusApiDto;
    model_id: string;
    model_type: TypeReportApiDto;
    sent_at: string;
    updated_at: string;
}

export type NotificationsResponseApiDto =
    PaginatedResponseDto<NotificationsItemApiDto>;

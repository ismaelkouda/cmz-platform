import {
    PaginatedResponseDto,
    SimpleResponseDto,
    TelecomOperatorDto,
} from '@cmz/shared-data';
import { ActorDto } from '@cmz/shared-data';

export type TasksActionsConformityApiDto =
    'conform' | 'non-conform' | 'in-progress' | 'unknown';

export interface TasksActionsItemApiDto {
    id: string;
    date: string;
    type: string;
    type_code: string;
    operator: TelecomOperatorDto;
    description: string;
    should_notify_user: boolean;
    auto_check: boolean;
    result: TasksActionsConformityApiDto;
    created_by: ActorDto;
    updated_by: ActorDto;
    created_at: string;
    updated_at: string;
}

export type TasksActionsResponseDto =
    PaginatedResponseDto<TasksActionsItemApiDto>;

export interface TasksActionsFilterApiDto {
    report_uniq_id: string;
}

export interface TasksActionsStoreApiDto {
    report_uniq_id: string;
    date: Date | string;
    type_code: string;
    operator: string;
    description: string;
    should_notify_user: boolean;
    result: TasksActionsConformityApiDto;
}

export type TasksActionsCreateApiDto = TasksActionsStoreApiDto;

export interface TasksActionsUpdateApiDto extends TasksActionsStoreApiDto {
    uniq_id: string;
}

export interface TasksActionsDeleteApiDto {
    uniq_id: string;
}

export interface TasksActionsTypeItemApiDto {
    code: string;
    name: string;
    operators: TelecomOperatorDto[];
}

export type TasksActionsTypeResponseDto = SimpleResponseDto<
    TasksActionsTypeItemApiDto[]
>;

export interface TasksActionsTypeFilterApiDto {
    id: string;
}

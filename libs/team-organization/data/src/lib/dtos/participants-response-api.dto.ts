import { PaginatedResponseDto, RolesDto, SelectDto } from '@cmz/shared-data';

export interface ParticipantsItemApiDto {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    role: RolesDto | null;
    team: SelectDto | null;
    status: string;
    created_at: string;
    updated_at: string;
}

export type ParticipantsResponseApiDto =
    PaginatedResponseDto<ParticipantsItemApiDto>;

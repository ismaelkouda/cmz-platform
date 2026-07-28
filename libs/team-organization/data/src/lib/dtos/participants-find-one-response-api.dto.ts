import { RolesDto, SelectDto, SimpleResponseDto } from '@cmz/shared-data';

/** Pas de `status` ni `created_at` dans le détail source — fidèle au wire. */
export interface ParticipantsFindOneItemApiDto {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    role: RolesDto | null;
    team: SelectDto | null;
    updated_at: string;
}

export type ParticipantsFindOneResponseApiDto =
    SimpleResponseDto<ParticipantsFindOneItemApiDto>;

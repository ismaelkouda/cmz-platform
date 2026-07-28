import { RolesDto } from '@cmz/shared-data';

export interface ParticipantsUpdateApiDto {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    role?: RolesDto;
    team_uniq_id?: string;
}

import { PaginatedResponseDto } from '@cmz/shared-data';
import { RolesDto } from '@cmz/shared-data';
import { UsersStatusApiDto } from './users-status-api.dto';

/**
 * `profile` porte le NOM ici (liste) — diverge du détail
 * (`UsersFindOneItemApiDto.profile_id`, id) ; même précédent que
 * `team-organization/participants.team` et `content-management/news.category`.
 */
export interface UsersItemApiDto {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    profile: string;
    role: RolesDto | null;
    status: UsersStatusApiDto;
    created_at: string;
    updated_at: string;
}

export type UsersResponseApiDto = PaginatedResponseDto<UsersItemApiDto>;

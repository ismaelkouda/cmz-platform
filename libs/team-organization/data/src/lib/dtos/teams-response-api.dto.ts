import { PaginatedResponseDto } from '@cmz/shared-data';

/** `slug` présent sur le wire mais non repris au domaine (fidèle au source : aucun getter `slug` sur `TeamsEntity`). */
export interface TeamsItemApiDto {
    uniq_id: string;
    code: string;
    name: string;
    slug: string;
    description: string;
    members_count: string;
    is_active: boolean;
    updated_at: string;
}

export type TeamsResponseApiDto = PaginatedResponseDto<TeamsItemApiDto>;

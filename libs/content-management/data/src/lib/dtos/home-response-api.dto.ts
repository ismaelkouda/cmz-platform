import { PaginatedResponseDto } from '@cmz/shared-data';

/**
 * `platforms` en `string[]` sur le wire (comme `report_types`/`operators`
 * côté `team-organization`) — `Platform` domaine = valeur wire, pas besoin
 * d'un DTO enum dédié ; `isPlatform` filtre à l'entrée (mapper).
 */
export interface HomeItemApiDto {
    id: string;
    title: string;
    resume: string;
    image_url: string;
    order: number;
    platforms: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export type HomeResponseApiDto = PaginatedResponseDto<HomeItemApiDto>;

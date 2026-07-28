import { PaginatedResponseDto } from '@cmz/shared-data';

/**
 * `users_count` est une STRING au wire (bug de typage source, forçant un
 * `Number(...)` en aval) — corrigé en `number` côté domaine
 * (`ProfilesPermissionsProps.usersCount`), converti dans le mapper.
 */
export interface ProfilesPermissionsItemApiDto {
    uniq_id: string;
    name: string;
    slug: string;
    description: string;
    users_count: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export type ProfilesPermissionsResponseApiDto =
    PaginatedResponseDto<ProfilesPermissionsItemApiDto>;

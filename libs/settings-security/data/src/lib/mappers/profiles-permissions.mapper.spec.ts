import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import { ProfilesPermissionsStatus } from '@cmz/settings-security-domain';
import { ProfilesPermissionsMapper } from './profiles-permissions.mapper';
import type { ProfilesPermissionsItemApiDto } from '../dtos/profiles-permissions-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `settings-security`, 4/6 fichiers. Le commentaire du mapper documente un
 * vrai fix par rapport au source : `users_count` est une STRING au wire
 * (bug de typage), convertie en `number` ici (`Number(dto.users_count)`) —
 * vérifié ici pour de vrai, y compris le cas d'une chaîne non numérique.
 */
function makePaginatedResponse(
    items: ProfilesPermissionsItemApiDto[]
): PaginatedResponseDto<ProfilesPermissionsItemApiDto> {
    return {
        error: false,
        message: 'OK',
        data: {
            current_page: 1,
            last_page: 1,
            per_page: 15,
            total: items.length,
            from: 1,
            to: items.length,
            first_page_url: '',
            last_page_url: '',
            next_page_url: '',
            prev_page_url: '',
            path: '',
            links: [],
            data: items,
        },
    };
}

function makeItemDto(
    partial: Partial<ProfilesPermissionsItemApiDto> = {}
): ProfilesPermissionsItemApiDto {
    return {
        uniq_id: 'PROFILE-001',
        name: 'Superviseur régional',
        slug: 'superviseur-regional',
        description: 'Profil de supervision régionale',
        users_count: '12',
        is_active: true,
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

describe('ProfilesPermissionsMapper', () => {
    it('mappe le wire vers ProfilesPermissionsEntity', () => {
        const entity = new ProfilesPermissionsMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('PROFILE-001');
        expect(entity.name).toBe('Superviseur régional');
        expect(entity.slug).toBe('superviseur-regional');
        expect(entity.description).toBe('Profil de supervision régionale');
    });

    it('convertit users_count (string wire) en number (fix vs bug de typage source)', () => {
        const entity = new ProfilesPermissionsMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ users_count: '42' })])
        ).items[0];
        expect(entity.usersCount).toBe(42);
        expect(typeof entity.usersCount).toBe('number');
    });

    it('users_count vaut NaN si la chaîne wire est non numérique (comportement Number(), pas masqué)', () => {
        const entity = new ProfilesPermissionsMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ users_count: 'douze' })])
        ).items[0];
        expect(Number.isNaN(entity.usersCount)).toBe(true);
    });

    it('dérive status ACTIVE/INACTIVE depuis is_active', () => {
        const active = new ProfilesPermissionsMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ is_active: true })])
        ).items[0];
        expect(active.status).toBe(ProfilesPermissionsStatus.ACTIVE);

        const inactive = new ProfilesPermissionsMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ is_active: false })])
        ).items[0];
        expect(inactive.status).toBe(ProfilesPermissionsStatus.INACTIVE);
    });

    it('lève une erreur si uniq_id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            new ProfilesPermissionsMapper().mapFromDto(
                makePaginatedResponse([
                    makeItemDto({ uniq_id: undefined as never }),
                ])
            )
        ).toThrow('Missing required fields: uniq_id');
    });
});

import '@angular/compiler';
import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { RolesDto, RolesMapper, SimpleResponseDto } from '@cmz/shared-data';
import { Role } from '@cmz/shared-domain';
import { UsersFindOneMapper } from './users-find-one.mapper';
import type { UsersFindOneItemApiDto } from '../dtos/users-find-one-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `settings-security`, 2/6 fichiers. Le commentaire du mapper documente un
 * vrai fix par rapport au source : `role` (wire brut dans le source
 * `users-find-one.mapper.ts`, jamais passé par un mapper de rôle,
 * contrairement à la liste) est ici traduit via `RolesMapper`, comme sur
 * `UsersMapper` — élimine une incohérence de typage confirmée en lisant le
 * source. Vérifié ici pour de vrai, pas seulement relu dans le commentaire.
 * `profile` porte l'**ID** ici (détail), pas le nom (≠ liste).
 */
function makeItemDto(
    partial: Partial<UsersFindOneItemApiDto> = {}
): UsersFindOneItemApiDto {
    return {
        id: 'USER-001',
        first_name: 'Awa',
        last_name: 'Traoré',
        email: 'awa.traore@example.com',
        phone: '0102030405',
        profile_id: 'PROFILE-42',
        role: RolesDto['TEAM-LEADER'],
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): UsersFindOneMapper {
    const injector = createEnvironmentInjector(
        [RolesMapper, UsersFindOneMapper],
        null as never
    );
    return injector.get(UsersFindOneMapper);
}

describe('UsersFindOneMapper', () => {
    it('mappe le wire vers UsersFindOneEntity, profile porte l\'ID (vue détail)', () => {
        const dto: SimpleResponseDto<UsersFindOneItemApiDto> = {
            error: false,
            message: '',
            data: makeItemDto(),
        };
        const entity = createMapper().mapFromDto(dto);

        expect(entity.uniqId).toBe('USER-001');
        expect(entity.firstName).toBe('Awa');
        expect(entity.profile).toBe('PROFILE-42');
    });

    it('dérive role via RolesMapper (fix par rapport au source, qui laissait ce champ non traduit)', () => {
        const dto: SimpleResponseDto<UsersFindOneItemApiDto> = {
            error: false,
            message: '',
            data: makeItemDto({ role: RolesDto.SUPERVISOR }),
        };
        expect(createMapper().mapFromDto(dto).role).toBe(Role.SUPERVISOR);
    });

    it('role vaut null quand absent du wire', () => {
        const dto: SimpleResponseDto<UsersFindOneItemApiDto> = {
            error: false,
            message: '',
            data: makeItemDto({ role: null }),
        };
        expect(createMapper().mapFromDto(dto).role).toBeNull();
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        const dto: SimpleResponseDto<UsersFindOneItemApiDto> = {
            error: false,
            message: '',
            data: makeItemDto({ id: undefined as never }),
        };
        expect(() => createMapper().mapFromDto(dto)).toThrow(
            'Missing required fields: id'
        );
    });
});

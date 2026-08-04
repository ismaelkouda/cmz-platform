import '@angular/compiler';
import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto, RolesDto, RolesMapper } from '@cmz/shared-data';
import { Role } from '@cmz/shared-domain';
import { UsersStatus } from '@cmz/settings-security-domain';
import { UsersMapper } from './users.mapper';
import type { UsersItemApiDto } from '../dtos/users-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `settings-security`, 1/6 fichiers. Le commentaire du mapper documente une
 * divergence assumée : `profile` porte le **nom** ici (liste), pas l'id
 * (≠ `UsersFindOneMapper`) — même précédent que
 * `team-organization/participants.team`.
 */
function makePaginatedResponse(
    items: UsersItemApiDto[]
): PaginatedResponseDto<UsersItemApiDto> {
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

function makeItemDto(partial: Partial<UsersItemApiDto> = {}): UsersItemApiDto {
    return {
        id: 'USER-001',
        first_name: 'Awa',
        last_name: 'Traoré',
        email: 'awa.traore@example.com',
        phone: '0102030405',
        profile: 'Superviseur régional',
        role: RolesDto['TEAM-LEADER'],
        status: 'active',
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): UsersMapper {
    const injector = createEnvironmentInjector(
        [RolesMapper, UsersMapper],
        null as never
    );
    return injector.get(UsersMapper);
}

describe('UsersMapper', () => {
    it('mappe le wire vers UsersEntity, profile porte le NOM (vue liste)', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('USER-001');
        expect(entity.firstName).toBe('Awa');
        expect(entity.lastName).toBe('Traoré');
        expect(entity.email).toBe('awa.traore@example.com');
        expect(entity.profile).toBe('Superviseur régional');
    });

    it('dérive role via RolesMapper', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ role: RolesDto.AGENT })])
        ).items[0];
        expect(entity.role).toBe(Role.AGENT);
    });

    it('reporte status tel quel (déjà une valeur UsersStatus valide)', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ status: 'blocked' })])
        ).items[0];
        expect(entity.status).toBe(UsersStatus.BLOCKED);
    });

    it('lève ApiError.invalidResponse si status est une valeur wire inconnue', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([
                    makeItemDto({ status: 'archived' as never }),
                ])
            )
        ).toThrow(/UsersStatus wire inconnue/);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ id: undefined as never })])
            )
        ).toThrow('Missing required fields: id');
    });
});

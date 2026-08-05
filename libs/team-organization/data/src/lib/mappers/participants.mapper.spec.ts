import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto, RolesDto, RolesMapper } from '@cmz/shared-data';
import { Role } from '@cmz/shared-domain';
import { ParticipantsStatus } from '@cmz/team-organization-domain';
import { ParticipantsMapper } from './participants.mapper';
import type { ParticipantsItemApiDto } from '../dtos/participants-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `team-organization`, 4/5 fichiers. Le commentaire du mapper documente une
 * divergence assumée entre liste et détail : ici `team` porte le **nom**
 * de l'équipe (`dto.team?.uniq_id ? dto.team.name : null`), contrairement à
 * `ParticipantsFindOneMapper` qui porte l'**uniqId** — vérifié explicitement
 * ci-dessous pour verrouiller ce comportement documenté.
 */
function makePaginatedResponse(
    items: ParticipantsItemApiDto[]
): PaginatedResponseDto<ParticipantsItemApiDto> {
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
    partial: Partial<ParticipantsItemApiDto> = {}
): ParticipantsItemApiDto {
    return {
        id: 'PART-001',
        first_name: 'Awa',
        last_name: 'Traoré',
        email: 'awa.traore@example.com',
        phone: '0102030405',
        role: RolesDto['TEAM-LEADER'],
        team: { id: 'T-1', uniq_id: 'TEAM-001', name: 'Équipe Littoral' },
        status: 'active',
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): ParticipantsMapper {
    const injector = createEnvironmentInjector(
        [RolesMapper, ParticipantsMapper],
        null as never
    );
    return injector.get(ParticipantsMapper);
}

describe('ParticipantsMapper', () => {
    it('mappe le wire vers ParticipantsEntity', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('PART-001');
        expect(entity.firstName).toBe('Awa');
        expect(entity.lastName).toBe('Traoré');
        expect(entity.email).toBe('awa.traore@example.com');
        expect(entity.phone).toBe('0102030405');
        expect(entity.updatedAt).toBe('2026-07-02T10:00:00Z');
    });

    it("team porte le NOM de l'équipe (pas l'uniqId — diverge du find-one)", () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];
        expect(entity.team).toBe('Équipe Littoral');
    });

    it('team vaut null quand team.uniq_id est absent du wire', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ team: null })])
        ).items[0];
        expect(entity.team).toBeNull();
    });

    it('dérive role via RolesMapper (team-leader wire -> LEADER domaine)', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([
                makeItemDto({ role: RolesDto['TEAM-LEADER'] }),
            ])
        ).items[0];
        expect(entity.role).toBe(Role.LEADER);
    });

    it('role vaut null quand absent du wire', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ role: null })])
        ).items[0];
        expect(entity.role).toBeNull();
    });

    it('reporte status tel quel (déjà une valeur ParticipantsStatus valide)', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ status: 'blocked' })])
        ).items[0];
        expect(entity.status).toBe(ParticipantsStatus.BLOCKED);
    });

    it('lève ApiError.invalidResponse si status est une valeur wire inconnue', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ status: 'archived' })])
            )
        ).toThrow(/ParticipantsStatus wire inconnue/);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ id: undefined as never })])
            )
        ).toThrow('Missing required fields: id');
    });
});

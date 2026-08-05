import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { RolesDto, RolesMapper, SimpleResponseDto } from '@cmz/shared-data';
import { Role } from '@cmz/shared-domain';
import { ParticipantsFindOneMapper } from './participants-find-one.mapper';
import type { ParticipantsFindOneItemApiDto } from '../dtos/participants-find-one-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `team-organization`, 5/5 fichiers (module complet). Contrepartie de
 * `participants.mapper.spec.ts` : ici `team` porte l'**uniqId**, pas le nom
 * — divergence documentée dans le code et verrouillée par ce test.
 */
function makeItemDto(
    partial: Partial<ParticipantsFindOneItemApiDto> = {}
): ParticipantsFindOneItemApiDto {
    return {
        id: 'PART-001',
        first_name: 'Awa',
        last_name: 'Traoré',
        email: 'awa.traore@example.com',
        phone: '0102030405',
        role: RolesDto['TEAM-LEADER'],
        team: { id: 'T-1', uniq_id: 'TEAM-001', name: 'Équipe Littoral' },
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): ParticipantsFindOneMapper {
    const injector = createEnvironmentInjector(
        [RolesMapper, ParticipantsFindOneMapper],
        null as never
    );
    return injector.get(ParticipantsFindOneMapper);
}

describe('ParticipantsFindOneMapper', () => {
    it('mappe le wire vers ParticipantsFindOneEntity', () => {
        const dto: SimpleResponseDto<ParticipantsFindOneItemApiDto> = {
            error: false,
            message: '',
            data: makeItemDto(),
        };
        const entity = createMapper().mapFromDto(dto);

        expect(entity.uniqId).toBe('PART-001');
        expect(entity.firstName).toBe('Awa');
        expect(entity.lastName).toBe('Traoré');
        expect(entity.email).toBe('awa.traore@example.com');
        expect(entity.phone).toBe('0102030405');
        expect(entity.updatedAt).toBe('2026-07-02T10:00:00Z');
    });

    it("team porte l'UNIQID de l'équipe (pas le nom — diverge de la liste)", () => {
        const dto: SimpleResponseDto<ParticipantsFindOneItemApiDto> = {
            error: false,
            message: '',
            data: makeItemDto(),
        };
        expect(createMapper().mapFromDto(dto).team).toBe('TEAM-001');
    });

    it('team vaut null quand team.uniq_id est absent du wire', () => {
        const dto: SimpleResponseDto<ParticipantsFindOneItemApiDto> = {
            error: false,
            message: '',
            data: makeItemDto({ team: null }),
        };
        expect(createMapper().mapFromDto(dto).team).toBeNull();
    });

    it('dérive role via RolesMapper (team-leader wire -> LEADER domaine)', () => {
        const dto: SimpleResponseDto<ParticipantsFindOneItemApiDto> = {
            error: false,
            message: '',
            data: makeItemDto({ role: RolesDto['TEAM-LEADER'] }),
        };
        expect(createMapper().mapFromDto(dto).role).toBe(Role.LEADER);
    });

    it('role vaut null quand absent du wire', () => {
        const dto: SimpleResponseDto<ParticipantsFindOneItemApiDto> = {
            error: false,
            message: '',
            data: makeItemDto({ role: null }),
        };
        expect(createMapper().mapFromDto(dto).role).toBeNull();
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        const dto: SimpleResponseDto<ParticipantsFindOneItemApiDto> = {
            error: false,
            message: '',
            data: makeItemDto({ id: undefined as never }),
        };
        expect(() => createMapper().mapFromDto(dto)).toThrow(
            'Missing required fields: id'
        );
    });
});

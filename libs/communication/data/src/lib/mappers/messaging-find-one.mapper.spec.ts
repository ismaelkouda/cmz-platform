import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { SimpleResponseDto } from '@cmz/shared-data';
import { MessagingTarget, MessagingType } from '@cmz/communication-domain';
import { MessagingFindOneMapper } from './messaging-find-one.mapper';
import { MessagingChannelMapper } from './messaging-channel.mapper';
import { MessagingTargetMapper } from './messaging-target.mapper';
import { MessagingTypeMapper } from './messaging-type.mapper';
import type { MessagingFindOneItemApiDto } from '../dtos/messaging-find-one-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `communication`, 3/3 fichiers. Le commentaire du mapper documente un bug
 * réel corrigé lors de sa construction : le mapper source dérivait
 * `region`/`department`/`municipality` via `JSON.stringify(dto.region?.id)`,
 * qui entoure une string de guillemets littéraux (`'"abc"'` au lieu de
 * `'abc'`), cassant le matching contre les options du select cascade en
 * édition. Remplacé par `dto.region?.id ?? ''`. Vérifié ici pour de vrai —
 * la régression serait silencieuse (aucune erreur de compilation, juste un
 * select vide en édition).
 */
function makeDetailDto(
    partial: Partial<MessagingFindOneItemApiDto> = {}
): MessagingFindOneItemApiDto {
    return {
        uniq_id: 'MSG-001',
        report_uniq_id: 'REPORT-42',
        type: 'tip',
        target_type: 'report',
        region: { id: 'RG-01', name: 'Littoral', code: 'LT' },
        department: { id: 'DP-01', name: 'Wouri', code: 'WR' },
        municipality: { id: 'MN-01', name: 'Douala 1er', code: 'D1' },
        channels: ['push'],
        subject: 'Alerte',
        content: 'Contenu du message.',
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): MessagingFindOneMapper {
    const injector = createEnvironmentInjector(
        [
            MessagingTypeMapper,
            MessagingTargetMapper,
            MessagingChannelMapper,
            MessagingFindOneMapper,
        ],
        null as never
    );
    return injector.get(MessagingFindOneMapper);
}

describe('MessagingFindOneMapper', () => {
    // Une nouvelle instance par test : le mapper met en cache par
    // `uniq_id`+`updated_at` (`with()`, réconciliation d'identité côté
    // entité) — partager une instance entre tests utilisant les mêmes
    // valeurs par défaut renverrait l'entité mise en cache du test
    // précédent, pas le résultat du nouveau mapping.
    it('dérive region/department/municipality en ID brut, pas en JSON.stringify (régression réelle corrigée)', () => {
        const dto: SimpleResponseDto<MessagingFindOneItemApiDto> = {
            error: false,
            message: '',
            data: makeDetailDto(),
        };
        const entity = createMapper().mapFromDto(dto);

        expect(entity.region).toBe('RG-01'); // pas '"RG-01"'
        expect(entity.department).toBe('DP-01');
        expect(entity.municipality).toBe('MN-01');
    });

    it('default region/department/municipality à une chaîne vide quand null (pas de select à pré-remplir)', () => {
        const dto: SimpleResponseDto<MessagingFindOneItemApiDto> = {
            error: false,
            message: '',
            data: makeDetailDto({
                region: null,
                department: null,
                municipality: null,
            }),
        };
        const entity = createMapper().mapFromDto(dto);

        expect(entity.region).toBe('');
        expect(entity.department).toBe('');
        expect(entity.municipality).toBe('');
    });

    it('reportId vient de report_uniq_id (pas report_id, différent du DTO liste)', () => {
        const dto: SimpleResponseDto<MessagingFindOneItemApiDto> = {
            error: false,
            message: '',
            data: makeDetailDto({ report_uniq_id: 'REPORT-99' }),
        };
        expect(createMapper().mapFromDto(dto).reportId).toBe('REPORT-99');
    });

    it('dérive type et targetType via les mappers dédiés', () => {
        const dto: SimpleResponseDto<MessagingFindOneItemApiDto> = {
            error: false,
            message: '',
            data: makeDetailDto({ type: 'education', target_type: 'area' }),
        };
        const entity = createMapper().mapFromDto(dto);
        expect(entity.type).toBe(MessagingType.EDUCATION);
        expect(entity.targetType).toBe(MessagingTarget.AREA);
    });

    it('lève une erreur si uniq_id est absent (MapperUtils.validateDto, champ requis)', () => {
        const dto: SimpleResponseDto<MessagingFindOneItemApiDto> = {
            error: false,
            message: '',
            data: makeDetailDto({ uniq_id: undefined as never }),
        };
        expect(() => createMapper().mapFromDto(dto)).toThrow(
            'Missing required fields: uniq_id'
        );
    });

    it('lève ApiError.invalidResponse si target_type est absent', () => {
        const dto: SimpleResponseDto<MessagingFindOneItemApiDto> = {
            error: false,
            message: '',
            data: makeDetailDto({ target_type: undefined as never }),
        };
        expect(() => createMapper().mapFromDto(dto)).toThrow(
            /type\/target_type manquant/
        );
    });
});

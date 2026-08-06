import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import {
    MessagingChannel,
    MessagingTarget,
    MessagingType,
} from '@cmz/communication-domain';
import { MessagingMapper } from './messaging.mapper';
import { MessagingChannelMapper } from './messaging-channel.mapper';
import { MessagingTargetMapper } from './messaging-target.mapper';
import { MessagingTypeMapper } from './messaging-type.mapper';
import type { MessagingItemApiDto } from '../dtos/messaging-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `communication`, 2/3 fichiers. Le commentaire du mapper documente un bug
 * corrigé lors de sa construction (`type`/`targetType` laissés en wire brut
 * sur la liste par le mapper source, jamais passés dans
 * `MessagingTypeMapper`/`MessagingTargetMapper`) — vérifié ici pour de vrai,
 * pas seulement relu dans le commentaire.
 */
function makePaginatedResponse(
    items: MessagingItemApiDto[]
): PaginatedResponseDto<MessagingItemApiDto> {
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
    partial: Partial<MessagingItemApiDto> = {}
): MessagingItemApiDto {
    return {
        uniq_id: 'MSG-001',
        report_id: 'REPORT-42',
        type: 'tip',
        target_type: 'report',
        region: 'Littoral',
        department: 'Wouri',
        municipality: 'Douala 1er',
        channels: ['push', 'sms'],
        subject: 'Alerte',
        content: 'Contenu du message.',
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): MessagingMapper {
    const injector = createEnvironmentInjector(
        [
            MessagingTypeMapper,
            MessagingTargetMapper,
            MessagingChannelMapper,
            MessagingMapper,
        ],
        null as never
    );
    return injector.get(MessagingMapper);
}

describe('MessagingMapper', () => {
    // Une nouvelle instance par test : le mapper met en cache par
    // `uniq_id`+`updated_at` (`with()`, réconciliation d'identité côté
    // entité) — partager une instance entre tests utilisant les mêmes
    // valeurs par défaut renverrait l'entité mise en cache du test
    // précédent, pas le résultat du nouveau mapping.
    it('mappe le wire vers MessagingEntity, region/department/municipality en NOM (vue liste)', () => {
        const result = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        );
        const entity = result.items[0];

        expect(entity.uniqId).toBe('MSG-001');
        expect(entity.reportId).toBe('REPORT-42');
        expect(entity.region).toBe('Littoral');
        expect(entity.department).toBe('Wouri');
        expect(entity.municipality).toBe('Douala 1er');
        expect(entity.subject).toBe('Alerte');
        expect(entity.content).toBe('Contenu du message.');
    });

    it('dérive type et targetType via les mappers dédiés — pas laissés en wire brut (bug corrigé)', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([
                makeItemDto({ type: 'awareness', target_type: 'area' }),
            ])
        ).items[0];
        expect(entity.type).toBe(MessagingType.AWARENESS);
        expect(entity.targetType).toBe(MessagingTarget.AREA);
    });

    it('mappe channels (tableau) via MessagingChannelMapper', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ channels: ['mail'] })])
        ).items[0];
        expect(entity.channels).toEqual([MessagingChannel.MAIL]);
    });

    it('default channels à un tableau vide quand absent du wire', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([
                makeItemDto({ channels: undefined as never }),
            ])
        ).items[0];
        expect(entity.channels).toEqual([]);
    });

    it('lève une erreur si uniq_id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([
                    makeItemDto({ uniq_id: undefined as never }),
                ])
            )
        ).toThrow('Missing required fields: uniq_id');
    });

    it('lève ApiError.invalidResponse si type est absent (garde explicite, distincte de validateDto)', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([
                    makeItemDto({ type: undefined as never }),
                ])
            )
        ).toThrow(/type\/target_type manquant/);
    });

    it('lève ApiError.invalidResponse si target_type est absent', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([
                    makeItemDto({ target_type: undefined as never }),
                ])
            )
        ).toThrow(/type\/target_type manquant/);
    });
});

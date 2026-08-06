import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import { TypeReport } from '@cmz/shared-domain';
import { NotificationsStatus } from '@cmz/communication-domain';
import { NotificationsMapper } from './notifications.mapper';
import { NotificationsStatusMapper } from './notifications-status.mapper';
import { NotificationsTypeReportMapper } from './notifications-type-report.mapper';
import type { NotificationsItemApiDto } from '../dtos/notifications-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `communication`, 1/3 fichiers. Suit le patron déjà établi par les
 * mappers corpus-générés `workflow-action`
 * (`queues-processing-item.mapper.spec.ts`) pour instancier une classe
 * `@Service()` avec dépendances `inject()` sans `TestBed` complet.
 */
function makePaginatedResponse(
    items: NotificationsItemApiDto[]
): PaginatedResponseDto<NotificationsItemApiDto> {
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
    partial: Partial<NotificationsItemApiDto> = {}
): NotificationsItemApiDto {
    return {
        id: 'NOTIF-001',
        reference: 'REF-001',
        title: 'Nouveau signalement',
        type: 'unused-wire-field',
        message: 'Un signalement a été créé près de vous.',
        status: 'unread',
        model_id: 'REPORT-42',
        model_type: 'ProcessingReport',
        sent_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): NotificationsMapper {
    const injector = createEnvironmentInjector(
        [
            NotificationsStatusMapper,
            NotificationsTypeReportMapper,
            NotificationsMapper,
        ],
        null as never
    );
    return injector.get(NotificationsMapper);
}

describe('NotificationsMapper', () => {
    // Une nouvelle instance par test : le mapper met en cache par
    // `uniq_id`+`updated_at` (`with()`, réconciliation d'identité côté
    // entité) — partager une instance entre tests utilisant les mêmes
    // `id`/`updated_at` par défaut renverrait l'entité mise en cache du
    // test précédent, pas le résultat du nouveau mapping.
    it('mappe le wire vers NotificationsEntity', () => {
        const mapper = createMapper();
        const result = mapper.mapFromDto(
            makePaginatedResponse([makeItemDto()])
        );
        const entity = result.items[0];

        expect(entity.uniqId).toBe('NOTIF-001');
        expect(entity.reference).toBe('REPORT-42'); // reference vient de model_id, pas de id
        expect(entity.title).toBe('Nouveau signalement');
        expect(entity.type).toBe(TypeReport.PROCESSING); // dérivé de model_type, via NotificationsTypeReportMapper
        expect(entity.message).toBe('Un signalement a été créé près de vous.');
        expect(entity.status).toBe(NotificationsStatus.UNREAD);
        expect(entity.sendAt).toBe('2026-07-01T10:00:00Z'); // sendAt vient de sent_at
        expect(entity.updatedAt).toBe('2026-07-02T10:00:00Z');
    });

    it('dérive type via model_type (RequestReport/FinalizationReport), pas via le champ type brut', () => {
        const requests = createMapper().mapFromDto(
            makePaginatedResponse([
                makeItemDto({ id: 'NOTIF-002', model_type: 'RequestReport' }),
            ])
        ).items[0];
        expect(requests.type).toBe(TypeReport.REQUESTS);

        const finalization = createMapper().mapFromDto(
            makePaginatedResponse([
                makeItemDto({
                    id: 'NOTIF-003',
                    model_type: 'FinalizationReport',
                }),
            ])
        ).items[0];
        expect(finalization.type).toBe(TypeReport.FINALIZATION);
    });

    it('dérive status via NotificationsStatusMapper (read/unread)', () => {
        const read = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ status: 'read' })])
        ).items[0];
        expect(read.status).toBe(NotificationsStatus.READ);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ id: undefined as never })])
            )
        ).toThrow('Missing required fields: id');
    });
});

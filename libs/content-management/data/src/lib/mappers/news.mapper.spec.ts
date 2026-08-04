import '@angular/compiler';
import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto, TypeMediaMapper } from '@cmz/shared-data';
import { NewsStatus } from '@cmz/content-management-domain';
import { NewsMapper } from './news.mapper';
import type { NewsItemApiDto } from '../dtos/news-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `content-management`, 5/12 fichiers. Le commentaire du mapper documente
 * une divergence assumée : `category`/`subCategory` portent le **nom** ici
 * (liste), pas l'id (≠ `NewsFindOneMapper`) — même précédent que
 * `team-organization/participants.team`. `TypeMediaMapper` (DI) lève une
 * `ApiError.invalidResponse` sur une valeur `type` wire inconnue — vérifié
 * pour de vrai, pas seulement supposé.
 */
function makePaginatedResponse(
    items: NewsItemApiDto[]
): PaginatedResponseDto<NewsItemApiDto> {
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

function makeItemDto(partial: Partial<NewsItemApiDto> = {}): NewsItemApiDto {
    return {
        id: 'NEWS-001',
        type: 'image',
        title: 'Nouvelle antenne à Dakar',
        category: { id: 'CAT-001', uniq_id: 'CAT-001', name: 'Infrastructure' },
        sub_category: {
            id: 'SUBCAT-001',
            uniq_id: 'SUBCAT-001',
            name: 'Réseau mobile',
        },
        is_published: true,
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): NewsMapper {
    const injector = createEnvironmentInjector(
        [TypeMediaMapper, NewsMapper],
        null as never
    );
    return injector.get(NewsMapper);
}

describe('NewsMapper', () => {
    it('mappe le wire vers NewsEntity, category/subCategory portent le NOM (vue liste)', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('NEWS-001');
        expect(entity.category).toBe('Infrastructure');
        expect(entity.subCategory).toBe('Réseau mobile');
        expect(entity.type).toBe('image');
    });

    it("category/subCategory valent '' quand absents du wire (pas d'exception)", () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([
                makeItemDto({ category: undefined, sub_category: undefined }),
            ])
        ).items[0];
        expect(entity.category).toBe('');
        expect(entity.subCategory).toBe('');
    });

    it('lève ApiError.invalidResponse si type est une valeur wire inconnue', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ type: 'audio' })])
            )
        ).toThrow(/TypeMedia wire inconnue/);
    });

    it('dérive status PUBLISH/UNPUBLISH depuis is_published', () => {
        const unpublished = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ is_published: false })])
        ).items[0];
        expect(unpublished.status).toBe(NewsStatus.UNPUBLISH);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ id: undefined as never })])
            )
        ).toThrow('Missing required fields: id');
    });
});

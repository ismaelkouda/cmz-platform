import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto, TypeMediaMapper } from '@cmz/shared-data';
import { SlideStatus } from '@cmz/content-management-domain';
import { SlideMapper } from './slide.mapper';
import type { SlideItemApiDto } from '../dtos/slide-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `content-management`, 9/12 fichiers. Combine les 2 comportements déjà
 * vérifiés séparément dans le module : filtrage `platforms` (comme `home`)
 * et `TypeMediaMapper` (DI, comme `news`).
 */
function makePaginatedResponse(
    items: SlideItemApiDto[]
): PaginatedResponseDto<SlideItemApiDto> {
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

function makeItemDto(partial: Partial<SlideItemApiDto> = {}): SlideItemApiDto {
    return {
        id: 'SLIDE-001',
        type: 'image',
        title: 'Nouveau réseau 5G',
        subtitle: 'Disponible à Dakar',
        order: 1,
        platforms: ['web', 'pwa'],
        is_active: true,
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): SlideMapper {
    const injector = createEnvironmentInjector(
        [TypeMediaMapper, SlideMapper],
        null as never
    );
    return injector.get(SlideMapper);
}

describe('SlideMapper', () => {
    it('mappe le wire vers SlideEntity', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('SLIDE-001');
        expect(entity.title).toBe('Nouveau réseau 5G');
        expect(entity.type).toBe('image');
        expect(entity.platforms).toEqual(['web', 'pwa']);
    });

    it('platforms: écarte silencieusement une valeur wire invalide', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([
                makeItemDto({ platforms: ['web', 'desktop'] }),
            ])
        ).items[0];
        expect(entity.platforms).toEqual(['web']);
    });

    it('lève ApiError.invalidResponse si type est une valeur wire inconnue', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ type: 'gif' })])
            )
        ).toThrow(/TypeMedia wire inconnue/);
    });

    it('dérive status ACTIVE/INACTIVE depuis is_active', () => {
        const inactive = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ is_active: false })])
        ).items[0];
        expect(inactive.status).toBe(SlideStatus.INACTIVE);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ id: undefined as never })])
            )
        ).toThrow('Missing required fields: id');
    });
});

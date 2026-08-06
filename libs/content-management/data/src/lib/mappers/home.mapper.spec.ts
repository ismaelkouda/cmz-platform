import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import { HomeStatus } from '@cmz/content-management-domain';
import { HomeMapper } from './home.mapper';
import type { HomeItemApiDto } from '../dtos/home-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `content-management`, 1/12 fichiers (dernier module du chantier). Le DTO
 * documente `platforms` en `string[]` libre côté wire — le mapper filtre
 * via `isPlatform`, testé sur les 3 cas réels (valeurs valides, valeur
 * invalide silencieusement écartée, champ absent).
 */
function makePaginatedResponse(
    items: HomeItemApiDto[]
): PaginatedResponseDto<HomeItemApiDto> {
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

function makeItemDto(partial: Partial<HomeItemApiDto> = {}): HomeItemApiDto {
    return {
        id: 'HOME-001',
        title: 'Bienvenue',
        resume: 'Page d’accueil',
        image_url: 'https://cdn.example.com/home.jpg',
        order: 1,
        platforms: ['web', 'mobile'],
        is_active: true,
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): HomeMapper {
    return new HomeMapper();
}

describe('HomeMapper', () => {
    it('mappe le wire vers HomeEntity', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('HOME-001');
        expect(entity.title).toBe('Bienvenue');
        expect(entity.image).toBe('https://cdn.example.com/home.jpg');
        expect(entity.platforms).toEqual(['web', 'mobile']);
    });

    it('platforms: écarte silencieusement une valeur wire invalide (pas une exception)', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([
                makeItemDto({ platforms: ['web', 'tv-connectee'] }),
            ])
        ).items[0];
        expect(entity.platforms).toEqual(['web']);
    });

    it("platforms: tableau vide si le champ est absent du wire (pas d'exception)", () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([
                makeItemDto({ platforms: undefined as never }),
            ])
        ).items[0];
        expect(entity.platforms).toEqual([]);
    });

    it('dérive status ACTIVE/INACTIVE depuis is_active', () => {
        const inactive = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ is_active: false })])
        ).items[0];
        expect(inactive.status).toBe(HomeStatus.INACTIVE);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ id: undefined as never })])
            )
        ).toThrow('Missing required fields: id');
    });
});

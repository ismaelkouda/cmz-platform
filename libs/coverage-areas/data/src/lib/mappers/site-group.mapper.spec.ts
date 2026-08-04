import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import { Status } from '@cmz/coverage-areas-domain';
import { SiteGroupMapper } from './site-group.mapper';
import type { SiteGroupItemApiDto } from '../dtos/site-group-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `coverage-areas`, 7/11 fichiers.
 */
function makePaginatedResponse(
    items: SiteGroupItemApiDto[]
): PaginatedResponseDto<SiteGroupItemApiDto> {
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
    partial: Partial<SiteGroupItemApiDto> = {}
): SiteGroupItemApiDto {
    return {
        id: 'SG-001',
        code: 'SG-DK',
        name: 'Groupe Dakar',
        description: 'Sites de la zone Dakar',
        is_active: true,
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): SiteGroupMapper {
    return new SiteGroupMapper();
}

describe('SiteGroupMapper', () => {
    it('mappe le wire vers SiteGroupEntity', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('SG-001');
        expect(entity.code).toBe('SG-DK');
        expect(entity.name).toBe('Groupe Dakar');
        expect(entity.description).toBe('Sites de la zone Dakar');
    });

    it('dérive status ACTIVE/INACTIVE depuis is_active', () => {
        const inactive = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ is_active: false })])
        ).items[0];
        expect(inactive.status).toBe(Status.INACTIVE);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ id: undefined as never })])
            )
        ).toThrow('Missing required fields: id');
    });
});

import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import { Status } from '@cmz/administrative-boundary-domain';
import { RegionMapper } from './region.mapper';
import type { RegionItemApiDto } from '../dtos/region-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `administrative-boundary`, 1/10 fichiers.
 */
function makePaginatedResponse(
    items: RegionItemApiDto[]
): PaginatedResponseDto<RegionItemApiDto> {
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

function makeItemDto(partial: Partial<RegionItemApiDto> = {}): RegionItemApiDto {
    return {
        id: 'REGION-001',
        name: 'Dakar',
        code: 'DK',
        description: 'Région de Dakar',
        population_size: 3500000,
        infrastructure_size: 120,
        departments_count: 4,
        municipalities_count: 19,
        is_active: true,
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): RegionMapper {
    return new RegionMapper();
}

describe('RegionMapper', () => {
    it('mappe le wire vers RegionEntity', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('REGION-001');
        expect(entity.name).toBe('Dakar');
        expect(entity.code).toBe('DK');
        expect(entity.description).toBe('Région de Dakar');
        expect(entity.populationSize).toBe(3500000);
        expect(entity.infrastructureCount).toBe(120);
        expect(entity.departmentsCount).toBe(4);
        expect(entity.municipalitiesCount).toBe(19);
    });

    it('dérive status ACTIVE/INACTIVE depuis is_active', () => {
        const active = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ is_active: true })])
        ).items[0];
        expect(active.status).toBe(Status.ACTIVE);

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

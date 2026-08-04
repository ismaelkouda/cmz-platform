import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import { Status } from '@cmz/administrative-boundary-domain';
import { DepartmentsByRegionIdMapper } from './departments-by-region-id.mapper';
import type { DepartmentsByRegionIdItemApiDto } from '../dtos/departments-by-region-id-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `administrative-boundary`, 7/10 fichiers. Liste relationnelle (par
 * région) : ni `region` imbriquée ni `infrastructure_size` — shape plus
 * réduite que `DepartmentMapper` (liste globale), vérifié explicitement en
 * confirmant l'absence des getters correspondants sur l'entité.
 */
function makePaginatedResponse(
    items: DepartmentsByRegionIdItemApiDto[]
): PaginatedResponseDto<DepartmentsByRegionIdItemApiDto> {
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
    partial: Partial<DepartmentsByRegionIdItemApiDto> = {}
): DepartmentsByRegionIdItemApiDto {
    return {
        id: 'DEPT-001',
        name: 'Dakar Département',
        code: 'DK-D1',
        description: 'Département de Dakar',
        population_size: 1200000,
        municipalities_count: 5,
        is_active: true,
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): DepartmentsByRegionIdMapper {
    return new DepartmentsByRegionIdMapper();
}

describe('DepartmentsByRegionIdMapper', () => {
    it('mappe le wire vers DepartmentsByRegionIdEntity', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('DEPT-001');
        expect(entity.name).toBe('Dakar Département');
        expect(entity.municipalitiesCount).toBe(5);
    });

    it("n'a pas de champ region ni infrastructureCount (shape réduite vs DepartmentEntity)", () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];
        expect('region' in entity).toBe(false);
        expect('infrastructureCount' in entity).toBe(false);
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

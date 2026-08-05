import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import { Status } from '@cmz/administrative-boundary-domain';
import { MunicipalitiesByDepartmentIdMapper } from './municipalities-by-department-id.mapper';
import type { MunicipalitiesByDepartmentIdItemApiDto } from '../dtos/municipalities-by-department-id-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `administrative-boundary`, 10/10 fichiers (module complet). Liste
 * relationnelle (par département) : shape la plus réduite du module — ni
 * `region`, ni `department`, ni `infrastructure_size`, vérifié en confirmant
 * l'absence des getters correspondants sur l'entité (même méthode que
 * `DepartmentsByRegionIdMapper`).
 */
function makePaginatedResponse(
    items: MunicipalitiesByDepartmentIdItemApiDto[]
): PaginatedResponseDto<MunicipalitiesByDepartmentIdItemApiDto> {
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
    partial: Partial<MunicipalitiesByDepartmentIdItemApiDto> = {}
): MunicipalitiesByDepartmentIdItemApiDto {
    return {
        id: 'MUN-001',
        name: 'Plateau',
        code: 'DK-M1',
        description: 'Commune du Plateau',
        population_size: 30000,
        is_active: true,
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): MunicipalitiesByDepartmentIdMapper {
    return new MunicipalitiesByDepartmentIdMapper();
}

describe('MunicipalitiesByDepartmentIdMapper', () => {
    it('mappe le wire vers MunicipalitiesByDepartmentIdEntity', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('MUN-001');
        expect(entity.name).toBe('Plateau');
        expect(entity.populationSize).toBe(30000);
    });

    it("n'a ni region, ni department, ni infrastructureCount (shape la plus réduite du module)", () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];
        expect('region' in entity).toBe(false);
        expect('department' in entity).toBe(false);
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

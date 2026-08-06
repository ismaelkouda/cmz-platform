import { describe, expect, it } from 'vitest';
import { Status } from '@cmz/administrative-boundary-domain';
import { RegionFindOneMapper } from './region-find-one.mapper';
import type { RegionFindOneItemApiDto } from '../dtos/region-find-one-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `administrative-boundary`, 2/10 fichiers.
 */
function makeItemDto(
    partial: Partial<RegionFindOneItemApiDto> = {}
): RegionFindOneItemApiDto {
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

function createMapper(): RegionFindOneMapper {
    return new RegionFindOneMapper();
}

describe('RegionFindOneMapper', () => {
    it('mappe le wire vers RegionFindOneEntity', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect(entity.uniqId).toBe('REGION-001');
        expect(entity.name).toBe('Dakar');
        expect(entity.departmentsCount).toBe(4);
        expect(entity.municipalitiesCount).toBe(19);
    });

    it('dérive status ACTIVE/INACTIVE depuis is_active', () => {
        const inactive = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ is_active: false }),
        });
        expect(inactive.status).toBe(Status.INACTIVE);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            createMapper().mapFromDto({
                error: false,
                message: '',
                data: makeItemDto({ id: undefined as never }),
            })
        ).toThrow('Missing required fields: id');
    });
});

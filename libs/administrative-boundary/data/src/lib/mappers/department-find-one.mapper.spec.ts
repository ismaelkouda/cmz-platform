import { describe, expect, it } from 'vitest';
import { Status } from '@cmz/administrative-boundary-domain';
import { DepartmentFindOneMapper } from './department-find-one.mapper';
import type { DepartmentFindOneItemApiDto } from '../dtos/department-find-one-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `administrative-boundary`, 5/10 fichiers. Même divergence que
 * `DepartmentMapper` (liste) : `dto.region.id`/`.name` sans chaînage
 * optionnel malgré `region: AdministrativeBoundaryDto` non-optionnel.
 */
function makeItemDto(
    partial: Partial<DepartmentFindOneItemApiDto> = {}
): DepartmentFindOneItemApiDto {
    return {
        id: 'DEPT-001',
        name: 'Dakar Département',
        code: 'DK-D1',
        description: 'Département de Dakar',
        region: { id: 'REGION-001', name: 'Dakar', code: 'DK' },
        population_size: 1200000,
        infrastructure_size: 40,
        municipalities_count: 5,
        is_active: true,
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): DepartmentFindOneMapper {
    return new DepartmentFindOneMapper();
}

describe('DepartmentFindOneMapper', () => {
    it('mappe le wire vers DepartmentFindOneEntity, region réduite à {id, name}', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect(entity.uniqId).toBe('DEPT-001');
        expect(entity.region).toEqual({ id: 'REGION-001', name: 'Dakar' });
    });

    it('dérive status ACTIVE/INACTIVE depuis is_active', () => {
        const inactive = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ is_active: false }),
        });
        expect(inactive.status).toBe(Status.INACTIVE);
    });

    it('lève une TypeError si region est absent malgré le typage non-optionnel (pas de garde ?.)', () => {
        expect(() =>
            createMapper().mapFromDto({
                error: false,
                message: '',
                data: makeItemDto({ region: undefined as never }),
            })
        ).toThrow(TypeError);
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

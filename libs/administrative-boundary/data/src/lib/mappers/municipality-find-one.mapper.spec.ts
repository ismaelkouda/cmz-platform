import { describe, expect, it } from 'vitest';
import { Status } from '@cmz/administrative-boundary-domain';
import { MunicipalityFindOneMapper } from './municipality-find-one.mapper';
import type { MunicipalityFindOneItemApiDto } from '../dtos/municipality-find-one-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `administrative-boundary`, 9/10 fichiers.
 */
function makeItemDto(
    partial: Partial<MunicipalityFindOneItemApiDto> = {}
): MunicipalityFindOneItemApiDto {
    return {
        id: 'MUN-001',
        name: 'Plateau',
        code: 'DK-M1',
        description: 'Commune du Plateau',
        region: { id: 'REGION-001', name: 'Dakar', code: 'DK' },
        department: {
            id: 'DEPT-001',
            name: 'Dakar Département',
            code: 'DK-D1',
        },
        population_size: 30000,
        infrastructure_size: 8,
        is_active: true,
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): MunicipalityFindOneMapper {
    return new MunicipalityFindOneMapper();
}

describe('MunicipalityFindOneMapper', () => {
    it('mappe le wire vers MunicipalityFindOneEntity, region ET department réduits à {id, name}', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect(entity.uniqId).toBe('MUN-001');
        expect(entity.region).toEqual({ id: 'REGION-001', name: 'Dakar' });
        expect(entity.department).toEqual({
            id: 'DEPT-001',
            name: 'Dakar Département',
        });
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

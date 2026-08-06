import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import { Status } from '@cmz/administrative-boundary-domain';
import { MunicipalityMapper } from './municipality.mapper';
import type { MunicipalityItemApiDto } from '../dtos/municipality-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `administrative-boundary`, 8/10 fichiers. Seul mapper du module à
 * réduire DEUX imbrications wire (`region` et `department`) à {id, name} —
 * même divergence « pas de garde `?.` » que `DepartmentMapper` pour les
 * deux.
 */
function makePaginatedResponse(
    items: MunicipalityItemApiDto[]
): PaginatedResponseDto<MunicipalityItemApiDto> {
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
    partial: Partial<MunicipalityItemApiDto> = {}
): MunicipalityItemApiDto {
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

function createMapper(): MunicipalityMapper {
    return new MunicipalityMapper();
}

describe('MunicipalityMapper', () => {
    it('mappe le wire vers MunicipalityEntity, region ET department réduits à {id, name}', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('MUN-001');
        expect(entity.region).toEqual({ id: 'REGION-001', name: 'Dakar' });
        expect(entity.department).toEqual({
            id: 'DEPT-001',
            name: 'Dakar Département',
        });
    });

    it('dérive status ACTIVE/INACTIVE depuis is_active', () => {
        const inactive = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ is_active: false })])
        ).items[0];
        expect(inactive.status).toBe(Status.INACTIVE);
    });

    it('lève une TypeError si department est absent malgré le typage non-optionnel (pas de garde ?.)', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([
                    makeItemDto({ department: undefined as never }),
                ])
            )
        ).toThrow(TypeError);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ id: undefined as never })])
            )
        ).toThrow('Missing required fields: id');
    });
});

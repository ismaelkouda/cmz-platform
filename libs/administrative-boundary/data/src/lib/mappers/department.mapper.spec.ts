import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import { Status } from '@cmz/administrative-boundary-domain';
import { DepartmentMapper } from './department.mapper';
import type { DepartmentItemApiDto } from '../dtos/department-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `administrative-boundary`, 4/10 fichiers. Contrairement à
 * `administrative-infrastructure/InfrastructureMapper` (qui lit
 * `dto.region?.name` en chaînage optionnel défensif), ce mapper lit
 * `dto.region.id`/`dto.region.name` SANS garde — vérifié ici : si le wire
 * envoie `region: null` malgré le typage non-optionnel, le mapper lève une
 * `TypeError` native (pas une erreur métier lisible), divergence assumée et
 * verrouillée par un test explicite plutôt que découverte en prod.
 */
function makePaginatedResponse(
    items: DepartmentItemApiDto[]
): PaginatedResponseDto<DepartmentItemApiDto> {
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
    partial: Partial<DepartmentItemApiDto> = {}
): DepartmentItemApiDto {
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

function createMapper(): DepartmentMapper {
    return new DepartmentMapper();
}

describe('DepartmentMapper', () => {
    it('mappe le wire vers DepartmentEntity, region réduite à {id, name}', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('DEPT-001');
        expect(entity.name).toBe('Dakar Département');
        expect(entity.region).toEqual({ id: 'REGION-001', name: 'Dakar' });
        expect(entity.municipalitiesCount).toBe(5);
    });

    it('region.code du wire est ignoré (props.region ne garde que id/name)', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([
                makeItemDto({
                    region: { id: 'REGION-002', name: 'Thiès', code: 'TH' },
                }),
            ])
        ).items[0];
        expect(entity.region).toEqual({ id: 'REGION-002', name: 'Thiès' });
        expect('code' in entity.region).toBe(false);
    });

    it('dérive status ACTIVE/INACTIVE depuis is_active', () => {
        const inactive = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ is_active: false })])
        ).items[0];
        expect(inactive.status).toBe(Status.INACTIVE);
    });

    it('lève une TypeError si region est absent malgré le typage non-optionnel (pas de garde ?.)', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([
                    makeItemDto({ region: undefined as never }),
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

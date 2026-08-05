import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import { FiberType, Operator, Status } from '@cmz/coverage-areas-domain';
import { OpticalFiberNetworkMapper } from './optical-fiber-network.mapper';
import type { OpticalFiberNetworkItemApiDto } from '../dtos/optical-fiber-network-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `coverage-areas`, 3/11 fichiers. `fiber_constructor_id` est typé
 * `string | number` côté wire (bug de typage réel de l'API) — le mapper se
 * défend avec `String(dto.fiber_constructor_id ?? '')`, vérifié ici y
 * compris le cas numérique et le cas absent.
 */
function makePaginatedResponse(
    items: OpticalFiberNetworkItemApiDto[]
): PaginatedResponseDto<OpticalFiberNetworkItemApiDto> {
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
    partial: Partial<OpticalFiberNetworkItemApiDto> = {}
): OpticalFiberNetworkItemApiDto {
    return {
        id: 'OFN-001',
        name: 'Backbone Dakar-Thiès',
        operator: Operator.ORANGE,
        fiber_constructor_id: 'FC-001',
        fiber_constructor_name: 'Huawei',
        type: FiberType.SINGLE_MODE,
        is_active: true,
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): OpticalFiberNetworkMapper {
    return new OpticalFiberNetworkMapper();
}

describe('OpticalFiberNetworkMapper', () => {
    it('mappe le wire vers OpticalFiberNetworkEntity', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('OFN-001');
        expect(entity.name).toBe('Backbone Dakar-Thiès');
        expect(entity.fiberConstructorId).toBe('FC-001');
        expect(typeof entity.fiberConstructorId).toBe('string');
    });

    it('fiber_constructor_id numérique (bug de typage wire) est converti en string', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([
                makeItemDto({ fiber_constructor_id: 42 as never }),
            ])
        ).items[0];
        expect(entity.fiberConstructorId).toBe('42');
        expect(typeof entity.fiberConstructorId).toBe('string');
    });

    it("fiber_constructor_id absent (null/undefined) tombe sur '' plutôt que 'null'/'undefined'", () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([
                makeItemDto({ fiber_constructor_id: null as never }),
            ])
        ).items[0];
        expect(entity.fiberConstructorId).toBe('');
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

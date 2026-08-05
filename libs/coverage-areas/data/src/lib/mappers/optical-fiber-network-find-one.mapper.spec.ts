import { describe, expect, it } from 'vitest';
import { FiberType, Operator } from '@cmz/coverage-areas-domain';
import { OpticalFiberNetworkFindOneMapper } from './optical-fiber-network-find-one.mapper';
import type { OpticalFiberNetworkFindOneItemApiDto } from '../dtos/optical-fiber-network-find-one-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `coverage-areas`, 4/11 fichiers. `geomUrl` dérive d'une chaîne de repli
 * `dto.geom_url || dto.geom_file_url` — vérifié sur les 3 combinaisons
 * (les deux présents, seulement le second, aucun des deux). Comme
 * `MobileNetworkFindOneProps`, pas de champ `status`.
 */
function makeItemDto(
    partial: Partial<OpticalFiberNetworkFindOneItemApiDto> = {}
): OpticalFiberNetworkFindOneItemApiDto {
    return {
        id: 'OFN-001',
        name: 'Backbone Dakar-Thiès',
        operator: Operator.ORANGE,
        fiber_constructor_id: 'FC-001',
        fiber_constructor_name: 'Huawei',
        type: FiberType.SINGLE_MODE,
        geom_url: 'https://geo.example.com/ofn-001.geojson',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): OpticalFiberNetworkFindOneMapper {
    return new OpticalFiberNetworkFindOneMapper();
}

describe('OpticalFiberNetworkFindOneMapper', () => {
    it('mappe le wire vers OpticalFiberNetworkFindOneEntity', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect(entity.uniqId).toBe('OFN-001');
        expect(entity.geomUrl).toBe('https://geo.example.com/ofn-001.geojson');
    });

    it("n'a pas de champ status (absent du DTO find-one)", () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect('status' in entity).toBe(false);
    });

    it('geomUrl retombe sur geom_file_url quand geom_url est absent', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({
                geom_url: undefined,
                geom_file_url: 'https://geo.example.com/legacy.geojson',
            }),
        });
        expect(entity.geomUrl).toBe('https://geo.example.com/legacy.geojson');
    });

    it('geomUrl est undefined quand ni geom_url ni geom_file_url ne sont présents', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({
                geom_url: undefined,
                geom_file_url: undefined,
            }),
        });
        expect(entity.geomUrl).toBeUndefined();
    });

    it('fiber_constructor_id numérique (bug de typage wire) est converti en string', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ fiber_constructor_id: 42 as never }),
        });
        expect(entity.fiberConstructorId).toBe('42');
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

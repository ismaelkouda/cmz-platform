import { describe, expect, it } from 'vitest';
import { FiberConstructorSelectMapper } from './fiber-constructor-select.mapper';
import type { FiberConstructorSelectItemApiDto } from '../dtos/fiber-constructor-select-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `coverage-areas`, 10/11 fichiers. `id` est typé `string` (pas
 * `string | number`) sur ce DTO select, contrairement à
 * `fiber_constructor_id` sur `OpticalFiberNetworkItemApiDto` — pas de
 * conversion `String()` ici, cohérent avec l'absence du bug de typage à cet
 * endroit précis du wire.
 */
function makeItemDto(
    partial: Partial<FiberConstructorSelectItemApiDto> = {}
): FiberConstructorSelectItemApiDto {
    return { id: 'FC-001', name: 'Huawei', ...partial };
}

describe('FiberConstructorSelectMapper', () => {
    it('mappe le wire vers SelectOption (value = id, label = name)', () => {
        const result = new FiberConstructorSelectMapper().mapFromDto({
            error: false,
            message: '',
            data: [makeItemDto()],
        });
        expect(result).toEqual([{ value: 'FC-001', label: 'Huawei' }]);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            new FiberConstructorSelectMapper().mapFromDto({
                error: false,
                message: '',
                data: [makeItemDto({ id: undefined as never })],
            })
        ).toThrow('Missing required fields: id');
    });
});

import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { TowerTypeSelectMapper } from './tower-type-select.mapper';
import type { TowerTypeSelectItemApiDto } from '../dtos/tower-type-select-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `coverage-areas`, 11/11 fichiers (module complet).
 */
function makeItemDto(
    partial: Partial<TowerTypeSelectItemApiDto> = {}
): TowerTypeSelectItemApiDto {
    return { id: 'TT-001', name: 'Pylône treillis', ...partial };
}

describe('TowerTypeSelectMapper', () => {
    it('mappe le wire vers SelectOption (value = id, label = name)', () => {
        const result = new TowerTypeSelectMapper().mapFromDto({
            error: false,
            message: '',
            data: [makeItemDto()],
        });
        expect(result).toEqual([{ value: 'TT-001', label: 'Pylône treillis' }]);
    });

    it('retourne un tableau vide sans erreur quand data est vide', () => {
        expect(
            new TowerTypeSelectMapper().mapFromDto({
                error: false,
                message: '',
                data: [],
            })
        ).toEqual([]);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            new TowerTypeSelectMapper().mapFromDto({
                error: false,
                message: '',
                data: [makeItemDto({ id: undefined as never })],
            })
        ).toThrow('Missing required fields: id');
    });
});

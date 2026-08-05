import { describe, expect, it } from 'vitest';
import { DepartmentSelectMapper } from './department-select.mapper';
import type { DepartmentSelectItemApiDto } from '../dtos/department-select-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `administrative-boundary`, 6/10 fichiers. Cascade racine department →
 * municipality (pas de région parente — cf. `RegionSelectMapper` pour le
 * cascade complet à 3 niveaux).
 */
function makeItemDto(
    partial: Partial<DepartmentSelectItemApiDto> = {}
): DepartmentSelectItemApiDto {
    return {
        id: 'DEPT-001',
        name: 'Dakar Département',
        code: 'DK-D1',
        municipalities: [{ id: 'MUN-001', name: 'Plateau', code: 'DK-M1' }],
        ...partial,
    };
}

describe('DepartmentSelectMapper', () => {
    it('mappe le cascade department → municipality', () => {
        const result = new DepartmentSelectMapper().mapFromDto({
            error: false,
            message: '',
            data: [makeItemDto()],
        });
        expect(result).toEqual([
            {
                id: 'DEPT-001',
                name: 'Dakar Département',
                code: 'DK-D1',
                municipalities: [
                    { id: 'MUN-001', name: 'Plateau', code: 'DK-M1' },
                ],
            },
        ]);
    });

    it('lève une erreur si municipalities est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            new DepartmentSelectMapper().mapFromDto({
                error: false,
                message: '',
                data: [makeItemDto({ municipalities: undefined as never })],
            })
        ).toThrow('Missing required fields: municipalities');
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            new DepartmentSelectMapper().mapFromDto({
                error: false,
                message: '',
                data: [makeItemDto({ id: undefined as never })],
            })
        ).toThrow('Missing required fields: id');
    });
});

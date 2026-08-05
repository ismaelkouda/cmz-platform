import { describe, expect, it } from 'vitest';
import { RegionSelectMapper } from './region-select.mapper';
import type { RegionSelectItemApiDto } from '../dtos/region-select-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `administrative-boundary`, 3/10 fichiers. Cascade complet
 * region → department → municipality en une seule réponse (évite un aller-
 * retour réseau par niveau côté formulaire) — vérifié sur les 3 niveaux.
 */
function makeItemDto(
    partial: Partial<RegionSelectItemApiDto> = {}
): RegionSelectItemApiDto {
    return {
        id: 'REGION-001',
        name: 'Dakar',
        code: 'DK',
        departments: [
            {
                id: 'DEPT-001',
                name: 'Dakar Département',
                code: 'DK-D1',
                municipalities: [
                    { id: 'MUN-001', name: 'Plateau', code: 'DK-M1' },
                ],
            },
        ],
        ...partial,
    };
}

describe('RegionSelectMapper', () => {
    it('mappe le cascade region → department → municipality sur les 3 niveaux', () => {
        const result = new RegionSelectMapper().mapFromDto({
            error: false,
            message: '',
            data: [makeItemDto()],
        });
        expect(result).toEqual([
            {
                id: 'REGION-001',
                name: 'Dakar',
                code: 'DK',
                departments: [
                    {
                        id: 'DEPT-001',
                        name: 'Dakar Département',
                        code: 'DK-D1',
                        municipalities: [
                            { id: 'MUN-001', name: 'Plateau', code: 'DK-M1' },
                        ],
                    },
                ],
            },
        ]);
    });

    it('une région sans départements produit un tableau departments vide, pas une erreur', () => {
        const result = new RegionSelectMapper().mapFromDto({
            error: false,
            message: '',
            data: [makeItemDto({ departments: [] })],
        });
        expect(result[0].departments).toEqual([]);
    });

    it('lève une erreur si departments est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            new RegionSelectMapper().mapFromDto({
                error: false,
                message: '',
                data: [makeItemDto({ departments: undefined as never })],
            })
        ).toThrow('Missing required fields: departments');
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            new RegionSelectMapper().mapFromDto({
                error: false,
                message: '',
                data: [makeItemDto({ id: undefined as never })],
            })
        ).toThrow('Missing required fields: id');
    });
});

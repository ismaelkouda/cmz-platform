import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { InfrastructureTypeSelectMapper } from './infrastructure-type-select.mapper';
import type { InfrastructureTypeSelectItemApiDto } from '../dtos/infrastructure-type-select-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `administrative-infrastructure`, 6/6 fichiers (module complet).
 */
describe('InfrastructureTypeSelectMapper', () => {
    it('mappe le wire vers SelectOption (value = id, label = name)', () => {
        const items: InfrastructureTypeSelectItemApiDto[] = [
            { id: 'ITYPE-001', name: 'Antenne', description: 'desc' },
        ];
        const result = new InfrastructureTypeSelectMapper().mapFromDto({
            error: false,
            message: '',
            data: items,
        });
        expect(result).toEqual([{ value: 'ITYPE-001', label: 'Antenne' }]);
    });

    it('retourne un tableau vide sans erreur quand data est vide', () => {
        expect(
            new InfrastructureTypeSelectMapper().mapFromDto({
                error: false,
                message: '',
                data: [],
            })
        ).toEqual([]);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            new InfrastructureTypeSelectMapper().mapFromDto({
                error: false,
                message: '',
                data: [
                    { id: undefined as never, name: 'Antenne', description: 'desc' },
                ],
            })
        ).toThrow('Missing required fields: id');
    });
});

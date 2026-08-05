import { describe, expect, it } from 'vitest';
import { InfrastructureSelectMapper } from './infrastructure-select.mapper';
import type { InfrastructureSelectItemApiDto } from '../dtos/infrastructure-select-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `administrative-infrastructure`, 3/6 fichiers.
 */
describe('InfrastructureSelectMapper', () => {
    it('mappe le wire vers SelectOption (value = id, label = name)', () => {
        const items: InfrastructureSelectItemApiDto[] = [
            { id: 'INFRA-001', name: 'Antenne Akwa', description: 'desc' },
        ];
        const result = new InfrastructureSelectMapper().mapFromDto({
            error: false,
            message: '',
            data: items,
        });
        expect(result).toEqual([{ value: 'INFRA-001', label: 'Antenne Akwa' }]);
    });

    it('ignore description — présent au wire, absent de SelectOption', () => {
        const result = new InfrastructureSelectMapper().mapFromDto({
            error: false,
            message: '',
            data: [
                { id: 'INFRA-001', name: 'Antenne Akwa', description: 'desc' },
            ],
        });
        expect('description' in result[0]).toBe(false);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            new InfrastructureSelectMapper().mapFromDto({
                error: false,
                message: '',
                data: [
                    {
                        id: undefined as never,
                        name: 'Antenne Akwa',
                        description: 'desc',
                    },
                ],
            })
        ).toThrow('Missing required fields: id');
    });
});

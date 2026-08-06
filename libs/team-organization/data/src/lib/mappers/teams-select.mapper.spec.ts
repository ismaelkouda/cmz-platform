import { describe, expect, it } from 'vitest';
import { TeamsSelectMapper } from './teams-select.mapper';
import type { TeamsSelectItemApiDto } from '../dtos/teams-select-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `team-organization`, 3/5 fichiers. Le plus simple des 5 : `ArrayResponseMapper`,
 * pas de dépendance injectée, sortie `SelectOption` (`value`/`label`).
 */
describe('TeamsSelectMapper', () => {
    it('mappe le wire vers SelectOption (value = uniq_id, label = name)', () => {
        const items: TeamsSelectItemApiDto[] = [
            { uniq_id: 'TEAM-001', name: 'Équipe Littoral', code: 'T01' },
            { uniq_id: 'TEAM-002', name: 'Équipe Ouest', code: 'T02' },
        ];
        const result = new TeamsSelectMapper().mapFromDto({
            error: false,
            message: '',
            data: items,
        });
        expect(result).toEqual([
            { value: 'TEAM-001', label: 'Équipe Littoral' },
            { value: 'TEAM-002', label: 'Équipe Ouest' },
        ]);
    });

    it('ignore code — présent au wire, absent de SelectOption', () => {
        const result = new TeamsSelectMapper().mapFromDto({
            error: false,
            message: '',
            data: [
                { uniq_id: 'TEAM-001', name: 'Équipe Littoral', code: 'T01' },
            ],
        });
        expect('code' in result[0]).toBe(false);
    });

    it('retourne un tableau vide sans erreur quand data est vide', () => {
        expect(
            new TeamsSelectMapper().mapFromDto({
                error: false,
                message: '',
                data: [],
            })
        ).toEqual([]);
    });

    it('lève une erreur si uniq_id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            new TeamsSelectMapper().mapFromDto({
                error: false,
                message: '',
                data: [
                    {
                        uniq_id: undefined as never,
                        name: 'Équipe Littoral',
                        code: 'T01',
                    },
                ],
            })
        ).toThrow('Missing required fields: uniq_id');
    });
});

import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { ProfilesPermissionsSelectMapper } from './profiles-permissions-select.mapper';
import type { ProfilesPermissionsSelectItemApiDto } from '../dtos/profiles-permissions-select-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `settings-security`, 5/6 fichiers.
 */
describe('ProfilesPermissionsSelectMapper', () => {
    it('mappe le wire vers SelectOption (value = uniq_id, label = name)', () => {
        const items: ProfilesPermissionsSelectItemApiDto[] = [
            { uniq_id: 'PROFILE-001', name: 'Superviseur régional' },
        ];
        const result = new ProfilesPermissionsSelectMapper().mapFromDto({
            error: false,
            message: '',
            data: items,
        });
        expect(result).toEqual([
            { value: 'PROFILE-001', label: 'Superviseur régional' },
        ]);
    });

    it('retourne un tableau vide sans erreur quand data est vide', () => {
        expect(
            new ProfilesPermissionsSelectMapper().mapFromDto({
                error: false,
                message: '',
                data: [],
            })
        ).toEqual([]);
    });

    it('lève une erreur si uniq_id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            new ProfilesPermissionsSelectMapper().mapFromDto({
                error: false,
                message: '',
                data: [
                    {
                        uniq_id: undefined as never,
                        name: 'Superviseur régional',
                    },
                ],
            })
        ).toThrow('Missing required fields: uniq_id');
    });
});

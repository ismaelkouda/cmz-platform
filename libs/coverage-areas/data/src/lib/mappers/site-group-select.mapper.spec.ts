import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { SiteGroupSelectMapper } from './site-group-select.mapper';
import type { SiteGroupSelectItemApiDto } from '../dtos/site-group-select-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `coverage-areas`, 9/11 fichiers. Le DTO porte un champ `description` que
 * le mapper ignore silencieusement (seuls `id`/`name` alimentent le
 * `SelectOption`) — comportement volontaire (un select n'a pas besoin de la
 * description), vérifié pour que ce ne soit pas confondu avec un oubli.
 */
function makeItemDto(
    partial: Partial<SiteGroupSelectItemApiDto> = {}
): SiteGroupSelectItemApiDto {
    return {
        id: 'SG-001',
        name: 'Groupe Dakar',
        description: 'Sites de la zone Dakar',
        ...partial,
    };
}

describe('SiteGroupSelectMapper', () => {
    it('mappe le wire vers SelectOption (value = id, label = name)', () => {
        const result = new SiteGroupSelectMapper().mapFromDto({
            error: false,
            message: '',
            data: [makeItemDto()],
        });
        expect(result).toEqual([{ value: 'SG-001', label: 'Groupe Dakar' }]);
    });

    it('description est ignorée dans le SelectOption (pas un oubli, un choix)', () => {
        const result = new SiteGroupSelectMapper().mapFromDto({
            error: false,
            message: '',
            data: [makeItemDto()],
        });
        expect('description' in result[0]).toBe(false);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            new SiteGroupSelectMapper().mapFromDto({
                error: false,
                message: '',
                data: [makeItemDto({ id: undefined as never })],
            })
        ).toThrow('Missing required fields: id');
    });
});

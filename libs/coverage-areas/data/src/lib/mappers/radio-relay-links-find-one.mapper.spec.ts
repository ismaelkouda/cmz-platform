import { describe, expect, it } from 'vitest';
import {
    RadioRelayLinksFrequency,
    RadioRelayLinksOperator,
} from '@cmz/coverage-areas-domain';
import { RadioRelayLinksFindOneMapper } from './radio-relay-links-find-one.mapper';
import type { RadioRelayLinksFindOneItemApiDto } from '../dtos/radio-relay-links-find-one-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `coverage-areas`, 6/11 fichiers. Le DTO find-one porte `is_active`, mais
 * le mapper ne le lit **jamais** — `RadioRelayLinksFindOneProps` n'a aucun
 * champ `status` (même divergence structurelle que
 * `InfrastructureTypeFindOneProps` du module `administrative-infrastructure` :
 * champ wire présent mais non consommé), vérifié par absence de getter.
 */
function makeItemDto(
    partial: Partial<RadioRelayLinksFindOneItemApiDto> = {}
): RadioRelayLinksFindOneItemApiDto {
    return {
        id: 'RRL-001',
        name: 'Liaison Dakar-Rufisque',
        operator: RadioRelayLinksOperator.ORANGE,
        frequency: RadioRelayLinksFrequency.MHZ_1800,
        start_date: '2026-01-15T00:00:00Z',
        end_date: '2026-12-31T00:00:00Z',
        is_active: true,
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        geom_url: 'https://geo.example.com/rrl-001.geojson',
        ...partial,
    };
}

function createMapper(): RadioRelayLinksFindOneMapper {
    return new RadioRelayLinksFindOneMapper();
}

describe('RadioRelayLinksFindOneMapper', () => {
    it('mappe le wire vers RadioRelayLinksFindOneEntity, startDate/endDate en Date natifs', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect(entity.uniqId).toBe('RRL-001');
        expect(entity.startDate).toBeInstanceOf(Date);
        expect(entity.geomUrl).toBe('https://geo.example.com/rrl-001.geojson');
    });

    it("n'a pas de champ status bien que is_active soit présent sur le DTO (champ mort, non consommé)", () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ is_active: false }),
        });
        expect('status' in entity).toBe(false);
    });

    it('geomUrl est undefined quand absent du wire (pas de fallback ici, contrairement à optical-fiber-network)', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ geom_url: undefined }),
        });
        expect(entity.geomUrl).toBeUndefined();
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

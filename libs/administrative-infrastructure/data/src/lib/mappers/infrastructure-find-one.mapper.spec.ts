import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { InfrastructureFindOneMapper } from './infrastructure-find-one.mapper';
import type { InfrastructureFindOneItemApiDto } from '../dtos/infrastructure-find-one-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `administrative-infrastructure`, 2/6 fichiers. `type` vient de `dto.type`
 * ici (≠ `dto.infrastructure_type` sur la liste) — même wire divergent que
 * `region`/`department`/`municipality` en accès direct (pas `?.`), et
 * `position` dérivée de `lat`/`long` via `parseCoordinate` (défaut `0` si
 * `Number.parseFloat` échoue) — comportement de repli vérifié ici.
 */
function makeItemDto(
    partial: Partial<InfrastructureFindOneItemApiDto> = {}
): InfrastructureFindOneItemApiDto {
    return {
        id: 'INFRA-001',
        name: 'Antenne relais Akwa',
        type: 'antenne',
        description: 'Antenne relais du centre-ville',
        region: { id: 'RG-01', name: 'Littoral', code: 'LT' },
        department: { id: 'DP-01', name: 'Wouri', code: 'WR' },
        municipality: { id: 'MN-01', name: 'Douala 1er', code: 'D1' },
        position: '4.05,9.70',
        lat: '4.05',
        long: '9.70',
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

describe('InfrastructureFindOneMapper', () => {
    it('mappe le wire vers InfrastructureFindOneEntity, type vient de dto.type', () => {
        const mapper = new InfrastructureFindOneMapper();
        const entity = mapper.mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });

        expect(entity.uniqId).toBe('INFRA-001');
        expect(entity.name).toBe('Antenne relais Akwa');
        expect(entity.type).toBe('antenne');
        expect(entity.region).toBe('Littoral');
        expect(entity.department).toBe('Wouri');
        expect(entity.municipality).toBe('Douala 1er');
    });

    it('dérive position.latitude/longitude en nombre via lat/long (parseFloat)', () => {
        const entity = new InfrastructureFindOneMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ lat: '4.05', long: '9.70' }),
        });
        expect(entity.position).toEqual({ latitude: 4.05, longitude: 9.7 });
    });

    it('default latitude/longitude à 0 quand lat/long est une chaîne non numérique (repli parseCoordinate)', () => {
        const entity = new InfrastructureFindOneMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ lat: 'invalide', long: '' }),
        });
        expect(entity.position).toEqual({ latitude: 0, longitude: 0 });
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            new InfrastructureFindOneMapper().mapFromDto({
                error: false,
                message: '',
                data: makeItemDto({ id: undefined as never }),
            })
        ).toThrow('Missing required fields: id');
    });
});

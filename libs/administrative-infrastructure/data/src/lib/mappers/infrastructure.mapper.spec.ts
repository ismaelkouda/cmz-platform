import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import { InfrastructureMapper } from './infrastructure.mapper';
import type { InfrastructureItemApiDto } from '../dtos/infrastructure-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `administrative-infrastructure`, 1/6 fichiers (module de référence du
 * pattern `crud-entity`, N-7). Aucune dépendance injectée — nouvelle
 * instance par test pour le cache `with()` (même piège que `communication`/
 * `team-organization`).
 */
function makePaginatedResponse(
    items: InfrastructureItemApiDto[]
): PaginatedResponseDto<InfrastructureItemApiDto> {
    return {
        error: false,
        message: 'OK',
        data: {
            current_page: 1,
            last_page: 1,
            per_page: 15,
            total: items.length,
            from: 1,
            to: items.length,
            first_page_url: '',
            last_page_url: '',
            next_page_url: '',
            prev_page_url: '',
            path: '',
            links: [],
            data: items,
        },
    };
}

function makeItemDto(
    partial: Partial<InfrastructureItemApiDto> = {}
): InfrastructureItemApiDto {
    return {
        id: 'INFRA-001',
        name: 'Antenne relais Akwa',
        infrastructure_type: 'antenne',
        description: 'Antenne relais du centre-ville',
        region: { id: 'RG-01', name: 'Littoral', code: 'LT' },
        department: { id: 'DP-01', name: 'Wouri', code: 'WR' },
        municipality: { id: 'MN-01', name: 'Douala 1er', code: 'D1' },
        position: '4.05,9.70',
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

describe('InfrastructureMapper', () => {
    it('mappe le wire vers InfrastructureEntity, region/department/municipality en NOM', () => {
        const entity = new InfrastructureMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('INFRA-001');
        expect(entity.name).toBe('Antenne relais Akwa');
        expect(entity.type).toBe('antenne'); // vient de infrastructure_type
        expect(entity.description).toBe('Antenne relais du centre-ville');
        expect(entity.region).toBe('Littoral');
        expect(entity.department).toBe('Wouri');
        expect(entity.municipality).toBe('Douala 1er');
        expect(entity.position).toBe('4.05,9.70');
    });

    it('region/department/municipality valent undefined si le wire envoie null malgré un type non-optionnel (défense réelle, pas théorique)', () => {
        const entity = new InfrastructureMapper().mapFromDto(
            makePaginatedResponse([
                makeItemDto({
                    region: null as never,
                    department: null as never,
                    municipality: null as never,
                }),
            ])
        ).items[0];
        expect(entity.region).toBeUndefined();
        expect(entity.department).toBeUndefined();
        expect(entity.municipality).toBeUndefined();
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            new InfrastructureMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ id: undefined as never })])
            )
        ).toThrow('Missing required fields: id');
    });
});

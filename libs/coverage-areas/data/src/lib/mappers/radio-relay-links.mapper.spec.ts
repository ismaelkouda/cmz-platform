import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import {
    RadioRelayLinksFrequency,
    RadioRelayLinksOperator,
    Status,
} from '@cmz/coverage-areas-domain';
import { RadioRelayLinksMapper } from './radio-relay-links.mapper';
import type { RadioRelayLinksItemApiDto } from '../dtos/radio-relay-links-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `coverage-areas`, 5/11 fichiers. `startDate`/`endDate` sont converties en
 * objets `Date` natifs (`new Date(...)`) — seul mapper du module à le faire,
 * vérifié explicitement (instance `Date`, pas juste la string wire
 * repassée). `RadioRelayLinksOperator` est un enum PROPRE au module (MTN
 * MAJUSCULES/MOOV/ORANGE), pas le `Operator` partagé
 * (mobile-network/optical-fiber-network, valeurs Moov/Orange en casse
 * mixte) — vérifié qu'aucune confusion de valeur n'est possible entre les
 * deux enums.
 */
function makePaginatedResponse(
    items: RadioRelayLinksItemApiDto[]
): PaginatedResponseDto<RadioRelayLinksItemApiDto> {
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
    partial: Partial<RadioRelayLinksItemApiDto> = {}
): RadioRelayLinksItemApiDto {
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
        ...partial,
    };
}

function createMapper(): RadioRelayLinksMapper {
    return new RadioRelayLinksMapper();
}

describe('RadioRelayLinksMapper', () => {
    it('mappe le wire vers RadioRelayLinksEntity, startDate/endDate en Date natifs', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('RRL-001');
        expect(entity.startDate).toBeInstanceOf(Date);
        expect(entity.startDate.toISOString()).toBe('2026-01-15T00:00:00.000Z');
        expect(entity.endDate).toBeInstanceOf(Date);
        expect(entity.endDate.toISOString()).toBe('2026-12-31T00:00:00.000Z');
    });

    it("operator RadioRelayLinksOperator.ORANGE ('ORANGE' majuscules) diverge de l'Operator partagé ('Orange')", () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];
        expect(entity.operator).toBe('ORANGE');
    });

    it('dérive status ACTIVE/INACTIVE depuis is_active', () => {
        const inactive = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ is_active: false })])
        ).items[0];
        expect(inactive.status).toBe(Status.INACTIVE);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ id: undefined as never })])
            )
        ).toThrow('Missing required fields: id');
    });
});

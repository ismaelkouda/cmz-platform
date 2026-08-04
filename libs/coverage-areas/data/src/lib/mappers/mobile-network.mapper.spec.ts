import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import { Operator, Status, Technology } from '@cmz/coverage-areas-domain';
import { MobileNetworkMapper } from './mobile-network.mapper';
import type { MobileNetworkItemApiDto } from '../dtos/mobile-network-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `coverage-areas`, 1/11 fichiers. `technology` normalise un champ wire
 * hétérogène (`string[] | string`) vers un tableau systématique — vérifié
 * sur les 3 formes réelles (tableau, scalaire, absent).
 */
function makePaginatedResponse(
    items: MobileNetworkItemApiDto[]
): PaginatedResponseDto<MobileNetworkItemApiDto> {
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
    partial: Partial<MobileNetworkItemApiDto> = {}
): MobileNetworkItemApiDto {
    return {
        id: 'MN-001',
        site_id: 'SITE-001',
        site_name: 'Site Plateau',
        tower_type_id: 'TT-001',
        tower_type_name: 'Pylône treillis',
        tower_size: 30,
        technology: ['4G', '3G'],
        operator: Operator.MTN,
        radius: 5,
        is_active: true,
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): MobileNetworkMapper {
    return new MobileNetworkMapper();
}

describe('MobileNetworkMapper', () => {
    it('mappe le wire vers MobileNetworkEntity', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('MN-001');
        expect(entity.siteName).toBe('Site Plateau');
        expect(entity.towerSize).toBe(30);
        expect(entity.operator).toBe(Operator.MTN);
        expect(entity.radius).toBe(5);
    });

    it('technology: passe le tableau wire tel quel quand déjà un tableau', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([
                makeItemDto({ technology: [Technology.FOUR_G, Technology.FIVE_G] }),
            ])
        ).items[0];
        expect(entity.technology).toEqual(['4G', '5G']);
    });

    it('technology: enveloppe un scalaire wire dans un tableau à 1 élément', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([
                makeItemDto({ technology: Technology.TWO_G as never }),
            ])
        ).items[0];
        expect(entity.technology).toEqual(['2G']);
    });

    it("technology: tableau vide si la valeur wire est absente/falsy (pas d'exception)", () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([
                makeItemDto({ technology: '' as never }),
            ])
        ).items[0];
        expect(entity.technology).toEqual([]);
    });

    it('radius est undefined si absent du wire (champ optionnel)', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ radius: undefined })])
        ).items[0];
        expect(entity.radius).toBeUndefined();
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

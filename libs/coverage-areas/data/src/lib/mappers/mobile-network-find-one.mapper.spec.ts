import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { Operator, Technology } from '@cmz/coverage-areas-domain';
import { MobileNetworkFindOneMapper } from './mobile-network-find-one.mapper';
import type { MobileNetworkFindOneItemApiDto } from '../dtos/mobile-network-find-one-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `coverage-areas`, 2/11 fichiers. `MobileNetworkFindOneProps` n'a **aucun**
 * champ `status` — `is_active` n'est même pas dans le DTO find-one
 * (contrairement à `MobileNetworkMapper`, liste), vérifié par l'absence du
 * getter. `infrastructureType` porte en réalité l'uniqId du site-group
 * sélectionné (incohérence de nommage du source documentée dans les props,
 * pas un concept "type d'infrastructure" réel).
 */
function makeItemDto(
    partial: Partial<MobileNetworkFindOneItemApiDto> = {}
): MobileNetworkFindOneItemApiDto {
    return {
        id: 'MN-001',
        site_id: 'SITE-001',
        site_name: 'Site Plateau',
        infrastructure_type: 'SITEGROUP-001',
        tower_type_id: 'TT-001',
        tower_type_name: 'Pylône treillis',
        tower_size: 30,
        technology: ['4G'],
        operator: Operator.MTN,
        radius: 5,
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): MobileNetworkFindOneMapper {
    return new MobileNetworkFindOneMapper();
}

describe('MobileNetworkFindOneMapper', () => {
    it('mappe le wire vers MobileNetworkFindOneEntity', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect(entity.uniqId).toBe('MN-001');
        expect(entity.infrastructureType).toBe('SITEGROUP-001');
    });

    it("n'a pas de champ status (absent du DTO find-one, contrairement à la liste)", () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect('status' in entity).toBe(false);
    });

    it('technology: enveloppe un scalaire wire dans un tableau à 1 élément', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ technology: Technology.THREE_G as never }),
        });
        expect(entity.technology).toEqual(['3G']);
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

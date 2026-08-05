import { describe, expect, it } from 'vitest';
import { Status } from '@cmz/coverage-areas-domain';
import { SiteGroupFindOneMapper } from './site-group-find-one.mapper';
import type { SiteGroupFindOneItemApiDto } from '../dtos/site-group-find-one-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `coverage-areas`, 8/11 fichiers. Seul mapper find-one du module à
 * conserver un champ `status` — divergence interne notable : les 3 autres
 * find-one (`mobile-network`, `optical-fiber-network`, `radio-relay-links`)
 * n'en ont aucun (vérifié dans leurs specs respectives).
 */
function makeItemDto(
    partial: Partial<SiteGroupFindOneItemApiDto> = {}
): SiteGroupFindOneItemApiDto {
    return {
        id: 'SG-001',
        code: 'SG-DK',
        name: 'Groupe Dakar',
        description: 'Sites de la zone Dakar',
        is_active: true,
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): SiteGroupFindOneMapper {
    return new SiteGroupFindOneMapper();
}

describe('SiteGroupFindOneMapper', () => {
    it('mappe le wire vers SiteGroupFindOneEntity', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect(entity.uniqId).toBe('SG-001');
        expect(entity.code).toBe('SG-DK');
    });

    it('dérive status ACTIVE/INACTIVE depuis is_active (contrairement aux 3 autres find-one du module)', () => {
        const inactive = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ is_active: false }),
        });
        expect(inactive.status).toBe(Status.INACTIVE);
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

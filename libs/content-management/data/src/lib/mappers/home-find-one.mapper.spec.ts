import { describe, expect, it } from 'vitest';
import { HomeStatus } from '@cmz/content-management-domain';
import { HomeFindOneMapper } from './home-find-one.mapper';
import type { HomeFindOneItemApiDto } from '../dtos/home-find-one-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `content-management`, 2/12 fichiers. `button_label`/`button_url` sont
 * **non-optionnels** sur ce DTO find-one (contrairement à
 * `SlideFindOneItemApiDto`, où ils le sont) — pas de fallback `?? ''` ici,
 * cohérent avec l'absence du besoin.
 */
function makeItemDto(
    partial: Partial<HomeFindOneItemApiDto> = {}
): HomeFindOneItemApiDto {
    return {
        id: 'HOME-001',
        title: 'Bienvenue',
        resume: 'Page d’accueil',
        image_url: 'https://cdn.example.com/home.jpg',
        order: 1,
        platforms: ['web'],
        content: '<p>Contenu</p>',
        time_duration_in_seconds: 10,
        button_label: 'En savoir plus',
        button_url: 'https://example.com/plus',
        is_active: true,
        start_date: '2026-01-01T00:00:00Z',
        end_date: '2026-12-31T00:00:00Z',
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): HomeFindOneMapper {
    return new HomeFindOneMapper();
}

describe('HomeFindOneMapper', () => {
    it('mappe le wire vers HomeFindOneEntity, startDate/endDate en Date natifs', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect(entity.uniqId).toBe('HOME-001');
        expect(entity.buttonLabel).toBe('En savoir plus');
        expect(entity.startDate).toBeInstanceOf(Date);
        expect(entity.startDate.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    });

    it("platforms: tableau vide si le champ est absent du wire (pas d'exception)", () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ platforms: undefined as never }),
        });
        expect(entity.platforms).toEqual([]);
    });

    it('dérive status ACTIVE/INACTIVE depuis is_active', () => {
        const inactive = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ is_active: false }),
        });
        expect(inactive.status).toBe(HomeStatus.INACTIVE);
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

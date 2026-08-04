import '@angular/compiler';
import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { TypeMediaMapper } from '@cmz/shared-data';
import { SlideStatus } from '@cmz/content-management-domain';
import { SlideFindOneMapper } from './slide-find-one.mapper';
import type { SlideFindOneItemApiDto } from '../dtos/slide-find-one-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `content-management`, 10/12 fichiers. `button_label`/`button_url` sont
 * **optionnels** sur ce DTO (contrairement à `HomeFindOneItemApiDto`, où ils
 * sont requis) — le mapper défend avec `?? ''`, vérifié explicitement.
 */
function makeItemDto(
    partial: Partial<SlideFindOneItemApiDto> = {}
): SlideFindOneItemApiDto {
    return {
        id: 'SLIDE-001',
        is_active: true,
        order: 1,
        time_duration_in_seconds: 8,
        type: 'video',
        image_url: 'https://cdn.example.com/slide-001.jpg',
        video_url: 'https://cdn.example.com/slide-001.mp4',
        platforms: ['web'],
        start_date: '2026-01-01T00:00:00Z',
        end_date: '2026-12-31T00:00:00Z',
        title: 'Nouveau réseau 5G',
        subtitle: 'Disponible à Dakar',
        content: '<p>Détails</p>',
        button_label: 'Découvrir',
        button_url: 'https://example.com/5g',
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): SlideFindOneMapper {
    const injector = createEnvironmentInjector(
        [TypeMediaMapper, SlideFindOneMapper],
        null as never
    );
    return injector.get(SlideFindOneMapper);
}

describe('SlideFindOneMapper', () => {
    it('mappe le wire vers SlideFindOneEntity, startDate/endDate en Date natifs', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect(entity.uniqId).toBe('SLIDE-001');
        expect(entity.buttonLabel).toBe('Découvrir');
        expect(entity.startDate).toBeInstanceOf(Date);
    });

    it("buttonLabel/buttonUrl valent '' quand absents du wire (champs optionnels, fix ?? '')", () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ button_label: undefined, button_url: undefined }),
        });
        expect(entity.buttonLabel).toBe('');
        expect(entity.buttonUrl).toBe('');
    });

    it('dérive status ACTIVE/INACTIVE depuis is_active', () => {
        const inactive = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ is_active: false }),
        });
        expect(inactive.status).toBe(SlideStatus.INACTIVE);
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

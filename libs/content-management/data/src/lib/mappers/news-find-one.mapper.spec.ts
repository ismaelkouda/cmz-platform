import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { TypeMediaMapper } from '@cmz/shared-data';
import { NewsStatus } from '@cmz/content-management-domain';
import { NewsFindOneMapper } from './news-find-one.mapper';
import type { NewsFindOneItemApiDto } from '../dtos/news-find-one-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `content-management`, 6/12 fichiers. `category`/`subCategory` portent
 * l'ID ici (détail), pas le nom (≠ `NewsMapper`, liste) — divergence
 * documentée dans le source. Le commentaire du mapper documente aussi un
 * vrai fix par rapport au source : chaînage optionnel ajouté sur
 * `dto.category?.id`/`dto.sub_category?.id` (le source faisait
 * `dto.category.id` sans garde — bug latent potentiel), vérifié ici pour
 * de vrai avec un item sans catégorie.
 */
function makeItemDto(
    partial: Partial<NewsFindOneItemApiDto> = {}
): NewsFindOneItemApiDto {
    return {
        id: 'NEWS-001',
        type: 'video',
        title: 'Nouvelle antenne à Dakar',
        resume: 'Résumé',
        image_url: 'https://cdn.example.com/news-001.jpg',
        video_url: 'https://cdn.example.com/news-001.mp4',
        order: 1,
        hashtags: ['dakar', 'reseau'],
        content: '<p>Contenu complet</p>',
        category: { id: 'CAT-001', uniq_id: 'CAT-001', name: 'Infrastructure' },
        sub_category: {
            id: 'SUBCAT-001',
            uniq_id: 'SUBCAT-001',
            name: 'Réseau mobile',
        },
        is_published: true,
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): NewsFindOneMapper {
    const injector = createEnvironmentInjector(
        [TypeMediaMapper, NewsFindOneMapper],
        null as never
    );
    return injector.get(NewsFindOneMapper);
}

describe('NewsFindOneMapper', () => {
    it("mappe le wire vers NewsFindOneEntity, category/subCategory portent l'ID (vue détail)", () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect(entity.uniqId).toBe('NEWS-001');
        expect(entity.category).toBe('CAT-001');
        expect(entity.subCategory).toBe('SUBCAT-001');
        expect(entity.hashtags).toEqual(['dakar', 'reseau']);
    });

    it("category/subCategory valent '' quand absents du wire (fix null-safety vs source, pas de TypeError)", () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ category: undefined, sub_category: undefined }),
        });
        expect(entity.category).toBe('');
        expect(entity.subCategory).toBe('');
    });

    it("hashtags: tableau vide si absent du wire (pas d'exception)", () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ hashtags: undefined as never }),
        });
        expect(entity.hashtags).toEqual([]);
    });

    it('dérive status PUBLISH/UNPUBLISH depuis is_published', () => {
        const unpublished = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ is_published: false }),
        });
        expect(unpublished.status).toBe(NewsStatus.UNPUBLISH);
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

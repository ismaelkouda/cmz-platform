import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { LegalNoticeStatus } from '@cmz/content-management-domain';
import { LegalNoticeFindOneMapper } from './legal-notice-find-one.mapper';
import type { LegalNoticeFindOneItemApiDto } from '../dtos/legal-notice-find-one-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `content-management`, 4/12 fichiers. Le DTO source documente déjà
 * l'écart : pas de `published_at` en find-one (contrairement à la liste) —
 * vérifié par l'absence du getter `publishedAt` sur l'entité, pas juste par
 * relecture du commentaire.
 */
function makeItemDto(
    partial: Partial<LegalNoticeFindOneItemApiDto> = {}
): LegalNoticeFindOneItemApiDto {
    return {
        id: 'LN-001',
        version: 'v1.2',
        content: '<p>Mentions légales</p>',
        is_published: true,
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): LegalNoticeFindOneMapper {
    return new LegalNoticeFindOneMapper();
}

describe('LegalNoticeFindOneMapper', () => {
    it('mappe le wire vers LegalNoticeFindOneEntity', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect(entity.uniqId).toBe('LN-001');
        expect(entity.content).toBe('<p>Mentions légales</p>');
    });

    it("n'a pas de champ publishedAt (absent du DTO find-one, contrairement à la liste)", () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect('publishedAt' in entity).toBe(false);
    });

    it('dérive status PUBLISH/UNPUBLISH depuis is_published', () => {
        const unpublished = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto({ is_published: false }),
        });
        expect(unpublished.status).toBe(LegalNoticeStatus.UNPUBLISH);
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

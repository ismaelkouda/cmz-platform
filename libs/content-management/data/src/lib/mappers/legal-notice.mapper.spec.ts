import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import { LegalNoticeStatus } from '@cmz/content-management-domain';
import { LegalNoticeMapper } from './legal-notice.mapper';
import type { LegalNoticeItemApiDto } from '../dtos/legal-notice-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `content-management`, 3/12 fichiers. Famille « document publiable »
 * (legal-notice/privacy-policy/terms-use, 3 entités quasi-identiques,
 * chacune son propre enum PUBLISH/UNPUBLISH — même précédent que
 * `coverage-areas/site-group`+`mobile-network`). Statut dérivé de
 * `is_published`, pas `is_active` — vocabulaire distinct des familles
 * `home`/`slide` du même module.
 */
function makePaginatedResponse(
    items: LegalNoticeItemApiDto[]
): PaginatedResponseDto<LegalNoticeItemApiDto> {
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
    partial: Partial<LegalNoticeItemApiDto> = {}
): LegalNoticeItemApiDto {
    return {
        id: 'LN-001',
        version: 'v1.2',
        is_published: true,
        created_at: '2026-07-01T10:00:00Z',
        published_at: '2026-07-01T12:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): LegalNoticeMapper {
    return new LegalNoticeMapper();
}

describe('LegalNoticeMapper', () => {
    it('mappe le wire vers LegalNoticeEntity', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('LN-001');
        expect(entity.version).toBe('v1.2');
        expect(entity.publishedAt).toBe('2026-07-01T12:00:00Z');
    });

    it('dérive status PUBLISH/UNPUBLISH depuis is_published', () => {
        const unpublished = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ is_published: false })])
        ).items[0];
        expect(unpublished.status).toBe(LegalNoticeStatus.UNPUBLISH);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ id: undefined as never })])
            )
        ).toThrow('Missing required fields: id');
    });
});

import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import { TermsUseStatus } from '@cmz/content-management-domain';
import { TermsUseMapper } from './terms-use.mapper';
import type { TermsUseItemApiDto } from '../dtos/terms-use-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `content-management`, 11/12 fichiers. 3e des 3 entités « document
 * publiable », shape identique à `LegalNoticeMapper`/`PrivacyPolicyMapper`,
 * enum `TermsUseStatus` propre au module.
 */
function makePaginatedResponse(
    items: TermsUseItemApiDto[]
): PaginatedResponseDto<TermsUseItemApiDto> {
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
    partial: Partial<TermsUseItemApiDto> = {}
): TermsUseItemApiDto {
    return {
        id: 'TU-001',
        version: 'v3.1',
        is_published: true,
        created_at: '2026-07-01T10:00:00Z',
        published_at: '2026-07-01T12:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): TermsUseMapper {
    return new TermsUseMapper();
}

describe('TermsUseMapper', () => {
    it('mappe le wire vers TermsUseEntity', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('TU-001');
        expect(entity.version).toBe('v3.1');
        expect(entity.publishedAt).toBe('2026-07-01T12:00:00Z');
    });

    it('dérive status PUBLISH/UNPUBLISH depuis is_published', () => {
        const unpublished = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ is_published: false })])
        ).items[0];
        expect(unpublished.status).toBe(TermsUseStatus.UNPUBLISH);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ id: undefined as never })])
            )
        ).toThrow('Missing required fields: id');
    });
});

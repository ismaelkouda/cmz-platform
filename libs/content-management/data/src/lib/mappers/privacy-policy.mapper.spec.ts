import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import { PrivacyPolicyStatus } from '@cmz/content-management-domain';
import { PrivacyPolicyMapper } from './privacy-policy.mapper';
import type { PrivacyPolicyItemApiDto } from '../dtos/privacy-policy-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `content-management`, 7/12 fichiers. 2e des 3 entités « document
 * publiable » (légal-notice/privacy-policy/terms-use), shape identique à
 * `LegalNoticeMapper`, enum `PrivacyPolicyStatus` propre au module.
 */
function makePaginatedResponse(
    items: PrivacyPolicyItemApiDto[]
): PaginatedResponseDto<PrivacyPolicyItemApiDto> {
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
    partial: Partial<PrivacyPolicyItemApiDto> = {}
): PrivacyPolicyItemApiDto {
    return {
        id: 'PP-001',
        version: 'v2.0',
        is_published: true,
        created_at: '2026-07-01T10:00:00Z',
        published_at: '2026-07-01T12:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): PrivacyPolicyMapper {
    return new PrivacyPolicyMapper();
}

describe('PrivacyPolicyMapper', () => {
    it('mappe le wire vers PrivacyPolicyEntity', () => {
        const entity = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('PP-001');
        expect(entity.version).toBe('v2.0');
        expect(entity.publishedAt).toBe('2026-07-01T12:00:00Z');
    });

    it('dérive status PUBLISH/UNPUBLISH depuis is_published', () => {
        const unpublished = createMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ is_published: false })])
        ).items[0];
        expect(unpublished.status).toBe(PrivacyPolicyStatus.UNPUBLISH);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            createMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ id: undefined as never })])
            )
        ).toThrow('Missing required fields: id');
    });
});

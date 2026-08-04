import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { PrivacyPolicyStatus } from '@cmz/content-management-domain';
import { PrivacyPolicyFindOneMapper } from './privacy-policy-find-one.mapper';
import type { PrivacyPolicyFindOneItemApiDto } from '../dtos/privacy-policy-find-one-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `content-management`, 8/12 fichiers. Même écart liste/détail que
 * `LegalNoticeFindOneMapper` : pas de `published_at` ici.
 */
function makeItemDto(
    partial: Partial<PrivacyPolicyFindOneItemApiDto> = {}
): PrivacyPolicyFindOneItemApiDto {
    return {
        id: 'PP-001',
        version: 'v2.0',
        content: '<p>Politique de confidentialité</p>',
        is_published: true,
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): PrivacyPolicyFindOneMapper {
    return new PrivacyPolicyFindOneMapper();
}

describe('PrivacyPolicyFindOneMapper', () => {
    it('mappe le wire vers PrivacyPolicyFindOneEntity', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect(entity.uniqId).toBe('PP-001');
        expect(entity.content).toBe('<p>Politique de confidentialité</p>');
    });

    it("n'a pas de champ publishedAt (absent du DTO find-one)", () => {
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
        expect(unpublished.status).toBe(PrivacyPolicyStatus.UNPUBLISH);
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

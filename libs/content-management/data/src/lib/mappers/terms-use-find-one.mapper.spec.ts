import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { TermsUseStatus } from '@cmz/content-management-domain';
import { TermsUseFindOneMapper } from './terms-use-find-one.mapper';
import type { TermsUseFindOneItemApiDto } from '../dtos/terms-use-find-one-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `content-management`, 12/12 fichiers (module complet — dernier module du
 * chantier « mappers concrets », 12/12 modules atteints). Même écart
 * liste/détail que `LegalNoticeFindOneMapper`/`PrivacyPolicyFindOneMapper` :
 * pas de `published_at` ici.
 */
function makeItemDto(
    partial: Partial<TermsUseFindOneItemApiDto> = {}
): TermsUseFindOneItemApiDto {
    return {
        id: 'TU-001',
        version: 'v3.1',
        content: "<p>Conditions d'utilisation</p>",
        is_published: true,
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

function createMapper(): TermsUseFindOneMapper {
    return new TermsUseFindOneMapper();
}

describe('TermsUseFindOneMapper', () => {
    it('mappe le wire vers TermsUseFindOneEntity', () => {
        const entity = createMapper().mapFromDto({
            error: false,
            message: '',
            data: makeItemDto(),
        });
        expect(entity.uniqId).toBe('TU-001');
        expect(entity.content).toBe("<p>Conditions d'utilisation</p>");
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
        expect(unpublished.status).toBe(TermsUseStatus.UNPUBLISH);
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

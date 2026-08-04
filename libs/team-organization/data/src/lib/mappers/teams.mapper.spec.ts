import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import { TeamsStatus } from '@cmz/team-organization-domain';
import { TeamsMapper } from './teams.mapper';
import type { TeamsItemApiDto } from '../dtos/teams-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `team-organization`, 1/5 fichiers. Aucune dépendance injectée : pas besoin
 * de `createEnvironmentInjector`, `new TeamsMapper()` suffit — mais une
 * nouvelle instance par test reste nécessaire (cache `with()` par
 * `uniqId`+`updatedAt`, même piège que `communication`).
 */
function makePaginatedResponse(
    items: TeamsItemApiDto[]
): PaginatedResponseDto<TeamsItemApiDto> {
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

function makeItemDto(partial: Partial<TeamsItemApiDto> = {}): TeamsItemApiDto {
    return {
        uniq_id: 'TEAM-001',
        code: 'T01',
        name: 'Équipe Littoral',
        slug: 'equipe-littoral',
        description: 'Équipe couvrant le Littoral',
        members_count: '12',
        is_active: true,
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

describe('TeamsMapper', () => {
    it('mappe le wire vers TeamsEntity', () => {
        const mapper = new TeamsMapper();
        const entity = mapper.mapFromDto(makePaginatedResponse([makeItemDto()]))
            .items[0];

        expect(entity.uniqId).toBe('TEAM-001');
        expect(entity.code).toBe('T01');
        expect(entity.name).toBe('Équipe Littoral');
        expect(entity.description).toBe('Équipe couvrant le Littoral');
        expect(entity.membersCount).toBe('12');
        expect(entity.updatedAt).toBe('2026-07-02T10:00:00Z');
    });

    it("ignore slug — présent au wire, aucun getter côté entité (fidèle au source)", () => {
        const entity = new TeamsMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ slug: 'autre-slug' })])
        ).items[0];
        expect('slug' in entity).toBe(false);
    });

    it('dérive status ACTIVE quand is_active est true', () => {
        const entity = new TeamsMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ is_active: true })])
        ).items[0];
        expect(entity.status).toBe(TeamsStatus.ACTIVE);
    });

    it('dérive status INACTIVE quand is_active est false', () => {
        const entity = new TeamsMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ is_active: false })])
        ).items[0];
        expect(entity.status).toBe(TeamsStatus.INACTIVE);
    });

    it('lève une erreur si uniq_id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            new TeamsMapper().mapFromDto(
                makePaginatedResponse([
                    makeItemDto({ uniq_id: undefined as never }),
                ])
            )
        ).toThrow('Missing required fields: uniq_id');
    });
});

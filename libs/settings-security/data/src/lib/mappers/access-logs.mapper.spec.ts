import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import { AccessLogsAction } from '@cmz/settings-security-domain';
import { AccessLogsMapper } from './access-logs.mapper';
import type { AccessLogsItemApiDto } from '../dtos/access-logs-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `settings-security`, 3/6 fichiers. Le commentaire du mapper documente un
 * vrai fix par rapport au source : `action` (string large au wire) est
 * validée et typée ici via `isAccessLogsAction` — le source laisse
 * `AccessLogsEntity.action: string` non validé (code mort confirmé :
 * `AccessLogsActionsMapper.mapToEnum` existe mais n'est jamais appelé sur
 * ce chemin). Vérifié ici pour de vrai.
 */
function makePaginatedResponse(
    items: AccessLogsItemApiDto[]
): PaginatedResponseDto<AccessLogsItemApiDto> {
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
    partial: Partial<AccessLogsItemApiDto> = {}
): AccessLogsItemApiDto {
    return {
        id: 'LOG-001',
        action: 'login',
        source: 'web',
        used_agent: 'Mozilla/5.0',
        created_at: '2026-07-01T10:00:00Z',
        ...partial,
    };
}

describe('AccessLogsMapper', () => {
    it('mappe le wire vers AccessLogsEntity, userAgent vient de used_agent (typo wire fidèle)', () => {
        const entity = new AccessLogsMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];

        expect(entity.uniqId).toBe('LOG-001');
        expect(entity.action).toBe(AccessLogsAction.LOGIN);
        expect(entity.source).toBe('web');
        expect(entity.userAgent).toBe('Mozilla/5.0');
        expect(entity.createdAt).toBe('2026-07-01T10:00:00Z');
    });

    it('valide action via isAccessLogsAction (les 5 valeurs wire réelles)', () => {
        for (const action of [
            'login',
            'logout',
            'attempted_login',
            'blocked_attempted_login',
            'attempts_exceeded',
        ] as const) {
            const entity = new AccessLogsMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ action })])
            ).items[0];
            expect(entity.action).toBe(action);
        }
    });

    it('lève ApiError.invalidResponse si action est une valeur wire inconnue (fix vs code mort du source)', () => {
        expect(() =>
            new AccessLogsMapper().mapFromDto(
                makePaginatedResponse([
                    makeItemDto({ action: 'unknown_event' }),
                ])
            )
        ).toThrow(/AccessLogsAction wire inconnue/);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            new AccessLogsMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ id: undefined as never })])
            )
        ).toThrow('Missing required fields: id');
    });
});

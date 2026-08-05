import { describe, expect, it } from 'vitest';
import { PaginatedResponseDto } from '@cmz/shared-data';
import { Status } from '@cmz/administrative-infrastructure-domain';
import { InfrastructureTypeMapper } from './infrastructure-type.mapper';
import type { InfrastructureTypeItemApiDto } from '../dtos/infrastructure-type-response-api.dto';

/**
 * Chantier L (poursuite, backlog cartographie #4, 2026-08-04) — module
 * `administrative-infrastructure`, 4/6 fichiers.
 */
function makePaginatedResponse(
    items: InfrastructureTypeItemApiDto[]
): PaginatedResponseDto<InfrastructureTypeItemApiDto> {
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
    partial: Partial<InfrastructureTypeItemApiDto> = {}
): InfrastructureTypeItemApiDto {
    return {
        id: 'ITYPE-001',
        name: 'Antenne',
        description: "Type d'infrastructure antenne",
        is_active: true,
        created_at: '2026-07-01T10:00:00Z',
        updated_at: '2026-07-02T10:00:00Z',
        ...partial,
    };
}

describe('InfrastructureTypeMapper', () => {
    it('mappe le wire vers InfrastructureTypeEntity', () => {
        const entity = new InfrastructureTypeMapper().mapFromDto(
            makePaginatedResponse([makeItemDto()])
        ).items[0];
        expect(entity.uniqId).toBe('ITYPE-001');
        expect(entity.name).toBe('Antenne');
        expect(entity.description).toBe("Type d'infrastructure antenne");
        expect(entity.updatedAt).toBe('2026-07-02T10:00:00Z');
    });

    it('dérive status ACTIVE quand is_active est true', () => {
        const entity = new InfrastructureTypeMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ is_active: true })])
        ).items[0];
        expect(entity.status).toBe(Status.ACTIVE);
    });

    it('dérive status INACTIVE quand is_active est false', () => {
        const entity = new InfrastructureTypeMapper().mapFromDto(
            makePaginatedResponse([makeItemDto({ is_active: false })])
        ).items[0];
        expect(entity.status).toBe(Status.INACTIVE);
    });

    it('lève une erreur si id est absent (MapperUtils.validateDto, champ requis)', () => {
        expect(() =>
            new InfrastructureTypeMapper().mapFromDto(
                makePaginatedResponse([makeItemDto({ id: undefined as never })])
            )
        ).toThrow('Missing required fields: id');
    });
});

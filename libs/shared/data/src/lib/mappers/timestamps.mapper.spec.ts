import { describe, expect, it } from 'vitest';
import { TimestampsMapper } from './timestamps.mapper';

/**
 * T12-3 (P2, 2026-08-13) — mapping direct sans nullabilité (contrairement
 * aux autres mappers `report-*`), created_at/updated_at toujours présents.
 */
describe('TimestampsMapper', () => {
    const mapper = new TimestampsMapper();

    it('mapToEntity() mappe created_at/updated_at en camelCase', () => {
        const entity = mapper.mapToEntity({
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-02T00:00:00Z',
        });
        expect(entity).toEqual({
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-02T00:00:00Z',
        });
    });

    it('mapToDto() est l’inverse exact de mapToEntity() (round-trip)', () => {
        const dtoIn = {
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-02T00:00:00Z',
        };
        expect(mapper.mapToDto(mapper.mapToEntity(dtoIn))).toEqual(dtoIn);
    });
});

import { describe, expect, it } from 'vitest';
import { AdministrativeBoundaryMapper } from './administrative-boundary.mapper';

/** T12-3 (P2, 2026-08-13) — null-safe dans les deux sens, pattern déjà vu (ActorMapper). */
describe('AdministrativeBoundaryMapper', () => {
    const mapper = new AdministrativeBoundaryMapper();

    it('mapToEntity() mappe id/name/code tels quels', () => {
        const entity = mapper.mapToEntity({
            id: 'AB-1',
            name: 'Région Centre',
            code: 'CTR',
        });
        expect(entity).toEqual({
            id: 'AB-1',
            name: 'Région Centre',
            code: 'CTR',
        });
    });

    it('mapToEntity() retourne null si le DTO est null', () => {
        expect(mapper.mapToEntity(null)).toBeNull();
    });

    it('mapToDto() mappe l’entité vers le DTO', () => {
        const dto = mapper.mapToDto({
            id: 'AB-1',
            name: 'Région Centre',
            code: 'CTR',
        });
        expect(dto).toEqual({ id: 'AB-1', name: 'Région Centre', code: 'CTR' });
    });

    it('mapToDto() retourne null si l’entité est null', () => {
        expect(mapper.mapToDto(null)).toBeNull();
    });
});

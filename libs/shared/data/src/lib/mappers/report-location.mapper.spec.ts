import { LocationMethod, LocationType } from '@cmz/shared-domain';
import { describe, expect, it } from 'vitest';
import { ReportLocationMapper } from './report-location.mapper';

/**
 * T12-3 (P2, 2026-08-13) — null-safe dans les deux sens. Distinct de
 * `LocationMapper` (data/mappers/location.mapper.ts) : celui-ci mappe
 * domaine↔wire au format `ReportLocationEntity`/`ReportLocationDto` déjà
 * en forme domaine (pas de parsing de coordonnées string→number ici).
 */
describe('ReportLocationMapper', () => {
    const mapper = new ReportLocationMapper();
    const coordinates = {
        latitude: 3.848,
        longitude: 11.502,
        what3words: 'a.b.c',
    };

    it('mapToEntity() mappe tous les champs tels quels', () => {
        const entity = mapper.mapToEntity({
            coordinates,
            method: LocationMethod.AUTO,
            type: LocationType.GPS,
            name: 'Domicile',
            description: 'Près du marché',
        });
        expect(entity).toEqual({
            coordinates,
            method: LocationMethod.AUTO,
            type: LocationType.GPS,
            name: 'Domicile',
            description: 'Près du marché',
        });
    });

    it('mapToEntity() retourne null si le DTO est null', () => {
        expect(mapper.mapToEntity(null)).toBeNull();
    });

    it('mapToDto() est l’inverse exact de mapToEntity() (round-trip)', () => {
        const dtoIn = {
            coordinates,
            method: LocationMethod.MANUAL,
            type: LocationType.WHAT3WORDS,
            name: '',
            description: '',
        };
        const roundTripped = mapper.mapToDto(mapper.mapToEntity(dtoIn));
        expect(roundTripped).toEqual(dtoIn);
    });

    it('mapToDto() retourne null si l’entité est null', () => {
        expect(mapper.mapToDto(null)).toBeNull();
    });
});

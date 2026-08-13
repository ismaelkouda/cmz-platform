import { LocationType } from '@cmz/shared-domain';
import { describe, expect, it } from 'vitest';
import { LocationTypeDto } from '../dtos/location-type.dto';
import { LocationTypeMapper } from './location-type.mapper';

/**
 * T12-3 (P1, 2026-08-13) — pattern guard+throw. Même point notable que
 * `LocationMethodMapper` : le DTO wire a une valeur `UNKNOWN` absente du
 * domaine `LocationType` (4 valeurs : gps/network/manual/what3words).
 */
describe('LocationTypeMapper', () => {
    const mapper = new LocationTypeMapper();

    it('mapFromDto accepte les 4 types connus du domaine', () => {
        expect(mapper.mapFromDto(LocationTypeDto.GPS)).toBe(LocationType.GPS);
        expect(mapper.mapFromDto(LocationTypeDto.NETWORK)).toBe(
            LocationType.NETWORK
        );
        expect(mapper.mapFromDto(LocationTypeDto.MANUAL)).toBe(
            LocationType.MANUAL
        );
        expect(mapper.mapFromDto(LocationTypeDto.WHAT3WORDS)).toBe(
            LocationType.WHAT3WORDS
        );
    });

    it('mapFromDto lève ApiError sur UNKNOWN — valeur wire légitime mais absente du domaine', () => {
        expect(() => mapper.mapFromDto(LocationTypeDto.UNKNOWN)).toThrow(
            /LocationType wire inconnue/
        );
    });

    it('mapToDto restitue la valeur wire identique au domaine', () => {
        expect(mapper.mapToDto(LocationType.WHAT3WORDS)).toBe('what3words');
    });

    it('parse() lève ApiError sur une chaîne arbitraire', () => {
        expect(() => mapper.parse('not-a-type')).toThrow(
            /LocationType wire inconnue/
        );
    });
});

import { LocationMethod } from '@cmz/shared-domain';
import { describe, expect, it } from 'vitest';
import { LocationMethodDto } from '../dtos/location-method.dto';
import { LocationMethodMapper } from './location-method.mapper';

/**
 * T12-3 (P1, 2026-08-13) — pattern guard+throw. Point notable : le DTO wire
 * a une 3e valeur `UNKNOWN` que le domaine `LocationMethod` n'a pas
 * (2 valeurs seulement, `auto`/`manual`) — verrouille explicitement que
 * `UNKNOWN` est rejeté, pas silencieusement toléré.
 */
describe('LocationMethodMapper', () => {
    const mapper = new LocationMethodMapper();

    it('mapFromDto accepte les 2 méthodes connues du domaine (auto/manual)', () => {
        expect(mapper.mapFromDto(LocationMethodDto.AUTO)).toBe(
            LocationMethod.AUTO
        );
        expect(mapper.mapFromDto(LocationMethodDto.MANUAL)).toBe(
            LocationMethod.MANUAL
        );
    });

    it('mapFromDto lève ApiError sur UNKNOWN — valeur wire légitime mais absente du domaine', () => {
        expect(() => mapper.mapFromDto(LocationMethodDto.UNKNOWN)).toThrow(
            /LocationMethod wire inconnue/
        );
    });

    it('mapFromDto lève ApiError sur une valeur wire totalement inconnue', () => {
        expect(() => mapper.mapFromDto('bogus' as LocationMethodDto)).toThrow(
            /LocationMethod wire inconnue/
        );
    });

    it('mapToDto restitue la valeur wire identique au domaine', () => {
        expect(mapper.mapToDto(LocationMethod.AUTO)).toBe('auto');
    });

    it('parse() lève ApiError sur une chaîne arbitraire', () => {
        expect(() => mapper.parse('not-a-method')).toThrow(
            /LocationMethod wire inconnue/
        );
    });
});

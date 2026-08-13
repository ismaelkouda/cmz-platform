import { Role } from '@cmz/shared-domain';
import { describe, expect, it } from 'vitest';
import { ResponsibilitiesDto } from '../dtos/responsibilities.dto';
import { ResponsibilitiesMapper } from './responsibilities.mapper';

/**
 * T12-3 (P2, 2026-08-13) — pattern guard+throw, même remarque que
 * `ProfilesMapper` : wire `responsibilities` code déjà `leader`
 * directement, pas de divergence à traduire (contrairement à
 * `RolesMapper`).
 */
describe('ResponsibilitiesMapper', () => {
    const mapper = new ResponsibilitiesMapper();

    it('mapFromDto accepte les 3 responsabilités wire sans transformation', () => {
        expect(mapper.mapFromDto(ResponsibilitiesDto.SUPERVISOR)).toBe(
            Role.SUPERVISOR
        );
        expect(mapper.mapFromDto(ResponsibilitiesDto.LEADER)).toBe(Role.LEADER);
        expect(mapper.mapFromDto(ResponsibilitiesDto.AGENT)).toBe(Role.AGENT);
    });

    it('mapFromDto lève ApiError sur une valeur wire inconnue', () => {
        expect(() => mapper.mapFromDto('bogus' as ResponsibilitiesDto)).toThrow(
            /ResponsibilitiesDto wire inconnue/
        );
    });

    it('mapToDto restitue la valeur wire identique au domaine', () => {
        expect(mapper.mapToDto(Role.AGENT)).toBe('agent');
    });
});

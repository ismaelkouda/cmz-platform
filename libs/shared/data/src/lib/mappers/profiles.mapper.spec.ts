import { Role } from '@cmz/shared-domain';
import { describe, expect, it } from 'vitest';
import { ProfilesDto } from '../dtos/profiles.dto';
import { ProfilesMapper } from './profiles.mapper';

/**
 * T12-3 (P2, 2026-08-13) — pattern guard+throw. Contrairement à
 * `RolesMapper` (wire `roles`, `team-leader` → `LEADER`), le wire
 * `profiles` code déjà `leader` directement — pas de divergence à
 * traduire ici, juste un `isRole()` narrowing. Verrouille explicitement
 * cette absence de transformation, pour ne pas confondre les deux mappers
 * lors d'une future modification.
 */
describe('ProfilesMapper', () => {
    const mapper = new ProfilesMapper();

    it('mapFromDto accepte les 3 profils wire sans transformation (pas de divergence, contrairement à RolesMapper)', () => {
        expect(mapper.mapFromDto(ProfilesDto.SUPERVISOR)).toBe(Role.SUPERVISOR);
        expect(mapper.mapFromDto(ProfilesDto.LEADER)).toBe(Role.LEADER);
        expect(mapper.mapFromDto(ProfilesDto.AGENT)).toBe(Role.AGENT);
    });

    it('mapFromDto lève ApiError sur une valeur wire inconnue', () => {
        expect(() => mapper.mapFromDto('bogus' as ProfilesDto)).toThrow(
            /ProfilesDto wire inconnue/
        );
    });

    it('mapToDto restitue la valeur wire identique au domaine', () => {
        expect(mapper.mapToDto(Role.LEADER)).toBe('leader');
    });
});

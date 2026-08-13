import { describe, expect, it } from 'vitest';
import { Role } from '@cmz/shared-domain';
import { RolesDto } from '../dtos/roles.dto';
import { RolesMapper } from './roles.mapper';

/**
 * T12-3 (cartographie 2026-08-12) — jamais testé, 9 appelants. Wire `roles`
 * diverge du code domaine (`team-leader` ↔ `leader`, cf. docstring du
 * mapper) : une régression silencieuse ici casse le mapping du rôle
 * "leader" dans tout module consommant `RolesDto`, sans erreur de
 * compilation (le mapping se fait par `Record`, pas par exhaustivité TS
 * vérifiée à l'usage).
 */
describe('RolesMapper', () => {
    const mapper = new RolesMapper();

    it('mapFromDto traduit "team-leader" (wire) en Role.LEADER (domaine) — la divergence documentée', () => {
        expect(mapper.mapFromDto(RolesDto['TEAM-LEADER'])).toBe(Role.LEADER);
    });

    it('mapFromDto traduit supervisor/agent sans changement de code', () => {
        expect(mapper.mapFromDto(RolesDto.SUPERVISOR)).toBe(Role.SUPERVISOR);
        expect(mapper.mapFromDto(RolesDto.AGENT)).toBe(Role.AGENT);
    });

    it('mapFromDto retourne null si dto est null', () => {
        expect(mapper.mapFromDto(null)).toBeNull();
    });

    it('mapToDto traduit Role.LEADER (domaine) en "team-leader" (wire) — round-trip cohérent avec mapFromDto', () => {
        expect(mapper.mapToDto(Role.LEADER)).toBe(RolesDto['TEAM-LEADER']);
    });

    it('mapToDto traduit supervisor/agent sans changement de code', () => {
        expect(mapper.mapToDto(Role.SUPERVISOR)).toBe(RolesDto.SUPERVISOR);
        expect(mapper.mapToDto(Role.AGENT)).toBe(RolesDto.AGENT);
    });

    it('round-trip : mapToDto puis mapFromDto restitue le même Role pour les 3 valeurs', () => {
        for (const role of Object.values(Role)) {
            expect(mapper.mapFromDto(mapper.mapToDto(role))).toBe(role);
        }
    });
});

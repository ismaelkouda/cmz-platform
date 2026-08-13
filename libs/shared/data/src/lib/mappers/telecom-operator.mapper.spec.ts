import { describe, expect, it } from 'vitest';
import { TelecomOperator } from '@cmz/shared-domain';
import { TelecomOperatorMapper } from './telecom-operator.mapper';

/**
 * T12-3 (cartographie 2026-08-12) — jamais testé, 20 appelants. Contrairement
 * à `RolesMapper`, wire = domaine ici (pas de table de correspondance) : le
 * risque n'est pas un mauvais mapping mais une valeur wire inconnue qui
 * passerait silencieusement au lieu de faire échouer tôt (`ApiError`).
 */
describe('TelecomOperatorMapper', () => {
    const mapper = new TelecomOperatorMapper();

    it('mapFromDto accepte les 3 opérateurs connus (mtn/orange/moov) sans transformation', () => {
        expect(mapper.mapFromDto('mtn')).toBe(TelecomOperator.MTN);
        expect(mapper.mapFromDto('orange')).toBe(TelecomOperator.ORANGE);
        expect(mapper.mapFromDto('moov')).toBe(TelecomOperator.MOOV);
    });

    it('mapFromDto lève ApiError sur une valeur wire inconnue', () => {
        expect(() => mapper.mapFromDto('bogus' as never)).toThrow(
            /TelecomOperator wire inconnue/
        );
    });

    it('mapToDto restitue la valeur wire identique au domaine', () => {
        expect(mapper.mapToDto(TelecomOperator.MTN)).toBe('mtn');
    });

    it('parse() accepte une chaîne connue', () => {
        expect(mapper.parse('orange')).toBe(TelecomOperator.ORANGE);
    });

    it('parse() lève ApiError sur une chaîne arbitraire (entrée brute non typée)', () => {
        expect(() => mapper.parse('not-an-operator')).toThrow(
            /TelecomOperator wire inconnue/
        );
    });
});

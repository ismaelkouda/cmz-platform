import { describe, expect, it } from 'vitest';
import { ReportSource } from '@cmz/shared-domain';
import { ReportSourceMapper } from './report-source.mapper';

/**
 * T12-3 (cartographie 2026-08-12) — jamais testé, 18 appelants. Même
 * pattern guard+throw que `TelecomOperatorMapper`/`ReportTypeMapper` — 5
 * canaux (app/pwa/ussd/sms/ivr), le domaine source précise « couvre tout
 * le DTO, pwa et unknown inclus » : verrouille explicitement `pwa`, le
 * canal le moins évident du lot.
 */
describe('ReportSourceMapper', () => {
    const mapper = new ReportSourceMapper();

    it('mapFromDto accepte les 5 canaux connus (app/pwa/ussd/sms/ivr) sans transformation', () => {
        expect(mapper.mapFromDto('app')).toBe(ReportSource.APP);
        expect(mapper.mapFromDto('pwa')).toBe(ReportSource.PWA);
        expect(mapper.mapFromDto('ussd')).toBe(ReportSource.USSD);
        expect(mapper.mapFromDto('sms')).toBe(ReportSource.SMS);
        expect(mapper.mapFromDto('ivr')).toBe(ReportSource.IVR);
    });

    it('mapFromDto lève ApiError sur une valeur wire inconnue', () => {
        expect(() => mapper.mapFromDto('bogus' as never)).toThrow(
            /ReportSource wire inconnue/
        );
    });

    it('mapToDto restitue la valeur wire identique au domaine', () => {
        expect(mapper.mapToDto(ReportSource.PWA)).toBe('pwa');
    });

    it('parse() accepte une chaîne connue', () => {
        expect(mapper.parse('ivr')).toBe(ReportSource.IVR);
    });

    it('parse() lève ApiError sur une chaîne arbitraire (entrée brute non typée)', () => {
        expect(() => mapper.parse('not-a-source')).toThrow(
            /ReportSource wire inconnue/
        );
    });
});

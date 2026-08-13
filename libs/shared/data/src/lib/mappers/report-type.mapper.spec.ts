import { describe, expect, it } from 'vitest';
import { ReportType } from '@cmz/shared-domain';
import { ReportTypeMapper } from './report-type.mapper';

/**
 * T12-3 (cartographie 2026-08-12) — jamais testé, 18 appelants. Même
 * pattern guard+throw que `TelecomOperatorMapper`/`ReportSourceMapper` —
 * ne pas confondre `ReportType` (ABI/ZOB/CPS/CPO, type de signalement) avec
 * `TypeReport` (étape workflow), distinction explicitée dans le docstring
 * de l'enum source.
 */
describe('ReportTypeMapper', () => {
    const mapper = new ReportTypeMapper();

    it('mapFromDto accepte les 4 types connus (abi/zob/cps/cpo) sans transformation', () => {
        expect(mapper.mapFromDto('abi')).toBe(ReportType.ABI);
        expect(mapper.mapFromDto('zob')).toBe(ReportType.ZOB);
        expect(mapper.mapFromDto('cps')).toBe(ReportType.CPS);
        expect(mapper.mapFromDto('cpo')).toBe(ReportType.CPO);
    });

    it('mapFromDto lève ApiError sur une valeur wire inconnue', () => {
        expect(() => mapper.mapFromDto('bogus' as never)).toThrow(
            /ReportType wire inconnue/
        );
    });

    it('mapToDto restitue la valeur wire identique au domaine', () => {
        expect(mapper.mapToDto(ReportType.ABI)).toBe('abi');
    });

    it('parse() accepte une chaîne connue', () => {
        expect(mapper.parse('cps')).toBe(ReportType.CPS);
    });

    it('parse() lève ApiError sur une chaîne arbitraire (entrée brute non typée)', () => {
        expect(() => mapper.parse('not-a-type')).toThrow(
            /ReportType wire inconnue/
        );
    });
});

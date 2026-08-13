import { Platform } from '@cmz/shared-domain';
import { describe, expect, it } from 'vitest';
import { PlatformDto } from '../dtos/platform.dto';
import { PlatformMapper } from './platform.mapper';

/** T12-3 (P2, 2026-08-13) — pattern guard+throw, même famille que TelecomOperatorMapper/ReportTypeMapper. */
describe('PlatformMapper', () => {
    const mapper = new PlatformMapper();

    it('mapFromDto accepte les 3 canaux connus (mobile/web/pwa) sans transformation', () => {
        expect(mapper.mapFromDto(PlatformDto.MOBILE)).toBe(Platform.MOBILE);
        expect(mapper.mapFromDto(PlatformDto.WEB)).toBe(Platform.WEB);
        expect(mapper.mapFromDto(PlatformDto.PWA)).toBe(Platform.PWA);
    });

    it('mapFromDto lève ApiError sur une valeur wire inconnue', () => {
        expect(() => mapper.mapFromDto('bogus' as PlatformDto)).toThrow(
            /Platform wire inconnue/
        );
    });

    it('mapToDto restitue la valeur wire identique au domaine', () => {
        expect(mapper.mapToDto(Platform.PWA)).toBe('pwa');
    });

    it('parse() accepte une chaîne connue (forms/query params)', () => {
        expect(mapper.parse('web')).toBe(Platform.WEB);
    });

    it('parse() lève ApiError sur une chaîne arbitraire', () => {
        expect(() => mapper.parse('not-a-platform')).toThrow(
            /Platform wire inconnue/
        );
    });
});

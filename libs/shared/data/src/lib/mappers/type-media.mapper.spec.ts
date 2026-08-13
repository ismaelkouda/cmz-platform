import { TypeMedia } from '@cmz/shared-domain';
import { describe, expect, it } from 'vitest';
import { TypeMediaDto } from '../dtos/type-media.dto';
import { TypeMediaMapper } from './type-media.mapper';

/** T12-3 (P2, 2026-08-13) — pattern guard+throw, même famille que TelecomOperatorMapper/ReportTypeMapper. */
describe('TypeMediaMapper', () => {
    const mapper = new TypeMediaMapper();

    it('mapFromDto accepte les 2 types connus (image/video) sans transformation', () => {
        expect(mapper.mapFromDto(TypeMediaDto.IMAGE)).toBe(TypeMedia.IMAGE);
        expect(mapper.mapFromDto(TypeMediaDto.VIDEO)).toBe(TypeMedia.VIDEO);
    });

    it('mapFromDto lève ApiError sur une valeur wire inconnue', () => {
        expect(() => mapper.mapFromDto('bogus' as TypeMediaDto)).toThrow(
            /TypeMedia wire inconnue/
        );
    });

    it('mapToDto restitue la valeur wire identique au domaine', () => {
        expect(mapper.mapToDto(TypeMedia.IMAGE)).toBe('image');
    });

    it('parse() accepte une chaîne connue', () => {
        expect(mapper.parse('video')).toBe(TypeMedia.VIDEO);
    });

    it('parse() lève ApiError sur une chaîne arbitraire', () => {
        expect(() => mapper.parse('not-a-media')).toThrow(
            /TypeMedia wire inconnue/
        );
    });
});

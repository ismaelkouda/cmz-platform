import { PriorityLevel } from '@cmz/shared-domain';
import { describe, expect, it } from 'vitest';
import { PriorityLevelDto } from '../dtos/priority-level.dto';
import { PriorityLevelMapper } from './priority-level.mapper';

/** T12-3 (P2, 2026-08-13) — pattern guard+throw, même famille que TelecomOperatorMapper/ReportTypeMapper. */
describe('PriorityLevelMapper', () => {
    const mapper = new PriorityLevelMapper();

    it('mapFromDto accepte les 4 niveaux connus (low/medium/high/critical) sans transformation', () => {
        expect(mapper.mapFromDto(PriorityLevelDto.LOW)).toBe(PriorityLevel.LOW);
        expect(mapper.mapFromDto(PriorityLevelDto.MEDIUM)).toBe(
            PriorityLevel.MEDIUM
        );
        expect(mapper.mapFromDto(PriorityLevelDto.HIGH)).toBe(
            PriorityLevel.HIGH
        );
        expect(mapper.mapFromDto(PriorityLevelDto.CRITICAL)).toBe(
            PriorityLevel.CRITICAL
        );
    });

    it('mapFromDto lève ApiError sur une valeur wire inconnue', () => {
        expect(() => mapper.mapFromDto('bogus' as PriorityLevelDto)).toThrow(
            /PriorityLevel wire inconnue/
        );
    });

    it('mapToDto restitue la valeur wire identique au domaine', () => {
        expect(mapper.mapToDto(PriorityLevel.CRITICAL)).toBe('critical');
    });

    it('parse() lève ApiError sur une chaîne arbitraire', () => {
        expect(() => mapper.parse('not-a-priority')).toThrow(
            /PriorityLevel wire inconnue/
        );
    });
});

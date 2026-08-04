import { describe, expect, it } from 'vitest';
import { parseAndValidateDateRange } from './date-range.util';

/**
 * Chantier L (onzième passe, 2026-08-04) — `parseAndValidateDateRange` est la
 * seule validation de plage de dates du dépôt, utilisée par les filtres de
 * recherche (période début/fin). Convention documentée en commentaire source
 * mais jamais vérifiée par un test : une borne absente ou invalide rend la
 * plage "non comparable", donc valide par convention — seule une plage où
 * les deux bornes sont valides ET start > end est invalide.
 */
describe('parseAndValidateDateRange', () => {
    it('valide une plage normale (start avant end)', () => {
        const result = parseAndValidateDateRange('2026-01-01', '2026-01-31');
        expect(result.isValidRange).toBe(true);
        expect(result.startDate).toBeInstanceOf(Date);
        expect(result.endDate).toBeInstanceOf(Date);
    });

    it('invalide une plage où start est après end', () => {
        const result = parseAndValidateDateRange('2026-01-31', '2026-01-01');
        expect(result.isValidRange).toBe(false);
    });

    it('considère une plage valide quand start === end (limite, pas isAfter)', () => {
        const result = parseAndValidateDateRange('2026-01-15', '2026-01-15');
        expect(result.isValidRange).toBe(true);
    });

    it('considère valide (non comparable) quand start est absent', () => {
        const result = parseAndValidateDateRange(undefined, '2026-01-31');
        expect(result.isValidRange).toBe(true);
        expect(result.startDate).toBeUndefined();
        expect(result.endDate).toBeInstanceOf(Date);
    });

    it('considère valide (non comparable) quand end est absent', () => {
        const result = parseAndValidateDateRange('2026-01-01', undefined);
        expect(result.isValidRange).toBe(true);
        expect(result.endDate).toBeUndefined();
    });

    it('considère valide (non comparable) quand les deux bornes sont absentes', () => {
        const result = parseAndValidateDateRange(undefined, undefined);
        expect(result.isValidRange).toBe(true);
        expect(result.startDate).toBeUndefined();
        expect(result.endDate).toBeUndefined();
    });

    it('considère valide (non comparable) quand start est une chaîne ISO invalide', () => {
        const result = parseAndValidateDateRange('pas-une-date', '2026-01-31');
        expect(result.isValidRange).toBe(true);
    });

    it('considère valide (non comparable) quand end est une chaîne ISO invalide', () => {
        const result = parseAndValidateDateRange('2026-01-01', 'pas-une-date');
        expect(result.isValidRange).toBe(true);
    });
});

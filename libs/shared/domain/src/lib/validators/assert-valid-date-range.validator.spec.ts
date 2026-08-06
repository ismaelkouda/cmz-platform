import { describe, expect, it } from 'vitest';
import { assertValidDateRange } from './assert-valid-date-range.validator';
import { DateRangeInvalidError } from '../errors/validation/date-range-invalid.error';

/**
 * Chantier L (onzième passe, 2026-08-04) — assertion partagée : ne lève que
 * si les DEUX bornes sont fournies ET startDate > endDate. Jamais testée.
 */
describe('assertValidDateRange', () => {
    it('ne lève rien quand startDate est avant endDate', () => {
        expect(() =>
            assertValidDateRange(new Date('2026-01-01'), new Date('2026-01-31'))
        ).not.toThrow();
    });

    it('ne lève rien quand startDate === endDate (limite, pas >)', () => {
        const d = new Date('2026-01-15');
        expect(() => assertValidDateRange(d, new Date(d))).not.toThrow();
    });

    it('lève DateRangeInvalidError quand startDate est après endDate', () => {
        expect(() =>
            assertValidDateRange(new Date('2026-01-31'), new Date('2026-01-01'))
        ).toThrow(DateRangeInvalidError);
    });

    it('ne lève rien quand seul startDate est fourni (non comparable)', () => {
        expect(() =>
            assertValidDateRange(new Date('2026-01-01'), undefined)
        ).not.toThrow();
    });

    it('ne lève rien quand seul endDate est fourni (non comparable)', () => {
        expect(() =>
            assertValidDateRange(undefined, new Date('2026-01-01'))
        ).not.toThrow();
    });

    it("ne lève rien quand aucune des deux bornes n'est fournie", () => {
        expect(() => assertValidDateRange(undefined, undefined)).not.toThrow();
    });
});

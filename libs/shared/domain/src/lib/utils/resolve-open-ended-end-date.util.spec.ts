import { describe, expect, it } from 'vitest';
import { resolveOpenEndedEndDate } from './resolve-open-ended-end-date.util';

/**
 * Chantier L (onzième passe, 2026-08-04) — règle métier partagée : un filtre
 * avec seulement une date de début est traité comme une plage ouverte
 * jusqu'à aujourd'hui. Jamais testé.
 */
describe('resolveOpenEndedEndDate', () => {
    it("retourne la date du jour quand startDate est fourni sans endDate", () => {
        const before = Date.now();
        const result = resolveOpenEndedEndDate(new Date('2026-01-01'));
        const after = Date.now();
        expect(result).toBeInstanceOf(Date);
        expect((result as Date).getTime()).toBeGreaterThanOrEqual(before);
        expect((result as Date).getTime()).toBeLessThanOrEqual(after);
    });

    it('retourne endDate inchangée quand les deux bornes sont fournies', () => {
        const end = new Date('2026-01-31');
        const result = resolveOpenEndedEndDate(new Date('2026-01-01'), end);
        expect(result).toBe(end);
    });

    it('retourne undefined quand ni startDate ni endDate ne sont fournis', () => {
        expect(resolveOpenEndedEndDate(undefined, undefined)).toBeUndefined();
    });

    it('retourne endDate inchangée (undefined ou non) quand startDate est absent — la garde `startDate && !endDate` ne se déclenche que si startDate est fourni', () => {
        const end = new Date('2026-01-31');
        expect(resolveOpenEndedEndDate(undefined, end)).toBe(end);
        expect(resolveOpenEndedEndDate(undefined, undefined)).toBeUndefined();
    });
});

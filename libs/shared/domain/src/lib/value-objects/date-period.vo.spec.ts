import { describe, expect, it } from 'vitest';
import { DatePeriod } from './date-period.vo';
import { InvalidStartDateError } from '../errors/date-period/invalid-start-date.error';
import { InvalidEndDateError } from '../errors/date-period/invalid-end-date.error';
import { InvalidDateRangeError } from '../errors/date-period/invalid-date-range.error';

/**
 * Chantier L (onzième passe, 2026-08-04) — `DatePeriod` est le seul value
 * object de plage de dates avec constructeur privé (fabrique via `create`/
 * `createOptional`) — 3 gardes de validation distinctes, jamais testées.
 */
describe('DatePeriod.create', () => {
    it('construit une période valide à partir de chaînes ISO', () => {
        const period = DatePeriod.create('2026-01-01', '2026-01-31');
        expect(period.start).toBeInstanceOf(Date);
        expect(period.end).toBeInstanceOf(Date);
    });

    it('accepte une seule borne (start seul)', () => {
        const period = DatePeriod.create('2026-01-01', undefined);
        expect(period.start).toBeInstanceOf(Date);
        expect(period.end).toBeUndefined();
    });

    it('accepte aucune borne (les deux undefined)', () => {
        const period = DatePeriod.create(undefined, undefined);
        expect(period.start).toBeUndefined();
        expect(period.end).toBeUndefined();
    });

    it('traite null comme absent, au même titre que undefined', () => {
        const period = DatePeriod.create(null, null);
        expect(period.start).toBeUndefined();
        expect(period.end).toBeUndefined();
    });

    it('lève InvalidStartDateError si start est une chaîne non parsable', () => {
        expect(() => DatePeriod.create('pas-une-date', undefined)).toThrow(
            InvalidStartDateError
        );
    });

    it('lève InvalidEndDateError si end est une chaîne non parsable (start valide ou absent)', () => {
        expect(() => DatePeriod.create(undefined, 'pas-une-date')).toThrow(
            InvalidEndDateError
        );
    });

    it('priorise InvalidStartDateError sur InvalidEndDateError quand les deux bornes sont invalides', () => {
        expect(() =>
            DatePeriod.create('pas-une-date', 'pas-une-date-non-plus')
        ).toThrow(InvalidStartDateError);
    });

    it('lève InvalidDateRangeError quand start est après end, toutes deux valides', () => {
        expect(() => DatePeriod.create('2026-01-31', '2026-01-01')).toThrow(
            InvalidDateRangeError
        );
    });

    it('accepte start === end (limite, pas >)', () => {
        expect(() =>
            DatePeriod.create('2026-01-15', '2026-01-15')
        ).not.toThrow();
    });
});

describe('DatePeriod.createOptional', () => {
    it('retourne null quand les deux bornes sont absentes', () => {
        expect(DatePeriod.createOptional(undefined, undefined)).toBeNull();
    });

    it('retourne null quand les deux bornes sont des chaînes vides', () => {
        expect(DatePeriod.createOptional('', '')).toBeNull();
    });

    it('délègue à create() dès qu’au moins une borne est fournie', () => {
        const period = DatePeriod.createOptional('2026-01-01', undefined);
        expect(period).not.toBeNull();
        expect(period?.start).toBeInstanceOf(Date);
    });

    it('propage les erreurs de validation de create()', () => {
        expect(() =>
            DatePeriod.createOptional('pas-une-date', undefined)
        ).toThrow(InvalidStartDateError);
    });
});

import { AbstractControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { dateNotInPastValidator } from './date-not-in-past.validator';

/**
 * T12-3 (P2, 2026-08-13) — jamais testé. Nom trompeur documenté dans le
 * source : renvoie `pastDate` quand la date est en réalité **future**
 * (comportement préservé du legacy, pas une erreur d'implémentation). Ce
 * test verrouille le comportement RÉEL, pas ce que le nom suggère.
 */
function control(value: unknown): AbstractControl {
    return { value } as AbstractControl;
}

describe('dateNotInPastValidator', () => {
    it('retourne null si la valeur est vide (champ optionnel)', () => {
        expect(dateNotInPastValidator(control(''))).toBeNull();
    });

    it('retourne { invalidDate: true } si la valeur n’est pas une date parsable', () => {
        expect(dateNotInPastValidator(control('not-a-date'))).toEqual({
            invalidDate: true,
        });
    });

    it('retourne { pastDate: true } pour une date dans le FUTUR (comportement réel malgré le nom)', () => {
        const future = new Date();
        future.setDate(future.getDate() + 5);
        expect(dateNotInPastValidator(control(future))).toEqual({
            pastDate: true,
        });
    });

    it('retourne null pour la date du jour (aujourd’hui n’est pas "après" aujourd’hui)', () => {
        expect(dateNotInPastValidator(control(new Date()))).toBeNull();
    });

    it('retourne null pour une date dans le passé', () => {
        const past = new Date();
        past.setDate(past.getDate() - 5);
        expect(dateNotInPastValidator(control(past))).toBeNull();
    });
});

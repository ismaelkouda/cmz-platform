import { AbstractControl, ValidationErrors } from '@angular/forms';
import { isAfter, isValid, startOfDay } from 'date-fns';

/**
 * Validateur de formulaire. Comportement **préservé du source** malgré un nom
 * trompeur : renvoie `pastDate` quand la date est **postérieure** à aujourd'hui
 * (la logique teste le futur). À clarifier avec le métier.
 */
export function dateNotInPastValidator(
    control: AbstractControl
): ValidationErrors | null {
    const value = control.value;
    if (!value) {
        return null;
    }
    const date = new Date(value);
    if (!isValid(date)) {
        return { invalidDate: true };
    }
    if (isAfter(startOfDay(date), startOfDay(new Date()))) {
        return { pastDate: true };
    }
    return null;
}

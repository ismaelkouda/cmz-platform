import { isValid, parse } from 'date-fns';

/** Parse une date française `JJ/MM/AAAA HH:mm:ss` en `Date`, ou `null`. */
export function parseFrenchDate(value: string): Date | null {
    if (!value) {
        return null;
    }
    const date = parse(value, 'dd/MM/yyyy HH:mm:ss', new Date());
    return isValid(date) ? date : null;
}

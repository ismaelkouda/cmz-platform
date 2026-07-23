import { format, isValid } from 'date-fns';

/** Formate une date en `JJ/MM/AAAA HH:mm:ss` (fr), ou `-` si absente/invalide. */
export function formatDateSafe(value: Date | string): string {
    if (!value) {
        return '-';
    }
    const date = new Date(value);
    return isValid(date) ? format(date, 'dd/MM/yyyy HH:mm:ss') : '-';
}

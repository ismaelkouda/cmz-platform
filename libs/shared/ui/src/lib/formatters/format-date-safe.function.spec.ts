import { describe, expect, it } from 'vitest';
import { formatDateSafe } from './format-date-safe.function';

/**
 * T12-3 (P2, 2026-08-13) — jamais testé. Fonction pure, format `date-fns`
 * fixe (fr) avec fallback `-` sur absence/invalidité.
 */
describe('formatDateSafe', () => {
    it('retourne "-" si la valeur est vide (chaîne vide)', () => {
        expect(formatDateSafe('')).toBe('-');
    });

    it('formate un objet Date valide en JJ/MM/AAAA HH:mm:ss', () => {
        const date = new Date(2026, 0, 15, 9, 5, 3); // 15 janvier 2026, 09:05:03 local
        expect(formatDateSafe(date)).toBe('15/01/2026 09:05:03');
    });

    it('formate une chaîne ISO valide', () => {
        const result = formatDateSafe('2026-06-01T12:00:00');
        expect(result).toMatch(/^01\/06\/2026 \d{2}:\d{2}:\d{2}$/);
    });

    it('retourne "-" pour une chaîne non parsable en date valide', () => {
        expect(formatDateSafe('not-a-date')).toBe('-');
    });
});

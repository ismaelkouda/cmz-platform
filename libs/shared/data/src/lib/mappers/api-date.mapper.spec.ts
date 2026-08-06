import { describe, expect, it } from 'vitest';
import { ApiDateMapper } from './api-date.mapper';

/**
 * Chantier L (onzième passe, 2026-08-04) — `ApiDateMapper` sérialise/
 * désérialise les dates au format attendu par l'API (`YYYY-MM-DD` et
 * `YYYY-MM-DD HH:mm:ss`, espace et non `T` — format Laravel/MySQL côté
 * legacy). Utilise l'heure **locale** (`getFullYear`/`getMonth`/`getDate`),
 * pas UTC — point non documenté avant ce test, verrouillé explicitement
 * ci-dessous. Jamais testé.
 */
describe('ApiDateMapper', () => {
    const mapper = new ApiDateMapper();

    it('toDateApi formate en YYYY-MM-DD avec zero-padding', () => {
        const date = new Date(2026, 0, 5); // 5 janvier 2026, heure locale
        expect(mapper.toDateApi(date)).toBe('2026-01-05');
    });

    it('toDateApi zero-pad le mois et le jour à deux chiffres même à un chiffre', () => {
        const date = new Date(2026, 8, 9); // 9 septembre 2026
        expect(mapper.toDateApi(date)).toBe('2026-09-09');
    });

    it('toDateTimeApi formate en YYYY-MM-DD HH:mm:ss (espace, pas T)', () => {
        const date = new Date(2026, 0, 5, 8, 3, 7);
        expect(mapper.toDateTimeApi(date)).toBe('2026-01-05 08:03:07');
    });

    it('fromDateTimeApi parse une chaîne "YYYY-MM-DD HH:mm:ss" en Date valide', () => {
        const result = mapper.fromDateTimeApi('2026-01-05 08:03:07');
        expect(result).toBeInstanceOf(Date);
        expect(Number.isNaN(result.getTime())).toBe(false);
        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(0);
        expect(result.getDate()).toBe(5);
    });

    it('round-trip : toDateTimeApi puis fromDateTimeApi restitue la même date locale', () => {
        const original = new Date(2026, 5, 15, 14, 30, 0);
        const roundTripped = mapper.fromDateTimeApi(
            mapper.toDateTimeApi(original)
        );
        expect(roundTripped.getFullYear()).toBe(original.getFullYear());
        expect(roundTripped.getMonth()).toBe(original.getMonth());
        expect(roundTripped.getDate()).toBe(original.getDate());
        expect(roundTripped.getHours()).toBe(original.getHours());
        expect(roundTripped.getMinutes()).toBe(original.getMinutes());
        expect(roundTripped.getSeconds()).toBe(original.getSeconds());
    });
});

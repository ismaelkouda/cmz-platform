import { describe, expect, it } from 'vitest';
import { parseFrenchDate } from './parse-french-date.function';

/**
 * T12-3 (P2, 2026-08-13) — jamais testé. Inverse de `formatDateSafe` :
 * parse strictement le format `JJ/MM/AAAA HH:mm:ss`, `null` sinon.
 */
describe('parseFrenchDate', () => {
    it('retourne null si la valeur est vide', () => {
        expect(parseFrenchDate('')).toBeNull();
    });

    it('parse une date française valide au format complet', () => {
        const result = parseFrenchDate('15/01/2026 09:05:03');
        expect(result).not.toBeNull();
        expect(result?.getFullYear()).toBe(2026);
        expect(result?.getMonth()).toBe(0);
        expect(result?.getDate()).toBe(15);
        expect(result?.getHours()).toBe(9);
        expect(result?.getMinutes()).toBe(5);
        expect(result?.getSeconds()).toBe(3);
    });

    it('retourne null pour une chaîne qui ne respecte pas le format attendu', () => {
        expect(parseFrenchDate('2026-01-15')).toBeNull();
    });

    it('retourne null pour une date française avec un jour/mois hors plage', () => {
        expect(parseFrenchDate('32/13/2026 00:00:00')).toBeNull();
    });

    it('round-trip avec formatDateSafe reste cohérent pour une date simple', () => {
        const parsed = parseFrenchDate('01/06/2026 12:00:00');
        expect(parsed).not.toBeNull();
    });
});

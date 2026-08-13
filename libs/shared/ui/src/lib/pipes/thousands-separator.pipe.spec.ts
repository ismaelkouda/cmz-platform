import { describe, expect, it } from 'vitest';
import { ThousandsSeparatorPipe } from './thousands-separator.pipe';

/**
 * T12-3 (P2, 2026-08-13) — jamais testé. Fallback '0' sur null/undefined/
 * chaîne vide/NaN — jamais de chaîne vide ou 'NaN' affichée à l'utilisateur.
 */
describe('ThousandsSeparatorPipe', () => {
    const pipe = new ThousandsSeparatorPipe();

    it('retourne "0" pour null', () => {
        expect(pipe.transform(null)).toBe('0');
    });

    it('retourne "0" pour undefined', () => {
        expect(pipe.transform(undefined)).toBe('0');
    });

    it('retourne "0" pour une chaîne vide', () => {
        expect(pipe.transform('')).toBe('0');
    });

    it('retourne "0" pour une chaîne non numérique (NaN après parseFloat)', () => {
        expect(pipe.transform('abc')).toBe('0');
    });

    it('formate un nombre avec séparateur de milliers fr-FR (espace insécable)', () => {
        const result = pipe.transform(1234567);
        expect(result.replace(/\s/g, ' ')).toBe('1 234 567');
    });

    it('formate une chaîne numérique convertie', () => {
        const result = pipe.transform('9876');
        expect(result.replace(/\s/g, ' ')).toBe('9 876');
    });

    it('formate zéro correctement (pas confondu avec le fallback)', () => {
        expect(pipe.transform(0)).toBe('0');
    });
});

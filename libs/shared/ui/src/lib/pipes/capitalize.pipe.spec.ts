import { describe, expect, it } from 'vitest';
import { CapitalizePipe } from './capitalize.pipe';

/**
 * T12-3 (P2, 2026-08-13) — jamais testé. Capitalise chaque mot (`\b\w`),
 * pas seulement le premier caractère de la chaîne.
 */
describe('CapitalizePipe', () => {
    const pipe = new CapitalizePipe();

    it('capitalise la première lettre de chaque mot', () => {
        expect(pipe.transform('bonjour le monde')).toBe('Bonjour Le Monde');
    });

    it('retourne la valeur telle quelle si vide (falsy court-circuite)', () => {
        expect(pipe.transform('')).toBe('');
    });

    it('ne change pas une chaîne déjà capitalisée', () => {
        expect(pipe.transform('Deja Capitalise')).toBe('Deja Capitalise');
    });

    it('capitalise un mot unique', () => {
        expect(pipe.transform('test')).toBe('Test');
    });
});

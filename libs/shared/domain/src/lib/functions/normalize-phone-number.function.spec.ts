import { describe, expect, it } from 'vitest';
import { normalizePhoneNumber } from './normalize-phone-number.function';

/**
 * Chantier L (onzième passe, 2026-08-04, poursuite dans `shared/domain` —
 * 0/65 fichiers couverts avant cette passe). `normalizePhoneNumber` retire
 * tout caractère non numérique (espaces, +, -, parenthèses) — jamais testé.
 */
describe('normalizePhoneNumber', () => {
    it('retourne undefined si phone est undefined', () => {
        expect(normalizePhoneNumber(undefined)).toBeUndefined();
    });

    it('retourne undefined si phone est une chaîne vide', () => {
        expect(normalizePhoneNumber('')).toBeUndefined();
    });

    it('retire les espaces', () => {
        expect(normalizePhoneNumber('01 23 45 67 89')).toBe('0123456789');
    });

    it("retire l'indicatif international (+) et les tirets", () => {
        expect(normalizePhoneNumber('+33-6-12-34-56-78')).toBe('33612345678');
    });

    it('retire les parenthèses', () => {
        expect(normalizePhoneNumber('(01) 23 45 67 89')).toBe('0123456789');
    });

    it('laisse une chaîne déjà normalisée inchangée', () => {
        expect(normalizePhoneNumber('0123456789')).toBe('0123456789');
    });

    it('retourne une chaîne vide si aucun chiffre ne subsiste (pas undefined — entrée non vide)', () => {
        expect(normalizePhoneNumber('abc')).toBe('');
    });
});

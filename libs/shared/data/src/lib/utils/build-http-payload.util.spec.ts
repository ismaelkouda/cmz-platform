import { describe, expect, it } from 'vitest';
import { buildHttpPayload } from './build-http-payload.util';

/**
 * Chantier L (onzième passe, 2026-08-04) — `buildHttpPayload` prépare le
 * corps des requêtes POST/PUT/PATCH (pendant écriture de `buildHttpParams`,
 * pendant lecture — I-8/P-9). Contrairement à `buildHttpParams`, les options
 * skip* ne sont pas configurables ici : undefined/null/'' sont toujours
 * exclus, sans exception — jamais testé jusqu'ici.
 */
describe('buildHttpPayload', () => {
    it('retire les clés explicitement exclues', () => {
        const payload = { id: 1, name: 'infra', internalFlag: true };
        expect(buildHttpPayload(payload, ['internalFlag'])).toEqual({
            id: 1,
            name: 'infra',
        });
    });

    it('retire toujours undefined, null et chaîne vide — non configurable', () => {
        const payload = { a: undefined, b: null, c: '', d: 'garde-moi' };
        expect(buildHttpPayload(payload, [])).toEqual({ d: 'garde-moi' });
    });

    it('conserve les valeurs falsy valides (0, false)', () => {
        const payload = { count: 0, active: false, name: 'x' };
        expect(buildHttpPayload(payload, [])).toEqual({
            count: 0,
            active: false,
            name: 'x',
        });
    });

    it('accepte un tableau exclude vide sans rien retirer de plus que les valeurs vides', () => {
        const payload = { id: 1, name: 'infra' };
        expect(buildHttpPayload(payload, [])).toEqual(payload);
    });

    it("combine exclusion de clé et filtrage de valeur vide dans le même appel", () => {
        const payload = {
            id: 1,
            internalFlag: true,
            description: '',
            name: 'infra',
        };
        expect(buildHttpPayload(payload, ['internalFlag'])).toEqual({
            id: 1,
            name: 'infra',
        });
    });

    it("ne mute pas l'objet payload d'origine", () => {
        const payload = { id: 1, name: 'infra' };
        const original = { ...payload };
        buildHttpPayload(payload, ['name']);
        expect(payload).toEqual(original);
    });
});

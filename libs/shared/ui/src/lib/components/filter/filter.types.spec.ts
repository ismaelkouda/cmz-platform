import { describe, expect, it, vi } from 'vitest';
import { labelsToFilterOptions } from './filter.types';

/**
 * T12-3 (P2, 2026-08-13) — jamais testé, ~15 appelants (tous les modules
 * crud-entity construisent leurs options de filtre `select` avec cette
 * fonction). Fonction pure : traduit chaque clé i18n, préserve le code wire
 * en `value`.
 */
describe('labelsToFilterOptions', () => {
    it('convertit une table { code: cléI18n } en options { value: code, label: traduit }', () => {
        const translate = vi.fn((key: string) => `t:${key}`);
        const labels = { A: 'STATUS.A', B: 'STATUS.B' };

        const options = labelsToFilterOptions(labels, translate);

        expect(options).toEqual([
            { label: 't:STATUS.A', value: 'A' },
            { label: 't:STATUS.B', value: 'B' },
        ]);
    });

    it('appelle translate() une fois par entrée avec la clé i18n (pas le code wire)', () => {
        const translate = vi.fn((key: string) => key);
        labelsToFilterOptions({ X: 'FOO.X' }, translate);

        expect(translate).toHaveBeenCalledWith('FOO.X');
        expect(translate).not.toHaveBeenCalledWith('X');
    });

    it('retourne un tableau vide pour une table vide, sans appeler translate', () => {
        const translate = vi.fn();
        expect(labelsToFilterOptions({}, translate)).toEqual([]);
        expect(translate).not.toHaveBeenCalled();
    });

    it('préserve le code wire en value tel quel (string), même si numérique en apparence', () => {
        const translate = (key: string) => key;
        const options = labelsToFilterOptions({ '42': 'NUM.KEY' }, translate);

        expect(options[0].value).toBe('42');
        expect(typeof options[0].value).toBe('string');
    });
});

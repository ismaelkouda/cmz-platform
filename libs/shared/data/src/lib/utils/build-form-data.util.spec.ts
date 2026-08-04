import { describe, expect, it } from 'vitest';
import { buildFormData } from './build-form-data.util';

/**
 * Chantier L (onzième passe, 2026-08-04) — `buildFormData` est le portage
 * fidèle de `formDataBuilder.constant.ts` (source legacy, cf. docstring du
 * fichier testé, déjà lu/vérifié lors de la comparaison P-9). Premier
 * consommateur réel : `optical-fiber-network` (upload `geom_file`). Jamais
 * testé jusqu'ici — Node 22 expose `FormData`/`File` globalement (undici),
 * donc testable sans DOM ni Angular.
 */
describe('buildFormData', () => {
    it('ignore undefined, null et chaîne vide', () => {
        const fd = buildFormData({ a: undefined, b: null, c: '', d: 'x' });
        expect(fd.has('a')).toBe(false);
        expect(fd.has('b')).toBe(false);
        expect(fd.has('c')).toBe(false);
        expect(fd.get('d')).toBe('x');
    });

    it('convertit les primitives en chaîne via String()', () => {
        const fd = buildFormData({ count: 42, active: true });
        expect(fd.get('count')).toBe('42');
        expect(fd.get('active')).toBe('true');
    });

    it('ajoute un File tel quel, sans le convertir en chaîne', () => {
        const file = new File(['contenu'], 'geom.json', {
            type: 'application/json',
        });
        const fd = buildFormData({ geom_file: file });
        const value = fd.get('geom_file');
        expect(value).toBeInstanceOf(File);
        expect((value as File).name).toBe('geom.json');
    });

    it('sérialise un tableau en JSON', () => {
        const fd = buildFormData({ tags: ['a', 'b', 'c'] });
        expect(fd.get('tags')).toBe(JSON.stringify(['a', 'b', 'c']));
    });

    it('sérialise un objet imbriqué en JSON (pas de récursion à plat)', () => {
        const fd = buildFormData({ meta: { source: 'infra', page: 2 } });
        expect(fd.get('meta')).toBe(
            JSON.stringify({ source: 'infra', page: 2 })
        );
    });

    it('gère un payload mixte complet en une seule passe', () => {
        const file = new File(['x'], 'a.txt');
        const fd = buildFormData({
            name: 'infra-1',
            skip: undefined,
            file,
            tags: ['x', 'y'],
        });
        expect(fd.get('name')).toBe('infra-1');
        expect(fd.has('skip')).toBe(false);
        expect(fd.get('file')).toBeInstanceOf(File);
        expect(fd.get('tags')).toBe(JSON.stringify(['x', 'y']));
    });
});

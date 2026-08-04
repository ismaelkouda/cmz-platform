import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { buildHttpParams } from './build-http-params.util';

/**
 * Chantier L (onzième passe, 2026-08-04) — première couverture de
 * `buildHttpParams`, utilisé par la quasi-totalité des appels GET filtrés/
 * paginés du dépôt (`readAll(filter, page)` de chaque `*Api`, vérifié
 * directement contre `InfrastructureApi`/`DashboardApi`/etc. lors de la
 * comparaison au contrat legacy, I-8/P-9 §7). Couvre les 5 options par
 * défaut (skip empty/null/undefined, format tableau, sérialisation date) et
 * l'aplatissement récursif des objets imbriqués — jamais testé jusqu'ici.
 */
describe('buildHttpParams', () => {
    it('retourne des HttpParams vides sans payload', () => {
        expect(buildHttpParams(undefined).toString()).toBe('');
        expect(buildHttpParams({}).toString()).toBe('');
    });

    it('inclut les valeurs primitives non vides telles quelles', () => {
        const params = buildHttpParams({ search: 'infra', page: 2 });
        expect(params.get('search')).toBe('infra');
        expect(params.get('page')).toBe('2');
    });

    it("exclut par défaut undefined, null et chaîne vide — comportement legacy (buildHttpPayload) répliqué côté params", () => {
        const params = buildHttpParams({
            a: undefined,
            b: null,
            c: '',
            d: 'garde-moi',
        });
        expect(params.keys()).toEqual(['d']);
    });

    it('peut désactiver individuellement chaque filtre skip*', () => {
        const params = buildHttpParams(
            { a: undefined, b: null, c: '' },
            { skipUndefined: false, skipNull: false, skipEmptyString: false }
        );
        expect(params.get('a')).toBe('undefined');
        expect(params.get('b')).toBe('null');
        expect(params.get('c')).toBe('');
    });

    it('sérialise une Date via dateSerializer (ISO par défaut)', () => {
        const d = new Date('2026-08-04T10:00:00.000Z');
        const params = buildHttpParams({ startDate: d });
        expect(params.get('startDate')).toBe('2026-08-04T10:00:00.000Z');
    });

    it('accepte un dateSerializer personnalisé', () => {
        const d = new Date('2026-08-04T10:00:00.000Z');
        const params = buildHttpParams(
            { startDate: d },
            { dateSerializer: (date) => `custom:${date.getFullYear()}` }
        );
        expect(params.get('startDate')).toBe('custom:2026');
    });

    it('répète la clé pour chaque élément de tableau par défaut (arrayFormat: repeat)', () => {
        const params = buildHttpParams({ tags: ['a', 'b', 'c'] });
        expect(params.getAll('tags')).toEqual(['a', 'b', 'c']);
    });

    it('joint les éléments de tableau en une seule valeur CSV avec arrayFormat: comma', () => {
        const params = buildHttpParams(
            { tags: ['a', 'b', 'c'] },
            { arrayFormat: 'comma' }
        );
        expect(params.getAll('tags')).toEqual(['a,b,c']);
    });

    it('omet complètement un tableau vide, quel que soit le format', () => {
        const params = buildHttpParams({ tags: [] });
        expect(params.has('tags')).toBe(false);
    });

    it("aplatit un objet imbriqué en clés pointées (key.nestedKey), récursivement", () => {
        const params = buildHttpParams({
            period: { start: '2026-01-01', end: '2026-01-31' },
        });
        expect(params.get('period.start')).toBe('2026-01-01');
        expect(params.get('period.end')).toBe('2026-01-31');
    });

    it("n'aplatit pas une Date comme un objet imbriqué — traitée comme valeur primitive", () => {
        const d = new Date('2026-08-04T10:00:00.000Z');
        const params = buildHttpParams({ createdAt: d });
        expect(params.keys()).toEqual(['createdAt']);
        expect(params.get('createdAt')).toBe('2026-08-04T10:00:00.000Z');
    });

    it('sérialise les Date à l’intérieur d’un tableau via dateSerializer', () => {
        const d1 = new Date('2026-01-01T00:00:00.000Z');
        const d2 = new Date('2026-01-02T00:00:00.000Z');
        const params = buildHttpParams(
            { dates: [d1, d2] },
            { arrayFormat: 'comma' }
        );
        expect(params.get('dates')).toBe(
            '2026-01-01T00:00:00.000Z,2026-01-02T00:00:00.000Z'
        );
    });
});

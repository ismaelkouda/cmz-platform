import { describe, expect, it } from 'vitest';
import { MapperUtils } from './mapper-utils';

/**
 * Chantier L (onzième passe, 2026-08-04) — `MapperUtils` n'avait jamais eu
 * de test dédié malgré son statut de dépendance la plus transversale du
 * dépôt : `MapperUtils.validateDto` est appelée par **plus de 60 mappers
 * concrets**, répartis sur les 13 modules métier (grep exhaustif,
 * 2026-08-04) — un bug ici se propagerait silencieusement partout.
 *
 * Constat additionnel (non correctif, documenté ici plutôt que dans le
 * code) : sur les 8 méthodes publiques de la classe, seule `validateDto`
 * est réellement appelée quelque part dans le dépôt (même grep exhaustif —
 * `createEnumMap`, `memoized`, `memoizedList`, `validateRequiredFields`,
 * `syncCollection`, `mergeImmutable`, `clearCache` : 0 appelant hors de ce
 * fichier de test). Ce ne sont pas des méthodes mortes au sens strict d'un
 * outil comme `knip` (qui ne détecte que les exports non importés, pas les
 * méthodes non appelées d'une classe importée) — mais un candidat réel pour
 * une revue humaine de suppression ou de documentation d'intention. Toutes
 * sont testées ci-dessous malgré tout : ce sont des méthodes publiques d'un
 * utilitaire partagé, un bug latent y serait une mine pour le premier
 * consommateur futur.
 */
describe('MapperUtils.validateDto', () => {
    it('ne lève rien quand tous les champs requis sont présents', () => {
        expect(() =>
            MapperUtils.validateDto(
                { id: 1, label: 'infra' },
                { required: ['id'] }
            )
        ).not.toThrow();
    });

    it('lève quand un champ requis est undefined', () => {
        expect(() =>
            MapperUtils.validateDto(
                { id: undefined, label: 'infra' },
                { required: ['id'] }
            )
        ).toThrow(/Missing required fields: id/);
    });

    it('lève quand un champ requis est null', () => {
        expect(() =>
            MapperUtils.validateDto(
                { id: null, label: 'infra' },
                { required: ['id'] }
            )
        ).toThrow(/Missing required fields: id/);
    });

    it("n'exige rien quand schema.required est absent", () => {
        expect(() =>
            MapperUtils.validateDto({ id: 1 }, {})
        ).not.toThrow();
    });

    it("lève une erreur générique si dto n'est pas un objet", () => {
        expect(() =>
            MapperUtils.validateDto(
                null as unknown as object,
                { required: [] }
            )
        ).toThrow('DTO must be an object');
    });

    it('liste tous les champs manquants, pas seulement le premier', () => {
        expect(() =>
            MapperUtils.validateDto(
                { id: undefined, uniq_id: undefined, label: 'x' },
                { required: ['id', 'uniq_id'] }
            )
        ).toThrow(/Missing required fields: id, uniq_id/);
    });

    it('accepte 0 et false comme valeurs présentes (pas manquantes)', () => {
        expect(() =>
            MapperUtils.validateDto(
                { count: 0, active: false },
                { required: ['count', 'active'] }
            )
        ).not.toThrow();
    });
});

describe('MapperUtils.validateRequiredFields', () => {
    it('lève aussi sur une chaîne vide (contrairement à validateDto)', () => {
        expect(() =>
            MapperUtils.validateRequiredFields({ label: '' }, ['label'])
        ).toThrow(/Missing required fields: label/);
    });

    it('ne lève rien quand tous les champs sont présents et non vides', () => {
        expect(() =>
            MapperUtils.validateRequiredFields(
                { id: 1, label: 'x' },
                ['id', 'label']
            )
        ).not.toThrow();
    });
});

describe('MapperUtils.createEnumMap', () => {
    it("construit une Map fidèle à l'objet source", () => {
        const map = MapperUtils.createEnumMap({ AUTO: 'auto', MANUAL: 'manual' });
        expect(map.get('AUTO')).toBe('auto');
        expect(map.get('MANUAL')).toBe('manual');
        expect(map.size).toBe(2);
    });
});

describe('MapperUtils#memoized', () => {
    it('retourne null pour une entrée null ou undefined, sans appeler le mapper', () => {
        const utils = new MapperUtils();
        let called = false;
        const mapper = (x: number) => {
            called = true;
            return x * 2;
        };
        expect(utils.memoized(null, mapper)).toBeNull();
        expect(utils.memoized(undefined, mapper)).toBeNull();
        expect(called).toBe(false);
    });

    it('applique le mapper à un input valide', () => {
        const utils = new MapperUtils();
        expect(utils.memoized(21, (x: number) => x * 2)).toBe(42);
    });

    it('met en cache : un second appel avec la même clé explicite ne réinvoque pas le mapper', () => {
        const utils = new MapperUtils();
        let calls = 0;
        const mapper = (x: number) => {
            calls++;
            return x * 2;
        };
        expect(utils.memoized(21, mapper, 'k')).toBe(42);
        expect(utils.memoized(999, mapper, 'k')).toBe(42); // valeur en cache, pas 1998
        expect(calls).toBe(1);
    });

    it('sans clé explicite, génère une clé par identité (id) pour les objets identifiables', () => {
        const utils = new MapperUtils();
        let calls = 0;
        const mapper = (x: { id: number; label: string }) => {
            calls++;
            return x.label.toUpperCase();
        };
        expect(utils.memoized({ id: 1, label: 'a' }, mapper)).toBe('A');
        // Même id, label différent : la clé générée est identique (id
        // seul), donc le résultat en cache ('A') est réutilisé — c'est le
        // comportement documenté de generateCacheKey, pas un bug caché.
        expect(utils.memoized({ id: 1, label: 'b' }, mapper)).toBe('A');
        expect(calls).toBe(1);
    });
});

describe('MapperUtils#memoizedList', () => {
    it('mappe chaque élément et filtre les résultats null (entrées null/undefined)', () => {
        const utils = new MapperUtils();
        const result = utils.memoizedList(
            [1, 2, 3],
            (x: number) => x * 10,
            (x) => `k${x}`
        );
        expect(result).toEqual([10, 20, 30]);
    });
});

describe('MapperUtils#clearCache', () => {
    it('vide le cache — un appel identique après clearCache ré-invoque le mapper', () => {
        const utils = new MapperUtils();
        let calls = 0;
        const mapper = (x: number) => {
            calls++;
            return x;
        };
        utils.memoized(1, mapper, 'k');
        utils.clearCache();
        utils.memoized(1, mapper, 'k');
        expect(calls).toBe(2);
    });
});

describe('MapperUtils.syncCollection', () => {
    interface Target {
        id: number;
        name: string;
    }
    interface Source {
        id: number;
        name: string;
    }

    it('met à jour les éléments existants en place (même référence de tableau)', () => {
        const target: Target[] = [{ id: 1, name: 'old' }];
        MapperUtils.syncCollection<Target, Source>(
            target,
            [{ id: 1, name: 'new' }],
            (item) => String(item.id),
            (t, s) => {
                t.name = s.name;
            },
            (s) => ({ id: s.id, name: s.name })
        );
        expect(target).toEqual([{ id: 1, name: 'new' }]);
    });

    it('ajoute les éléments source absents de target', () => {
        const target: Target[] = [];
        MapperUtils.syncCollection<Target, Source>(
            target,
            [{ id: 2, name: 'nouveau' }],
            (item) => String(item.id),
            () => {
                throw new Error('update ne doit pas être appelé ici');
            },
            (s) => ({ id: s.id, name: s.name })
        );
        expect(target).toEqual([{ id: 2, name: 'nouveau' }]);
    });

    it('retire les éléments de target absents de source', () => {
        const target: Target[] = [
            { id: 1, name: 'a' },
            { id: 2, name: 'b' },
        ];
        MapperUtils.syncCollection<Target, Source>(
            target,
            [{ id: 1, name: 'a' }],
            (item) => String(item.id),
            () => undefined,
            (s) => ({ id: s.id, name: s.name })
        );
        expect(target).toEqual([{ id: 1, name: 'a' }]);
    });
});

describe('MapperUtils.mergeImmutable', () => {
    interface Entity {
        id: number;
        name: string;
    }
    interface Dto {
        id: number;
        name: string;
    }

    it('retourne un nouveau tableau (immuable) sans muter current', () => {
        const current: readonly Entity[] = [{ id: 1, name: 'old' }];
        const result = MapperUtils.mergeImmutable<Entity, Dto, number>(
            current,
            [{ id: 1, name: 'new' }],
            (item) => item.id,
            (entity, dto) => ({ ...entity, name: dto.name }),
            (dto) => ({ id: dto.id, name: dto.name })
        );
        expect(result).toEqual([{ id: 1, name: 'new' }]);
        expect(current).toEqual([{ id: 1, name: 'old' }]); // non mutée
        expect(result).not.toBe(current);
    });

    it('crée une entité neuve pour un dto sans correspondance dans current', () => {
        const result = MapperUtils.mergeImmutable<Entity, Dto, number>(
            [],
            [{ id: 5, name: 'neuf' }],
            (item) => item.id,
            (entity) => entity,
            (dto) => ({ id: dto.id, name: dto.name })
        );
        expect(result).toEqual([{ id: 5, name: 'neuf' }]);
    });

    it("suit l'ordre de incoming, pas celui de current", () => {
        const current: readonly Entity[] = [
            { id: 1, name: 'a' },
            { id: 2, name: 'b' },
        ];
        const result = MapperUtils.mergeImmutable<Entity, Dto, number>(
            current,
            [
                { id: 2, name: 'b2' },
                { id: 1, name: 'a2' },
            ],
            (item) => item.id,
            (entity, dto) => ({ ...entity, name: dto.name }),
            (dto) => ({ id: dto.id, name: dto.name })
        );
        expect(result.map((r) => r.id)).toEqual([2, 1]);
    });
});

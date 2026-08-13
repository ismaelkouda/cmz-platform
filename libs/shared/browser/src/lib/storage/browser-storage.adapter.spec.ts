import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BrowserStorageAdapter } from './browser-storage.adapter';

/**
 * T12-3 (cartographie 2026-08-12) — jamais testé, seul point d'écriture
 * session (`SessionService` en dépend directement, voir
 * `session.service.spec.ts`). Environnement `node` (pas `jsdom`) : `crypto`,
 * `btoa`/`atob` sont natifs Node 22 — seul `localStorage`/`sessionStorage`
 * manque, remplacé ici par un `Proxy` minimal (même esprit que le double
 * `StoragePort` de `session.service.spec.ts`), pas besoin du coût jsdom pour
 * cette classe.
 *
 * Un stub `Storage` classique (objet avec méthodes `getItem`/`setItem`/…)
 * ne suffit pas : `removeKeysWithPrefix()`/`clearObfuscated()` itèrent via
 * `Object.keys(localStorage)`, qui exige des clés **énumérables sur
 * l'objet lui-même** — pas juste accessibles via des méthodes. D'où un
 * `Proxy` qui expose le contenu de la `Map` comme propriétés énumérables
 * réelles (`ownKeys`/`getOwnPropertyDescriptor`), en plus des méthodes
 * `Storage`.
 */
function installStorageStub(): { store: Map<string, string> } {
    const store = new Map<string, string>();
    const methods = {
        get length() {
            return store.size;
        },
        clear: () => store.clear(),
        getItem: (key: string) => store.get(key) ?? null,
        key: (index: number) => Array.from(store.keys())[index] ?? null,
        removeItem: (key: string) => void store.delete(key),
        setItem: (key: string, value: string) => void store.set(key, value),
    };
    const stub = new Proxy(methods as unknown as Storage, {
        get(target, prop, receiver) {
            if (typeof prop === 'string' && store.has(prop)) {
                return store.get(prop);
            }
            return Reflect.get(target, prop, receiver);
        },
        ownKeys: () => Array.from(store.keys()),
        getOwnPropertyDescriptor: (_target, prop) => {
            if (typeof prop === 'string' && store.has(prop)) {
                return {
                    enumerable: true,
                    configurable: true,
                    value: store.get(prop),
                };
            }
            return undefined;
        },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).localStorage = stub;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).sessionStorage = stub;
    return { store };
}

describe('BrowserStorageAdapter', () => {
    let adapter: BrowserStorageAdapter;
    let store: Map<string, string>;

    beforeEach(() => {
        ({ store } = installStorageStub());
        adapter = new BrowserStorageAdapter();
    });

    afterEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (globalThis as any).localStorage;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (globalThis as any).sessionStorage;
    });

    describe('save/get/remove/hasKey (sync, non obfusqué)', () => {
        it('save() sérialise un objet en JSON, get() le désérialise', () => {
            adapter.save('key', { a: 1 });
            expect(store.get('key')).toBe('{"a":1}');
            expect(adapter.get('key')).toEqual({ a: 1 });
        });

        it('save() stocke une chaîne telle quelle (pas de double JSON.stringify)', () => {
            adapter.save('key', 'raw-string');
            expect(store.get('key')).toBe('raw-string');
        });

        it('get() retourne defaultValue si la clé est absente', () => {
            expect(adapter.get('missing', 'fallback')).toBe('fallback');
            expect(adapter.get('missing')).toBeNull();
        });

        it('get() retourne la chaîne brute si elle n’est pas du JSON valide', () => {
            store.set('key', 'not-json{');
            expect(adapter.get('key')).toBe('not-json{');
        });

        it('remove() efface la clé, hasKey() reflète la présence', () => {
            adapter.save('key', 'v');
            expect(adapter.hasKey('key')).toBe(true);
            adapter.remove('key');
            expect(adapter.hasKey('key')).toBe(false);
        });
    });

    describe('saveObfuscated/getObfuscated (async, chiffré)', () => {
        it('round-trip : la valeur lue après saveObfuscated est identique à celle écrite', async () => {
            await adapter.saveObfuscated('token', {
                value: 'a.b.c',
                n: 42,
            });
            const result = await adapter.getObfuscated<{
                value: string;
                n: number;
            }>('token');
            expect(result).toEqual({ value: 'a.b.c', n: 42 });
        });

        it('la valeur stockée est préfixée obf: et n’est pas lisible en clair', async () => {
            await adapter.saveObfuscated('token', 'secret-value');
            const raw = store.get('token');
            expect(raw?.startsWith('obf:')).toBe(true);
            expect(raw).not.toContain('secret-value');
        });

        it('getObfuscated() sur une clé absente retourne null', async () => {
            expect(await adapter.getObfuscated('missing')).toBeNull();
        });

        it('getObfuscated() sur une valeur non préfixée obf: (legacy/sync) retombe sur un parse direct', async () => {
            store.set('legacy-key', JSON.stringify({ legacy: true }));
            expect(await adapter.getObfuscated('legacy-key')).toEqual({
                legacy: true,
            });
        });
    });

    describe('removeKeysWithPrefix/clearObfuscated/clearAll', () => {
        it('removeKeysWithPrefix() ne retire que les clés portant le préfixe donné', async () => {
            adapter.save('paths_data', 'a');
            adapter.save('paths_extra', 'b');
            adapter.save('other', 'c');

            await adapter.removeKeysWithPrefix('paths_');

            expect(store.has('paths_data')).toBe(false);
            expect(store.has('paths_extra')).toBe(false);
            expect(store.has('other')).toBe(true);
        });

        it('clearObfuscated() ne retire que les entrées préfixées obf:, laisse le reste intact', async () => {
            await adapter.saveObfuscated('secure', 'v');
            adapter.save('plain', 'v');

            await adapter.clearObfuscated();

            expect(store.has('secure')).toBe(false);
            expect(store.has('plain')).toBe(true);
        });

        it('clearAll() vide entièrement localStorage', () => {
            adapter.save('a', '1');
            adapter.save('b', '2');

            adapter.clearAll();

            expect(store.size).toBe(0);
        });
    });
});

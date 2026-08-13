import { createEnvironmentInjector } from '@angular/core';
import { StoragePort } from '@cmz/shared-domain';
import { describe, expect, it, vi } from 'vitest';
import { STORAGE_PORT } from '../tokens/storage-port.token';
import { StorePathsService } from './store-paths.service';

/**
 * T12-3 (cartographie 2026-08-12) — jamais testé directement (seulement
 * exercé indirectement via `session.service.spec.ts`, côté écriture
 * `setPaths()`). Ce spec couvre le cycle de vie propre à cette classe :
 * hydratation initiale, `whenReady()`, et le défaut de robustesse partagé
 * avec `SessionService.loadToken()` (voir note dans le test dédié
 * ci-dessous — même pattern `try`/`finally` sans `catch`).
 */
function makeFakeStorage(): StoragePort {
    const store = new Map<string, unknown>();
    return {
        save: vi.fn((key: string, value: unknown) => store.set(key, value)),
        get: vi.fn(
            <T>(key: string, defaultValue: T | null) =>
                (store.get(key) as T | undefined) ?? defaultValue
        ),
        remove: vi.fn((key: string) => store.delete(key)),
        hasKey: vi.fn((key: string) => store.has(key)),
        saveObfuscated: vi.fn(async (key: string, value: unknown) => {
            store.set(key, value);
        }),
        getObfuscated: vi.fn(
            async <T>(key: string) => (store.get(key) as T | undefined) ?? null
        ),
        removeKeysWithPrefix: vi.fn(async (prefix: string) => {
            for (const key of Array.from(store.keys())) {
                if (key.startsWith(prefix)) store.delete(key);
            }
        }),
        clearObfuscated: vi.fn(async () => store.clear()),
        clearAll: vi.fn(() => store.clear()),
    } as StoragePort;
}

describe('StorePathsService', () => {
    it('paths() démarre à null avant hydratation, ready() à false', () => {
        const storage = makeFakeStorage();
        const injector = createEnvironmentInjector(
            [{ provide: STORAGE_PORT, useValue: storage }, StorePathsService],
            null as never
        );
        const service = injector.get(StorePathsService);

        // Synchrone, avant tout `await` : capture bien l'état initial du
        // signal, pas déjà hydraté par le microtask de `load()`.
        expect(service.paths()).toBeNull();
    });

    it('hydrate paths() depuis le stockage si une valeur y est déjà persistée', async () => {
        const storage = makeFakeStorage();
        await storage.saveObfuscated('paths_data', ['/report-states']);

        const injector = createEnvironmentInjector(
            [{ provide: STORAGE_PORT, useValue: storage }, StorePathsService],
            null as never
        );
        const service = injector.get(StorePathsService);

        await service.whenReady();

        expect(service.paths()).toEqual(['/report-states']);
        expect(service.ready()).toBe(true);
    });

    it('paths() reste null si rien n’a jamais été persisté (fail-closed, pas d’exception)', async () => {
        const storage = makeFakeStorage();
        const injector = createEnvironmentInjector(
            [{ provide: STORAGE_PORT, useValue: storage }, StorePathsService],
            null as never
        );
        const service = injector.get(StorePathsService);

        await service.whenReady();

        expect(service.paths()).toBeNull();
    });

    it('setPaths() persiste et met à jour paths() de façon synchrone après résolution', async () => {
        const storage = makeFakeStorage();
        const injector = createEnvironmentInjector(
            [{ provide: STORAGE_PORT, useValue: storage }, StorePathsService],
            null as never
        );
        const service = injector.get(StorePathsService);
        await service.whenReady();

        await service.setPaths(['/processing', '/finalization']);

        expect(service.paths()).toEqual(['/processing', '/finalization']);
        expect(storage.saveObfuscated).toHaveBeenCalledWith('paths_data', [
            '/processing',
            '/finalization',
        ]);
    });

    it('ready() reste true et paths() reste null si l’hydratation initiale échoue (finally garanti, même défaut que SessionService)', async () => {
        // Même défaut réel que `session.service.spec.ts` (T12-3, 2026-08-13),
        // non corrigé ici : `load()` n'a qu'un `try`/`finally`, pas de
        // `catch` — l'exception continue de se propager après le `finally`,
        // et `void this.load()` dans le constructeur ne l'intercepte pas →
        // unhandled promise rejection à chaque `paths_data` illisible.
        const storage = makeFakeStorage();
        storage.getObfuscated = vi.fn(async () => {
            throw new Error('corrupted payload');
        });

        let capturedRejection: unknown;
        const onUnhandledRejection = (reason: unknown) => {
            capturedRejection = reason;
        };
        process.on('unhandledRejection', onUnhandledRejection);

        try {
            const injector = createEnvironmentInjector(
                [
                    { provide: STORAGE_PORT, useValue: storage },
                    StorePathsService,
                ],
                null as never
            );
            const service = injector.get(StorePathsService);

            await expect(service.whenReady()).resolves.toBeUndefined();
            expect(service.ready()).toBe(true);
            expect(service.paths()).toBeNull();

            await new Promise((r) => setTimeout(r, 0));
            expect((capturedRejection as Error)?.message).toBe(
                'corrupted payload'
            );
        } finally {
            process.off('unhandledRejection', onUnhandledRejection);
        }
    });
});

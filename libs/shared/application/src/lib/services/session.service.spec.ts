import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import type { AuthToken, CurrentUser } from '@cmz/shared-domain';
import { NavigationPort, StoragePort } from '@cmz/shared-domain';
import { NAVIGATION_PORT } from '../tokens/navigation-port.token';
import { STORAGE_PORT } from '../tokens/storage-port.token';
import { SessionService } from './session.service';
import { StorePathsService } from './store-paths.service';

/**
 * Régression I-7 (`audit-workspace-2026-08-02-revue-finale.md`, débloqué
 * 2026-08-03) : avant ce correctif, `SessionService.save()` persistait
 * `user.permissions`/`user.actions` mais **jamais `user.paths`** — le champ
 * dont dépend `pathsGuard` (`apps/backoffice-angular/src/app/guards/
 * paths.guard.ts`) pour savoir si une page est autorisée. Ce test verrouille
 * le comportement : `save()` doit appeler `StorePathsService.setPaths(user.paths)`
 * et le résultat doit être lisible via `StorePathsService.paths()` immédiatement
 * après — pas seulement "la méthode a été appelée", mais "l'état lu par le
 * guard reflète bien ce qui a été sauvegardé".
 *
 * Double de test minimal pour `StoragePort` : un `Map` en mémoire, pas un
 * mock qui se contente d'enregistrer les appels — pour que
 * `StorePathsService.setPaths()` → `storage.saveObfuscated()` →
 * (indirectement, via `StorePathsService._paths` signal) → `paths()` forme
 * une vraie boucle bout-en-bout, comme le ferait le vrai adaptateur
 * `@cmz/shared-browser`.
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

function makeUser(paths: string[]): CurrentUser {
    return {
        id: 1,
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        profile: 'ADMIN',
        phone: '690000000',
        isAdmin: false,
        enable2fa: false,
        status: 'ACTIVE',
        photo: '',
        permissions: [],
        paths,
        actions: null,
    };
}

describe('SessionService', () => {
    it('save() persiste user.paths via StorePathsService (régression I-7)', async () => {
        const storage = makeFakeStorage();
        const injector = createEnvironmentInjector(
            [
                { provide: STORAGE_PORT, useValue: storage },
                { provide: NAVIGATION_PORT, useValue: { reload: vi.fn() } },
                StorePathsService,
                SessionService,
            ],
            null as never
        );
        const session = injector.get(SessionService);
        const storePaths = injector.get(StorePathsService);

        const user = makeUser(['/report-states', '/processing']);
        const token: AuthToken = {
            value: 'a.b.c',
            expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        };

        await session.save(user, token);

        // Le guard `pathsGuard` ne lit que `StorePathsService.paths()` — c'est
        // ce signal, pas l'appel interne à `setPaths`, qui doit être vérifié.
        // Format chemin absolu depuis T3-2 (2026-08-11) — SessionService ne
        // transforme pas la valeur (pass-through pur), le format exact
        // n'affecte donc pas ce test, gardé cohérent avec paths.guard.ts.
        expect(storePaths.paths()).toEqual(['/report-states', '/processing']);
        expect(storage.saveObfuscated).toHaveBeenCalledWith('paths_data', [
            '/report-states',
            '/processing',
        ]);
    });

    it('save() persiste aussi le menu (permissions) et les actions fines, sans régression', async () => {
        const storage = makeFakeStorage();
        const injector = createEnvironmentInjector(
            [
                { provide: STORAGE_PORT, useValue: storage },
                { provide: NAVIGATION_PORT, useValue: { reload: vi.fn() } },
                StorePathsService,
                SessionService,
            ],
            null as never
        );
        const session = injector.get(SessionService);

        const user = makeUser([]);
        user.actions = { 'report-states': ['approve'] };
        const token: AuthToken = {
            value: 'a.b.c',
            expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        };

        await session.save(user, token);

        expect(storage.saveObfuscated).toHaveBeenCalledWith(
            'menu',
            user.permissions
        );
        expect(storage.saveObfuscated).toHaveBeenCalledWith(
            'permissionsActions',
            user.actions
        );
    });

    it('whenReady() se résout après hydratation initiale (token null ou présent)', async () => {
        const storage = makeFakeStorage();
        const injector = createEnvironmentInjector(
            [
                { provide: STORAGE_PORT, useValue: storage },
                { provide: NAVIGATION_PORT, useValue: { reload: vi.fn() } },
                StorePathsService,
                SessionService,
            ],
            null as never
        );
        const session = injector.get(SessionService);

        await expect(session.whenReady()).resolves.toBeUndefined();
        expect(session.ready()).toBe(true);
    });

    it('hydrate token() depuis le stockage au démarrage si un jeton y est déjà présent', async () => {
        const storage = makeFakeStorage();
        const existingToken: AuthToken = {
            value: 'existing.token',
            expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        };
        await storage.saveObfuscated('token_data', existingToken);

        const injector = createEnvironmentInjector(
            [
                { provide: STORAGE_PORT, useValue: storage },
                { provide: NAVIGATION_PORT, useValue: { reload: vi.fn() } },
                StorePathsService,
                SessionService,
            ],
            null as never
        );
        const session = injector.get(SessionService);

        await session.whenReady();

        expect(session.token()).toEqual(existingToken);
    });

    it('ready() reste true et token() reste null si le déchiffrement initial échoue (finally garanti)', async () => {
        // Défaut réel constaté en écrivant ce test (T12-3, 2026-08-13), pas
        // corrigé ici (hors périmètre — écrire les tests, pas patcher du
        // code métier sans validation) : `loadToken()` n'a qu'un
        // `try`/`finally`, aucun `catch`. Le `finally` garantit bien que
        // `ready`/`resolveReady()` s'exécutent (`whenReady()` se débloque
        // quand même — pas de guard bloqué indéfiniment), MAIS l'exception
        // continue ensuite de se propager hors de `loadToken()`. Le
        // constructeur l'appelle en `void this.loadToken()` sans `.catch()`
        // → **unhandled promise rejection** au niveau de l'application à
        // chaque session illisible (quota dépassé, payload corrompu, mauvais
        // tag AES-GCM). Ce test capture ce rejet explicitement (sinon il
        // fuit dans Vitest en tant que "Unhandled Rejection" au niveau de la
        // suite) et documente le symptôme sans le masquer. Même pattern
        // exact et même trou dans `StorePathsService.load()` (constructeur
        // co-injecté ici) — géré séparément dans
        // `store-paths.service.spec.ts`.
        const storage = makeFakeStorage();
        const originalGetObfuscated = storage.getObfuscated.bind(storage);
        storage.getObfuscated = vi.fn(async (key: string, ...rest) => {
            if (key === 'token_data') {
                throw new Error('corrupted payload');
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (originalGetObfuscated as any)(key, ...rest);
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
                    {
                        provide: NAVIGATION_PORT,
                        useValue: { reload: vi.fn() },
                    },
                    StorePathsService,
                    SessionService,
                ],
                null as never
            );
            const session = injector.get(SessionService);

            // `whenReady()` doit se résoudre même si `loadToken()` a levé —
            // c'est le seul contrat que `finally` tient réellement.
            await expect(session.whenReady()).resolves.toBeUndefined();
            expect(session.ready()).toBe(true);
            expect(session.token()).toBeNull();

            // Laisse le microtask du rejet non intercepté atteindre le
            // handler process avant d'affirmer sa présence.
            await new Promise((r) => setTimeout(r, 0));
            expect((capturedRejection as Error)?.message).toBe(
                'corrupted payload'
            );
        } finally {
            process.off('unhandledRejection', onUnhandledRejection);
        }
    });

    it('clear() efface le stockage et déclenche un rechargement de navigation', async () => {
        const storage = makeFakeStorage();
        const navigation: NavigationPort = { reload: vi.fn() };
        const injector = createEnvironmentInjector(
            [
                { provide: STORAGE_PORT, useValue: storage },
                { provide: NAVIGATION_PORT, useValue: navigation },
                StorePathsService,
                SessionService,
            ],
            null as never
        );
        const session = injector.get(SessionService);

        await session.clear();

        expect(storage.clearAll).toHaveBeenCalled();
        expect(navigation.reload).toHaveBeenCalled();
        expect(session.token()).toBeNull();
    });
});

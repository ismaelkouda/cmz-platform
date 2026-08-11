import { createEnvironmentInjector } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import type { AuthToken, CurrentUser } from '@cmz/shared-domain';
import { NavigationPort, StoragePort } from '@cmz/shared-domain';
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
                { provide: StoragePort, useValue: storage },
                { provide: NavigationPort, useValue: { reload: vi.fn() } },
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
                { provide: StoragePort, useValue: storage },
                { provide: NavigationPort, useValue: { reload: vi.fn() } },
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
                { provide: StoragePort, useValue: storage },
                { provide: NavigationPort, useValue: { reload: vi.fn() } },
                StorePathsService,
                SessionService,
            ],
            null as never
        );
        const session = injector.get(SessionService);

        await expect(session.whenReady()).resolves.toBeUndefined();
        expect(session.ready()).toBe(true);
    });

    it('clear() efface le stockage et déclenche un rechargement de navigation', async () => {
        const storage = makeFakeStorage();
        const navigation: NavigationPort = { reload: vi.fn() };
        const injector = createEnvironmentInjector(
            [
                { provide: StoragePort, useValue: storage },
                { provide: NavigationPort, useValue: navigation },
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

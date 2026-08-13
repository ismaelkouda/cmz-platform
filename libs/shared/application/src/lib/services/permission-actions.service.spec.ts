import { createEnvironmentInjector } from '@angular/core';
import { StoragePort } from '@cmz/shared-domain';
import { describe, expect, it, vi } from 'vitest';
import { STORAGE_PORT } from '../tokens/storage-port.token';
import { PermissionActionsService } from './permission-actions.service';

/**
 * T12-3 (P1, 2026-08-13) — jamais testé, ~40 composants + `permission.guard.ts`
 * (RBAC) consomment `can()`. Même famille de risque que `SessionService`/
 * `StorePathsService` (T3-7) : `load()` n'avait aucun `try`/`catch` (pas
 * même un `finally`) — corrigé dans le même mouvement (voir docstring de
 * `load()`), verrouillé ici.
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

async function flush(): Promise<void> {
    await new Promise((r) => setTimeout(r, 0));
}

describe('PermissionActionsService', () => {
    it('can() répond false pour toute route/action tant que rien n’a été chargé (fail-closed initial)', () => {
        const storage = makeFakeStorage();
        const injector = createEnvironmentInjector(
            [
                { provide: STORAGE_PORT, useValue: storage },
                PermissionActionsService,
            ],
            null as never
        );
        const service = injector.get(PermissionActionsService);

        // Synchrone, avant que le microtask de load() ne se résolve.
        expect(service.can('report-states', 'approve')()).toBe(false);
    });

    it('can() reflète les permissions chargées depuis le stockage une fois le microtask résolu', async () => {
        const storage = makeFakeStorage();
        await storage.saveObfuscated('permissionsActions', {
            'report-states': ['approve', 'reject'],
        });

        const injector = createEnvironmentInjector(
            [
                { provide: STORAGE_PORT, useValue: storage },
                PermissionActionsService,
            ],
            null as never
        );
        const service = injector.get(PermissionActionsService);
        await flush();

        expect(service.can('report-states', 'approve')()).toBe(true);
        expect(service.can('report-states', 'reject')()).toBe(true);
        expect(service.can('report-states', 'delete')()).toBe(false);
    });

    it('can() répond false pour une route jamais présente dans la map, sans lever', async () => {
        const storage = makeFakeStorage();
        await storage.saveObfuscated('permissionsActions', {
            'report-states': ['approve'],
        });

        const injector = createEnvironmentInjector(
            [
                { provide: STORAGE_PORT, useValue: storage },
                PermissionActionsService,
            ],
            null as never
        );
        const service = injector.get(PermissionActionsService);
        await flush();

        expect(service.can('unknown-route', 'approve')()).toBe(false);
    });

    it('can() répond false et reste utilisable si rien n’a jamais été persisté (data null)', async () => {
        const storage = makeFakeStorage();
        const injector = createEnvironmentInjector(
            [
                { provide: STORAGE_PORT, useValue: storage },
                PermissionActionsService,
            ],
            null as never
        );
        const service = injector.get(PermissionActionsService);
        await flush();

        expect(service.can('report-states', 'approve')()).toBe(false);
    });

    it('reste fail-closed et journalise via console.error si le déchiffrement initial échoue (régression T3-7)', async () => {
        const storage = makeFakeStorage();
        storage.getObfuscated = vi.fn(async () => {
            throw new Error('corrupted payload');
        });

        let capturedRejection: unknown;
        const onUnhandledRejection = (reason: unknown) => {
            capturedRejection = reason;
        };
        process.on('unhandledRejection', onUnhandledRejection);
        const errorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);

        try {
            const injector = createEnvironmentInjector(
                [
                    { provide: STORAGE_PORT, useValue: storage },
                    PermissionActionsService,
                ],
                null as never
            );
            const service = injector.get(PermissionActionsService);
            await flush();

            expect(service.can('report-states', 'approve')()).toBe(false);
            expect(capturedRejection).toBeUndefined();
            expect(errorSpy).toHaveBeenCalledWith(
                'PermissionActionsService: permissions illisibles au démarrage',
                expect.objectContaining({ message: 'corrupted payload' })
            );
        } finally {
            process.off('unhandledRejection', onUnhandledRejection);
            errorSpy.mockRestore();
        }
    });
});

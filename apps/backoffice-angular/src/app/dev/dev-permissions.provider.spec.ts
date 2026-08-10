import { describe, expect, it } from 'vitest';
import { PermissionActionsService } from '@cmz/shared-application';
import { provideDevPermissions } from './dev-permissions.provider';

/**
 * T3-4 / DT-6 — preuve machine que le bypass dev **ne peut pas** s'activer
 * hors environnement de développement.
 *
 * Le prédicat est injecté (`isDev`) pour rester testable sous Vitest ESM
 * (spy sur `isDevMode` Angular non configurable). Le call site prod/dev
 * utilise le défaut `isDevMode` Angular.
 */
describe('provideDevPermissions (T3-4 exclusion prod)', () => {
    it('isDev() === false → [] (aucun Provider PermissionActionsService)', () => {
        const providers = provideDevPermissions(() => false);

        expect(providers).toEqual([]);
        expect(
            providers.some(
                (p) =>
                    (p as { provide?: unknown }).provide ===
                    PermissionActionsService
            )
        ).toBe(false);
    });

    it('isDev() === true → un seul Provider stub can() toujours true', () => {
        const providers = provideDevPermissions(() => true);

        expect(providers).toHaveLength(1);
        const def = providers[0] as {
            provide: unknown;
            useFactory: () => PermissionActionsService;
        };
        expect(def.provide).toBe(PermissionActionsService);

        const stub = def.useFactory();
        expect(stub.can('any-route', 'any-action')()).toBe(true);
    });

    it('défaut (signature app.config) est une fonction sans arg', () => {
        // Garantit que `...provideDevPermissions()` reste valide :
        // l'appel 0-arg doit utiliser isDevMode Angular (live, non mocké).
        expect(() => provideDevPermissions()).not.toThrow();
        expect(Array.isArray(provideDevPermissions())).toBe(true);
    });
});

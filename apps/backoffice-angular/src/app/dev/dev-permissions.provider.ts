import { Provider, isDevMode, signal, type Signal } from '@angular/core';
import { PermissionActionsService } from '@cmz/shared-application';

/**
 * **DEV ONLY** — accorde toutes les permissions (le backend d'auth qui peuple le
 * storage chiffré n'est pas branché en dev). Remplace `PermissionActionsService`
 * pour activer les boutons Créer/éditer/supprimer.
 *
 * **Gardé par `isDevMode()`** (paramètre injectable pour les tests, défaut
 * Angular). En build production, `isDevMode() === false` → renvoie `[]` → le
 * vrai `PermissionActionsService` (lecture chiffrée) reprend la main. Ne peut
 * donc pas fuiter en prod.
 *
 * Preuve machine (T3-4 / DT-6) :
 * - unit : `dev-permissions.provider.spec.ts` (`isDev` true/false)
 * - structure : `bun run check:dev-permissions-prod` (CI garde-fous)
 *
 * @param isDev prédicat d'environnement — **ne pas passer `() => true` hors
 *   tests**. Prod/call site app.config utilise le défaut `isDevMode`.
 */
export function provideDevPermissions(
    isDev: () => boolean = isDevMode
): Provider[] {
    if (!isDev()) {
        return [];
    }
    return [
        {
            provide: PermissionActionsService,
            useFactory: (): PermissionActionsService =>
                ({
                    permissions: signal<Record<string, string[]>>({}),
                    can: (): Signal<boolean> => signal(true),
                }) as unknown as PermissionActionsService,
        },
    ];
}

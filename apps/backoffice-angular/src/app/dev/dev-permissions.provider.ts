import { Provider, signal, type Signal } from '@angular/core';
import { PermissionActionsService } from '@cmz/shared-application';

/**
 * **DEV ONLY** — accorde toutes les permissions (le backend d'auth qui peuple le
 * storage chiffré n'est pas branché en dev). Remplace `PermissionActionsService`
 * pour activer les boutons Créer/éditer/supprimer. À retirer en production.
 */
export function provideDevPermissions(): Provider {
    return {
        provide: PermissionActionsService,
        useFactory: (): PermissionActionsService =>
            ({
                permissions: signal<Record<string, string[]>>({}),
                can: (): Signal<boolean> => signal(true),
            }) as unknown as PermissionActionsService,
    };
}

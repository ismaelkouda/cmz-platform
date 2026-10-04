import { InjectionToken } from '@angular/core';
import { StoragePort } from '@cmz/shared-domain';

/**
 * Jeton d'injection Angular pour `StoragePort` (ADR-0024) — même
 * raisonnement que `NAVIGATION_PORT` (`./navigation-port.token.ts`).
 * Colocalisé ici plutôt que dans `@cmz/core` : `SessionService`,
 * `PermissionActionsService` et `StorePathsService` (tous
 * `shared-application`) le consomment. Le workspace UI est volontairement
 * mémoire-only en v1 et ne dépend pas de ce port : restaurer des vues ou des
 * brouillons exigerait un contrat de confidentialité séparé.
 */
export const STORAGE_PORT = new InjectionToken<StoragePort>('StoragePort');

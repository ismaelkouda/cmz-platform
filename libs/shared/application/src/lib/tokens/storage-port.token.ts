import { InjectionToken } from '@angular/core';
import { StoragePort } from '@cmz/shared-domain';

/**
 * Jeton d'injection Angular pour `StoragePort` (ADR-0024) — même
 * raisonnement que `NAVIGATION_PORT` (`./navigation-port.token.ts`).
 * Colocalisé ici plutôt que dans `@cmz/core` : `SessionService`/
 * `PermissionActionsService`/`StorePathsService` (tous `shared-application`)
 * le consomment, et `TabService` (`@cmz/shared-ui`) aussi — `type:ui` a le
 * droit de dépendre de `type:application`, donc pas besoin de dupliquer ce
 * jeton ailleurs.
 */
export const STORAGE_PORT = new InjectionToken<StoragePort>('StoragePort');

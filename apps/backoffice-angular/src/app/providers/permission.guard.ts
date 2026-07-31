import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { PermissionActionsService } from '@cmz/shared-application';

/**
 * Guard fonctionnel RBAC — câble les permissions chiffrées du backend sur les
 * routes Angular. Repose sur `PermissionActionsService.can(route, action)` qui
 * retourne un `Signal<boolean>` réactif (ADR-0010 §Ports & Adapters).
 *
 * Usage dans les routes :
 * ```ts
 * {
 *   path: 'report-states/approve',
 *   canActivate: [permissionGuard('report-states', 'APPROVE')],
 *   loadComponent: () => import(...)
 * }
 * ```
 *
 * En développement (`isDevMode()`), `provideDevPermissions()` remplace le service
 * par un stub qui renvoie toujours `true` — ce guard ne bloque jamais en dev.
 *
 * En production, le signal est chargé depuis le localStorage chiffré (AES-GCM)
 * après le login. Si le déchiffrement n'est pas encore terminé (signal vide),
 * l'accès est refusé par sécurité et redirigé vers `/auth/login`.
 *
 * @param route  Clé de route dans la PermissionMap (ex: 'report-states')
 * @param action Action requise dans le tableau de la route  (ex: 'APPROVE')
 */
export function permissionGuard(route: string, action: string): CanActivateFn {
    return () => {
        const permissions = inject(PermissionActionsService);
        const router = inject(Router);
        const allowed = permissions.can(route, action)();
        return allowed ? true : router.createUrlTree(['/auth/login']);
    };
}

import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { PermissionActionsService } from '@cmz/shared-application';

/**
 * Guard fonctionnel RBAC — câble les permissions chiffrées du backend sur les
 * routes Angular. Repose sur `PermissionActionsService.can(route, action)` qui
 * retourne un `Signal<boolean>` réactif (ADR-0010 §Ports & Adapters).
 *
 * **Actuellement non câblé sur aucune route** (audit
 * `audit-workspace-2026-08-02-revue-finale.md`, I-7, 2026-08-03) : les 4
 * routes `workflow-action` qui l'utilisaient (`report-states`/`processing`/
 * `requests`/`finalization`) ont été corrigées vers `guards/paths.guard.ts` —
 * elles appelaient `permissionGuard(module, 'VIEW')`, une action qui
 * n'existe dans **aucun** vocabulaire réel (`PermissionAction` legacy :
 * `read`/`write`/`execute`/`export`/`delete`/`approve`, jamais `VIEW`), donc
 * toujours fausse pour toute session réelle — invisible en dev
 * (`provideDevPermissions()` répond toujours `true`). **Gardé dans le
 * dépôt** : la fonction elle-même est correcte et redevient utile dès qu'une
 * route a réellement besoin d'un contrôle fin par action (pas seulement
 * « cette page est-elle listée »), voir `guards/paths.guard.ts` pour cette
 * distinction. Convention réelle des noms d'action, vérifiée par grep sur
 * les ~130 appels `this.permissions.can(...)` déjà en production dans ce
 * dépôt : **minuscules** (`'create'`/`'edit'`/`'delete'`/`'take'`/`'treat'`/
 * `'qualify'`/`'export'`/`'enable'`/`'disable'`/`'publish'`), jamais
 * `'APPROVE'` majuscule — corrigé dans l'exemple ci-dessous, qui portait la
 * même incohérence de casse avant ce correctif.
 *
 * Usage dans les routes (si un besoin réel apparaît) :
 * ```ts
 * {
 *   path: 'report-states/approve',
 *   canActivate: [permissionGuard('report-states', 'approve')],
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
 * @param action Action requise dans le tableau de la route (ex: 'approve') — en minuscules, jamais un verbe inventé sans contrepartie réelle côté backend
 */
export function permissionGuard(route: string, action: string): CanActivateFn {
    return () => {
        const permissions = inject(PermissionActionsService);
        const router = inject(Router);
        const allowed = permissions.can(route, action)();
        return allowed ? true : router.createUrlTree(['/auth/login']);
    };
}

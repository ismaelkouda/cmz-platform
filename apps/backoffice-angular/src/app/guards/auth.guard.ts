import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { SessionService } from '@cmz/shared-application';

/**
 * Guard fonctionnel d'authentification — porte d'entrée *coarse-grained*,
 * évaluée **avant** `permissionGuard` (*fine-grained*, par module/action).
 * Vérifie qu'une session existe et n'est pas expirée ; sinon redirige vers
 * `/auth/login`.
 *
 * Appliqué **une seule fois**, sur le nœud racine qui enveloppe toutes les
 * routes hors `/auth` (`app.routes.ts`) — pas répété sur chacune des ~18
 * routes de module : Angular évalue `canActivate` du parent avant de
 * résoudre n'importe lequel de ses enfants, donc un seul point
 * d'application suffit pour tout le périmètre protégé (audit
 * `audit-workspace-2026-08-02-addendum.md`, I-5). Une déclaration
 * supplémentaire de `canMatch` global (I-6) n'a pas été ajoutée : elle
 * n'apporterait rien que ce point unique ne couvre déjà — moins de
 * mécanismes pour le même résultat.
 *
 * Même limite assumée que `permissionGuard`/`SessionService` (Web Crypto
 * asynchrone, cf. `application-scope.md`) : un jeton encore non déchiffré
 * au moment du guard est traité comme « pas de session » — refus par
 * sécurité, jamais un défaut permissif.
 */
export const authGuard: CanActivateFn = () => {
    const session = inject(SessionService);
    const router = inject(Router);

    const token = session.token();
    const isValid =
        token !== null && new Date(token.expiresAt).getTime() > Date.now();

    return isValid ? true : router.createUrlTree(['/auth/login']);
};

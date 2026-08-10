import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { SessionService } from '@cmz/shared-application';

/**
 * Guard fonctionnel d'authentification — porte d'entrée *coarse-grained*,
 * évaluée **avant** `permissionGuard` / `pathsGuard` (*fine-grained*).
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
 * **Hydratation (T5-3)** : attend `SessionService.whenReady()` avant de
 * lire le jeton. Sans cela, un full document load (F5, e2e `page.goto`)
 * évalue le guard pendant le déchiffrement Crypto → rejet faux-négatif
 * de session valide. Fail-closed **après** hydratation uniquement.
 */
export const authGuard: CanActivateFn = async () => {
    const session = inject(SessionService);
    const router = inject(Router);

    await session.whenReady();

    const token = session.token();
    const isValid =
        token !== null && new Date(token.expiresAt).getTime() > Date.now();

    return isValid ? true : router.createUrlTree(['/auth/login']);
};

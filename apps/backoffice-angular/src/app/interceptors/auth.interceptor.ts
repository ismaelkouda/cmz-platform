import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { SKIP_AUTH } from '@cmz/core';
import { SessionService } from '@cmz/shared-application';

/**
 * Attache le jeton de session (`Authorization: Bearer <token>`) à toute
 * requête sortante, sauf celles marquées `SKIP_AUTH` (endpoints publics —
 * `login`/`forgot-password`/`reset-password`, cf.
 * `authentication/data/src/lib/sources/*.api.ts`).
 *
 * **Responsabilité unique — requête sortante.** La réaction à un 401 ne vit
 * plus ici : elle est portée par `errorInterceptor`
 * (`@cmz/shared-data/interceptors/error.interceptor.ts`, chantier I-3), qui
 * mappe un 401 vers `UnauthorizedError` (`@cmz/shared-domain`) — un type déjà
 * doté d'un handler enregistré dans `UiFeedbackService`
 * (`registry.register(UnauthorizedError, ...)` : toast + `session.clear()`).
 * Dupliquer l'appel à `session.clear()` dans les deux intercepteurs aurait
 * réintroduit exactement le défaut que `contracts/error.contract.md`
 * documente déjà avoir corrigé une fois (33 handlers ad hoc → 1 handler
 * générique + 2 exceptions) : une même réaction câblée à plusieurs endroits.
 *
 * Emplacement — composition root (`apps/backoffice-angular`), pas
 * `@cmz/core` : le jeton vit dans `SessionService` (`@cmz/shared-application`),
 * et `type:core` n'a pas le droit d'en dépendre (ADR-0003 §4 — `type:core` ne
 * dépend que de `type:core`/`type:domain`/`type:constants`). Même
 * emplacement que `permissionGuard` (`../providers/permission.guard.ts`),
 * pour la même raison structurelle.
 *
 * Limite connue, assumée et déjà documentée pour `permissionGuard`
 * (`application-scope.md`) : le déchiffrement du jeton (Web Crypto) est
 * asynchrone. Une requête émise avant la fin du déchiffrement partira sans
 * en-tête `Authorization` — refus côté serveur plutôt que fuite de session,
 * jamais l'inverse.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const session = inject(SessionService);

    if (req.context.get(SKIP_AUTH)) {
        return next(req);
    }

    const token = session.token();
    const authorizedReq = token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token.value}` } })
        : req;

    return next(authorizedReq);
};

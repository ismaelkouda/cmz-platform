import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, tap } from 'rxjs';
import { BYPASS_CACHE } from './cache-context.token';
import { HttpCacheStore } from './http-cache.store';

/**
 * Consomme `BYPASS_CACHE`, posé par ~90 sources `data` (`*.api.ts`, un
 * `HttpContext().set(BYPASS_CACHE, options?.forceRefresh ?? false)` sur
 * chaque appel liste) sans qu'aucun intercepteur ne l'ait jamais lu — cf.
 * `contracts`/`archetypes/data.md` (règle mécanique de l'archétype
 * `api-source`) et l'audit `audit-workspace-2026-08-02-addendum.md`
 * (chantier I-4).
 *
 * Ne s'applique qu'aux requêtes **`GET`** : les mutations (`POST`/`DELETE`)
 * ne sont jamais mises en cache — cohérent avec l'usage réel du token
 * (jamais posé ailleurs que sur les appels liste).
 *
 * - `BYPASS_CACHE` faux (défaut) : sert la réponse en cache si présente,
 *   sinon appelle le réseau et met en cache la réponse.
 * - `BYPASS_CACHE` vrai (`forceRefresh: true` côté appelant) : ignore le
 *   cache en lecture, appelle le réseau, et **rafraîchit** l'entrée — pour
 *   qu'un prochain appel non forcé voie la donnée à jour, pas l'ancienne.
 *
 * Emplacement — `@cmz/core`, avec le token qu'il consomme : aucune
 * dépendance à `@cmz/shared-*`, donc aucune raison de vivre ailleurs
 * (contrairement à `authInterceptor`/`errorInterceptor`, cf. leurs
 * commentaires respectifs pour la règle de placement appliquée partout ici).
 */
export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
    if (req.method !== 'GET') {
        return next(req);
    }

    const store = inject(HttpCacheStore);
    const key = req.urlWithParams;
    const bypass = req.context.get(BYPASS_CACHE);

    if (!bypass) {
        const cached = store.get(key);
        if (cached) {
            return of(cached.clone());
        }
    }

    return next(req).pipe(
        tap((event) => {
            if (event instanceof HttpResponse) {
                store.set(key, event);
            }
        })
    );
};

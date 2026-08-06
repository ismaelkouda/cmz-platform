import { Service } from '@angular/core';
import { HttpResponse } from '@angular/common/http';

/**
 * Cache mémoire des réponses GET, consommé par `cacheInterceptor`. Clé =
 * `req.urlWithParams` (URL + query params sérialisés) : deux requêtes vers
 * le même endpoint avec des filtres différents ont des clés différentes,
 * ce n'est pas une simple mise en cache par chemin.
 *
 * **Pas de TTL, pas de purge automatique câblée ici — et c'est volontaire.**
 * `SessionService.clear()` (`@cmz/shared-application`) appelle déjà
 * `navigation.reload()` à la déconnexion, qui recharge la page et efface
 * donc cet état mémoire par construction. Câbler un appel explicite à
 * `clear()` depuis `SessionService` ou `UiFeedbackService` violerait les
 * frontières de couche (`type:application`/`type:ui` n'ont pas le droit de
 * dépendre de `type:core`, ADR-0003 §4) pour un gain nul : le rechargement
 * complet de page fait déjà le travail.
 */
@Service()
export class HttpCacheStore {
    private readonly cache = new Map<string, HttpResponse<unknown>>();

    get(key: string): HttpResponse<unknown> | undefined {
        return this.cache.get(key);
    }

    set(key: string, response: HttpResponse<unknown>): void {
        this.cache.set(key, response);
    }

    /** Exposé pour les tests / un futur bouton « vider le cache » explicite. */
    clear(): void {
        this.cache.clear();
    }
}

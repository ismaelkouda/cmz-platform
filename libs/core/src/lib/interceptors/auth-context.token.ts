import { HttpContextToken } from '@angular/common/http';

/**
 * Contexte de requête — désactive l'attache automatique du jeton par
 * `authInterceptor` (ex. appel vers une origine tierce, endpoint public
 * hors périmètre du back-end métier). Même convention que `BYPASS_CACHE`
 * (`cache-context.token.ts`) : un `HttpContextToken` posé par l'appelant,
 * lu par l'intercepteur — pas une liste d'URL en dur à maintenir.
 *
 * Usage : `http.get(url, { context: new HttpContext().set(SKIP_AUTH, true) })`.
 */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

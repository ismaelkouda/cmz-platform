import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import {
    ServerResponseError,
    UnauthorizedError,
    UnknownError,
} from '@cmz/shared-domain';
import { catchError, throwError } from 'rxjs';

/**
 * Normalise les échecs **de transport** (la requête HTTP elle-même échoue —
 * jamais atteinte le mapper) vers les `DomainError` existantes, pour qu'ils
 * traversent la même boucle de feedback que les erreurs d'enveloppe
 * `{error, message, data}` déjà traitées par `unwrapResponse`
 * (`unwrap-response.util.ts`, même dossier de responsabilité).
 *
 * **Bug corrigé par cet intercepteur, reproductible avant son ajout :** une
 * panne réseau ou un 5xx brut ne passe jamais par `unwrapResponse` (l'appel
 * HTTP échoue avant qu'il y ait un corps à dé-emballer). L'erreur brute
 * (`HttpErrorResponse`) remontait alors telle quelle jusqu'à
 * `ResourceFacade` → `errorHandler.handle(err as DomainError)` — un cast,
 * pas une conversion. `ErrorHandlerRegistry.handle()` ne trouvant ni handler
 * par type ni `error.code`, retombait sur le handler par défaut, qui fait
 * `translate(error.messageKey, …)` : `messageKey` est `undefined` sur une
 * `HttpErrorResponse` → **toast vide**. C'est exactement le défaut que
 * `contracts/mapper.contract.md` documente avoir corrigé une fois pour les
 * erreurs d'enveloppe (`ApiError` sans `messageKey` arrivant à la boucle) —
 * non corrigé, jusqu'ici, pour les échecs de transport.
 *
 * Mapping :
 * - **401** → `UnauthorizedError` — réutilise le handler déjà enregistré
 *   dans `UiFeedbackService` (toast + `session.clear()`), pas une nouvelle
 *   réaction câblée ailleurs.
 * - **0** (réseau inatteignable, CORS, hors ligne) → `UnknownError`
 *   (`messageKey: 'ERRORS.HTTP.UNKNOWN'`).
 * - **autre statut HTTP** → `ServerResponseError`, avec le message serveur
 *   s'il est exploitable, sinon le résumé Angular (`error.message`) —
 *   passthrough i18next déjà prévu par ce type (cf.
 *   `server-response.error.ts`).
 * - **non-`HttpErrorResponse`** (erreur côté client avant l'envoi) →
 *   propagée sans modification, hors périmètre de cet intercepteur.
 *
 * **Bug trouvé et corrigé le 2026-08-03 (audit `audit-workspace-2026-08-02-
 * revue-finale.md`, I-8/P-8/P-9 — comparaison au contrat réel du legacy,
 * `httpErrorMapper`, `src/core/interceptors/http-error.mapper.ts`) :**
 * l'extraction du message ne testait que `typeof error.error === 'string'`.
 * Or le legacy — seule source de vérité disponible, aucun test/mock/fixture
 * n'existe ni ici ni là-bas pour un payload d'erreur réel — lit
 * `error.error.message` : le corps JSON d'une erreur 4xx/5xx est un
 * **objet** (`{ message: "..." }`, auto-parsé par `HttpClient` quand
 * `Content-Type: application/json`), jamais une chaîne brute. Avec l'ancien
 * test (`error: 'Erreur interne côté serveur'`, une chaîne — un scénario
 * qui ne correspond à aucune réponse JSON réelle observée), le bug ne
 * pouvait pas se voir : `typeof error.error === 'string'` était toujours
 * faux pour un vrai corps JSON, donc `serverMessage` retombait sur
 * `error.message` — le résumé technique générique d'Angular (« Http
 * failure response for … : 400 Bad Request »), jamais le message métier du
 * backend. Concrètement : chaque erreur serveur réelle aurait affiché ce
 * texte technique brut à l'utilisateur, jamais le message serveur voulu —
 * régression invisible en test, jamais vérifiée contre une vraie forme de
 * réponse avant cette comparaison.
 *
 * Emplacement — `@cmz/shared-data`, pas `@cmz/core` ni l'app : cet
 * intercepteur ne dépend que de `@cmz/shared-domain` (`type:data` → `type:domain`
 * est une dépendance autorisée, ADR-0003 §4), exactement comme
 * `unwrap-response.util.ts` déjà dans cette lib. Il n'a besoin ni de
 * `SessionService` ni du `Router` — contrairement à `authInterceptor`, rien
 * ne l'oblige à vivre dans la racine de composition.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
    next(req).pipe(
        catchError((error: unknown) => {
            if (!(error instanceof HttpErrorResponse)) {
                return throwError(() => error);
            }

            if (error.status === 401) {
                return throwError(() => new UnauthorizedError());
            }

            if (error.status === 0) {
                return throwError(() => new UnknownError());
            }

            return throwError(
                () => new ServerResponseError(extractServerMessage(error))
            );
        })
    );

/**
 * Ordre de préférence, du plus au moins fiable :
 * 1. Corps JSON `{ message: "..." }` (forme réelle confirmée contre le
 *    legacy, `httpErrorMapper` — `error.error.message`) ;
 * 2. Corps brut en chaîne (`Content-Type` non-JSON, ou serveur qui renvoie
 *    du texte simple) ;
 * 3. Résumé générique d'Angular (`error.message`) — dernier recours,
 *    jamais le message métier voulu, seulement pour ne jamais afficher une
 *    chaîne vide.
 */
function extractServerMessage(error: HttpErrorResponse): string {
    const body: unknown = error.error;
    if (
        body &&
        typeof body === 'object' &&
        'message' in body &&
        typeof (body as { message: unknown }).message === 'string' &&
        (body as { message: string }).message.trim() !== ''
    ) {
        return (body as { message: string }).message;
    }
    if (typeof body === 'string' && body.trim() !== '') {
        return body;
    }
    return error.message;
}

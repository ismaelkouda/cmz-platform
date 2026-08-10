import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { StorePathsService } from '@cmz/shared-application';

/**
 * Garde de route *coarse-grained* par page autorisée — remplace, sur les 4
 * routes `workflow-action` (`report-states`/`processing`/`requests`/
 * `finalization`), l'ancien `permissionGuard(module, 'VIEW')`.
 *
 * **Pourquoi ce remplacement (audit `audit-workspace-2026-08-02-revue-finale.md`,
 * I-7 — débloqué le 2026-08-03 par l'accès au dépôt legacy).** `'VIEW'` n'est
 * **membre d'aucun vocabulaire d'action réel** : ni le type `PermissionAction`
 * du legacy (`'read' | 'write' | 'execute' | 'export' | 'delete' | 'approve'`),
 * ni aucun des ~130 appels réels à `PermissionActionsService.can(route, action)`
 * du legacy (recherche exhaustive : `take`/`treat`/`qualify`/`finalize`/
 * `export`/`create`/`edit`/`delete`/`enable`/`disable`/`publish`/`unpublish`/
 * `download` — jamais `VIEW`). `permissionGuard(module, 'VIEW')` lisait donc
 * une clé qu'aucune session réelle ne peut jamais poser dans
 * `permissionsActions` — **redirection systématique de tout utilisateur réel**
 * vers `/auth/login` sur ces 4 routes, quel que soit son profil. Invisible en
 * dev (`provideDevPermissions()` fait toujours répondre `true`), jamais
 * couvert par un test contre la vraie forme du payload backend.
 *
 * **Ce que le legacy faisait réellement pour cette question** (« ai-je le
 * droit de voir cette page du tout ? », pas « ai-je le droit de faire cette
 * action dans la page ? ») : `PagesGuard` (`src/core/guard/PagesGuard.ts`),
 * jamais activé (`canActivate: [PagesGuard]` commenté dans
 * `processing.routes.ts`/`finalization.routes.ts`) — vérifiait
 * `state.url` contre `StorePathsService.getPaths` (`CurrentUser.paths:
 * string[]`, un champ du wire distinct de `permissions` (menu) et `actions`
 * (boutons)). `@cmz/shared-application` porte déjà `StorePathsService`,
 * fidèle au legacy — il n'était simplement jamais alimenté
 * (`SessionService.save()` ne persistait jamais `user.paths`, corrigé dans
 * le même correctif que ce fichier) ni consommé par aucun guard. Ce fichier
 * active enfin ce que le legacy avait conçu mais jamais mis en service.
 *
 * **Incertitude assumée, documentée plutôt que masquée** : aucune donnée
 * réelle (fixture, mock, réponse serveur capturée) n'a été trouvée ni dans
 * ce dépôt ni dans le legacy pour confirmer le format exact des chaînes de
 * `paths` (segment nu `"report-states"` vs chemin absolu `"/report-states"`,
 * top-level uniquement vs sous-routes incluses). Choix fait ici : comparer
 * au **segment de route configuré** (`route.routeConfig?.path`, ex.
 * `"report-states"`) plutôt qu'à `state.url` complet — `state.url` inclurait
 * les sous-chemins de navigation (`/report-states/approve/123`), qu'une
 * liste de pages menu ne peut pas raisonnablement énumérer une par une ;
 * c'est très probablement la raison pour laquelle `PagesGuard`
 * (comparaison stricte sur `state.url`) n'a jamais été activé côté legacy.
 * **À confirmer contre une vraie réponse de connexion avant mise en
 * production** — signalé explicitement, pas supposé silencieusement correct.
 *
 * **Hydratation (T5-3)** : `await storePaths.whenReady()` avant décision —
 * même race Crypto qu'`authGuard` (voir ce fichier / SessionService).
 */
export const pathsGuard: CanActivateFn = async (route) => {
    const storePaths = inject(StorePathsService);
    const router = inject(Router);

    await storePaths.whenReady();

    const segment = route.routeConfig?.path;
    const paths = storePaths.paths();

    const allowed = !!segment && !!paths && paths.includes(segment);

    return allowed ? true : router.createUrlTree(['/auth/login']);
};

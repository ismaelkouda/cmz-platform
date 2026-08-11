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
 * **Format confirmé (T3-2, `docs/architecture/taches-restantes.md`,
 * 2026-08-11)** : une vraie réponse de connexion (staging) a été fournie et
 * inspectée — `CurrentUser.paths` contient des **chemins absolus avec
 * slash** (ex. `"/dashboard"`, `"/requests/queues"`), pas des segments nus.
 * Comparaison corrigée en conséquence : `route.routeConfig?.path` est
 * préfixé d'un `/` avant l'appel à `paths.includes(...)`. Cas B du mémo
 * `docs/architecture/verification-format-paths.md` (conservé pour
 * traçabilité de la démarche de vérification, plus pour le doute lui-même).
 *
 * **Défaut distinct découvert pendant cette même vérification, non traité
 * ici** : la comparaison porte sur le **segment de route Angular
 * configuré** (`route.routeConfig?.path`, ex. `"report-states"`,
 * `"territorial-structures/regions"`), mais un examen exhaustif de
 * `app.routes.ts` contre la liste réelle de `paths` montre que la quasi
 * totalité des segments Angular ne correspondent à aucune entrée du wire
 * réel (ex. `report-states` vs `/requests/queues` + `/reports-processing/
 * queues`, `territorial-structures/*` vs `/territorial-structure/*` —
 * singulier côté API, `content-management/home` vs `/content-management/
 * home-blocks`, etc.) — désalignement structurel entre le routing Angular
 * et le contrat backend réel, documenté séparément (T3-2b,
 * `taches-restantes.md`) car il nécessite une décision produit sur le
 * remapping des URLs, pas une simple correction de guard.
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

    const allowed = !!segment && !!paths && paths.includes(`/${segment}`);

    return allowed ? true : router.createUrlTree(['/auth/login']);
};

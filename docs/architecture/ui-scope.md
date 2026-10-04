# Couche `@cmz/shared-ui` — état

- **Dernière mise à jour :** 2026-10-04

Présentation partagée (pipes, services UI, adaptateurs). Dépend de
`shared-domain`/`shared-application` ; jamais l'inverse.

## Généré et vérifié (`tsc` vert)

| Élément                                                   | Notes                                                                                                                                                                                         |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CapitalizePipe`, `SeparatorThousandsPipe`, `SafeUrlPipe` | pipes, `standalone` implicite.                                                                                                                                                                |
| `WorkspaceRouteReuseStrategy`                             | conserve exactement le premier arbre composant sous le shell workspace ; rattache la même instance et détruit officiellement les handles fermés.                                              |
| `TableSelectionService<T>`                                | signaux ; `SelectionEvent` externalisé.                                                                                                                                                       |
| `WorkspaceService`                                        | registre mémoire borné des vues ouvertes ; signaux `active/suspended`, fermeture MRU, garde dirty et aucune persistance implicite.                                                            |
| `WorkspaceDirtyDirective`                                 | relie un booléen de modification métier à la vue active sans coupler le formulaire à une identité de route ; déployée sur le formulaire pilote `infrastructure-type`.                         |
| `NavService`                                              | nettoyé (typé, code mort retiré, `takeUntilDestroyed`).                                                                                                                                       |
| **`SonnerNotificationService`**                           | adaptateur `NotificationPort` → **ngx-sonner** (Sonner).                                                                                                                                      |
| **`SweetAlertConfirmDialog`**                             | adaptateur `ConfirmDialogPort` → **SweetAlert2**.                                                                                                                                             |
| **`UiFeedbackService`**                                   | **ferme la boucle d'erreurs** : `registerDefault` (33 → 1 + 2), `messageKey` traduit, toast Sonner ; exceptions `Unauthorized` (warning + `session.clear`) et `Validation` (message serveur). |

## Câblage requis côté app (adaptateurs)

- Fournir le catalogue natif `@angular/localize` via `LOCALIZED_MESSAGE_CATALOG`
  au composition root Angular.
- Inclure **`<ngx-sonner-toaster />`** dans le template racine (rendu des
  toasts).
- Lier les ports aux adaptateurs si on injecte les abstractions :
  `NotificationPort`/`ConfirmDialogPort`.

## Non reproduits / restants

| Élément                                                                 | Raison                                                                                                                                                         |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout`                                                                | **mort** (commenté).                                                                                                                                           |
| `permission-tree-node`, `FormValidationService`                         | dépendent de **primeng** (`TreeNode`, `MessageService`) — **exclu du partagé** (ADR-0012). À refaire sans primeng (interface `TreeNode` maison) ou dans l'app. |
| `mapping`, `excel-export`, `sweet-alert` (service), `app-customization` | dépendances externes / HTTP restantes — au fil des besoins.                                                                                                    |

Le vieux couple `TabService`/`CustomRouteReuseStrategy` a été retiré : il
persistait des raccourcis sans fournir la promesse runtime d'une vue vivante. Le
contrat actuel est documenté dans
[`workspace-vues-vivantes-accessibilite-2026-10-04.md`](./workspace-vues-vivantes-accessibilite-2026-10-04.md).
Ce contrat est multi-stack, mais la ligne ci-dessus décrit uniquement
l'adaptateur Angular actuellement qualifié. L'adaptateur ReactJS reste une tâche
explicite : mêmes oracles observables, implémentation native distincte, aucune
fausse abstraction commune des cycles de vie des deux frameworks.

## Dates (date-fns 4.4.0) — généré et vérifié

- **shared-data** : `parseAndValidateDateRange` (`date-range.util`) — moment →
  date-fns.
- **shared-ui** : `formatDateSafe`, `parseFrenchDate`, `formatDate`
  (formatteurs) ; `dateNotInPastValidator` (validateur de formulaire) — moment →
  date-fns.
- Non-reproduction : sémantique « non comparable ⇒ valide » préservée ; misnomer
  de `dateNotInPastValidator` (teste le futur) signalé.

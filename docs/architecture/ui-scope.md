# Couche `@cmz/shared-ui` — état

- **Dernière mise à jour :** 2026-07-23

Présentation partagée (pipes, services UI, adaptateurs). Dépend de
`shared-domain`/ `shared-application`/`shared-infra` ; jamais l'inverse.

## Généré et vérifié (`tsc` vert)

| Élément                                                   | Notes                                                                                                                                                                                         |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CapitalizePipe`, `SeparatorThousandsPipe`, `SafeUrlPipe` | pipes, `standalone` implicite.                                                                                                                                                                |
| `CustomRouteReuseStrategy`                                | réutilisation de route.                                                                                                                                                                       |
| `TableSelectionService<T>`                                | signaux ; `SelectionEvent` externalisé.                                                                                                                                                       |
| `TabService`                                              | async (persistance chiffrée Web Crypto), signal.                                                                                                                                              |
| `NavService`                                              | nettoyé (typé, code mort retiré, `takeUntilDestroyed`).                                                                                                                                       |
| **`I18nextTranslationService`**                           | adaptateur `TranslationPort` → **i18next**.                                                                                                                                                   |
| **`SonnerNotificationService`**                           | adaptateur `NotificationPort` → **ngx-sonner** (Sonner).                                                                                                                                      |
| **`SweetAlertConfirmDialog`**                             | adaptateur `ConfirmDialogPort` → **SweetAlert2**.                                                                                                                                             |
| **`UiFeedbackService`**                                   | **ferme la boucle d'erreurs** : `registerDefault` (33 → 1 + 2), `messageKey` traduit, toast Sonner ; exceptions `Unauthorized` (warning + `session.clear`) et `Validation` (message serveur). |

## Câblage requis côté app (adaptateurs)

- Initialiser **i18next** au bootstrap (`i18next.init({...})` + ressources).
- Inclure **`<ngx-sonner-toaster />`** dans le template racine (rendu des
  toasts).
- Lier les ports aux adaptateurs si on injecte les abstractions :
  `{ provide: TranslationPort, useExisting: I18nextTranslationService }`, idem
  `NotificationPort`/`ConfirmDialogPort`.

## Non reproduits / restants

| Élément                                                                 | Raison                                                                                                                                                         |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout`                                                                | **mort** (commenté).                                                                                                                                           |
| `permission-tree-node`, `FormValidationService`                         | dépendent de **primeng** (`TreeNode`, `MessageService`) — **exclu du partagé** (ADR-0012). À refaire sans primeng (interface `TreeNode` maison) ou dans l'app. |
| `mapping`, `excel-export`, `sweet-alert` (service), `app-customization` | dépendances externes / HTTP restantes — au fil des besoins.                                                                                                    |

## Dates (date-fns 4.4.0) — généré et vérifié

- **shared-data** : `parseAndValidateDateRange` (`date-range.util`) — moment →
  date-fns.
- **shared-ui** : `formatDateSafe`, `parseFrenchDate`, `formatDate`
  (formatteurs) ; `dateNotInPastValidator` (validateur de formulaire) — moment →
  date-fns.
- Non-reproduction : sémantique « non comparable ⇒ valide » préservée ; misnomer
  de `dateNotInPastValidator` (teste le futur) signalé.

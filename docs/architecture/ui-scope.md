# Couche `@cmz/shared-ui` — état

- **Dernière mise à jour :** 2026-07-22

Présentation partagée (pipes, services UI). Dépend de `shared-domain`/
`shared-application`/`shared-infra` ; jamais l'inverse.

## Généré (sans install)

| Élément                                                   | Notes                                                                                                                                                |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CapitalizePipe`, `SeparatorThousandsPipe`, `SafeUrlPipe` | `@Pipe`, `standalone` implicite, `inject()`. Nom `separatorThousands` corrigé.                                                                       |
| `CustomRouteReuseStrategy`                                | stratégie de réutilisation de route (@angular/router).                                                                                               |
| `TableSelectionService<T>`                                | signaux ; `SelectionEvent` **externalisé** en interface UI.                                                                                          |
| `TabService`                                              | `@Service`, **async** (persistance chiffrée Web Crypto), `signal` au lieu de BehaviorSubject, `CustomRouteReuseStrategy`.                            |
| `NavService`                                              | **nettoyé** : typé (aucun `any`), code mort retiré, `takeUntilDestroyed` (corrige le `complete()` sans `next()`), typo `megaMenuColapse`→`Collapse`. |
| interfaces `Tab`, `Menu`, `SelectionEvent`                | externalisées (formes UI).                                                                                                                           |

## Non reproduits / bloqués

| Élément                                      | Raison                                                                                         |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `layout`                                     | **mort** (entièrement commenté) + dépend d'`AppCustomizationService`                           |
| `permission-tree-node`                       | bloqué : `TreeNodeInterface extends TreeNode` de **`primeng`** (install à approuver)           |
| `UiFeedbackService`                          | **`@jsverse/transloco`** + `ngx-toastr` (install) — point de branchement du handler par défaut |
| `SweetAlertService`                          | `sweetalert2` (install)                                                                        |
| `FormValidationService`                      | `primeng` (install)                                                                            |
| fonctions de formatage `*-style`, `format-*` | présentation ; certaines `moment` (install)                                                    |

Les éléments bloqués attendent l'accord d'install des libs externes.

# Couche `@cmz/shared-ui` — état

- **Dernière mise à jour :** 2026-07-22

Présentation partagée (pipes, services UI). Dépend de `shared-domain`/
`shared-application` ; jamais l'inverse.

## Généré (sans install)

| Archétype | Éléments                                                  | Notes                                                                                                                                            |
| --------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pipe`    | `CapitalizePipe`, `SeparatorThousandsPipe`, `SafeUrlPipe` | `@Pipe` (non renommé), `standalone` implicite (jamais `standalone: true`), `inject()`. Nom `separatorThousands` corrigé (suffixe `Pipe` retiré). |

## Bloqué — dépendances externes à **approuver** avant `bun add`

| Élément                                                | Lib externe                                      |
| ------------------------------------------------------ | ------------------------------------------------ |
| `UiFeedbackService` (branche `registerDefault` + i18n) | **`@jsverse/transloco`** + `ngx-toastr`          |
| `SweetAlertService`                                    | `sweetalert2`                                    |
| `FormValidationService`                                | `primeng`                                        |
| `layout` / `nav` / `tab`                               | `@angular/router` (déjà au catalog) — buildables |
| `permission-tree-node`, `table-selection`              | formes UI (`TreeNodeInterface`…) — buildables    |
| fonctions de formatage (`format-*`, `*-style`)         | `moment` pour certaines                          |

Les services sans lib externe (`layout`, `nav`, `tab`, `permission-tree-node`,
`table-selection`) sont générables sans approbation ; ceux à
toast/alerte/primeng/ Transloco attendent l'accord d'install.
`UiFeedbackService` est le point où le **handler par défaut**
(`ErrorHandlerRegistry.registerDefault`) et **Transloco** se branchent (cf.
[`error.contract`](../../contracts/error.contract.md)).

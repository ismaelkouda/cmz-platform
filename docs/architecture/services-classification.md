# Classification des « services » de `shared/domain/services`

- **Dernière mise à jour :** 2026-07-22

Le dossier source `shared/domain/services` réunit **28 fichiers** sous
l'étiquette « domain », mais l'analyse des dépendances montre un **fourre-tout
multi-couches**. Un service de **domaine** est du métier pur : aucune dépendance
framework, UI, HTTP ou infrastructure. Presque aucun de ces 28 ne l'est. Les
générer dans `shared-domain` importerait `HttpClient`, `ngx-toastr`, `primeng`,
`crypto-js`, `Router`, `ExcelJS`… dans la couche métier — violation Clean
Architecture.

Chaque service est donc **routé vers sa vraie couche**. La couche cible
détermine la lib (`@cmz/shared-<couche>`) où il sera généré, **quand cette
couche sera construite** — pas maintenant dans le domaine.

## Routage

| Couche cible             | Services (source)                                                                                                                               | Signal                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **domain**               | `normalize-phone-number` (fonction pure)                                                                                                        | aucun import externe                    |
| **application**          | `error-handler-registry`, `session`, `permission-actions`, `store-paths`, `route-context`, `notifications-initializer`                          | état/orchestration, infra via injection |
| **ui**                   | `ui-feedback`, `form-validation`, `sweet-alert`, `nav`, `tab`, `layout`, `table-selection`, `permission-tree-node`, `app-customization.service` | toastr / primeng / router / formes UI   |
| **data / infra**         | `mapping` (HttpClient), `encoding-data` (crypto-js), `excel-export` + `table-export-excel-file` (ExcelJS), `openlayers-loader`                  | lib externe / réseau                    |
| **module (hors kernel)** | `history-data-parser` → module `history` ; certains `app-customization.*`                                                                       | couplage composant/module               |

## Cycle #2 — `history-data-parser`

Il importe **à la fois** un type UI
(`@shared/components/history/.../interfaces`) et un DTO d'infrastructure
(`.../api/dto`). Ce n'est ni du domaine partagé, ni un service transverse :
c'est un parseur propre au **module `history`**. Il sort du kernel et sera
généré avec ce module (Phase 07). Le cycle `domain → components` disparaît par
ce simple **bon placement**.

## Conséquence de séquencement

- **Maintenant (kernel `shared-domain`)** : seule la logique métier pure est
  extraite — ici la fonction `normalizePhoneNumber`. Rien d'autre de `services/`
  n'entre dans le domaine.
- **Plus tard** : les services `application` / `ui` / `data-infra` sont générés
  quand on bâtit `@cmz/shared-application`, `@cmz/shared-ui`,
  `@cmz/shared-infra` comme **tranches de couche cohérentes** (une lib par
  couche, ADR-0003 / Phase 4), chacune sous le contrat
  [`service`](../../contracts/service.contract.md). Cette table est la feuille
  de route de ces tranches.

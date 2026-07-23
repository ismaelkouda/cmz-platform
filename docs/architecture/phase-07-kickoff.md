# Phase 07 — démarrage : intégration module ↔ kernel

- **Dernière mise à jour :** 2026-07-23

## Constat

En branchant le premier module (générateur SEOS `resources`, 101 fichiers
plats), on a mesuré la **surface d'intégration** : **68 imports** vers
`@shared/*` / `@core/*`. Beaucoup relèvent du **support de pattern** différé («
base au premier consommateur ») — le module **est** ce premier consommateur.

## Support kernel — **complet** (vérifié `tsc` / `eslint`)

| Pièce                                                                        | Lib                | Couvre                                                                          |
| ---------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------- |
| bases mappers `SimpleResponse`/`Paginated`/`ArrayResponse`/`MessageResponse` | shared-data        | envelopes de réponse (via `unwrapResponse`)                                     |
| `unwrapResponse` / `assertResponseOk`                                        | shared-data        | dé-emballage `{error,message,data}` (lève `ServerResponseError`/`UnknownError`) |
| `MapperUtils`, `FetchOptions`                                                | shared-data        | support de mapper, options de fetch                                             |
| `buildHttpParams` / `buildHttpPayload`                                       | shared-data        | sérialisation HTTP                                                              |
| `SelectOption`                                                               | shared-domain      | option de select                                                                |
| facades `BaseFacade` / `PaginatedFacade`, `ResourceState`, `facade.util`     | shared-application | orchestration signal-based                                                      |
| `PAGINATION_CONST`                                                           | shared-constants   | pagination                                                                      |
| config `APP_CONFIG` + tokens d'URL, `BYPASS_CACHE`                           | **@cmz/core**      | config runtime + cache                                                          |
| `COMMON_FORM_VALIDATORS`                                                     | shared-ui          | règles de formulaire                                                            |

## Reste avant un module de bout en bout

- **Adaptateur** (`tools/seos-adapter/mapping.mjs`) : ajouter deux réécritures —
  `@shared/domain/services/ui-feedback` → `@cmz/shared-ui` (service déplacé en
  ui) et `@core/*` → `@cmz/core`.
- Faire tourner un **premier module réel** via l'adaptateur, résolu contre le
  kernel, `bun install` + `tsc`/`nx build`.

## Pipeline module (rappel, ADR-0011)

```
générateur SEOS (plat, dossier = nom module)
  → check-pattern (106/106)
  → tools/seos-adapter/adapt.mjs <plat> <module>   # distribue + réécrit @shared/* -> @cmz/shared-*
  → bun install (workspace:*) + tsc / nx build
```

## Note — erreurs kernel « en attente de consommateur »

`ApiError` et `InvalidFilterError` (operational-error) n'ont pas de consommateur
dans le code généré : leurs consommateurs (sources de données, VO de filtre de
module) arrivent en Phase 07. Statut identique aux 19 `domain-error` (consommées
par les validators de module). **Rétention intentionnelle**, pas du code mort.

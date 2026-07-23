# Phase 07 — démarrage : intégration module ↔ kernel

- **Dernière mise à jour :** 2026-07-23

## Constat

En branchant le premier module (générateur SEOS `resources`, 101 fichiers
plats), on mesure la **surface d'intégration** : **68 imports** vers `@shared/*`
/ `@core/*`. Plusieurs sont du **support de pattern** différé (« base au premier
consommateur ») — le module **est** ce premier consommateur. Le kernel
entités/enums/erreurs ne suffit pas ; il faut compléter le support.

## Support généré (ce lot) — vérifié `tsc`

| Pièce                                                            | Lib           | Imports source couverts                       |
| ---------------------------------------------------------------- | ------------- | --------------------------------------------- |
| `SimpleResponseMapper`, `PaginatedMapper`, `ArrayResponseMapper` | shared-data   | bases de mappers (3)                          |
| `MapperUtils`                                                    | shared-data   | `@shared/domain/utils/mapper-utils` (3)       |
| `FetchOptions`                                                   | shared-data   | `@shared/interface/fetch-options` (19)        |
| `SelectOption`                                                   | shared-domain | `@shared/domain/interfaces/select-option` (5) |

Non-reproduction : `console.log('dto:')` de `SimpleResponseMapper` retiré ; bloc
`validateDto` commenté de `MapperUtils` retiré.

## Support restant (prérequis Phase 07)

| Pièce source                                                                                          | Cible                                                   | Note                                              |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| `@shared/application/services/base-facade`, `array-base-facade`, `object-base-facade`, `facade.utils` | shared-application                                      | **facades** (archétype à écrire)                  |
| `@shared/constants/pagination.constants`                                                              | shared-constants                                        | données                                           |
| `@shared/domain/utils/build-http-params`, `build-http-payload`                                        | shared-data                                             | utils HTTP (`HttpParams`)                         |
| `@shared/domain/services/ui-feedback.service`                                                         | **path** : notre `UiFeedbackService` est en `shared-ui` | l'adaptateur devra réécrire vers `@cmz/shared-ui` |
| `@core/interceptors/*`, `@core/config/config.tokens`                                                  | **`@cmz/core`** (lib à créer)                           | couche core transverse                            |
| `form-validators.constants`                                                                           | shared-ui                                               | présentation                                      |

## Pipeline module (rappel, ADR-0011)

```
générateur SEOS (plat, dossier = nom module)
  → check-pattern (106/106)
  → tools/seos-adapter/adapt.mjs <plat> <module>   # distribue + réécrit @shared/* -> @cmz/shared-*
  → bun install (workspace:*) + tsc/nx build
```

## Séquencement

1. Finir le **support** (facades, pagination, http-utils, `@cmz/core`) — en
   cours.
2. Faire tourner un **premier module réel** de bout en bout via l'adaptateur,
   résolu contre le kernel complété.
3. Étendre aux 53 entités (mesure Phase 03).

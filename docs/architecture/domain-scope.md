# Périmètre du domaine `shared-domain` — ce qui entre, ce qui sort

- **Dernière mise à jour :** 2026-10-04

Le domaine est **métier pur** : zéro dépendance framework / UI / HTTP / infra.
Comme `services/`, les dossiers `utils/`, `functions/`, `types/`, `constants/`,
`pipes/` du source sont **mixtes** ; chaque fichier est routé vers sa vraie
couche. Ce document est la carte d'ensemble (voir aussi
[`services-classification.md`](./services-classification.md)).

## Entré dans `shared-domain`

| Archétype   | Fichiers                                                            |
| ----------- | ------------------------------------------------------------------- |
| `enum`      | 15                                                                  |
| `props`     | 8 (formes d'entités)                                                |
| `entity`    | 9                                                                   |
| `error`     | base `DomainError` + 19 `domain-error` + `InvalidFilterError`       |
| `vo`        | `DatePeriod`, `LocationMethodVO`                                    |
| `validator` | `assertValidDateRange`                                              |
| `util`      | `isMatchConfirmPassword`, `isValidEmail`, `resolveOpenEndedEndDate` |
| `function`  | `normalizePhoneNumber`                                              |
| `type`      | `PermissionAction`, `MediaValue`                                    |

## Routé ailleurs (non-domaine)

| Source                                                                                 | Couche cible           | Raison                                |
| -------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------- |
| `utils/build-http-params`, `build-http-payload`, `mapper-utils`, `date-range` (moment) | **data**               | HTTP / moment / support de mapper     |
| ancienne stratégie de réutilisation de route, `crud-form-utils`                        | **ui**                 | `@angular/router` / formes            |
| `functions/*` de formatage (`format-*`, `separator-thousands`, `*-style`)              | **ui**                 | présentation                          |
| `functions/control-date`, `semantic-version-validator`                                 | **ui**                 | `@angular/forms` (`ValidatorFn`)      |
| `functions/convertUrlToBase64`, `load-image`, `url-to-file`                            | **infra**              | DOM / fetch / File                    |
| `types/route-context`, `types/table-selection`                                         | **ui**                 | navigation / tableau                  |
| `pipes/*` (`capitalize`, `safe-url`, `separator-thousands`)                            | **ui**                 | `PipeTransform` / `DomSanitizer`      |
| `constants/*` (`operator`, `report`, `source`, `platform-crop-config`)                 | **`shared-constants`** | lib de constantes dédiée (kernel-05a) |

## Corrections de non-reproduction appliquées

- **`LocationMethodVO.fromDto` supprimé** : parsait une string DTO (fuite
  domaine→data) et était **cassé** (comparait `dtoValue.toLowerCase()` aux
  valeurs enum, qui sont des clés i18n `COMMON.*` → toujours `UNKNOWN`). Le pont
  DTO→VO revient au `mapper`.
- **`normalizePhoneNumber`** : `replaceAll` (lib ES2021) → `replace(/\D/g,'')`
  (socle es2020).
- **`.types.ts` → `.type.ts`** (un fichier = un type).
- L'ancienne stratégie de route n'est pas une primitive du domaine et n'a pas
  été conservée comme référence active. Elle est remplacée côté UI par le
  workspace borné de l'ADR-0084.

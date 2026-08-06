# Audit référence — volet `queues` (`processing`)

- **Date :** 2026-07-30
- **Dernière mise à jour :** 2026-07-31
- **Périmètre :** tranche A complète (domain → data → application → UI).
- **Hors scope :** parité shell legacy `ManagementDialog` fullscreen (P2 — hors
  IR).
- **Source legacy :**
  `$SEOS_LEGACY_ROOT/src/presentation/pages/processing`
- **Cible Nx :** `libs/processing/{domain,data,application,ui}` — préfixe
  `QueuesProcessing*`.

**Verdict tranche A : ✅ signé** — structure, UI kernel, i18n, permissions
ligne.

---

## 1. Item wire → entité

| Champ wire (`QueuesProcessingItemApiDto`) | Legacy                        | Nx (`QueuesProcessingItemMapper`) | Statut         |
| ----------------------------------------- | ----------------------------- | --------------------------------- | -------------- |
| `uniq_id`                                 | `uniqId`                      | `uniqId`                          | ✅             |
| `report_type`                             | `ReportTypeMapper`            | `mapFromDto` (wire-first)         | ✅             |
| `operators[]`                             | `TelecomOperatorMapper`       | idem                              | ✅             |
| `source`                                  | `ReportSourceMapper`          | `mapFromDto`                      | ✅             |
| `initiator_phone_number`                  | pass-through                  | `?? ''`                           | ⚠️ P2 défensif |
| `reported_at` / `updated_at`              | pass-through                  | `?? ''`                           | ⚠️ P2 défensif |
| —                                         | `type: TypeReport.PROCESSING` | idem                              | ✅             |
| Cache entité                              | `dto:${uniq_id}` + `with()`   | idem                              | ✅             |
| Validation                                | `required: ['uniq_id']`       | idem                              | ✅             |

| Rôle        | Legacy                                      | Nx                                           |
| ----------- | ------------------------------------------- | -------------------------------------------- |
| DTO item    | `api/dto/queues/queues-response-api.dto.ts` | `dtos/queues-processing-response-api.dto.ts` |
| Mapper item | `mappers/queues/queues.mapper.ts`           | `mappers/queues-processing-item.mapper.ts`   |
| Entity      | `entities/queues/queues.entity.ts`          | `entities/queues-processing.entity.ts`       |

---

## 2. Filtre contract → wire

| Champ contract            | Legacy VO                      | Nx `queuesProcessingFilterVo`                                     | Statut |
| ------------------------- | ------------------------------ | ----------------------------------------------------------------- | ------ |
| `initiatorPhoneNumber`    | `normalizePhoneNumber(trim)`   | idem                                                              | ✅     |
| `uniqId`                  | `trim()`                       | `trim()`                                                          | ✅     |
| `source`                  | `trim()`                       | `trim()`                                                          | ✅     |
| `reportType`, `operators` | pass-through                   | pass-through                                                      | ✅     |
| Dates                     | `DatePeriod` + endDate ouverte | `assertValidDateRange` + `resolveOpenEndedEndDate` (FilterEntity) | ✅     |

| Champ wire | Nx `queuesProcessingFilterMapper` | Statut |
| ---------- | --------------------------------- | ------ |
| snake_case | si défini uniquement              | ✅     |

---

## 3. HTTP / repository

| Critère      | Legacy            | Nx                                    | Statut |
| ------------ | ----------------- | ------------------------------------- | ------ |
| Endpoint     | `queues`          | `PROCESSING_ENDPOINTS.QUEUES`         | ✅     |
| Méthode      | `GET`             | `GET`                                 | ✅     |
| Pagination   | `?page=` + filtre | `HttpParams` + `arrayFormat: 'comma'` | ✅     |
| Cache bypass | `BYPASS_CACHE`    | idem                                  | ✅     |

---

## 4. Application

| Rôle       | Legacy                     | Nx                                    | Statut |
| ---------- | -------------------------- | ------------------------------------- | ------ |
| Use case   | `QueuesUseCase` + CQRS     | `QueuesProcessingUseCase` — `defer()` | ✅     |
| Facade     | `QueuesFacade` + query bus | `QueuesProcessingFacade`              | ✅     |
| Repository | `QueuesRepository`         | `QueuesProcessingRepository`          | ✅     |

---

## 5. Presenter VM + UI

| Élément               | Legacy                                            | Nx                                                        | Statut           |
| --------------------- | ------------------------------------------------- | --------------------------------------------------------- | ---------------- |
| Labels colonnes       | i18n `PROCESSING.QUEUES.*`                        | idem via `TranslationPort`                                | ✅               |
| `operators` affichage | enum[] brut                                       | `operatorsLabel` pré-traduit                              | ✅ équivalent UX |
| `actionsRef`          | getter entity                                     | `item.uniqId`                                             | ✅               |
| Action ligne          | `tooltipButtonTake` + `disableButtonTake: false`  | `actionButtons.take` + `disabled: false`                  | ✅               |
| Tooltip permission    | TAKE / SEE_MORE                                   | idem                                                      | ✅               |
| Colonne table         | `__action`                                        | `__action` + `rowActionDefinitions`                       | ✅               |
| Permission page       | `canTake` — `/reports-processing/queues` + `take` | idem                                                      | ✅               |
| Handler clic          | ouvre `ManagementDialog`                          | `ProcessingDetailsDialogComponent` (substitut minimal IR) | ✅               |
| Export                | `ExcelExportService` + `export`                   | `exportProcessingList` + `Repository.export` ×3 volets    | ✅               |
| Page                  | `cmz-filter` + `cmz-table` + pagination           | idem                                                      | ✅               |

Fichiers UI :

- `features/queues-processing-page.component.ts`
- `adapters/queues-processing-vm.presenter.ts`
- `constants/queues-processing-table.constant.ts`
- `stores/queues-processing-filter.store.ts`

---

## 6. Oracle / tests

| Test                                        | Statut                                |
| ------------------------------------------- | ------------------------------------- |
| `queues-processing-item.mapper.spec.ts`     | ✅                                    |
| `processing-filter.mapper.spec.ts` — queues | ✅                                    |
| `queues-processing-filter.vo.spec.ts`       | ✅                                    |
| `queues-processing.use-case.spec.ts`        | ✅                                    |
| Smoke curl                                  | ✅ `tools/smoke/processing-queues.sh` |
| ESLint 0 warnings                           | ✅                                    |
| Build app strictTemplates                   | ✅                                    |

```bash
bunx nx test processing-domain processing-data processing-application --skip-nx-cache
bunx eslint --max-warnings=0 "libs/processing/**/*.ts"
./tools/smoke/processing-queues.sh
```

---

## 7. Écarts ouverts

| #   | Écart                                      | Sévérité     |
| --- | ------------------------------------------ | ------------ |
| 1   | Filtre operators multi-select              | P2           |
| 2   | Defaults `''` vs `undefined` legacy        | P2 accepté   |
| 3   | Parité shell `ManagementDialog` fullscreen | P2 — hors IR |

---

## 8. Liens

→ [Audit volet `tasks`](./processing-tasks-audit.md) ·
[Audit référence global](../processing-reference-audit.md)

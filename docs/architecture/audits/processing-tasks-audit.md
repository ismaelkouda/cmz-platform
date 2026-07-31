# Audit référence — volet `tasks` (`processing`)

- **Date :** 2026-07-30
- **Dernière mise à jour :** 2026-07-30
- **Périmètre :** tranche A complète (domain → data → application → UI).
- **Hors scope :** sous-graphe `tasks/actions` (tranche C), navigation details.
- **Source legacy :**
  `/Users/macbookair/Dev/Angular/cmz-backoffice-frontend/src/presentation/pages/processing`
- **Cible Nx :** `libs/processing/{domain,data,application,ui}` — préfixe
  `TasksProcessing*`.

**Verdict tranche A : ✅ signé**

> Même forme wire que `queues` ; différences : endpoint `taken`, action `treat`,
> permission `/reports-processing/tasks` + `treat`.

---

## 1. Item wire → entité

| Champ wire                   | Nx (`TasksProcessingItemMapper`) | Statut |
| ---------------------------- | -------------------------------- | ------ |
| 8 champs liste               | idem queues                      | ✅     |
| Endpoint distinct            | `taken`                          | ✅     |
| Cache + validation `uniq_id` | idem                             | ✅     |

| Rôle     | Legacy                                    | Nx                                          |
| -------- | ----------------------------------------- | ------------------------------------------- |
| DTO item | `api/dto/tasks/tasks-response-api.dto.ts` | `dtos/tasks-processing-response-api.dto.ts` |
| Mapper   | `mappers/tasks/tasks.mapper.ts`           | `mappers/tasks-processing-item.mapper.ts`   |
| Entity   | `entities/tasks/tasks.entity.ts`          | `entities/tasks-processing.entity.ts`       |

---

## 2. Filtre contract → wire

| Champ           | Legacy `TasksFilterVo`  | Nx `tasksProcessingFilterVo`  | Statut |
| --------------- | ----------------------- | ----------------------------- | ------ |
| Liste standard  | sans trim uniqId/source | trim unifié Nx                | ⚠️ P2  |
| Wire snake_case | idem queues             | `tasksProcessingFilterMapper` | ✅     |

---

## 3. HTTP / repository

| Critère             | Legacy      | Nx                           | Statut |
| ------------------- | ----------- | ---------------------------- | ------ |
| Endpoint            | **`taken`** | `PROCESSING_ENDPOINTS.TASKS` | ✅     |
| GET paginé + filtre | ✅          | ✅                           | ✅     |

---

## 4. Application

| Rôle       | Nx                          | Statut |
| ---------- | --------------------------- | ------ |
| Use case   | `TasksProcessingUseCase`    | ✅     |
| Facade     | `TasksProcessingFacade`     | ✅     |
| Repository | `TasksProcessingRepository` | ✅     |

---

## 5. Presenter VM + UI

| Élément              | Legacy                             | Nx                                                                 | Statut |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------ | ------ |
| Action ligne         | `treat` — tooltip TREAT / SEE_MORE | `actionButtons.treat`                                              | ✅     |
| `disableButtonTreat` | `false`                            | `disabled: false`                                                  | ✅     |
| Permission           | `canTreat`                         | `PermissionActionsService` — `/reports-processing/tasks` + `treat` | ✅     |
| Refus permission     | toast                              | `NotificationPort.error`                                           | ✅     |
| Handler clic         | navigation actions-treatment       | stub — tranche B/C                                                 | 🔧     |
| Colonne              | `__action`                         | `__action`                                                         | ✅     |
| Page kernel          | `cmz-filter` + table + pagination  | idem                                                               | ✅     |
| i18n                 | `PROCESSING.TASKS.*`               | ✅ `fr.translation.ts`                                             | ✅     |

Fichiers UI :

- `features/tasks-processing-page.component.ts`
- `adapters/tasks-processing-vm.presenter.ts`
- `constants/tasks-processing-table.constant.ts`
- `stores/tasks-processing-filter.store.ts`

---

## 6. Oracle / tests

| Test                                       | Statut                               |
| ------------------------------------------ | ------------------------------------ |
| `tasks-processing-item.mapper.spec.ts`     | ✅                                   |
| `processing-filter.mapper.spec.ts` — tasks | ✅                                   |
| Smoke curl                                 | ✅ `tools/smoke/processing-tasks.sh` |

> Use-case tasks : pas de spec dédié (P1 — à ajouter).

```bash
bunx nx test processing-data --skip-nx-cache
./tools/smoke/processing-tasks.sh
```

---

## 7. Écarts ouverts

| #   | Écart                                 | Sévérité       |
| --- | ------------------------------------- | -------------- |
| 1   | Handler `treat` → navigation / dialog | P0 — tranche B |
| 2   | Export Excel                          | P1             |
| 3   | Tranche C `tasks/actions`             | P0             |
| 4   | VO trim vs legacy tasks               | P2 accepté     |

---

## 8. Liens

→ [Audit volet `all`](./processing-all-audit.md) ·
[Audit référence global](../processing-reference-audit.md)

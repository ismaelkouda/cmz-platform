# Audit référence — volet `all` (`processing`)

- **Date :** 2026-07-30
- **Dernière mise à jour :** 2026-07-31
- **Périmètre :** tranche A complète (domain → data → application → UI).
- **Hors scope :** parité shell legacy `ManagementDialog` fullscreen (P2 — hors
  IR).
- **Source legacy :**
  `$SEOS_LEGACY_ROOT/src/presentation/pages/processing`
- **Cible Nx :** `libs/processing/{domain,data,application,ui}` — préfixe
  `AllProcessing*`.

**Verdict tranche A : ✅ signé** — clôture relecture structurelle **3/3 volets**
([A-2026-07-30-16](../../seos/Assumptions-Register.md)).

---

## 1. Item wire → entité

| Champ wire                            | Nx (`AllProcessingItemMapper`) | Statut |
| ------------------------------------- | ------------------------------ | ------ |
| 8 champs liste                        | idem queues/tasks              | ✅     |
| Mapper dupliqué (pas de util partagé) | inline par volet               | ✅     |
| Cache + validation `uniq_id`          | ✅                             | ✅     |

| Rôle     | Legacy                                | Nx                                        |
| -------- | ------------------------------------- | ----------------------------------------- |
| DTO item | `api/dto/all/all-response-api.dto.ts` | `dtos/all-processing-response-api.dto.ts` |
| Mapper   | `mappers/all/all.mapper.ts`           | `mappers/all-processing-item.mapper.ts`   |
| Entity   | `entities/all/all.entity.ts`          | `entities/all-processing.entity.ts`       |

---

## 2. Filtre contract → wire — champ `state`

| Couche      | Legacy                     | Nx                                     | Statut               |
| ----------- | -------------------------- | -------------------------------------- | -------------------- |
| Contract    | `AllFilterDto.state`       | `AllProcessingFilterContract.state`    | ✅                   |
| VO / Entity | **state perdu** avant HTTP | `allProcessingFilterVo` + FilterEntity | ✅ Nx corrige legacy |
| Wire        | jamais émis                | `state=terminated` si défini           | ✅                   |
| Enum        | clé i18n en form           | `ProcessingAllState.TERMINATED`        | ✅                   |
| UI select   | legacy                     | `PROCESSING_ALL_STATE_OPTIONS` + i18n  | ✅                   |

| Wire `state` | Valeur API   | Nx                              |
| ------------ | ------------ | ------------------------------- |
| Terminé      | `terminated` | `ProcessingAllState.TERMINATED` |

---

## 3. HTTP / repository

| Critère       | Legacy           | Nx                         | Statut |
| ------------- | ---------------- | -------------------------- | ------ |
| Endpoint      | **`processing`** | `PROCESSING_ENDPOINTS.ALL` | ✅     |
| Param `state` | non émis         | émis si défini             | ✅ Nx  |

---

## 4. Application

| Rôle         | Nx                     | Statut           |
| ------------ | ---------------------- | ---------------- |
| Use case     | `AllProcessingUseCase` | ✅               |
| Facade       | `AllProcessingFacade`  | ✅               |
| Filtre state | perdu legacy           | câblé end-to-end | ✅  |

---

## 5. Presenter VM + UI

| Élément         | Legacy             | Nx                                 | Statut |
| --------------- | ------------------ | ---------------------------------- | ------ |
| Colonnes liste  | idem               | idem                               | ✅     |
| Action ligne    | `view` — SEE_MORE  | `actionButtons.view`               | ✅     |
| Permission      | aucune             | idem                               | ✅     |
| Handler clic    | ouvre details      | `ProcessingDetailsDialogComponent` | ✅     |
| Filtre state UI | select             | `cmz-filter` select + i18n         | ✅     |
| i18n            | `PROCESSING.ALL.*` | ✅ `fr.translation.ts`             | ✅     |

Fichiers UI :

- `features/all-processing-page.component.ts`
- `adapters/all-processing-vm.presenter.ts`
- `constants/all-processing-table.constant.ts`
- `constants/processing-all-state-label.constant.ts`
- `stores/all-processing-filter.store.ts`

---

## 6. Oracle / tests

| Test                                               | Statut                             |
| -------------------------------------------------- | ---------------------------------- |
| `all-processing-item.mapper.spec.ts`               | ✅                                 |
| `processing-filter.mapper.spec.ts` — all + `state` | ✅                                 |
| `all-processing-filter.vo.spec.ts`                 | ✅                                 |
| Smoke curl                                         | ✅ `tools/smoke/processing-all.sh` |

> Mock : ne filtre pas réellement sur `state` (liste statique) — P2.

```bash
bunx nx run-many -t test -p processing-domain processing-data --skip-nx-cache
./tools/smoke/processing-all.sh
```

---

## 7. Écarts ouverts

| #   | Écart               | Sévérité           |
| --- | ------------------- | ------------------ |
| 1   | Export Excel        | ✅ livré tranche C |
| 2   | Mock filtre `state` | P2                 |

---

## 8. Bilan tranche A listes

| Volet  | Audit                                     |
| ------ | ----------------------------------------- |
| queues | ✅ [queues](./processing-queues-audit.md) |
| tasks  | ✅ [tasks](./processing-tasks-audit.md)   |
| all    | ✅ (ce document)                          |

**Prochaine étape :** module IR clôturé — voir
[`processing-meta-verification.md`](./processing-meta-verification.md).

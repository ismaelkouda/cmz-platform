# Vérification Meta — module `processing` (clôture IR)

- **Date :** 2026-07-31
- **Référence structure :** `libs/administrative-infrastructure/*` (pages) +
  legacy `processing`
- **Référence interaction ligne :** legacy `processing` (`__action`, dialog
  take/treat, route tasks/actions)
- **Périmètre :** `libs/processing/*` — listes + details + export +
  tasks/actions CRUD

---

## Scorecard final

| #   | Critère Meta                                                              | Résultat                                        |
| --- | ------------------------------------------------------------------------- | ----------------------------------------------- |
| 1   | DTO filtre sortant = primitives wire                                      | ✅ (`AllProcessingFilterApiDto.state?: string`) |
| 2   | Pipeline filtre contract → vo → entity → repo → mapper                    | ✅                                              |
| 3   | Application `defer()`, sans CQRS bus/handler                              | ✅                                              |
| 4   | UI projection wire via `processing-filter-wire.util.ts`                   | ✅                                              |
| 5   | Isolation cross-module (0 import inter-domaine)                           | ✅                                              |
| 6   | VO vs filterEntity (`endDate` dans entity)                                | ✅                                              |
| 7   | Pattern action `__action` (workflow-action)                               | ✅                                              |
| 8   | `Repository.export` sur les 3 ports liste                                 | ✅                                              |
| 9   | Contrats mutation distincts (take/treat + `TasksActionsProcessing*` CRUD) | ✅                                              |
| 10  | i18n `PROCESSING.*` (+ export tooltips)                                   | ✅                                              |
| 11  | `provideProcessing()` + guard RBAC                                        | ✅                                              |
| 12  | Corpus 100 % applicable (`verified` / `n/a`)                              | ✅ 156 paires, 7 chaînes                        |

**Verdict Meta : ✅ conforme — module clôturé IR**

---

## Oracle exécuté (2026-07-31)

| Tier          | Commande                                                    | Résultat                                                                       |
| ------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1 build       | `bunx nx run-many -t build --projects=tag:scope:processing` | ✅                                                                             |
| 1 test        | `bunx nx run-many -t test --projects=tag:scope:processing`  | ✅ 44 tests                                                                    |
| 1 lint        | `bunx eslint libs/processing --max-warnings=0`              | ✅                                                                             |
| 1 corpus      | `bun run corpus:processing:full`                            | ✅ 7/7 tranche-closed                                                          |
| 2 intégration | `bunx nx run backoffice-angular:build:production`           | ⚠️ compile OK — **budget bundle** dépassé (1.78 MB > 1 MB) ; 0 erreur template |

Le dépassement budget est **monorepo-wide** (ExcelJS CommonJS) — hors périmètre
clôture IR module ; Tier 2 template/type **vert**.

---

## Corpus

| Métrique                          | Valeur                                                        |
| --------------------------------- | ------------------------------------------------------------- |
| Fichier                           | `corpus/processing.pairs.jsonl`                               |
| Paires                            | 156                                                           |
| `verified`                        | 117                                                           |
| `n/a`                             | 39 (CQRS legacy — [A-05](../../seos/Assumptions-Register.md)) |
| `pending` / `emitted` / `blocked` | 0                                                             |

Chaînes : `queues.list`, `tasks.list`, `all.list`, `details`, `tasks.actions`,
`export.list`, `module.shell`.

---

## Corrections appliquées (sessions clôture)

### Tranche A (2026-07-30)

1. **`resolveOpenEndedEndDate`** — uniquement dans `*FilterEntity`.
2. **`all-processing-filter-api.dto`** — `state?: string` (wire-first).
3. **Item mappers** — inline par volet ; cache/`with()` ; plus de util partagé.
4. **Filter stores** — projection wire → contract via
   `processing-filter-wire.util.ts`.
5. **Presenters** — `actionButtons` workflow (`take` / `treat` / `view`).

### Tranches B/C + export (2026-07-31)

6. **Details** — `ProcessingDetailsUseCase` + confirm take/treat ; specs
   VO/permissions/mappers.
7. **Export Excel** — `GET …/export` ×3 volets +
   `processing-list-export.util.ts` + permission `export`.
8. **Tasks/actions** — CRUD `TasksActionsProcessing*` + page
   `/processing/tasks/actions` + corpus 31 nœuds.
9. **Corpus mapping** — `tasks-actions-*` + `list_export` ; CI processing full
   (plus tranche A seule).

---

## Notes acceptées

| Note                     | Détail                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| A-03 duplication         | 3 item mappers, 3 filter mappers, 3 chaînes UI — pas de factorisation inter-volet                                  |
| Shell UI legacy          | `ManagementDialog` fullscreen, tabs/carte/photos — **hors périmètre IR** ([A-12](../seos/Assumptions-Register.md)) |
| Sweet-alert / radio-card | Create/edit tasks/actions — P2 UX, non bloquant IR                                                                 |
| Filtre operators         | Multi-select opérateurs — P2, absent legacy Nx                                                                     |
| Budget production        | P2 transverse — à traiter en durcissement monorepo                                                                 |

---

## Distinction archétypes UI (leçon référence)

| Archétype       | Module                          | Colonne action             |
| --------------- | ------------------------------- | -------------------------- |
| CRUD            | `administrative-infrastructure` | `__actionDropdown`         |
| Workflow-action | `processing`                    | `__action` (bouton unique) |

Emprunter à infra la **structure de page**, pas l'**interaction ligne**.

---

## Distinction vs `requests` / `finalization`

| Zone            | `processing`        | `requests`                   | `finalization`       |
| --------------- | ------------------- | ---------------------------- | -------------------- |
| Corpus paires   | **156**             | 157                          | 126                  |
| Chaînes         | **7**               | 8                            | 6                    |
| Mutation tasks  | **`treat`**         | `approve` (FormData)         | `finalize` (comment) |
| Sous-route CRUD | **`tasks/actions`** | —                            | —                    |
| Details         | take + treat        | qualification approve/reject | take + finalize      |
| Module IR       | **clôturé**         | clôturé                      | clôturé              |

---

## Oracle de régression

```bash
bunx nx run-many -t build,test --projects=tag:scope:processing
bunx eslint libs/processing --max-warnings=0
bun run corpus:processing:full
```

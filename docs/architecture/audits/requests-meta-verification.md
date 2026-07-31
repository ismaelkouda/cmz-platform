# Vérification Meta — module `requests` (clôture IR)

- **Date :** 2026-07-31
- **Référence structure :** `libs/processing/*` +
  [`processing-meta-verification.md`](./processing-meta-verification.md)
- **Référence interaction ligne :** legacy `requests` (`__action`, qualification
  dialog)
- **Périmètre :** `libs/requests/*` — listes + details + export + permissions +
  qualification

---

## Scorecard final

| #   | Critère Meta                                           | Résultat                                                            |
| --- | ------------------------------------------------------ | ------------------------------------------------------------------- |
| 1   | DTO filtre sortant = primitives wire                   | ✅ (`AllRequestsFilterApiDto.status?: string` — corrigé 2026-07-31) |
| 2   | Pipeline filtre contract → vo → entity → repo → mapper | ✅                                                                  |
| 3   | Application `defer()`, sans CQRS bus/handler           | ✅                                                                  |
| 4   | UI projection wire via `requests-filter-wire.util.ts`  | ✅                                                                  |
| 5   | Isolation cross-module (0 import inter-domaine)        | ✅                                                                  |
| 6   | VO vs filterEntity (`endDate` dans entity)             | ✅                                                                  |
| 7   | Pattern action `__action` (workflow-action)            | ✅                                                                  |
| 8   | `Repository.export` sur les 3 ports liste              | ✅                                                                  |
| 9   | `RequestsDetailsQualificationContract` unifié          | ✅                                                                  |
| 10  | i18n `REQUESTS.*` (+ `TOOLTIP.SEE_MORE`)               | ✅                                                                  |
| 11  | `provideRequests()` + guard RBAC                       | ✅                                                                  |
| 12  | Corpus 100 % applicable (`verified` / `n/a`)           | ✅ 157 paires, 8 chaînes                                            |

**Verdict Meta : ✅ conforme — module clôturé IR**

---

## Oracle exécuté (2026-07-31)

| Tier          | Commande                                                  | Résultat                                                                       |
| ------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1 build       | `bunx nx run-many -t build --projects=tag:scope:requests` | ✅                                                                             |
| 1 test        | `bunx nx run-many -t test --projects=tag:scope:requests`  | ✅ 54 tests                                                                    |
| 1 lint        | `bunx eslint libs/requests --max-warnings=0`              | ✅                                                                             |
| 1 corpus      | `bun run corpus:requests`                                 | ✅ 8/8 tranche-closed                                                          |
| 2 intégration | `bunx nx run backoffice-angular:build:production`         | ⚠️ compile OK — **budget bundle** dépassé (1.76 MB > 1 MB) ; 0 erreur template |

Le dépassement budget est **monorepo-wide** (ExcelJS CommonJS) — hors périmètre
clôture IR module ; Tier 2 template/type **vert**.

---

## Corpus

| Métrique                          | Valeur                                                        |
| --------------------------------- | ------------------------------------------------------------- |
| Fichier                           | `corpus/requests.pairs.jsonl`                                 |
| Paires                            | 157                                                           |
| `verified`                        | 119                                                           |
| `n/a`                             | 38 (CQRS legacy — [A-05](../../seos/Assumptions-Register.md)) |
| `pending` / `emitted` / `blocked` | 0                                                             |

Chaînes : `queues.list`, `tasks.list`, `all.list`, `details`, `module.shell`,
`export.list`, `details.permissions`, `details.qualification`.

---

## Corrections appliquées (session clôture)

1. **`AllRequestsFilterApiDto.status`** — `RequestsAllStatus` → `string`
   (wire-first, aligné processing).
2. **i18n** — `REQUESTS.{QUEUES,TASKS,ALL}.TOOLTIP.SEE_MORE` ajoutés.

---

## Notes acceptées

| Note              | Détail                                                                            |
| ----------------- | --------------------------------------------------------------------------------- |
| A-03 duplication  | 3 item mappers, 3 filter mappers, 3 chaînes UI — pas de factorisation inter-volet |
| Export Excel      | Capacité requests-only — enrichit le pattern `workflow-action`                    |
| Shell UI legacy   | `ManagementDialog` fullscreen, OpenLayers — **hors périmètre IR**                 |
| Budget production | P2 transverse — à traiter en durcissement monorepo                                |

---

## Distinction vs `processing`

| Zone            | `processing`             | `requests`            |
| --------------- | ------------------------ | --------------------- |
| Corpus paires   | **156**                  | **157**               |
| Chaînes         | **7**                    | **8**                 |
| Mutation tasks  | `treat`                  | `approve` (FormData)  |
| Export listes   | `GET …/export` + ExcelJS | idem                  |
| Sous-route CRUD | **`tasks/actions`**      | —                     |
| Clôture module  | **module IR clôturé**    | **module IR clôturé** |

---

## Oracle de régression

```bash
bunx nx run-many -t build,test --projects=tag:scope:requests
bunx eslint libs/requests --max-warnings=0
bun run corpus:requests
```

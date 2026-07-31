# Vérification Meta — module `report-states` (clôture IR)

- **Date :** 2026-07-31
- **Référence structure :** `libs/requests/*` + `libs/finalization/*` (pages
  multi-volets)
- **Référence interaction ligne :** legacy `report-states` (`__action`, dialog
  take/approve/reject)
- **Périmètre :** `libs/report-states/*` — 5 listes + details + export Excel

---

## Scorecard final

| #   | Critère Meta                                                           | Résultat                           |
| --- | ---------------------------------------------------------------------- | ---------------------------------- |
| 1   | DTO filtre sortant = primitives wire                                   | ✅                                 |
| 2   | Pipeline filtre contract → vo → entity → repo → mapper                 | ✅                                 |
| 3   | Application `defer()`, sans CQRS bus/handler                           | ✅                                 |
| 4   | UI projection wire via `report-states-filter-wire.util.ts`             | ✅                                 |
| 5   | Isolation cross-module (0 import inter-domaine)                        | ✅                                 |
| 6   | VO vs filterEntity (`endDate` dans entity)                             | ✅                                 |
| 7   | Pattern action `__action` (workflow-action)                            | ✅                                 |
| 8   | `Repository.export` sur les 4 ports liste exportables                  | ✅ (approve/evaluate/close/reject) |
| 9   | Contrats mutation distincts (take/approve/reject — pattern `requests`) | ✅                                 |
| 10  | i18n `REPORT_STATES.*` (+ export tooltips)                             | ✅                                 |
| 11  | `provideReportStates()` + guard RBAC                                   | ✅                                 |
| 12  | Corpus 100 % applicable (`verified` / `n/a`)                           | ✅ 187 paires, 8 chaînes           |

**Verdict Meta : ✅ conforme — module clôturé IR**

---

## Oracle exécuté (2026-07-31)

| Tier          | Commande                                                       | Résultat                                                      |
| ------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| 1 build       | `bunx nx run-many -t build --projects=tag:scope:report-states` | ✅                                                            |
| 1 test        | `bunx nx run-many -t test --projects=tag:scope:report-states`  | ✅ 37 tests                                                   |
| 1 lint        | `bunx eslint libs/report-states --max-warnings=0`              | ✅                                                            |
| 1 corpus      | `bun run corpus:report-states:full`                            | ✅ 8/8 tranche-closed                                         |
| 2 intégration | `bunx nx run backoffice-angular:build:production`              | ⚠️ compile OK — **budget bundle** dépassé ; 0 erreur template |

---

## Corpus

| Métrique                          | Valeur                                                        |
| --------------------------------- | ------------------------------------------------------------- |
| Fichier                           | `corpus/report-states.pairs.jsonl`                            |
| Paires                            | 187                                                           |
| `verified`                        | 138                                                           |
| `n/a`                             | 49 (CQRS legacy — [A-05](../../seos/Assumptions-Register.md)) |
| `pending` / `emitted` / `blocked` | 0                                                             |

Chaînes : `approve.list`, `evaluate.list`, `close.list`, `reject.list`,
`download.list`, `details`, `export.list`, `module.shell`.

---

## Corrections appliquées (session clôture)

1. **Scaffold IR multi-volet** — 5 entités/repos/facades
   `{Volet}ReportStates*` + details (pattern `requests`).
2. **Details** — `ReportStatesDetailsUseCase` + dialog take/approve/reject ;
   reload sur facades volet.
3. **Export Excel** — `GET …/export` ×4 volets +
   `report-states-list-export.util.ts` + permission `export`.
4. **Corpus mapping** — `table-constants` singulier/pluriel legacy ; chaînes
   export + details + shell.
5. **Specs** — use-case export ×5 volets + details use-case ; fix import
   `approve-report-states.use-case.spec.ts`.
6. **i18n** — `REPORT_STATES.*.TABLE|FILTER|TOOLTIP` (export, take, finalize).

---

## Notes acceptées

| Note              | Détail                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| A-03 duplication  | 5 item mappers, 5 filter mappers, 5 chaînes UI — pas de factorisation inter-volet               |
| Volet `download`  | Centre d'export Shapefile/Excel — liste fichiers + téléchargement ; pas de dialog details       |
| Shell UI legacy   | `ManagementDialog` fullscreen — **hors périmètre IR** ([A-12](../seos/Assumptions-Register.md)) |
| Budget production | P2 transverse — ExcelJS CommonJS                                                                |

---

## Distinction vs famille `workflow-action`

| Zone             | `report-states`     | `requests`    | `finalization` | `processing` |
| ---------------- | ------------------- | ------------- | -------------- | ------------ |
| Corpus paires    | **187**             | 157           | 126            | 156          |
| Chaînes          | **8**               | 8             | 6              | 7            |
| Volets liste     | **5** (états)       | 3             | 3              | 3            |
| Mutation details | take/approve/reject | qualification | take/finalize  | take/treat   |
| Module IR        | **clôturé**         | clôturé       | clôturé        | clôturé      |

**Famille `workflow-action` : 4/4 modules clôturés IR.**

---

## Oracle de régression

```bash
bunx nx run-many -t build,test --projects=tag:scope:report-states
bunx eslint libs/report-states --max-warnings=0
bun run corpus:report-states:full
```

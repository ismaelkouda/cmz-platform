# Vérification Meta — module `finalization` (clôture IR)

- **Date :** 2026-07-31
- **Référence structure :** `libs/requests/*` +
  [`requests-meta-verification.md`](./requests-meta-verification.md)
- **Référence interaction ligne :** legacy `finalization` (`__action`, dialog
  take/finalize)
- **Périmètre :** `libs/finalization/*` — listes + details + export +
  permissions + finalize

---

## Scorecard final

| #   | Critère Meta                                              | Résultat                                          |
| --- | --------------------------------------------------------- | ------------------------------------------------- |
| 1   | DTO filtre sortant = primitives wire                      | ✅ (`AllFinalizationFilterApiDto.state?: string`) |
| 2   | Pipeline filtre contract → vo → entity → repo → mapper    | ✅                                                |
| 3   | Application `defer()`, sans CQRS bus/handler              | ✅                                                |
| 4   | UI projection wire via `finalization-filter-wire.util.ts` | ✅                                                |
| 5   | Isolation cross-module (0 import inter-domaine)           | ✅                                                |
| 6   | VO vs filterEntity (`endDate` dans entity)                | ✅                                                |
| 7   | Pattern action `__action` (workflow-action)               | ✅                                                |
| 8   | `Repository.export` sur les 3 ports liste                 | ✅                                                |
| 9   | `FinalizationDetailsFinalizeContract` unifié (comment)    | ✅                                                |
| 10  | i18n `FINALIZATION.*`                                     | ✅                                                |
| 11  | `provideFinalization()` + guard RBAC                      | ✅                                                |
| 12  | Corpus 100 % applicable (`verified` / `n/a`)              | ✅ 126 paires, 6 chaînes                          |

**Verdict Meta : ✅ conforme — module clôturé IR**

---

## Oracle exécuté (2026-07-31)

| Tier          | Commande                                                      | Résultat                                                                       |
| ------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1 build       | `bunx nx run-many -t build --projects=tag:scope:finalization` | ✅                                                                             |
| 1 test        | `bunx nx run-many -t test --projects=tag:scope:finalization`  | ✅ 43 tests                                                                    |
| 1 lint        | `bunx eslint libs/finalization --max-warnings=0`              | ✅                                                                             |
| 1 corpus      | `bun run corpus:finalization`                                 | ✅ 6/6 tranche-closed                                                          |
| 2 intégration | `bunx nx run backoffice-angular:build:production`             | ⚠️ compile OK — **budget bundle** dépassé (1.78 MB > 1 MB) ; 0 erreur template |

---

## Corpus

| Métrique                          | Valeur                            |
| --------------------------------- | --------------------------------- |
| Fichier                           | `corpus/finalization.pairs.jsonl` |
| Paires                            | 126                               |
| `verified`                        | 90                                |
| `n/a`                             | 36                                |
| `pending` / `emitted` / `blocked` | 0                                 |

Chaînes : `queues.list`, `tasks.list`, `all.list`, `details`, `module.shell`,
`export.list`.

---

## Corrections appliquées (session clôture)

1. **Specs héritées requests** — permissions `finalizationState`, finalize
   VO/mapper, use-case sans approve/reject.
2. **Vitest aliases** — `@cmz/finalization-{domain,data,application}` dans
   `tools/vitest-lib.config.ts`.
3. **Corpus mapping** — legacy `tasks-table.constants.ts` /
   `all-table.constants.ts` (suffixe pluriel).
4. **Sélecteurs UI** — `cmz-*-finalization-page` (plus `cmz-*-requests-page`).

---

## Notes acceptées

| Note                  | Détail                                                                            |
| --------------------- | --------------------------------------------------------------------------------- |
| A-03 duplication      | 3 item mappers, 3 filter mappers, 3 chaînes UI — pas de factorisation inter-volet |
| Details simplifié     | take + finalize(comment) — pas qualification requests                             |
| Filtre all            | `state: terminated` (aligné processing)                                           |
| Fichiers morts legacy | Supprimés (approve/reject/qualification + UI orphelin requests)                   |

---

## Distinction vs `requests`

| Zone           | `requests`                   | `finalization`                |
| -------------- | ---------------------------- | ----------------------------- |
| Corpus paires  | 157                          | **126**                       |
| Chaînes        | 8                            | **6**                         |
| Mutation tasks | `approve` (FormData)         | **`finalize`** (comment JSON) |
| Filtre all     | `status` (6 valeurs)         | **`state: terminated`**       |
| Details        | qualification approve/reject | **finalize unifié**           |

---

## Oracle de régression

```bash
bunx nx run-many -t build,test --projects=tag:scope:finalization
bunx eslint libs/finalization --max-warnings=0
bun run corpus:finalization
```

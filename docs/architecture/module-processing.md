# Module `processing` — reconstruction (Phase 07)

- **Dernière mise à jour :** 2026-07-31
- **Statut :** **module IR clôturé** — corpus 156 paires, 7 chaînes, Meta 12/12
  ([audit Meta](./audits/processing-meta-verification.md))
- **Corpus :**
  [`corpus/processing.pairs.jsonl`](../../corpus/processing.pairs.jsonl) —
  `bun run corpus:processing:report`
- **Source de vérité :**
  `/Users/macbookair/Dev/Angular/cmz-backoffice-frontend/src/presentation/pages/processing`
- **Archétype SEOS :**
  [`workflow-action` v0](./patterns/workflow-action.pattern.json) — module de
  référence de la famille.

Module de **traitement opérationnel des signalements**. **211 fichiers .ts** au
source legacy, CQRS + commandes partielles, **4 entités déclarées** (`queues`,
`tasks`, `all`, `details`) plus la sous-route `tasks/actions`
(`actions-treatment`). Reconstruction Nx en **4 packages**
(`libs/processing/{domain,data,application,ui}`).

---

## Convention de nommage — famille `workflow-action`

Trois modules partagent la triade de volets liste (`queues`, `tasks`, `all`) :
`processing`, `requests`, `finalization`. Le legacy utilisait des noms
génériques (`AllUseCase`, `AllFacade`) isolés par dossier — insuffisant dans un
monorepo.

**Décision (2026-07-30) :** qualifier chaque artefact volet par le module :

| Couche         | Pattern                           | Exemple                         |
| -------------- | --------------------------------- | ------------------------------- |
| Entity         | `{Volet}ProcessingEntity`         | `QueuesProcessingEntity`        |
| Props          | `{Volet}ProcessingProps`          | `QueuesProcessingProps`         |
| Use-case       | `{Volet}ProcessingUseCase`        | `AllProcessingUseCase`          |
| Façade         | `{Volet}ProcessingFacade`         | `QueuesProcessingFacade`        |
| Port           | `{Volet}ProcessingRepository`     | `TasksProcessingRepository`     |
| Impl data      | `{Volet}ProcessingRepositoryImpl` | idem                            |
| Contrat filtre | `{Volet}ProcessingFilterContract` | `AllProcessingFilterContract`   |
| VO filtre      | `{volet}ProcessingFilterVo`       | `allProcessingFilterVo`         |
| Page UI        | `{Volet}ProcessingPageComponent`  | `QueuesProcessingPageComponent` |

**Conservé sans volet** (périmètre module entier) : `ProcessingSection`,
`PROCESSING_ENDPOINTS`.

**Un volet = une entité liste + une chaîne complète** — voir
[A-2026-07-30-03](../../seos/Assumptions-Register.md).

**Routes URL** : `/processing/queues|tasks|all` (qualifiant module dans le
segment parent).

À répliquer : `requests` → `{Volet}Requests*`, `finalization` →
`{Volet}Finalization*`.

---

## Périmètre fonctionnel

| Volet                   | Route app                   | Endpoint API         | Action ligne | Rôle                                     |
| ----------------------- | --------------------------- | -------------------- | ------------ | ---------------------------------------- |
| **`queues`**            | `/processing/queues`        | `queues`             | `take`       | Bac à pioche — en attente d'affectation  |
| **`tasks`**             | `/processing/tasks`         | `taken`              | `treat`      | Mes tâches — prises en charge agent      |
| **`all`**               | `/processing/all`           | `processing`         | `view`       | Tous les traitements — vue consolidée    |
| **`details`**           | (dialog / fiche)            | `{id}`               | take/treat   | Fiche signalement — **tranche B**        |
| **`actions-treatment`** | `/processing/tasks/actions` | `processing-actions` | CRUD         | Actions de traitement — **tranche C ✅** |

---

## Contrat d'endpoints canonique

```ts
// libs/processing/data/src/lib/endpoints/processing.endpoints.ts
export const PROCESSING_ENDPOINTS = {
    QUEUES: 'queues',
    TASKS: 'taken',
    ALL: 'processing',
    QUEUES_EXPORT: 'queues/export',
    TASKS_EXPORT: 'taken/export',
    ALL_EXPORT: 'processing/export',
    PROCESSING: 'processing-actions',
    DETAILS_REPORTS: '{id}',
} as const;
```

Listes : **câblées**. **Details (tranche B) :** GET `{reportUrl}{uniq_id}`, POST
`…/take`, POST `…/process`. **Actions (tranche C) :** CRUD
`{reportUrl}{id}/processing-actions` + types — **câblés**.

---

## Scaffolding Nx

```
libs/processing/
├── domain/       @cmz/processing-domain       (28 fichiers .ts)
├── data/         @cmz/processing-data         (24 fichiers .ts)
├── application/  @cmz/processing-application  (8 fichiers .ts)
└── ui/           @cmz/processing-ui           (23 fichiers .ts)
```

Tags : `scope:processing` × `type:{domain,data,application,ui}`.

Composition root : `provideProcessing()` dans
`apps/backoffice-angular/src/app/providers/processing.providers.ts` — bind
`{Volet}ProcessingRepository` → `{Volet}ProcessingRepositoryImpl` (×3) +
`ProcessingDetailsRepository` → `ProcessingDetailsRepositoryImpl`.

Route parent : `/processing` + `permissionGuard('processing', 'VIEW')`.

---

## Inventaire par couche (tranche A — état actuel)

### Domain (`@cmz/processing-domain`)

| Artefact      | Fichiers                                                           |
| ------------- | ------------------------------------------------------------------ |
| Entités liste | `entities/{queues,tasks,all}-processing.entity.ts`                 |
| Props         | `props/{queues,tasks,all}-processing.props.ts`                     |
| Filtres       | `contracts/*-processing-filter.contract.ts`                        |
|               | `entities/*-processing-filter.entity.ts`                           |
|               | `value-objects/*-processing-filter.vo.ts`                          |
|               | `validators/*-processing-filter.validator.ts`                      |
| Ports         | `repositories/{queues,tasks,all}-processing.repository.ts`         |
| Enums         | `enums/processing-section.enum.ts`, `processing-all-state.enum.ts` |

Pipeline filtre : **contract → VO (trim, dates) → FilterEntity (endDate) →
port**.

### Data (`@cmz/processing-data`)

| Artefact       | Fichiers                                                                |
| -------------- | ----------------------------------------------------------------------- |
| Endpoints      | `endpoints/processing.endpoints.ts`                                     |
| DTOs item      | `dtos/{volet}-processing-response-api.dto.ts`                           |
| DTOs filtre    | `dtos/{volet}-processing-filter-api.dto.ts`                             |
| Mappers item   | `mappers/{volet}-processing-item.mapper.ts` (dupliqués, cache/`with()`) |
| Mappers filtre | `mappers/{volet}-processing-filter.mapper.ts`                           |
| Sources        | `sources/{volet}-processing.api.ts`                                     |
| Repos impl     | `repositories/{volet}-processing.repository.impl.ts`                    |

Clé métier wire : **`uniq_id`** → `uniqId`. Enums via mappers kernel
(`ReportTypeMapper`, …).

### Application (`@cmz/processing-application`)

| Artefact  | Fichiers                                                           |
| --------- | ------------------------------------------------------------------ |
| Use-cases | `use-cases/{volet}-processing.use-case.ts` — `defer()`             |
| Façades   | `facades/{volet}-processing.facade.ts` — `PaginatedResourceFacade` |

Chaîne : **facade → use-case → filterVo → filterEntity → repository (port)**.
Pas de CQRS (bus/handler/query supprimés). Application **ne dépend pas de
data**.

Tests : `queues-processing.use-case.spec.ts` (délégation + propagation erreur).

### UI (`@cmz/processing-ui`)

| Artefact    | Fichiers                                                 |
| ----------- | -------------------------------------------------------- |
| Routes      | `features/processing.routes.ts` — lazy, breadcrumbs i18n |
| Pages       | `features/{volet}-processing-page.component.ts`          |
| Presenters  | `adapters/{volet}-processing-vm.presenter.ts`            |
| VM props    | `adapters/{volet}-processing-vm-props.interface.ts`      |
| Tables      | `constants/{volet}-processing-table.constant.ts`         |
| Filter keys | `constants/{volet}-processing-filter-keys.constant.ts`   |
| Stores      | `stores/{volet}-processing-filter.store.ts`              |
| Wire util   | `utils/processing-filter-wire.util.ts`                   |
| RBAC routes | `constants/processing-paths.constant.ts`                 |

**Stack kernel :** `cmz-filter` + `cmz-table` + `cmz-pagination`.

**Pattern action workflow-action (≠ CRUD infra) :**

| Volet  | Colonne    | Bouton  | Permission RBAC                       |
| ------ | ---------- | ------- | ------------------------------------- |
| queues | `__action` | `take`  | `/reports-processing/queues` + `take` |
| tasks  | `__action` | `treat` | `/reports-processing/tasks` + `treat` |
| all    | `__action` | `view`  | (vue seule)                           |

Presenters : `actionButtons.{take|treat|view}` — tooltip dynamique selon
permission, bouton toujours actif (`disabled: false`). Refus au clic →
`NotificationPort`.

**Référence structure page :** `administrative-infrastructure/ui` (filter +
table + pagination). **Référence interaction ligne :** legacy `processing`
(`__action`, pas `__actionDropdown`).

---

## Câblage transverse

| Élément                                                                  | Statut                                             |
| ------------------------------------------------------------------------ | -------------------------------------------------- |
| `provideProcessing()` dans `app.config.ts`                               | ✅                                                 |
| Route `/processing` + guard permissions                                  | ✅                                                 |
| i18n `PROCESSING.QUEUES\|TASKS\|ALL.*`                                   | ✅ `apps/backoffice-angular/.../fr.translation.ts` |
| i18n `PROCESSING.DETAILS.*`, `MANAGEMENT.*`, `COMMON.SUCCESS.TAKE/TREAT` | ✅ tranche B                                       |
| Mock `tools/mock-server.mjs` (`queues` / `taken` / `processing`)         | ✅                                                 |
| Mock détail `GET report/{uniq_id}`, `POST …/take`, `POST …/process`      | ✅ tranche B                                       |
| Smoke curl                                                               | ✅ `tools/smoke/processing-{queues,tasks,all}.sh`  |

---

## Décisions d'ingénieur (validées)

1. **Pas de fusion inter-volet** — ports, mappers item et filter dupliqués
   volontairement.
2. **Clé métier = `uniqId`** (wire `uniq_id`) — jamais `id` serveur.
3. **Enums kernel** — `@cmz/shared-domain` / `@cmz/shared-data`.
4. **Filtre `state` (all)** — Nx corrige le legacy (state perdu avant HTTP) ;
   wire `terminated`.
5. **Composition root app-level** — pas route-scoped (évite NG0201).
6. **Projection wire UI** — `processing-filter-wire.util.ts` dans UI, pas
   domain.

---

## Tranche A — bilan

| #   | Livrable                                            | Statut |
| --- | --------------------------------------------------- | ------ |
| 1   | Application — use-cases + façades ×3                | ✅     |
| 2   | Domaine — entity/props/filtre/ports ×3              | ✅     |
| 3   | Data — DTO/mapper/API/repos ×3                      | ✅     |
| 4   | UI — filter stores, presenters, `cmz-*`, `__action` | ✅     |
| 5   | Transverse — i18n, mock, oracle                     | ✅     |

### Écarts restants (post-tranche A)

| #   | Écart                                                          | Tranche | Sévérité |
| --- | -------------------------------------------------------------- | ------- | -------- |
| 1   | Parité `ManagementDialog` (tabs, carte, photos, sweet-alert)   | B       | P2       |
| 2   | Filtre operators multi-select                                  | A+      | P2       |
| 3   | Sweet-alert create/edit + radio-card opérateur (tasks/actions) | C       | P2       |

---

## Tranches suivantes

### Tranche B — Détail signalement (`details`) ⚠️ partielle

| #   | Livrable                                                             | Statut                            |
| --- | -------------------------------------------------------------------- | --------------------------------- |
| 1   | Domain — `ProcessingDetails*`, port `execute/take/treat`, RBAC paths | ✅                                |
| 2   | Data — DTO legacy, mappers, API `{reportUrl}{uniq_id}`, repo impl    | ✅                                |
| 3   | Application — `ProcessingDetailsUseCase` + `ProcessingDetailsFacade` | ✅                                |
| 4   | UI — `ProcessingDetailsDialogComponent` + ouverture depuis listes    | ✅ (minimal)                      |
| 5   | i18n + mock + oracle build/eslint                                    | ✅                                |
| 6   | Parité `ManagementDialog` + confirm take/treat                       | ✅ confirm · ⬜ tabs/carte/photos |
| 7   | Specs mapper/use-case details                                        | ✅                                |

Naming module-scoped : `ProcessingDetails*` (≠ `{Volet}Processing*` des listes).
Permissions appliquées en use-case via `withPermissions()`. API legacy directe
sur `REPORT_API_URL` + `uniq_id` (pas segment `PROCESSING_ENDPOINTS`).

### Tranche C — Actions de traitement (`tasks/actions`) ✅ IR + corpus

| #   | Livrable                                                     | Statut       |
| --- | ------------------------------------------------------------ | ------------ |
| 1   | Domain — `TasksActions*`, conformité, ports CRUD + types     | ✅           |
| 2   | Data — DTO/mappers/API/repos                                 | ✅           |
| 3   | Application — `TasksActionsUseCase` + facades                | ✅           |
| 4   | UI — page `/processing/tasks/actions` + dialog formulaire    | ✅ (minimal) |
| 5   | Navigation tasks → actions (query params)                    | ✅           |
| 6   | Mock CRUD + types                                            | ✅           |
| 7   | Export Excel listes (queues/tasks/all)                       | ✅           |
| 8   | Specs use-case tasks/actions + export ×3                     | ✅           |
| 9   | Corpus `processing.tasks.actions` + `processing.export.list` | ✅           |
| 10  | Sweet-alert create/edit, radio-card opérateur                | ⬜ P2        |

### Tranche D — Durcissements

Tests use-case tasks/all, tests presenters UI, export, Playwright (Phase 08).

---

## Oracle de vérification

```bash
bunx nx run-many -t build --projects=tag:scope:processing
bunx nx run-many -t test --projects=tag:scope:processing
bunx eslint --max-warnings=0 "libs/processing/**/*.ts"
bunx nx run backoffice-angular:build:production   # strictTemplates
./tools/smoke/processing-queues.sh
./tools/smoke/processing-tasks.sh
./tools/smoke/processing-all.sh
```

---

## Références

- [Audit de référence processing](./processing-reference-audit.md)
- [Vérification Meta (clôture IR)](./audits/processing-meta-verification.md)
- [Audits volets : queues / tasks / all](./audits/processing-queues-audit.md)
- [Archétype workflow-action](./archetypes/workflow-action.md)
- [Analyse projet source — `processing/*`](./analyse-du-projet-source.md)
- Source legacy routes :
  `cmz-backoffice-frontend/.../processing/processing.routes.ts`

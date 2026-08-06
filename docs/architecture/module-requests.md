# Module `requests` — IR, contrats, oracle & corpus

- **Dernière mise à jour :** 2026-07-31
- **Statut :** **✅ module clôturé (IR)** — oracle Tier 1 + corpus 100 % ; audit
  Meta signé
  ([`requests-meta-verification.md`](./audits/requests-meta-verification.md))
- **Statut exécution :** listes + details + export + permissions + qualification
  **câblés** ; parité shell UI legacy (`ManagementDialog`) **hors périmètre IR**
- **Archétype :**
  [`workflow-action` v0](./patterns/workflow-action.pattern.json) — promu avec
  `processing` (Rule 0, sync legacy 2026-07-31)
- **Corpus :**
  [`corpus/requests.pairs.jsonl`](../../corpus/requests.pairs.jsonl)
- **Source de vérité métier :**
  `$SEOS_LEGACY_ROOT/src/presentation/pages/requests`

Ce document décrit la **Représentation Intermédiaire (IR)** du module `requests`
telle qu’instanciée dans le monorepo Nx. L’oracle et le corpus en sont la preuve
de conformité — pas la parité visuelle du shell UI.

---

## 1. Rôle dans SEOS

| Niveau    | Objet                                | Ce module                                      |
| --------- | ------------------------------------ | ---------------------------------------------- |
| Thèse     | Synthèse neurosymbolique (Méthode 2) | 157 paires annotées `legacy → Nx`              |
| Archétype | Famille `workflow-action`            | 2ᵉ module validé après `processing`            |
| IR        | 4 couches isolées + contrats         | `@cmz/requests-{domain,data,application,ui}`   |
| Oracle    | Generate-Verify-Repair               | build + test + eslint + `corpus:requests:full` |

**Invariant :** l’IA n’invente pas les champs, endpoints ni règles métier — elle
instancie l’IR à partir du legacy et du pattern JSON.

---

## 2. Instanciation IR — `workflow-action`

### 2.1 Volets et entités

Quatre entités déclarées : `queues`, `tasks`, `all`, `details`. Pas de
sous-graphe `tasks-actions` (présent côté `processing`).

| Volet     | Route              | Endpoint liste          | Action ligne | Mutation details        |
| --------- | ------------------ | ----------------------- | ------------ | ----------------------- |
| `queues`  | `/requests/queues` | `requests/queues`       | `take`       | `take`                  |
| `tasks`   | `/requests/tasks`  | `requests/task-baskets` | `qualify`    | `approve` (FormData)    |
| `all`     | `/requests/all`    | `requests/qualified`    | `view`       | `reject`                |
| `details` | (dialog)           | `requests/{uniq_id}`    | —            | take / approve / reject |

### 2.2 Convention de nommage Nx

Qualification module obligatoire (monorepo package-based) :

| Couche       | Pattern                     | Exemple                   |
| ------------ | --------------------------- | ------------------------- |
| Entity liste | `{Volet}RequestsEntity`     | `QueuesRequestsEntity`    |
| Port liste   | `{Volet}RequestsRepository` | `TasksRequestsRepository` |
| Use-case     | `{Volet}RequestsUseCase`    | `AllRequestsUseCase`      |
| Façade       | `{Volet}RequestsFacade`     | `TasksRequestsFacade`     |
| Details      | `RequestsDetails*`          | `RequestsDetailsEntity`   |

Sans volet (périmètre module) : `RequestsSection`, `REQUESTS_ENDPOINTS`,
`REQUESTS_*_ROUTE`.

### 2.3 Graphe des 4 couches

```
domain/       contrats, entités, VOs, ports (0 framework)
    ↓
data/         DTOs wire, mappers, sources HTTP, RepositoryImpl
    ↓
application/  use-cases (defer), façades ResourceFacade
    ↓
ui/           pages, presenters, stores filtre, dialog details
```

**Pipelines filtre liste :**
`FilterContract → FilterVo → FilterEntity (endDate) → Repository.execute(page)`.

**Pipeline details :** `FilterContract → Entity → Repository` ; mutations via
entités dédiées (`Take`, `Approve`, `Reject`).

**Composition root :** `provideRequests()` — 4 bindings port → impl +
`RequestsDetailsRepository`.

---

## 3. Contrats canoniques

Point de vérité pour toute émission ou réparation LLM. Fichiers listés = chemins
Nx réels.

### 3.1 Endpoints HTTP

```ts
// libs/requests/data/src/lib/endpoints/requests.endpoints.ts
export const REQUESTS_ENDPOINTS = {
    QUEUES: 'requests/queues',
    TASKS: 'requests/task-baskets',
    ALL: 'requests/qualified',
    QUEUES_EXPORT: 'requests/queues/export',
    TASKS_EXPORT: 'requests/task-baskets/export',
    ALL_EXPORT: 'requests/qualified/export',
    DETAILS_REQUESTS: 'requests',
} as const;
```

| Capacité      | Méthode                           | Query                          | Corps      |
| ------------- | --------------------------------- | ------------------------------ | ---------- |
| Liste paginée | GET `{endpoint}`                  | filtres + `page`               | —          |
| Export Excel  | GET `{endpoint}/export`           | mêmes filtres, **sans `page`** | —          |
| Fiche         | GET `requests/{uniq_id}`          | —                              | —          |
| Take          | POST `requests/{uniq_id}/take`    | —                              | —          |
| Approve       | POST `requests/{uniq_id}/approve` | —                              | `FormData` |
| Reject        | POST `requests/{uniq_id}/reject`  | —                              | JSON motif |

Export : jeu filtré complet côté API ; génération `.xlsx` client via
`ExcelExportPort` (ExcelJS).

### 3.2 Contrats filtre liste

| Volet    | Interface                      | Particularité                              |
| -------- | ------------------------------ | ------------------------------------------ |
| `queues` | `QueuesRequestsFilterContract` | champs communs                             |
| `tasks`  | `TasksRequestsFilterContract`  | idem                                       |
| `all`    | `AllRequestsFilterContract`    | + `status?: RequestsAllStatus` (6 valeurs) |

Champs partagés : `initiatorPhoneNumber`, `uniqId`, `reportType`, `operators`,
`source`, `startDate`, `endDate`.

**Écart vs `processing` :** filtre « all » utilise `status` (requests), pas
`state?: terminated` (processing).

### 3.3 Contrats & ports details

| Artefact                                 | Rôle                                        |
| ---------------------------------------- | ------------------------------------------- |
| `RequestsDetailsFilterContract`          | clé `uniqId`                                |
| `RequestsDetailsTakeContract`            | prise en charge                             |
| `RequestsDetailsQualificationContract`   | approve/reject unifié                       |
| `RequestsDetailsQualificationEditFields` | champs si `approvalType` ∈ `edit\|callback` |
| `RequestsDetailsRepository`              | `execute`, `take`, `approve`, `reject`      |

**Décision IR (≠ legacy) :** les DTO legacy `DetailsApproveDto` /
`DetailsRejectDto` sont remplacés par
**`RequestsDetailsQualificationContract`** +
`RequestsDetailsApproveEntity.fromDetails()` /
`RequestsDetailsRejectEntity.fromDetails()` — pas de contrats approve/reject
séparés.

```ts
// libs/requests/domain/.../requests-details-qualification.contract.ts
export interface RequestsDetailsQualificationContract {
    decision: 'accepted' | 'rejected';
    comment: string;
    reason: string;
    approvalType: string;
    callbackType: string | null;
    editFields?: RequestsDetailsQualificationEditFields;
}
```

### 3.4 Port liste — export métier

```ts
// libs/requests/domain/.../queues-requests.repository.ts (idem tasks/all)
abstract export(
    validContract: QueuesRequestsFilterContract,
    options?: FetchOptions
): Observable<QueuesRequestsEntity[]>;
```

Capacité **distincte** de la pagination UI — chaîne corpus dédiée
`requests.export.list`.

### 3.5 RBAC

```ts
export const REQUESTS_QUEUES_ROUTE = '/requests/queues'; // action take
export const REQUESTS_TASKS_ROUTE = '/requests/tasks'; // action approve
export const REQUESTS_ALL_ROUTE = '/requests/all';
```

| Action UI         | Permission                                                                  |
| ----------------- | --------------------------------------------------------------------------- |
| `take` (queues)   | `REQUESTS_QUEUES_ROUTE` + `take`                                            |
| `qualify` (tasks) | `REQUESTS_TASKS_ROUTE` + `approve`                                          |
| export listes     | filtre RBAC + permission export (edge cases → corpus `details.permissions`) |

**Permissions domaine (purs) :** `requests-details-permissions.util.ts` — `take`
si `PENDING`, `qualify` si `IN_PROGRESS` + qualification `PENDING`, `reject` si
`IN_PROGRESS`.

### 3.6 Écarts documentés vs `processing`

| Zone                      | `processing`                    | `requests`                                         |
| ------------------------- | ------------------------------- | -------------------------------------------------- |
| Endpoints                 | `queues`, `taken`, `processing` | `requests/queues`, `…/task-baskets`, `…/qualified` |
| Mutation principale tasks | `treat` (`/process`)            | `approve` (FormData)                               |
| Qualification             | treat entity                    | `RequestsDetailsQualificationContract`             |
| Export listes             | non câblé IR                    | `Repository.export` + `GET …/export`               |
| `TypeReport` item         | `PROCESSING`                    | `REQUESTS`                                         |

Référence module sœur : [`module-processing.md`](./module-processing.md).

---

## 4. Corpus SEOS

### 4.1 Manifest

| Métrique       | Valeur                                               |
| -------------- | ---------------------------------------------------- |
| Fichier        | `corpus/requests.pairs.jsonl`                        |
| Paires totales | **157**                                              |
| `verified`     | **119**                                              |
| `n/a`          | **38** (CQRS legacy sans équivalent Nx voulu)        |
| Chaînes        | **8** — toutes **tranche-closed** (100 % applicable) |
| Pattern        | `workflow-action`                                    |
| Dernière vérif | 2026-07-31                                           |

### 4.2 Chaînes (`chain_id`)

Déclaration : [`tools/corpus/chains.mjs`](../../tools/corpus/chains.mjs) ·
miroir pattern :
[`workflow-action.pattern.json`](./patterns/workflow-action.pattern.json).

| Chaîne                           | Sous-graphe             | Paires | Description IR                               |
| -------------------------------- | ----------------------- | ------ | -------------------------------------------- |
| `requests.queues.list`           | `list_volet`            | 24     | Entity → UI queues                           |
| `requests.tasks.list`            | `list_volet`            | 24     | Entity → UI tasks                            |
| `requests.all.list`              | `list_volet`            | 24     | Entity → UI all (+ `status`)                 |
| `requests.details`               | `details`               | 50     | Fiche + take/approve/reject                  |
| `requests.module.shell`          | —                       | 5      | Routes, endpoints, providers                 |
| `requests.export.list`           | `list_export`           | 12     | Export Excel (requests only)                 |
| `requests.details.permissions`   | `details_permissions`   | 8      | RBAC + edge cases take/qualify/reject/export |
| `requests.details.qualification` | `details_qualification` | 10     | `approvalType` edit\|callback + `editFields` |

Comparaison : `processing` = 113 paires / 5 chaînes tranche-closed ; `requests`
enrichit export, permissions et qualification.

### 4.3 Statuts paire

| `status`              | Signification                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `verified`            | Fichier Nx présent + oracle nx vert                                                                          |
| `n/a`                 | Legacy CQRS (query-bus, handler…) — pas d’équivalent Nx ([A-2026-07-30-02](../seos/Assumptions-Register.md)) |
| `pending` / `emitted` | Émission intermédiaire — **0** dans l’état actuel                                                            |

Seuils : **corpus-ready** ≥ 80 % · **tranche-closed** = 100 % applicable
([A-2026-07-30-09](../seos/Assumptions-Register.md)).

### 4.4 Commandes corpus

```bash
bun run corpus:requests:report   # rapport dry-run (stdout)
bun run corpus:requests:full     # emit + oracle nx → écrit jsonl (8 chaînes)
bun run corpus:requests          # tranche A — gate rapide listes + shell
bun run corpus:sync-pattern      # push pattern → legacy seos/patterns/
```

Outil bas :
`node tools/corpus/emit-pairs.mjs requests [--verify|--report|--dry-run]`.

---

## 5. Oracle de vérification

Aucune slice IR n’est « terminée » sans passage oracle
([LLM_CONTEXT.md](../../LLM_CONTEXT.md) §3).

### 5.1 Tier 1 — module (gate PR / corpus)

```bash
bunx nx run-many -t build,test --projects=tag:scope:requests
bunx eslint libs/requests --max-warnings=0
bun run corpus:requests:full
```

Oracles par couche (attachés aux paires corpus) :

| Package                     | Target oracle typique |
| --------------------------- | --------------------- |
| `@cmz/requests-domain`      | `:build`              |
| `@cmz/requests-data`        | `:build`              |
| `@cmz/requests-application` | `:build`, `:test`     |
| `@cmz/requests-ui`          | `:build`              |

**Note :** `@cmz/shared-*` n’a pas de target `:build` — les paires shared
redirigent vers un oracle module (`requests-domain` ou `requests-ui`).

### 5.2 Tier 2 — intégration (optionnel PR, nightly)

```bash
bunx nx run backoffice-angular:build:production   # strictTemplates
```

Mock contractuel : `tools/mock-server.mjs` — `report/requests/…`, pool 1548,
`/export` sans `page`, store details stateful.

### 5.3 Tests domaine (contrats & règles)

Couverture ciblée : filter VOs, qualification VO, permissions utils, labels,
`RequestsDetailsApproveEntity.fromDetails`, mappers data, use-cases application.

---

## 6. Rule 0 — promotion pattern

Deux modules `workflow-action` validés indépendamment :

| Module       | Paires | Chaînes | Sync legacy     |
| ------------ | ------ | ------- | --------------- |
| `processing` | 113    | 5       | ✅              |
| `requests`   | 157    | 8       | ✅ (2026-07-31) |

Destination sync :
`$SEOS_LEGACY_ROOT/seos/patterns/workflow-action.pattern.json`.

**Limite méthodologique :** audit référence `processing` details /
`tasks_actions` non terminé (A-2026-07-30-12) — n’affecte pas la clôture corpus
`requests`.

---

## 7. Hors périmètre IR (non bloquant)

Écarts UI documentés — **ne bloquent ni l’oracle ni le corpus** :

| Zone                                                            | État                |
| --------------------------------------------------------------- | ------------------- |
| Shell `ManagementDialog` fullscreen (header, sidebar, step bar) | substitut dialog Nx |
| Carte OpenLayers                                                | lien OSM            |
| Mutations inline listes sans dialog                             | non reproduit       |
| Chatbot / mock UX polish                                        | hors contrat métier |

---

## 8. Clôture module (2026-07-31)

Gate **obligatoire** avant tout nouveau module `workflow-action`
(`finalization`, etc.) :

| Gate         | Commande                                                                         | Statut                |
| ------------ | -------------------------------------------------------------------------------- | --------------------- |
| Build        | `bunx nx run-many -t build --projects=tag:scope:requests`                        | ✅                    |
| Test         | `bunx nx run-many -t test --projects=tag:scope:requests`                         | ✅ 54                 |
| Lint         | `bunx eslint libs/requests --max-warnings=0`                                     | ✅                    |
| Corpus       | `bun run corpus:requests:full`                                                   | ✅ 8/8 tranche-closed |
| Meta audit   | [`audits/requests-meta-verification.md`](./audits/requests-meta-verification.md) | ✅ 12/12              |
| Pattern sync | `bun run corpus:sync-pattern`                                                    | ✅ legacy 2026-07-31  |

**Décision :** module `requests` **clôturé** — référence corpus enrichie pour la
famille `workflow-action`. Prochain module autorisé : `finalization` (tranche A
listes).

---

## 9. Références

- [Vérification Meta (clôture)](./audits/requests-meta-verification.md)
- [Corpus README](./corpus/README.md)
- [Pattern `workflow-action`](./patterns/workflow-action.pattern.json)
- [Module référence `processing`](./module-processing.md)
- [Assumptions Register](../seos/Assumptions-Register.md) — A-2026-07-30-02, 08,
  09, 11
- [ADR reconstruction pilotée par patterns](../adr/0009-reconstruction-pilotee-par-patterns.md)

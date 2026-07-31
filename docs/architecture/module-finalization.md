# Module `finalization` — IR, contrats, oracle & corpus

- **Dernière mise à jour :** 2026-07-31
- **Statut :** **✅ module clôturé (IR)** — oracle Tier 1 + corpus 100 % ; audit
  Meta signé
  ([`finalization-meta-verification.md`](./audits/finalization-meta-verification.md))
- **Archétype :**
  [`workflow-action` v0](./patterns/workflow-action.pattern.json) — promu depuis
  `requests`
- **Corpus :**
  [`corpus/finalization.pairs.jsonl`](../../corpus/finalization.pairs.jsonl)
- **Source de vérité :**
  `/Users/macbookair/Dev/Angular/cmz-backoffice-frontend/src/presentation/pages/finalization`

Module de **finalisation des signalements**. Quatre entités : `queues`, `tasks`,
`all`, `details`. Mutations : **take** (queues) + **finalize** avec commentaire
(tasks).

---

## Contrats canoniques

```ts
// libs/finalization/data/src/lib/endpoints/finalization.endpoints.ts
export const FINALIZATION_ENDPOINTS = {
    QUEUES: 'finalizations/queues',
    TASKS: 'finalizations/task-baskets',
    ALL: 'finalizations',
    QUEUES_EXPORT: 'finalizations/queues/export',
    TASKS_EXPORT: 'finalizations/task-baskets/export',
    ALL_EXPORT: 'finalizations/export',
    DETAILS_REPORTS: 'finalizations',
} as const;
```

| Volet    | Route                  | RBAC                           | Action ligne | Mutation details               |
| -------- | ---------------------- | ------------------------------ | ------------ | ------------------------------ |
| `queues` | `/finalization/queues` | `/reports-finalization/queues` | `take`       | POST `finalizations/{id}/take` |
| `tasks`  | `/finalization/tasks`  | `/reports-finalization/tasks`  | `finalize`   | POST `{id}/finalize` + comment |
| `all`    | `/finalization/all`    | `/reports-finalization/all`    | `view`       | —                              |

Filtre « all » : `state?: terminated` (aligné `processing`, pas `status`
requests).

Details API legacy asymétrique :

- GET `{reportUrl}{uniq_id}`
- POST `{reportUrl}finalizations/{uniq_id}/take`
- POST `{reportUrl}{uniq_id}/finalize`

---

## Naming Nx

Pattern `{Volet}Finalization*` — ex. `QueuesFinalizationEntity`,
`FinalizationDetailsFinalizeEntity`.

---

## Oracle

```bash
bunx nx run-many -t build,test --projects=tag:scope:finalization
bunx eslint libs/finalization --max-warnings=0
bun run corpus:finalization
bun run corpus:finalization:report
```

---

## Chaînes corpus (6)

| Chaîne                      | Description                        |
| --------------------------- | ---------------------------------- |
| `finalization.queues.list`  | Liste files d'attente              |
| `finalization.tasks.list`   | Paniers agent                      |
| `finalization.all.list`     | Vue consolidée + filtre `state`    |
| `finalization.details`      | take/finalize (pas approve/reject) |
| `finalization.export.list`  | Export Excel                       |
| `finalization.module.shell` | Routes + providers                 |

---

## Écarts vs `requests`

| Zone           | `requests`                   | `finalization`                                    |
| -------------- | ---------------------------- | ------------------------------------------------- |
| Mutation tasks | `approve` (FormData)         | `finalize` (comment JSON)                         |
| Filtre all     | `status` (6 valeurs)         | `state: terminated`                               |
| RBAC tasks     | `approve`                    | **`finalize`** (legacy liste utilisait `execute`) |
| Details        | qualification approve/reject | finalize unifié                                   |

---

## Références

- [Audit Meta (clôture)](./audits/finalization-meta-verification.md)
- [Module `requests` (clôturé)](./module-requests.md)
- [Module `processing`](./module-processing.md)
- [Corpus README](./corpus/README.md)

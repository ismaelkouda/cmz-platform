# Archétype `workflow-action`

- **Pattern JSON :**
  [`../patterns/workflow-action.pattern.json`](../patterns/workflow-action.pattern.json)
  (v0)
- **Module de référence :** `processing`
- **Famille :** files de traitement + transitions d'état (~36 % des entités
  legacy)

## Rôle DDD/CQRS

Module opérationnel où des **agents** consomment des **files de signalements** :
bac à pioche (`queues`), tâches personnelles (`tasks`), vue consolidée (`all`).
Les **mutations workflow** (take, treat, actions CRUD) vivent dans des
sous-graphes distincts du slice liste.

## Invariants mécaniques (tous volets liste)

1. **Un volet = une chaîne complète** — jamais d'entité liste générique
   multi-volet ([A-2026-07-30-03](../../seos/Assumptions-Register.md)).
2. **Nommage `{Volet}{Module}{Role}`** en monorepo
   ([A-2026-07-30-04](../../seos/Assumptions-Register.md)).
3. **Chaîne application (cible Nx) :**
   `facade → use-case → filterVo → filterEntity → repository (port)`.
4. **Clé métier liste = `uniqId`** (wire `uniq_id`) — jamais `id` seul.
5. **Filtre liste :** contract (optionnel) → VO (validation) → FilterEntity
   (`DatePeriod` pour les dates) → mapper data → wire snake_case.

## Sous-graphes

### A — `list_volet` (×3 : queues, tasks, all)

| Nœud IR          | Legacy (ex. queues)                             | Nx (ex. processing)                                 |
| ---------------- | ----------------------------------------------- | --------------------------------------------------- |
| list-item-props  | `interfaces/queues/queues-props.interface.ts`   | `props/queues-processing.props.ts`                  |
| list-item-entity | `entities/queues/queues.entity.ts`              | `entities/queues-processing.entity.ts`              |
| filter-contract  | _(souvent implicite DTO)_                       | `contracts/{volet}-processing-filter.contract.ts`   |
| filter-entity    | `entities/queues/queues-filter.entity.ts`       | `entities/queues-processing-filter.entity.ts`       |
| filter-vo        | `value-objects/queues/queues-filter.vo.ts`      | `value-objects/queues-processing-filter.vo.ts`      |
| repository-port  | `repositories/queues/queues.repository.ts`      | `repositories/queues-processing.repository.ts`      |
| use-case         | `use-cases/queues/queues.use-case.ts`           | `use-cases/queues-processing.use-case.ts`           |
| facade           | `services/queues/queues.facade.ts`              | `facades/queues-processing.facade.ts`               |
| item-api-dto     | `api/dto/queues/queues-response-api.dto.ts`     | `dtos/queues-processing-response-api.dto.ts`        |
| filter-api-dto   | `api/dto/queues/queues-filter-api.dto.ts`       | `dtos/queues-processing-filter-api.dto.ts`          |
| item-mapper      | `mappers/queues/queues.mapper.ts`               | `mappers/queues-processing-item.mapper.ts`          |
| filter-mapper    | `mappers/queues/queues-filter.mapper.ts`        | `mappers/queues-processing-filter.mapper.ts`        |
| api-source       | `sources/queues/queues.api.ts`                  | `sources/queues-processing.api.ts`                  |
| repository-impl  | `repositories/queues/queues.repository.impl.ts` | `repositories/queues-processing.repository.impl.ts` |
| page-component   | `features/queues/queues.component.ts`           | `features/queues-processing-page.component.ts`      |
| presenter        | `adapters/queues/queues-vm.presenter.ts`        | `adapters/queues-processing-vm.presenter.ts`        |
| filter-store     | `store/queues/queues-filter.store.ts`           | `stores/queues-processing-filter.store.ts`          |
| table-constants  | `adapters/queues/queues-table.constant.ts`      | `constants/queues-processing-table.constant.ts`     |

**Pattern action UI (workflow-action, ≠ CRUD infra) :**

| Volet  | Colonne    | Bouton  | Presenter             |
| ------ | ---------- | ------- | --------------------- |
| queues | `__action` | `take`  | `actionButtons.take`  |
| tasks  | `__action` | `treat` | `actionButtons.treat` |
| all    | `__action` | `view`  | `actionButtons.view`  |

Ne pas utiliser `__actionDropdown` ni `action-item.factory` (pattern CRUD).

**Écarts legacy → Nx acceptés (documentés corpus `status: n/a`) :**

- `queries-bus`, `queries-handler`, `queries`, `queries-mappers` → absorbés par
  use-case direct ([A-2026-07-30-05](../../seos/Assumptions-Register.md)).

### B — `details` (workflow transversal)

Fiche signalement, permissions, take/treat. UI legacy =
`ManagementDialogComponent` (kernel `@cmz/shared-ui` à terme).

**Infra corpus :** chaîne `processing.details` (36 nœuds IR) — voir
[`tools/corpus/mapping.mjs`](../../tools/corpus/mapping.mjs).

**Gate tranche A :** ✅ clôturée sur `processing` (2026-07-30) — listes
structure + UI kernel + i18n. Tranche B (`details`) peut démarrer sur processing
seul. `requests` **n'hérite pas** de details tant que processing référence n'a
pas fermé l'audit global workflow.

### C — `tasks_actions`

CRUD actions sur une tâche — route `tasks/actions`, alias presentation
`actions-treatment`. Nommage Nx : **`TasksActionsProcessing*`** (volet composé +
module, cf. A-04).

| Nœud IR          | Nx (ex.)                                     |
| ---------------- | -------------------------------------------- |
| list-item-entity | `tasks-actions-processing.entity.ts`         |
| use-case         | `tasks-actions-processing.use-case.ts`       |
| facade           | `tasks-actions-processing.facade.ts`         |
| page             | `tasks-actions-processing-page.component.ts` |
| type-entity      | `tasks-actions-type-processing.entity.ts`    |

_Formalisation détaillée : tranche C du plan processing._

## Oracle de sortie (slice list_volet)

```bash
bunx nx run-many -t build,test --projects=tag:scope:processing
bunx eslint --max-warnings=0 "libs/processing/**/*.ts"
node tools/corpus/emit-pairs.mjs processing --verify
```

Une slice n'est **corpus-ready** que si `emit-pairs` marque la chaîne
`processing.{volet}.list` ≥ seuil défini dans
[`corpus/README.md`](../corpus/README.md).

## Réplication

Même pattern, modules différents :

| Module          | Préfixe rôle           |
| --------------- | ---------------------- |
| `processing`    | `{Volet}Processing*`   |
| `requests`      | `{Volet}Requests*`     |
| `finalization`  | `{Volet}Finalization*` |
| `report-states` | `{Volet}ReportStates*` |

Voir [`module-report-states.md`](../module-report-states.md) pour le 5ᵉ volet
(`download` = centre de fichiers, hors export Excel liste).

## Références

- [Contrats couche domain](./domain.md) — filtre, entity, VO
- [Contrats couche data](./data.md) — mapper, api-source
- [Contrats couche application](./application.md) — use-case, facade
- [Contrats couche ui](./ui.md) — presenter, filter-store
- [Module processing](../module-processing.md)
- [Module requests](../module-requests.md)
- [Module finalization](../module-finalization.md)
- [Module report-states](../module-report-states.md)

# Audit de référence — module `processing`

- **Créé :** 2026-07-30
- **Dernière mise à jour :** 2026-07-31
- **Rôle :** tracker explicite de l'**audit ligne-à-ligne** du module de
  référence `workflow-action`. Distinct de la **clôture corpus** tranche A.
- **Règle :** `corpus verified` ≠ `audit terminé`
  ([A-2026-07-30-12](../seos/Assumptions-Register.md)).

> **Module IR clôturé** (Meta 12/12, corpus 156 paires, 7 chaînes). P2 restants
> : parité shell UI legacy (`ManagementDialog`) + sweet-alert/radio-card
> tasks/actions.

---

## Grille d'audit (source → Nx)

Légende : ✅ revu + oracle vert · 🔧 en cours / partiel · ❌ non commencé · ➖
n/a

### Tranche A — listes (`queues`, `tasks`, `all`)

| Critère                                 | Statut | Notes                                                                          |
| --------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| Domaine — props/entity/filtre par volet | ✅     | `{Volet}ProcessingEntity` ; `all` + `state`                                    |
| Domaine — contrats/VO/FilterEntity      | ✅     | VO par volet ; `resolveOpenEndedEndDate` dans FilterEntity                     |
| Data — DTO wire vs legacy               | ✅     | [audits volets](./audits/)                                                     |
| Data — mappers item + filtre            | ✅     | Dupliqués par volet ; specs Vitest                                             |
| Data — endpoints canoniques             | ✅     | 5 clés ; listes câblées                                                        |
| Application — use-case/facade           | ✅     | 3 volets, `defer()`, sans CQRS                                                 |
| UI — presenter/filter-store/table       | ✅     | `cmz-filter` + `cmz-table` (`__action`) + pagination                           |
| UI — pattern action workflow            | ✅     | `actionButtons` — pas dropdown CRUD infra                                      |
| UI — pages fonctionnelles               | ✅     | Listes + dialog details + route tasks/actions                                  |
| i18n `PROCESSING.*` (tranche A)         | ✅     | `fr.translation.ts` — QUEUES/TASKS/ALL + DETAILS.CONFIRM                       |
| Mock / smoke HTTP listes                | ✅     | `tools/smoke/processing-*.sh` × 3                                              |
| Permissions take/treat (lignes)         | ✅     | `PermissionActionsService` + tooltip dynamique                                 |
| Navigation → details                    | ✅     | Dialog Nx minimal                                                              |
| Export Excel                            | ✅     | `GET …/export` ×3 volets + `processing-list-export.util` + permission `export` |
| Corpus `processing.*.list`              | ✅     | 100 % verified (Tier 1)                                                        |
| Corpus `processing.export.list`         | ✅     | 12 paires, 100 % verified                                                      |
| Relecture métier ligne-à-ligne          | ✅     | queues + tasks + all                                                           |
| Oracle eslint + build app               | ✅     | `eslint --max-warnings=0` + compile OK                                         |

### Tranche B — `details`

| Critère                                         | Statut     |
| ----------------------------------------------- | ---------- |
| Domaine / data / application / UI minimal       | ✅         |
| Confirm take/treat (`ConfirmDialogPort`)        | ✅         |
| Specs VO / permissions / mappers / use-case     | ✅         |
| Parité `ManagementDialog` (tabs, carte, photos) | ⬜ hors IR |
| Corpus `processing.details`                     | ✅ 100 %   |

### Tranche C — `tasks/actions`

| Critère                                           | Statut                                |
| ------------------------------------------------- | ------------------------------------- |
| Domaine / data / application / UI CRUD            | ✅                                    |
| Navigation tasks → actions                        | ✅                                    |
| Specs use-case                                    | ✅                                    |
| Export Excel / sweet-alert / radio-card opérateur | ✅ export · ⬜ sweet-alert/radio-card |
| Corpus `processing.tasks.actions`                 | ✅ 31 nœuds, 100 % verified           |

---

## Écarts P0 restants

_Aucun P0 ouvert — corpus 7 chaînes clôturé (156 paires)._

## Écarts P2 restants

1. Parité shell UI legacy (`ManagementDialog` fullscreen) — tabs/carte/photos.
2. Sweet-alert create/edit + radio-card opérateur sur
   `tasks-actions-processing-form-dialog`.

---

## Oracle de régression

```bash
bunx nx run-many -t build,test --projects=tag:scope:processing
bunx eslint libs/processing --max-warnings=0
bun run corpus:processing:full
```

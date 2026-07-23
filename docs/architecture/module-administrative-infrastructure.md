# Module `administrative-infrastructure` — reconstruction (Phase 07)

- **Dernière mise à jour :** 2026-07-23

Premier module réel. **228 fichiers .ts** au source, CQRS complet, **2 entités**
(`infrastructure`, `infrastructure-type`). Reconstruit par **tranches de
couche** (une lib par couche :
`libs/administrative-infrastructure/{domain,data,application,ui}`).

## Fait — domaine core `infrastructure-type` (vérifié `tsc`)

Lib **`@cmz/administrative-infrastructure-domain`** :

| Fichier                                                    | Note                                                                                          |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `enums/infrastructure-type-status.enum` (`Status`)         | `StatusStyle` (`*_STYLE`) **exclu** → `ui` (règle kernel)                                     |
| `props/infrastructure-type.props`, `…-find-one.props`      | formes d'entités (`props/`)                                                                   |
| `entities/infrastructure-type.entity`, `…-find-one.entity` | pattern `props` + getters + `with()` immuable ; `statusStyle()`/`actionsRef` (UI) **retirés** |

## Reste — par tranche (multi-tours)

### Domaine (≈ 64 fichiers, 2 entités)

- **entité `infrastructure`** (utilise `CoordinatesProps` du kernel → prouve la
  résolution module↔`shared-domain`).
- **repository ports** (`*.repository`, `*-find-one`, `*-select`) : classes
  abstraites. ⚠️ le source les fait dépendre de `shared-data` (`Paginate`,
  `MessageResponseDto`) → **question domain→data à trancher** (Paginate est-il
  un type kernel neutre ?).
- **machinerie CQRS** : `contracts/` (+ `validate-contracts`), `value-objects/`
  par commande (create/update/delete/enable/disable/filter/find-one),
  `validators/` (utilisent `GenericRequiredError` du kernel). Nouveaux
  archétypes à cadrer (`contract`, `validate-contract`, `command-vo`).

### Data

- `dto/`, `mappers/` (réutilisent bases + `MapperUtils` du kernel), `sources`
  (HTTP, `buildHttpParams`), `repositories` (impl des ports).

### Application

- `commands`/`queries` + `bus` + `handlers` + `use-cases` (CQRS), facades
  concrètes étendant `PaginatedFacade`/`BaseFacade`.

### UI / feature

- `store`, `features` (composants + `.html`), `adapters`, `StatusStyle`,
  `form-validators` composés.

## Séquencement proposé

1. **Domaine** complet (2 entités) — en cours. Écrire au passage les contrats
   `contract` / `validate-contract` / `command-vo` / `repository` (port).
2. **Data** (dto + mappers + sources + repos).
3. **Application** (CQRS + facades).
4. **UI/feature**.
5. `bun install` + `nx build` du module contre le kernel.

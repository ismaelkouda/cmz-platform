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

## Fait — domaine core `infrastructure` (vérifié `tsc`)

- `props/infrastructure.props` (liste, `position: string`),
  `props/infrastructure-find-one.props` (`position: CoordinatesProps` **importé
  de `@cmz/shared-domain`**) → **résolution module→kernel prouvée**.
- `entities/infrastructure.entity`, `…-find-one.entity` : pattern `props` +
  getters + `with()` ; `actionsRef` (UI) **retiré**.

## Tranché — question domain→data (repository ports)

Le source fait dépendre les ports de `shared-data` (`Paginate`,
`MessageResponseDto`, `FetchOptions`) : **incohérence** (domaine→data). Décision
d'ingénieur, appuyée sur l'usage réel de l'UI (seuls `current_page`,
`last_page`, `per_page`, `total` sont consommés ;
URLs/`links`/`path`/`from`/`to` jamais) :

- **`PageResult<T>`** — modèle domaine neutre (`items`, `currentPage`,
  `lastPage`, `perPage`, `total`) dans `@cmz/shared-domain`. `PaginatedMapper`
  traduit l'enveloppe Laravel → `PageResult`. `PaginatedFacade` en parle :
  l'application ne dépend plus d'aucune forme réseau.
- **`FetchOptions`** (`{ forceRefresh? }`, intention de requête neutre) déplacé
  vers `@cmz/shared-domain`.
- **`MessageResponseDto`** → **`MessageEntity`** (déjà kernel) pour
  create/update/delete.

→ les ports parleront **100 % domaine** ; plus aucun import `data`.

## Reste — par tranche (multi-tours)

### Domaine (2 entités)

- **repository ports** (`*.repository`, `*-find-one`, `*-select`) : classes
  abstraites renvoyant `PageResult` / `MessageEntity` / `SelectOption` +
  `FetchOptions` (tous du domaine). **Bloqués par la machinerie CQRS** (leurs
  signatures référencent les `validate-contracts`).
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

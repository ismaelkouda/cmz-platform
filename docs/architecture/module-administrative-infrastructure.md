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

→ les ports parlent **100 % domaine** ; plus aucun import `data`.

## Fait — machinerie CQRS + ports (vérifié `tsc`, domaine pur)

- **contracts** (`*.contract` brut = tout optionnel ; `*.validate-contract` =
  tout requis), **validators** (`validateX(c): asserts c is …ValidateContract`,
  lèvent `GenericRequiredError` du kernel ; `filter` → `assertValidDateRange`),
  **value-objects** (`xVo(c)` valide puis renvoie la forme validée).
- **repository ports** (`*.repository`, `*-find-one`, `*-select`) : classes
  abstraites **sans décorateur** (token DI, impl décorée en `data`) → le domaine
  ne tire pas `@angular/core`. Renvoient `PageResult` / `MessageEntity` /
  `SelectOption` + `FetchOptions` (tous du domaine).
- **Non-reproduction (corrections d'ingénieur)** : `find-one-filter.contract`
  `uniqId` rendu optionnel (aligné sur delete/enable/disable) ; validator
  `filter` en `: void` (fin de l'assertion tautologique) ; méthode liste unifiée
  `execute` (le source oscillait `execute`/`readAll`). Le whitelisting de
  payload create/update est **préservé** (intention défensive, pas un défaut).
- Lib domaine : dépend uniquement de `@cmz/shared-domain` (+ `rxjs`).

## Fait — couche data (vérifié `tsc`, `@cmz/administrative-infrastructure-data`)

- **DTOs** api (request + response via
  `PaginatedResponseDto`/`SimpleResponseDto`
    - `AdministrativeBoundaryDto` du kernel).
- **command mappers** (fonctions `xMapper(validContract): ApiDto`, renommage
  snake_case, `position`→`latitude/longitude`) ; **response mappers**
  (`@Service` sur
  `PaginatedMapper`/`SimpleResponseMapper`/`ArrayResponseMapper` +
  `MapperUtils.validateDto` + cache/`with()`).
- **sources** `@Service` `HttpClient` (`SETTINGS_API_URL`, `BYPASS_CACHE`,
  `buildHttpParams`/`buildHttpPayload` du kernel).
- **repository impls** `implements` les ports : liste→`PageResult` (via le
  response mapper purifié) ; create/update/delete/enable/disable→`MessageEntity`
  via `MessageResultMapper` (kernel) — qui applique aussi `assertResponseOk`
  (rendu d'erreur serveur dans la loop).
- **Fix d'ingénieur** : `is_active = status === Status.ACTIVE` (le source
  faisait `!!status`, toujours vrai car `Status.INACTIVE='COMMON.INACTIVE'` est
  truthy) ; typo `prams`→`params`.
- Dépendances : `{domain module, shared-data, shared-domain, core, @angular}`.

## Fait — couche application (vérifié `tsc`, optimisée)

Lib `@cmz/administrative-infrastructure-application` (**12 fichiers** vs **~72**
au source). **Optimisation (mandat « optimise, ne reproduis pas ») :** la
cérémonie CQRS dégénérée du source est **supprimée** — `command` +
`command-mapper`

- `command-bus` (un bus par commande, un seul handler, `instanceof`) + `handler`
- `query` + `query-*` + `application/dto` (identique au `Contract` domaine).
  Chaîne réduite : **facade → use-case → repository (port)**.

* **use-cases** (`@Service`) : service applicatif par entité — `execute` (liste
  : `filterEntity ∘ filterVo` → `repository.execute`), create/update/delete
  (+enable/disable), find-one, select. `defer()` reporte le throw de validation
  dans le flux (rendu loop). Injectent les **ports** (domaine), pas les impls
  data → **application ne dépend pas de `data`**.
* **facades** (`@Service`, signal) : `<entity>` étend le nouveau
  `CollectionFacade` (liste + mutations) ; `find-one`/`select` étendent
  `BaseFacade`. `select` expose `options = computed(data ?? [])`.
* **Kernel** : nouveau `CollectionFacade extends PaginatedFacade` (signaux
  `actionState`/`actionSuccess`/`actionError` + `runAction`).
* **Fix layering** : le feedback passe par
  `NotificationPort`/`TranslationPort` + `ErrorHandlerRegistry` (application) —
  **plus de `UiFeedbackService`** (le source violait application→ui). Aucun
  import `ui`.
* **Ajout domaine** oublié : `*-filter.entity` (`resolveOpenEndedEndDate`).

## En cours — couche UI (`@cmz/administrative-infrastructure-ui`)

**Fait — fondations (vérifié `tsc`, pures : domain + shared-ui) :**

- `StatusStyle` + `statusStyleOf` (UI, exclu du domaine) ; `vm-props`,
  **presenters** (Entity→view-model), `table`/`tabs` constants, `form-keys`,
  `filter-keys`, `form-error-messages`, `form-validators`, `paths`, helper
  `form-errors`.
- **Non-reproduction** : `statusStyle` et `actionsRef` sont **calculés dans le
  presenter** (`statusStyleOf(status)`, `actionsRef = item.name`) — le source
  les mettait sur l'entité (fuite UI→domaine, déjà retirée).
- **Kernel shared-ui** : ajout `ActionDropdownItem` + `getControlError`
  (réutilisables).

**Reste — sous-tranches UI (multi-tours) :**

1. **Composants partagés kernel** (prérequis) : `shared-ui` n'expose pas encore
   les composants `table`/`pagination`/`form-field` que consomment les features.
2. **Stores** : `*-filter.control`/`*-filter.store`, `*-form.control`/
   `*-form.store` (reactive forms + signaux).
3. **Features** : composants `page`/`list`/`form` (+ `.html`/`.scss`) +
   `*-form-helper.service`.
4. **Routing/DI** : `*.routes`, `di/*.providers` (wiring port→impl).

## Séquencement proposé

1. **Domaine** complet (2 entités) — **fait** (entités, props, enums, contracts,
   validators, value-objects, ports).
2. **Data** (dto + mappers + sources + repos) — **fait**.
3. **Application** (use-cases + facades) — **fait** (CQRS ceremony optimisée).
4. **UI/feature** — **en cours** : fondations faites ; reste stores + composants
   partagés kernel + features + routing/DI.
5. `bun install` + `nx build` du module contre le kernel.

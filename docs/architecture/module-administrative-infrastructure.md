# Module `administrative-infrastructure` — reconstruction (Phase 07)

- **Dernière mise à jour :** 2026-07-26
- **Statut :** module **terminé** (2 entités, 4 couches) —
  `ngc --strictTemplates` vert, `nx serve` OK contre le mock. Suites :
  durcissements transverses (Status wire-first, boundaries, StoragePort)
  intégrés ; voir « Mise à jour 2026-07-26 ».

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

## Fait — couche UI (`@cmz/administrative-infrastructure-ui`)

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

**Composants partagés kernel (design-system, sans primeng) :**

- **Faits** : `cmz-pagination`, `cmz-action-dropdown`, `cmz-table`, `cmz-filter`
  (standalone + `OnPush` + signals, a11y, i18n via `TranslationPort`, tokens,
  logique pure `pageWindow` testable). `cmz-table`/`cmz-filter` **focalisés**
  (pas le fourre-tout primeng/`any` du source) ; `TableColumn`/`TableRowBase`
  promus au kernel ; `PaginationMeta` (dont `PageResult` dérive) ;
  `FilterField`/`FilterOption` typés + helper `labelsToFilterOptions` (map
  code→clé i18n ; l'ancien `enumToFilterOptions` label-first a été remplacé lors
  du passage wire-first).
- **Tailwind CSS v4** installé/câblé (`@tailwindcss/postcss`, `tailwind.css` :
  `@theme` tokens + `@source` libs + pont `--cmz-*`). `cmz-filter` stylé en
  utilitaires Tailwind ; les autres primitives en styles scopés — **les deux
  consomment le même jeu de tokens `@theme`** (source unique). → `bun install`.
- **`cmz-field`** (champ de formulaire : label + contrôle projeté + erreur
  `getControlError`) → prérequis du **form** couvert.
- **Validation réelle débloquée** : après `bun install`, **toutes les libs
  passent `ngc --strictTemplates`** (classes + templates vérifiés par le
  compilateur Angular, pas seulement `tsc`).

→ **Tous les composants partagés prérequis (liste + form) sont faits et
validés.**

**Modernisation Angular 22 (signal-first, validée `ngc`) :**

- **Façades = `rxResource`** (`@angular/core/rxjs-interop`) : `ResourceFacade`/
  `PaginatedResourceFacade`/`CollectionResourceFacade` — `value/isLoading/error`
  en signaux, chargement par `setParams`, erreurs via `effect`, mutations
  one-shot (`runAction`) + `reload()`. Plus aucun `.subscribe()` manuel.
- **Formulaires = Signal Forms** (`@angular/forms/signals`) : `cmz-field`
  (enveloppe un `Field`) et `cmz-filter` (`model()` + `form()` + `[formField]`).
  Fini `ReactiveFormsModule`.

**Feature `list` `infrastructure-type` — fait (validé `ngc`) :**

- `cmz-infrastructure-type-list` compose `cmz-filter`/`cmz-table`/
  `cmz-pagination` sur la façade `rxResource`
  (`items()`/`isLoading()`/`value()`).
- `store` **signal-first** (modèle `Record` deux-voies → contrat, dates typées)
  ; presenter → `itemsVM` ; permissions (`PermissionActionsService`),
  confirmations (`ConfirmDialogPort`), i18n (`TranslationPort`). Sans
  ngx-translate/toastr/primeng. Export différé (non-cœur).

**Feature `form` `infrastructure-type` — fait (validé `ngc`) :**

- Store Signal Forms : `form(model, schema)` typé,
  `required(name/description)` + `disabled(() => isDetails())` ; hydratation
  edit/details via `effect` sur la façade find-one (`rxResource`).
- Composant : `[formField]` + `cmz-field` (erreurs) ; submit → façade
  `create`/`update` ; **navigation retour par `effect` sur `actionSuccess`**
  (pas de polling). Modes create/edit/details via query params.

**Routes + DI `infrastructure-type` — fait (validé `ngc`, libs + app) :**

- `INFRASTRUCTURE_TYPE_ROUTES` = **composition root** : wire les ports domaine →
  impls `data` au niveau route (`providers`), list/form en `loadComponent`
  (lazy). `app.routes` charge le feature sur `equipments/types`.

> **Validation** : `ngc --strictTemplates` vert (libs + app). Le `nx build` AOT
> complet ne tourne pas **en sandbox** (Tailwind v4 tire `lightningcss`, binaire
> natif lié à la plateforme — installé pour macOS, sandbox = Linux) → à lancer
> sur le poste. Ce n'est pas un problème de code.

**Entité `infrastructure` — fait (validé `ngc`) :**

- `list` : filtre recherche / type (select via `InfrastructureTypeSelectFacade`)
  / region-dept-commune (texte) / dates ; actions edit/delete (pas de statut).
- `form` **Signal Forms** : name / type (select) / **position (lat,long)** /
  description ; submit reconstruit `CoordinatesProps`. `FormMode` extrait en
  type partagé. Routes + DI (+ `InfrastructureTypeSelectRepository`) ; app monte
  `equipments/list` + `equipments/types`.
- Sélecteur cartographique de position = enhancement futur (hors périmètre).

**Design-system cohérent — Sonner/SweetAlert2 retirés :**

- `CmzNotificationService` + `ToastOutlet` (`aria-live`) et
  `CmzConfirmDialogService` + `DialogOutlet` (`<dialog>` natif). Ports inchangés
  ; app-shell câblé (`useExisting`) + outlets + `UiFeedbackService`. i18next
  gardé.

**Reste (enhancements, hors périmètre du module) :**

1. Sélecteur cartographique de position (`infrastructure`).
2. Selects région/dept/commune en cascade — livrés avec le **module
   `administrative-boundary`** (Phase 08).
3. Export CSV/PDF des listes.

## Mise à jour 2026-07-26 — durcissements transverses

Intégrés après la clôture du module (validés `ngc` + audit boundaries) :

- **`Status` wire-first** : `enum` →
  `const Status {ACTIVE:'active',INACTIVE:'inactive'}`
    - `type` + garde `isStatus` ; libellés déplacés en UI (`STATUS_LABEL`),
      filtre via `labelsToFilterOptions`, filter-store via `isStatus` (fin du
      cast `as`).
- **Boundaries durcies** : isolation par `type:*` **et** `scope:*` ; `type:app`
  = seul composition root ; `type:constants` feuille universelle.
- **`StoragePort`** (`shared-domain`) + `BrowserStorageAdapter`
  (`shared-browser`, ex-`shared-infra` supprimée) câblés au root.
- **Runtime app-shell** (i18next resources, tokens `*_API_URL`) + **mock
  backend** (`tools/mock-server.mjs` + proxy) : l'app tourne de bout en bout en
  dev.
- **DEV ONLY** : `provideDevPermissions()` (toutes permissions) — **gardé par
  `isDevMode()`**, à retirer/remplacer par l'auth réelle en production.

## Séquencement proposé

1. **Domaine** complet (2 entités) — **fait** (entités, props, enums, contracts,
   validators, value-objects, ports).
2. **Data** (dto + mappers + sources + repos) — **fait**.
3. **Application** (use-cases + facades) — **fait** (CQRS ceremony optimisée).
4. **UI/feature** — **fait** (stores, composants kernel, features, routing/DI).
5. `bun install` + `nx build` du module contre le kernel — **fait** ✅.

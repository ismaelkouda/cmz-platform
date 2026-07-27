# Module `administrative-boundary` — plan de reconstruction (Phase 08)

- **Créé :** 2026-07-26
- **Statut :** **fait** (2026-07-27) — 4 libs + câblage app + mock backend,
  validés `ngc --strictTemplates` + `eslint`/boundaries + smoke test mock +
  `nx lint`/`nx serve` (confirmé par l'utilisateur sur le poste macOS). Écarts
  réels vs plan : voir [§ Bilan réel](#bilan-réel-2026-07-27) en fin de
  document.
- **Gabarit de référence :** `module-administrative-infrastructure.md`
  (Phase 07)
- **Contrats d'archétype :** [`archetypes/`](./archetypes/README.md) — extraits
  formellement du module de référence ; ce module sert de **premier test** de
  l'hypothèse « génération outillée sous contrat » avant d'investir dans la
  Phase 04 (outillage SEOS). Chaque fichier produit doit être coché contre son
  contrat, pas construit par analogie libre.

## Périmètre (source : `presentation/pages/administrative-boundary`, 374 fichiers)

Trois entités **hiérarchiques** du découpage territorial :

```
region (1) ──< department (n) ──< municipality (n)
```

- **regions** —
  `code, name, description, populationSize, departmentsCount, municipalitiesCount, infrastructureCount, status`.
- **departments** — idem + `region` (parent), `municipalitiesCount`.
- **municipalities** — idem + `region`, `department` (parents),
  `populationSize`, `infrastructureCount` (feuille, pas de `*Count` enfant).

Par entité : **liste paginée + filtre**, **find-one**, **select** (dropdowns),
**create / update / delete**. En plus, **deux vues imbriquées** :

- `departments-by-region-id` — départements d'une région (liste + filtre
  propres).
- `municipalities-by-department-id` — communes d'un département (liste +
  filtre).

Endpoints (constante data) : `territorial-structures/regions`,
`territorial-structures/departments`, `territorial-structures/municipalities`.

## Décisions d'ingénieur (non-reproduction) — à appliquer

1. **CRUD seul, pas de toggle.** Le source n'a **aucun** enable/disable pour ce
   module (contrairement à `infrastructure-type`). `status` est un attribut de
   donnée dérivé de `is_active`. → presenters sans action toggle, pas de
   `*-enable/-disable.{contract,vo,validator,mapper}`.
2. **Un seul `Status` wire-first.** Le source duplique 3 enums identiques
   (`regions/`, `departments/`, `municipalities/-status.enum` =
   `ACTIVE/INACTIVE`). → **un** `Status` module (`enums/status.enum.ts`, valeurs
   `active`/`inactive`, garde `isStatus`), libellés `STATUS_LABEL` + style en
   `ui` (cf. Phase 07).
3. **Relations : garder l'`id`, pas seulement le `.name`.** Les réponses
   renvoient des objets `AdministrativeBoundaryDto {id,name,code}` mais le
   domaine source n'en garde que `.name` (`region: string = dto.region.name`) —
   perte de l'`id`, rend l'édition (préremplir un select région) impossible. →
   props relationnelles typées `{ id, name }` (ou VO `AdministrativeBoundaryRef`
   kernel) pour list **et** find-one.
4. **Cascade region → departments côté select.** `RegionsSelectItemApiDto`
   embarque déjà `departments[]`. Réutiliser cette forme cascade pour les
   formulaires (department : select région ; municipality : région → département
   dépendant) plutôt que de rappeler l'API à chaque changement.
5. **CQRS dégénéré supprimé.** Comme en Phase 07 : pas de `commands-bus`,
   `commands-handlers`, `commands-mappers`, `queries-bus/handlers/mappers`,
   `application/dto`, ni `di/*-par-use-case`. Chaîne : **façade → use-case →
   repository (port)**. Attendu ≈ **35–40 fichiers application** (vs ~140
   source).
6. **Ports 100 % domaine.** Repos renvoient `PageResult` / `MessageEntity` /
   `SelectOption` + `FetchOptions` (kernel), zéro import `data` (cf.
   ADR/kernel).
7. **`find-one-filter.uniqId` optionnel au niveau `.contract.ts`, requis au
   niveau `.validate-contract.ts`** (comme en Phase 07 : le contrat brut est
   optionnel, la forme validée ne l'est pas). Méthode liste unifiée `execute`,
   whitelisting create/update préservé — mêmes corrections qu'en Phase 07.
   **Aucun filtre (liste ou vue imbriquée) n'est présumé sans champ requis par
   défaut** — chaque champ se juge contre la réalité de l'entité, cf.
   [`archetypes/README.md`](./archetypes/README.md#principe-transversal--la-requiredness-dun-champ-de-filtre-nest-jamais-présumée).
8. **Réutilisation kernel maximale** : `cmz-table`, `cmz-filter`, `cmz-field`,
   `cmz-pagination`, `cmz-action-dropdown`, facades `rxResource`,
   `labelsToFilterOptions`, `form-errors.helper`, `MessageResultMapper`,
   `PaginatedMapper`. Ne **rien** recréer de ce qui existe déjà dans `shared-*`.

## Points tranchés (2026-07-26)

1. **Vues imbriquées → route dédiée en drill-down** (fidèle au source,
   confirmé). Depuis une ligne région → page « départements de la région »
   filtrée ; idem département → communes. Les onglets de la page liste sont
   `[Liste | Historique]` dans le source ; l'onglet **Historique** s'appuie sur
   une feature `history` partagée **hors périmètre** de ce module (à traiter
   séparément).
2. **`code` → champ saisi, aligné sur le pattern de champ existant.** Le module
   déjà fait n'a aucun `code` (précédent : `name`/`description`) ; on garde
   `code` car c'est la réalité de ce module (source + create-api l'exigent),
   modélisé **exactement comme un champ standard du gabarit Phase 07** :
    - `FORM_KEYS` : `{ CODE:'code', NAME:'name', DESCRIPTION:'description', … }`
      ;
    - `*-create.contract` optionnel (`code?`) / `*-create.validate-contract`
      requis (`code`) ;
    - `*-create.validator` :
      `if (!contract.code) throw new GenericRequiredError('<NS>.FORM.ERROR.CREATE.CODE_REQUIRE')`
      ;
    - store Signal Forms : `code:''` au modèle,
      `required(schema.code,{message:'COMMON.VALIDATION.REQUIRED'})`,
      `disabled(schema.code,()=>isDetails())`, hydratation `code: item.code`
      dans l'`effect`.
    - Chaque entité n'embarque que ses champs réels (region :
      code/name/description/ population/infrastructure ; department : + select
      région ; municipality : + cascade région→département).
3. **Delete parent → bloqué si enfants > 0** (garde source reproduite).
   Presenter : `disabled: !canDelete || childrenCount > 0` — region
   (`departmentsCount`), department (`municipalitiesCount`) ; municipality
   toujours supprimable.
4. **Compteurs** (`departmentsCount`, …) : lecture seule d'affichage — OK.

## Phase 1 — Scaffolding Nx (4 libs)

- [x] Générer `libs/administrative-boundary/{domain,data,application,ui}`
      (`@cmz/administrative-boundary-{domain,data,application,ui}`).
- [x] `project.json` tags : `scope:administrative-boundary` +
      `type:{domain,data,application,ui}`.
- [x] `tsconfig.base.json` : ajouter les 4 paths
      `@cmz/administrative-boundary-*`.
- [x] Barrels `src/index.ts` (vides au départ).
- [x] Vérifier que `eslint.config.mjs` couvre le nouveau scope (règle
      `scope:administrative-boundary → [self, scope:shared]` — **ajouter** ce
      `sourceTag`, calqué sur le bloc `administrative-infrastructure`).

## Phase 2 — Domaine (`-domain`)

Par entité **E ∈ {region, department, municipality}** (+ 2 vues imbriquées) :

- [x] `enums/status.enum.ts` — **un seul** `Status` wire-first + `isStatus`.
- [x] `props/<E>.props.ts`, `props/<E>-find-one.props.ts` — relations en
      `{id,name}` (décision 3), compteurs, `code`.
- [x] `props/departments-by-region-id.props.ts`,
      `props/municipalities-by-department-id.props.ts`.
- [x] `entities/<E>.entity.ts`, `<E>-find-one.entity.ts`,
      `<E>-filter.entity.ts`, `<E>-select.entity.ts` — pattern `props` +
      getters + `with()` immuable (aucun `statusStyle`/`actionsRef` : UI).
- [x] `entities/departments-by-region-id.entity.ts`,
      `municipalities-by-department-id.entity.ts`.
- [x] `contracts/<E>-{create,update,delete,filter,find-one-filter}.contract.ts` +
      `.validate-contract.ts` (create/update/find-one-filter **et tout champ de
      `filter` qui s'avère requis après examen** — pas de présomption
      d'optionalité par défaut).
- [x] `contracts/{departments-by-region-id,municipalities-by-department-id}-filter.contract.ts`
      — **juger explicitement si l'id du parent (région/département) est
      requis** dans ce contrat ; si oui, `.validate-contract.ts` +
      `GenericRequiredError` comme n'importe quel champ requis.
- [x] `validators/<E>-{create,update,filter,find-one-filter}.validator.ts` +
      validators des 2 filtres imbriqués (`assertValidDateRange` + champs requis
      le cas échéant, via `GenericRequiredError`).
- [x] `value-objects/<E>-{create,update,delete,filter,find-one-filter}.vo.ts` +
      VO des filtres imbriqués.
- [x] `repositories/<E>.repository.ts`, `<E>-find-one.repository.ts`,
      `<E>-select.repository.ts` (classes abstraites, tokens DI, sans
      décorateur).
- [x] `repositories/departments-by-region-id.repository.ts`,
      `municipalities-by-department-id.repository.ts`.
- [x] Barrel + **`ngc` domaine pur** (dépend seulement de `@cmz/shared-domain` +
      `rxjs`).

## Phase 3 — Data (`-data`)

- [x] `endpoints/administrative-boundary.endpoints.ts`
      (`territorial-structures/*`).
- [x] `dtos/` par entité : `-create-api`, `-update-api`, `-delete-api`,
      `-filter-api`, `-find-one-filter-api`, `-response-api`,
      `-find-one-response-api`, `-select-response-api` (+ DTO cascade
      region→departments).
- [x] `dtos/` des 2 vues imbriquées (`-filter-api`, `-response-api`).
- [x] `mappers/` : response
      (`PaginatedMapper`/`SimpleResponseMapper`/`ArrayResponseMapper` +
      `MapperUtils.validateDto`), request (snake_case), **`status.mapper`**
      (`is_active ⇄ Status`, **un seul** partagé), résolution relations
      `{id,name}`.
- [x] `sources/*.api.ts` (`@Service` `HttpClient`, `SETTINGS_API_URL`,
      `buildHttpParams/Payload`, `BYPASS_CACHE`).
- [x] `repositories/*.repository.impl.ts` → `PageResult` (liste) /
      `MessageEntity` (mutations via `MessageResultMapper` +
      `assertResponseOk`).
- [x] `package.json` deps
      `{domain module, shared-data, shared-domain, core, @angular/*}` (= imports
      réels) ; barrel ; `ngc`.

## Phase 4 — Application (`-application`)

- [x] `use-cases/<E>.use-case.ts` (liste :
      `filterEntity ∘ filterVo → repository.execute`), `<E>-find-one`,
      `<E>-select`, create/update/delete (injectent les **ports**).
- [x] `use-cases/departments-by-region-id.use-case.ts`,
      `municipalities-by-department-id.use-case.ts`.
- [x] `facades/<E>.facade.ts` (étend `CollectionResourceFacade`),
      `<E>-find-one.facade.ts` / `<E>-select.facade.ts` (étendent
      `ResourceFacade`).
- [x] `facades/` des 2 vues imbriquées (paginées, paramétrées par l'id parent).
- [x] Feedback via `NotificationPort`/`TranslationPort`/`ErrorHandlerRegistry`
      (aucun import `ui` ni `data`). Barrel ; `ngc`.

## Phase 5 — UI (`-ui`)

- [x] `constants/` : `administrative-boundary-paths`, puis par entité `-paths`,
      `-filter-keys`, `-form-keys`, `-form-error-messages`, `-table`, `-tabs` ;
      `form-validators` ; **`status-label.constant`** (`STATUS_LABEL`).
- [x] `enums/status-style.enum` + `mappers/status-style.mapper` (UI).
- [x] `stores/<E>-filter.store.ts` (Signal Forms, modèle `Record` semé sur
      toutes les clés → contrat, dates typées, cascade region→dept pour
      municipality) + `stores/<E>-form.store.ts` (`form(model, schema)`,
      `required`, hydratation edit/details via `effect` sur find-one).
- [x] `stores/` des filtres imbriqués + `form-mode.type` (réutiliser le
      partagé).
- [x] `adapters/<E>-vm-props.interface.ts` + `<E>-vm.presenter.ts` (Entity→VM,
      `statusStyleOf`, `statusLabel` via `STATUS_LABEL`, `actionsRef`, actions
      edit/delete **sans toggle**) + presenters des 2 vues imbriquées.
- [x] `features/<E>-list.component.ts`, `<E>-form.component.ts`,
      `<E>-page.component.ts`, `<E>.routes.ts` (composition root : ports→impls
      au niveau route, lazy).
- [x] `features/departments-by-region-id.component.ts`,
      `municipalities-by-department-id.component.ts` — **routes dédiées
      drill-down** (navigation depuis la ligne parent : région → départements,
      département → communes), pas des onglets de détail.
- [x] Selects cascade : department-form → `RegionsSelectFacade` ;
      municipality-form → région puis département dépendant.
- [x] Barrel ; `ngc --strictTemplates`.

## Phase 6 — Câblage app + i18n

- [x] `apps/backoffice-angular/src/app/providers/administrative-boundary.providers.ts`
      — `provideAdministrativeBoundary()` : wire des ~11 ports (3×
      list/find-one/select + 2 nested) → impls `-data`, au **root**
      (app.config).
- [x] `app.config.ts` : `...provideAdministrativeBoundary()`.
- [x] `app.routes.ts` : route lazy `territorial-structures` (ou `boundaries`) +
      sous-routes regions/departments/municipalities ; entrée de menu/nav.
- [x] i18n : ajouter le namespace
      `ADMINISTRATIVE_BOUNDARY.{REGION,DEPARTMENT,MUNICIPALITY}.*` (titres,
      colonnes, filtres, tooltips, messages) à `fr.translation.ts`. Réutiliser
      `COMMON.ACTIVE/INACTIVE` pour le statut.

## Phase 7 — Mock backend

- [x] Étendre `tools/mock-server.mjs` : seed cohérent **hiérarchique** (régions
      → départements → communes reliés par id) + compteurs calculés.
- [x] Routes `territorial-structures/{regions,departments,municipalities}` :
      liste paginée (`?page`) vs select (sans page, cascade region→departments),
      find-one, `store`/`update`/`delete`.
- [x] Filtrage imbriqué : `departments?region_id=…`,
      `municipalities?department_id=…` (ou le paramètre réel — à aligner sur les
      `*-filter-api.dto`).
- [x] Enveloppe `{error,message,data}` + pagination Laravel (déjà en place).

## Phase 8 — Validation & livraison (Definition of Done)

- [x] `ngc --strictTemplates` + `isolatedModules` **vert** (4 libs + app).
- [x] Audit **boundaries** sur imports réels : 0 violation (scope isolation).
- [x] **deps = imports** sur les 4 `package.json`.
- [x] `npx nx lint` + `npx nx serve` (poste macOS) — confirmé par l'utilisateur
      le 2026-07-27 : `nx lint backoffice-angular` vert,
      `nx serve     backoffice-angular` build + dev-server OK
      (`localhost:4200`). Non exécutable depuis le sandbox Linux arm64 utilisé
      pendant le développement (binaires natifs `@nx/nx-*` du workspace en
      `darwin-arm64` → `WorkspaceContext is not a constructor`, indépendant de
      ce module) ; substitué à l'époque par `tsc --noEmit` (4 libs + app) +
      `ngc --strictTemplates` (app) + `eslint` (lint + boundaries), tous verts —
      cf. § Bilan réel.
- [x] Smoke test contre le mock : liste + filtre + pagination +
      create/edit/details + delete (confirm) + **vues imbriquées** + **selects
      cascade** pour les 3 entités.
- [x] Commits conventionnels par couche (`feat(admin-boundary): domain …`,
      `… data …`, `… application …`, `… ui + wiring …`), subject ≤72, corps
      ≤100.
- [x] Mettre ce document à jour (statut « fait » + écarts réels vs plan).

## Estimation d'ampleur

Source ≈ **374 fichiers** (CQRS complet, 3 entités + 2 vues). Cible attendue
après optimisation ≈ **domaine ~70 · data ~55 · application ~38 · ui ~55** →
ordre de grandeur **~220 fichiers** produits, à valider couche par couche comme
en Phase 07.

## Bilan réel (2026-07-27)

**Fichiers produits** (réel vs estimé) : domaine **101** (~70 estimé) · data
**76** (~55) · application **21** (~38) · ui **58** (~55) → **256** fichiers (vs
~220 estimé, ~374 source). Écarts :

- **Domaine au-dessus de l'estimation** : les 2 vues imbriquées doublent chacune
  un jeu complet contrat/validate-contract/validator/VO de filtre, en plus de
  leurs props/entités propres — poids sous-estimé au moment du chiffrage
  initial.
- **Application très en dessous de l'estimation** (21 vs ~38) : les façades
  restent des classes de quelques lignes qui étendent
  `ResourceFacade`/`PaginatedResourceFacade`/`CollectionResourceFacade` — aucune
  logique dupliquée à écrire par entité, l'estimation initiale n'avait pas
  anticipé à quel point la base `shared-application` absorbe le boilerplate.

**Bug réel trouvé par `ngc --strictTemplates`** (pas par `tsc` seul, qui ne
type-check pas les templates Angular) : les deux vues imbriquées en lecture
seule (`departments-by-region-id`, `municipalities-by-department-id`) échouaient
`[rows]="itemsVM()"` sur `<cmz-table>` — `TableRowBase` n'a que des propriétés
optionnelles et TypeScript rejette une assignation sans **aucune** propriété en
commun (« no properties in common »). Corrigé en déclarant
`dropdownActions?: ActionDropdownItem[]` (optionnel, jamais renseigné) dans les
deux `*-vm-props.interface.ts` — `cmz-table` ne lit cette prop que si la colonne
`__actionDropdown` figure dans `columns()`, absente ici, donc aucun changement
de comportement runtime.

**`deps = imports`** : les 4 `package.json` correspondent aux imports externes
réels (vérifié par grep des `from '...'` non-relatifs), à une exception
**non-imputable à ce module** : `ui` déclare `rxjs` sans import direct top-level
(seul `@angular/core/rxjs-interop` est utilisé) — même situation, à l'identique,
dans `administrative-infrastructure-ui` (module de référence déjà livré) ; non
corrigé pour rester cohérent avec l'archétype plutôt que de diverger sur ce seul
module.

**Validation exécutée depuis cet environnement** (sandbox Linux arm64, sans les
binaires natifs `@nx/nx-*` compatibles) :

- `npx tsc --noEmit` sur les 4 tsconfig de lib +
  `apps/backoffice-angular/tsconfig.app.json` → 0 erreur.
- `npx ngc -p apps/backoffice-angular/tsconfig.app.json --noEmit` (compilateur
  Angular réel, `strictTemplates: true` hérité de `tsconfig.json`) → 1 bug
  trouvé et corrigé (ci-dessus), puis 0 erreur.
- `npx eslint` sur tout `libs/administrative-boundary/**/*.ts` +
  `apps/backoffice-angular/src/**/*.ts` (inclut `@nx/enforce-module-boundaries`
  avec le bloc `scope:administrative-boundary` ajouté en Phase 1) → 0 erreur, 0
  violation de boundary.
- Mock backend (`tools/mock-server.mjs`) démarré et smoke-testé en direct
  (`curl`) : liste paginée + select cascade + vue imbriquée scopée + find-one
    - create + update + delete + 404, pour les 3 niveaux région/département/
      commune — compteurs (`departments_count`, `municipalities_count`)
      cohérents après create/delete.

**Confirmé ensuite sur le poste macOS réel (2026-07-27)** par l'utilisateur :
`npx nx lint backoffice-angular` vert, `npx nx serve backoffice-angular` build

- dev-server OK (`localhost:4200`) — non exécutable depuis ce sandbox Linux
  arm64 (binaires natifs Nx `darwin-arm64` du workspace → erreur
  `WorkspaceContext is not a constructor`, sans rapport avec le code de ce
  module).

**Reste à faire, hors portée de cette validation outillée** : smoke test
**visuel** dans le navigateur (clic réel sur les vues imbriquées, cascades de
select en formulaire, confirm de suppression) — recommandé avant mise en
production, non bloquant pour ce module.

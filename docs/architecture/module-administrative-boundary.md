# Module `administrative-boundary` — plan de reconstruction (Phase 08)

- **Créé :** 2026-07-26
- **Statut :** à faire (plan)
- **Gabarit de référence :** `module-administrative-infrastructure.md`
  (Phase 07)

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
7. **`find-one-filter.uniqId` optionnel**, méthode liste unifiée `execute`,
   whitelisting create/update préservé — mêmes corrections qu'en Phase 07.
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

- [ ] Générer `libs/administrative-boundary/{domain,data,application,ui}`
      (`@cmz/administrative-boundary-{domain,data,application,ui}`).
- [ ] `project.json` tags : `scope:administrative-boundary` +
      `type:{domain,data,application,ui}`.
- [ ] `tsconfig.base.json` : ajouter les 4 paths
      `@cmz/administrative-boundary-*`.
- [ ] Barrels `src/index.ts` (vides au départ).
- [ ] Vérifier que `eslint.config.mjs` couvre le nouveau scope (règle
      `scope:administrative-boundary → [self, scope:shared]` — **ajouter** ce
      `sourceTag`, calqué sur le bloc `administrative-infrastructure`).

## Phase 2 — Domaine (`-domain`)

Par entité **E ∈ {region, department, municipality}** (+ 2 vues imbriquées) :

- [ ] `enums/status.enum.ts` — **un seul** `Status` wire-first + `isStatus`.
- [ ] `props/<E>.props.ts`, `props/<E>-find-one.props.ts` — relations en
      `{id,name}` (décision 3), compteurs, `code`.
- [ ] `props/departments-by-region-id.props.ts`,
      `props/municipalities-by-department-id.props.ts`.
- [ ] `entities/<E>.entity.ts`, `<E>-find-one.entity.ts`,
      `<E>-filter.entity.ts`, `<E>-select.entity.ts` — pattern `props` +
      getters + `with()` immuable (aucun `statusStyle`/`actionsRef` : UI).
- [ ] `entities/departments-by-region-id.entity.ts`,
      `municipalities-by-department-id.entity.ts`.
- [ ] `contracts/<E>-{create,update,delete,filter,find-one-filter}.contract.ts` +
      `.validate-contract.ts` (create/update/find-one-filter).
- [ ] `contracts/{departments-by-region-id,municipalities-by-department-id}-filter.contract.ts`.
- [ ] `validators/<E>-{create,update,filter,find-one-filter}.validator.ts` +
      validators des 2 filtres imbriqués (`assertValidDateRange`).
- [ ] `value-objects/<E>-{create,update,delete,filter,find-one-filter}.vo.ts` +
      VO des filtres imbriqués.
- [ ] `repositories/<E>.repository.ts`, `<E>-find-one.repository.ts`,
      `<E>-select.repository.ts` (classes abstraites, tokens DI, sans
      décorateur).
- [ ] `repositories/departments-by-region-id.repository.ts`,
      `municipalities-by-department-id.repository.ts`.
- [ ] Barrel + **`ngc` domaine pur** (dépend seulement de `@cmz/shared-domain` +
      `rxjs`).

## Phase 3 — Data (`-data`)

- [ ] `endpoints/administrative-boundary.endpoints.ts`
      (`territorial-structures/*`).
- [ ] `dtos/` par entité : `-create-api`, `-update-api`, `-delete-api`,
      `-filter-api`, `-find-one-filter-api`, `-response-api`,
      `-find-one-response-api`, `-select-response-api` (+ DTO cascade
      region→departments).
- [ ] `dtos/` des 2 vues imbriquées (`-filter-api`, `-response-api`).
- [ ] `mappers/` : response
      (`PaginatedMapper`/`SimpleResponseMapper`/`ArrayResponseMapper` +
      `MapperUtils.validateDto`), request (snake_case), **`status.mapper`**
      (`is_active ⇄ Status`, **un seul** partagé), résolution relations
      `{id,name}`.
- [ ] `sources/*.api.ts` (`@Service` `HttpClient`, `SETTINGS_API_URL`,
      `buildHttpParams/Payload`, `BYPASS_CACHE`).
- [ ] `repositories/*.repository.impl.ts` → `PageResult` (liste) /
      `MessageEntity` (mutations via `MessageResultMapper` +
      `assertResponseOk`).
- [ ] `package.json` deps
      `{domain module, shared-data, shared-domain, core, @angular/*}` (= imports
      réels) ; barrel ; `ngc`.

## Phase 4 — Application (`-application`)

- [ ] `use-cases/<E>.use-case.ts` (liste :
      `filterEntity ∘ filterVo → repository.execute`), `<E>-find-one`,
      `<E>-select`, create/update/delete (injectent les **ports**).
- [ ] `use-cases/departments-by-region-id.use-case.ts`,
      `municipalities-by-department-id.use-case.ts`.
- [ ] `facades/<E>.facade.ts` (étend `CollectionResourceFacade`),
      `<E>-find-one.facade.ts` / `<E>-select.facade.ts` (étendent
      `ResourceFacade`).
- [ ] `facades/` des 2 vues imbriquées (paginées, paramétrées par l'id parent).
- [ ] Feedback via `NotificationPort`/`TranslationPort`/`ErrorHandlerRegistry`
      (aucun import `ui` ni `data`). Barrel ; `ngc`.

## Phase 5 — UI (`-ui`)

- [ ] `constants/` : `administrative-boundary-paths`, puis par entité `-paths`,
      `-filter-keys`, `-form-keys`, `-form-error-messages`, `-table`, `-tabs` ;
      `form-validators` ; **`status-label.constant`** (`STATUS_LABEL`).
- [ ] `enums/status-style.enum` + `mappers/status-style.mapper` (UI).
- [ ] `stores/<E>-filter.store.ts` (Signal Forms, modèle `Record` semé sur
      toutes les clés → contrat, dates typées, cascade region→dept pour
      municipality) + `stores/<E>-form.store.ts` (`form(model, schema)`,
      `required`, hydratation edit/details via `effect` sur find-one).
- [ ] `stores/` des filtres imbriqués + `form-mode.type` (réutiliser le
      partagé).
- [ ] `adapters/<E>-vm-props.interface.ts` + `<E>-vm.presenter.ts` (Entity→VM,
      `statusStyleOf`, `statusLabel` via `STATUS_LABEL`, `actionsRef`, actions
      edit/delete **sans toggle**) + presenters des 2 vues imbriquées.
- [ ] `features/<E>-list.component.ts`, `<E>-form.component.ts`,
      `<E>-page.component.ts`, `<E>.routes.ts` (composition root : ports→impls
      au niveau route, lazy).
- [ ] `features/departments-by-region-id.component.ts`,
      `municipalities-by-department-id.component.ts` — **routes dédiées
      drill-down** (navigation depuis la ligne parent : région → départements,
      département → communes), pas des onglets de détail.
- [ ] Selects cascade : department-form → `RegionsSelectFacade` ;
      municipality-form → région puis département dépendant.
- [ ] Barrel ; `ngc --strictTemplates`.

## Phase 6 — Câblage app + i18n

- [ ] `apps/backoffice-angular/src/app/providers/administrative-boundary.providers.ts`
      — `provideAdministrativeBoundary()` : wire des ~11 ports (3×
      list/find-one/select + 2 nested) → impls `-data`, au **root**
      (app.config).
- [ ] `app.config.ts` : `...provideAdministrativeBoundary()`.
- [ ] `app.routes.ts` : route lazy `territorial-structures` (ou `boundaries`) +
      sous-routes regions/departments/municipalities ; entrée de menu/nav.
- [ ] i18n : ajouter le namespace
      `ADMINISTRATIVE_BOUNDARY.{REGION,DEPARTMENT,MUNICIPALITY}.*` (titres,
      colonnes, filtres, tooltips, messages) à `fr.translation.ts`. Réutiliser
      `COMMON.ACTIVE/INACTIVE` pour le statut.

## Phase 7 — Mock backend

- [ ] Étendre `tools/mock-server.mjs` : seed cohérent **hiérarchique** (régions
      → départements → communes reliés par id) + compteurs calculés.
- [ ] Routes `territorial-structures/{regions,departments,municipalities}` :
      liste paginée (`?page`) vs select (sans page, cascade region→departments),
      find-one, `store`/`update`/`delete`.
- [ ] Filtrage imbriqué : `departments?region_id=…`,
      `municipalities?department_id=…` (ou le paramètre réel — à aligner sur les
      `*-filter-api.dto`).
- [ ] Enveloppe `{error,message,data}` + pagination Laravel (déjà en place).

## Phase 8 — Validation & livraison (Definition of Done)

- [ ] `ngc --strictTemplates` + `isolatedModules` **vert** (4 libs + app).
- [ ] Audit **boundaries** sur imports réels : 0 violation (scope isolation).
- [ ] **deps = imports** sur les 4 `package.json`.
- [ ] `npx nx lint` + `npx nx serve` (poste macOS) OK.
- [ ] Smoke test contre le mock : liste + filtre + pagination +
      create/edit/details + delete (confirm) + **vues imbriquées** + **selects
      cascade** pour les 3 entités.
- [ ] Commits conventionnels par couche (`feat(admin-boundary): domain …`,
      `… data …`, `… application …`, `… ui + wiring …`), subject ≤72, corps
      ≤100.
- [ ] Mettre ce document à jour (statut « fait » + écarts réels vs plan).

## Estimation d'ampleur

Source ≈ **374 fichiers** (CQRS complet, 3 entités + 2 vues). Cible attendue
après optimisation ≈ **domaine ~70 · data ~55 · application ~38 · ui ~55** →
ordre de grandeur **~220 fichiers** produits, à valider couche par couche comme
en Phase 07.

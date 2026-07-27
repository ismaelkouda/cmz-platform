# Module `coverage-areas` — plan de reconstruction

- **Créé :** 2026-07-27
- **Statut :** plan (avant Phase 1)
- **Gabarit de référence :** `module-administrative-boundary.md` — même
  archétype **CRUD** déjà validé 2 fois (`administrative-infrastructure`,
  `administrative-boundary`). Aucun nouveau pattern à valider ici, contrairement
  à `authentication`.
- **Contrats d'archétype :** [`archetypes/`](./archetypes/README.md) —
  réutilisés tels quels.

## Périmètre réel vs classification (écart trouvé, pas supposé)

Le tableau de classification (`analyse-du-projet-source.md`, Phase 03) ne
scorait que 2 entités de `coverage-areas` (`site-group` Conforme 96 %,
`mobile-network` Proche 89 %). Lecture directe du source
(`src/presentation/pages/coverage-areas/`) : le domaine a en réalité **4 entités
CRUD complètes** + **2 concepts « select » partagés** :

| Entité                            | Fichiers source | Classe (si mesurée)  |
| --------------------------------- | --------------: | -------------------- |
| `site-group`                      |             126 | Conforme (96 % crud) |
| `mobile-network`                  |             120 | Proche (89 % crud)   |
| `optical-fiber-network`           |             120 | non mesurée          |
| `radio-relay-links`               |             114 | non mesurée          |
| `fiber-constructor` (select seul) |               8 | non mesurée          |
| `tower-type` (select seul)        |               8 | non mesurée          |

Total domaine : **502 fichiers**. Largement plus gros
qu'`administrative-boundary` (3 entités hiérarchiques). Décision utilisateur :
**`site-group` seul d'abord**, pilote sur ce domaine avant les 3 autres — même
logique que `administrative-infrastructure` comme pilote initial du socle.

## `site-group` — forme métier (source lu, pas supposé)

Entité **la plus simple vue jusqu'ici** : pas de hiérarchie (contrairement à
région/département/commune), pas de compteurs dérivés (contrairement à
`RegionEntity`), pas de sous-entité liée. CRUD pur + find-one + select + filtre,
`code/name/description/status/updatedAt` :

```ts
// domaine cible (props) — copie conforme du source, wire→domain déjà scindé
interface SiteGroupProps {
    uniqId: string;
    code: string;
    name: string;
    description: string;
    status: Status; // ACTIVE | INACTIVE, enum local au module (précédent : chaque module a le sien)
    updatedAt: string;
}
```

Wire (`SiteGroupItemApiDto`) :
`id, code, name, description, is_active, created_at, updated_at` — snake_case
classique, séparation wire/domain à reproduire (précédent constant sur les 2
modules précédents).

Validateur `create` : seuls `code` et `name` sont requis
(`GenericRequiredError`), `description` optionnelle. Pas de règle métier au-delà
du required — le validateur le plus simple vu jusqu'ici.

Select (`SiteGroupSelectItemApiDto`) : `id, name, description` — pas de `code`
exposé au select, à vérifier si un consommateur en aurait besoin (aucun dans le
périmètre `site-group` seul ; `mobile-network`/`optical-fiber-network` utilisent
probablement ce select comme référence parente — **hors périmètre de ce
pilote**, à confirmer quand ces entités seront reconstruites).

## Découverte : tab « Historique », absente des 2 modules déjà livrés

`site-group` (et `administrative-infrastructure` !) ont dans le source un 2ᵉ
onglet « Historique » (`SITE_GROUP_TABS`, `INFRASTRUCTURE_TABS` — vérifié sur
les deux) qui charge un composant **partagé**,
`@shared/components/history/.../HistoryPageComponent` (~60 fichiers,
domain/data/application/ui complets, générique par `ref` query param).

Ni `administrative-infrastructure` ni `administrative-boundary` (livrés) ne
l'ont reconstruit — ni mentionné dans leurs plans respectifs. Ce n'est donc pas
un oubli de ce plan spécifiquement, c'est un **gap déjà présent** dans les 2
modules livrés, découvert ici en creusant `site-group`.

**Décision pour ce plan : ne pas construire la tab Historique** — cohérent avec
le précédent (`administrative-infrastructure` livré sans), et c'est un kernel
partagé de ~60 fichiers, pas une variation de `site-group` — un chantier à part
entière (`shared/history`), pas ce module. Si le besoin redevient prioritaire,
il se traite une fois pour toutes au niveau kernel, pas dupliqué par entité.

## Décisions d'ingénieur

1. **Aucun nouveau pattern.** `site-group` est un CRUD strictement plus simple
   que `RegionEntity` (pas de compteurs, pas de hiérarchie) — les archétypes
   existants s'appliquent sans adaptation.
2. **Status enum local au module**, pas partagé — précédent constant
   (`administrative-boundary` et `administrative-infrastructure` ont chacun leur
   propre `Status`/`StatusStyle`, jamais un enum kernel commun) malgré la
   duplication ; rester cohérent plutôt que de corriger cette duplication ici,
   hors sujet de ce module.
3. **Tab Historique explicitement hors périmètre** (cf. section précédente) —
   décision documentée, pas un oubli.
4. **Select `site-group` construit mais pas branché** : le port/repository
   `select` sera présent (symétrie avec l'archétype), mais aucun consommateur
   n'existe tant que `mobile-network`/`optical-fiber-network` ne sont pas
   reconstruits — à ne pas sur-designer en anticipant leurs besoins non
   confirmés.
5. **Scope Nx `coverage-areas`, pas `coverage-areas-site-group`.** Les 4 libs
   portent le tag `scope:coverage-areas` (le domaine), pas un tag par entité —
   cohérent avec `administrative-boundary` (3 entités, 1 scope). Les entités
   suivantes (`mobile-network`, etc.) s'ajouteront **dans les mêmes libs**, pas
   dans de nouvelles.

## Phase 1 — Scaffolding Nx (4 libs)

- [ ] Générer `libs/coverage-areas/{domain,data,application,ui}`
      (`@cmz/coverage-areas-{domain,data,application,ui}`).
- [ ] `project.json` tags : `scope:coverage-areas` +
      `type:{domain,data,application,ui}`.
- [ ] `tsconfig.base.json` : 4 paths `@cmz/coverage-areas-*`.
- [ ] Barrels vides.
- [ ] `eslint.config.mjs` : bloc `scope:coverage-areas → [self, scope:shared]`.

## Phase 2 — Domaine (`site-group`)

- [ ] `enums/status.enum.ts` (`Status`, `StatusStyle`).
- [ ] `props/site-group.props.ts`, `props/site-group-find-one.props.ts`.
- [ ] `entities/site-group.entity.ts` (+ `.with()`),
      `site-group-find-one.entity.ts`, `site-group-filter.entity.ts`.
- [ ] `contracts/site-group-{create,update,delete,enable,disable,filter,     find-one-filter}.contract.ts` +
      `.validate-contract.ts`.
- [ ] `validators/` — `create`/`update` : `code`+`name` requis
      (`GenericRequiredError`), rien d'autre.
- [ ] `value-objects/`.
- [ ] `repositories/site-group.repository.ts` +
      `site-group-{find-one,select}.repository.ts` (ports abstraits).
- [ ] Barrel ; `tsc` domaine pur.

## Phase 3 — Data (`-data`)

- [x] `endpoints/coverage-areas.endpoints.ts` —
      `SITE_GROUP:     'infrastructures/site-groups'` (les 5 autres clés du
      source — `MOBILE_NETWORK`/`TOWER_TYPE`/`OPTICAL_FIBER_NETWORK`/
      `RADIO_RELAY_LINKS`/`FIBER_CONSTRUCTOR` — non recopiées : hors périmètre
      tant que ces entités ne sont pas reconstruites).
- [x] `dtos/site-group-*-api.dto.ts` (wire snake_case, fidèle au source).
- [x] `mappers/site-group*.mapper.ts` (`PaginatedMapper`/`SimpleResponseMapper`,
      cache d'identité `.with()` comme `InfrastructureTypeMapper`).
- [x] `sources/site-group*.api.ts` — `HttpClient` + `SETTINGS_API_URL` (confirmé
      par lecture du source, même token que
      `administrative-infrastructure`/`administrative-boundary`).
- [x] `repositories/*.repository.impl.ts`.
- [x] Barrel ; `tsc` + `eslint` propres.

## Phase 4 — Application (`-application`)

- [ ] `use-cases/site-group*.use-case.ts`.
- [ ] `facades/site-group.facade.ts` (`PaginatedResourceFacade`),
      `site-group-find-one.facade.ts` (`ResourceFacade`),
      `site-group-select.facade.ts` (`CollectionResourceFacade`).
- [ ] Barrel ; `tsc`.

## Phase 5 — UI (`-ui`)

- [ ] `constants/site-group-{paths,filter-keys,table}.constant.ts`,
      `status-label.constant.ts`.
- [ ] `adapters/site-group-vm-props.interface.ts` + `.presenter.ts`,
      `mappers/status-style.mapper.ts`.
- [ ] `stores/site-group-filter.store.ts`, `site-group-form.store.ts` (Signal
      Forms — **pas** de `*-form-keys`/`*-form-error-messages`, confirmé mort
      par l'audit workspace sur les 2 modules précédents).
- [ ] `features/site-group-list.component.ts`, `site-group-form.component.ts`
      (`cmz-table`/`cmz-filter`/`cmz-field`, comme `region-*`).
- [ ] `site-group.routes.ts` — liste + form, **pas** de route historique
      (décision ci-dessus).
- [ ] Barrel ; `ngc --strictTemplates`.

## Phase 6 — Câblage app + i18n

- [ ] `providers/coverage-areas.providers.ts` (composition root).
- [ ] `app.config.ts` : `...provideCoverageAreas()`.
- [ ] `app.routes.ts` : route `coverage-areas/site-groups` (à nommer exactement
      d'après `SITE_GROUP_ROUTE` du source).
- [ ] i18n : namespace `COVERAGE_AREAS.SITE_GROUP.*`.

## Phase 7 — Mock backend

- [ ] Étendre `tools/mock-server.mjs` : CRUD `site-group` (liste paginée,
      find-one, create/update/delete/enable/disable, select) — même forme que
      `infrastructure-types` (entité plate, pas de hiérarchie).

## Phase 8 — Validation & livraison

- [ ] `ngc --strictTemplates` vert (4 libs + app).
- [ ] Boundaries 0 violation (grep direct, pas seulement la config).
- [ ] `npx nx lint` + `npx nx serve` (poste macOS).
- [ ] Smoke test : liste, création, édition, activation/désactivation,
      suppression.
- [ ] Commits conventionnels par couche.
- [ ] Mettre ce document à jour (statut fait + écarts réels + noter la suite :
      `mobile-network`/`optical-fiber-network`/`radio-relay-links`/
      `fiber-constructor`/`tower-type` restent à construire dans le même scope).

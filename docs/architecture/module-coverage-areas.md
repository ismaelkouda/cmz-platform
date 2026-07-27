# Module `coverage-areas` — plan de reconstruction

- **Créé :** 2026-07-27
- **Statut :** livré et **confirmé** — les **4 entités CRUD** du domaine
  (`site-group` + `mobile-network` + `optical-fiber-network` +
  `radio-relay-links`, 2026-07-27) + les 2 concepts select
  (`tower-type`/`fiber-constructor`). Phases 1 à 8 complètes pour les quatre
  entités. `nx lint`/`nx serve` confirmés conformes par l'utilisateur sur son
  poste macOS pour l'ensemble du module (dernière confirmation : 2026-07-27,
  après `radio-relay-links`). Module `coverage-areas` **terminé**. Cf. « Bilan
  réel » de chaque entité en fin de document.
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

- [x] Générer `libs/coverage-areas/{domain,data,application,ui}`
      (`@cmz/coverage-areas-{domain,data,application,ui}`).
- [x] `project.json` tags : `scope:coverage-areas` +
      `type:{domain,data,application,ui}`.
- [x] `tsconfig.base.json` : 4 paths `@cmz/coverage-areas-*`.
- [x] Barrels vides.
- [x] `eslint.config.mjs` : bloc `scope:coverage-areas → [self, scope:shared]`.

## Phase 2 — Domaine (`site-group`)

- [x] `enums/status.enum.ts` (`Status`).
- [x] `props/site-group.props.ts`, `props/site-group-find-one.props.ts`.
- [x] `entities/site-group.entity.ts` (+ `.with()`),
      `site-group-find-one.entity.ts`, `site-group-filter.entity.ts`.
- [x] `contracts/site-group-{create,update,delete,enable,disable,filter,     find-one-filter}.contract.ts` +
      `.validate-contract.ts`.
- [x] `validators/` — `create`/`update` : `code`+`name` requis
      (`GenericRequiredError`), rien d'autre.
- [x] `value-objects/` (`site-group-filter.vo.ts` manquait ici — écart détecté
      et corrigé en Phase 4, cf. « Bilan réel »).
- [x] `repositories/site-group.repository.ts` +
      `site-group-{find-one,select}.repository.ts` (ports abstraits).
- [x] Barrel ; `tsc` domaine pur.

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

- [x] `use-cases/site-group*.use-case.ts`.
- [x] `facades/site-group.facade.ts` (`CollectionResourceFacade` — pas
      `PaginatedResourceFacade` : correction du plan initial, la facade liste de
      `infrastructure-type` — le gabarit choisi — étend en réalité
      `CollectionResourceFacade`, vérifié par lecture directe avant d'écrire),
      `site-group-find-one.facade.ts` (`ResourceFacade`),
      `site-group-select.facade.ts` (`ResourceFacade`).
- [x] Barrel ; `tsc` + `eslint` propres.
- [x] **Écart Phase 2 corrigé en marge** :
      `value-objects/site-group-filter.vo.ts` manquait (validateur présent, VO
      oublié) — détecté par `tsc` en Phase 4, ajouté + exporté avant de
      continuer.

## Phase 5 — UI (`-ui`)

- [x] `constants/site-group-{paths,filter-keys,table}.constant.ts`,
      `status-label.constant.ts`.
- [x] `adapters/site-group-vm-props.interface.ts` + `.presenter.ts`,
      `mappers/status-style.mapper.ts`.
- [x] `stores/site-group-filter.store.ts`, `site-group-form.store.ts` (Signal
      Forms — **pas** de `*-form-keys`/`*-form-error-messages`, confirmé mort
      par l'audit workspace sur les 2 modules précédents). `code` ajouté au
      modèle/schéma (différence avec `infrastructure-type`, présent chez
      `region`).
- [x] `features/site-group-list.component.ts`, `site-group-form.component.ts`
      (`cmz-table`/`cmz-filter`/`cmz-field`, comme `infrastructure-type-*`).
- [x] `site-group.routes.ts` — liste + form, **pas** de route historique
      (décision ci-dessus).
- [x] Barrel ; `tsc` propre. `ngc --strictTemplates` (contre
      `apps/backoffice-angular/tsconfig.app.json`) vert, mais les fichiers ne
      sont pas encore importés par l'app (câblage en Phase 6) — vérification
      complète des templates différée à la Phase 8, comme pour les modules
      précédents.

## Phase 6 — Câblage app + i18n

- [x] `providers/coverage-areas.providers.ts` (composition root).
- [x] `app.config.ts` : `...provideCoverageAreas()`.
- [x] `app.routes.ts` : route `coverage-areas/site-groups` (préfixe
      `coverage-areas` choisi pour cohérence avec le nom de domaine/scope Nx,
      plutôt que `infrastructures/site-groups` — l'URL wire de l'API — qui
      resterait un détail de source non repris côté routing app).
- [x] i18n : namespace `COVERAGE_AREAS.SITE_GROUP.*` (TITLE/FORM/FILTER/TABLE/
      TOOLTIP/SWEET_ALERT — modelé sur `ADMINISTRATIVE_BOUNDARY.REGION`, plus
      complet que `INFRASTRUCTURE_TYPE` qui manque un bloc `TOOLTIP` alors que
      son composant l'utilise, un gap pré-existant non corrigé ici, hors
      périmètre de ce module).
- [x] `ngc --strictTemplates` (app complète) + `eslint` (app + 4 libs) propres.

## Phase 7 — Mock backend

- [x] Étendre `tools/mock-server.mjs` : CRUD `site-group` (liste paginée,
      find-one, create/update/delete/enable/disable, select) — même forme que
      `infrastructure-types` (entité plate, pas de hiérarchie).
- [x] Smoke test direct (curl contre le mock lancé en local, port 3399) : liste
      paginée, select, find-one, create, enable, disable, update, delete — tous
      200/201 avec la bonne enveloppe `{error,message,data}`.

## Phase 8 — Validation & livraison

- [x] `ngc --strictTemplates` vert (4 libs + app) — revérifié en fin de Phase 8
      après câblage complet (Phase 6), pas seulement lib par lib.
- [x] `tsc --noEmit` vert lib par lib (`domain`/`data`/`application`/`ui`).
- [x] Boundaries 0 violation (grep direct des imports `@cmz/*` par lib, pas
      seulement la config eslint) : `domain` → `shared-domain` seul ; `data` →
      `core`/`coverage-areas-domain`/`shared-data`/`shared-domain` ;
      `application` →
      `coverage-areas-domain`/`shared-application`/`shared-domain` ; `ui` →
      `coverage-areas-{domain,application}`/`shared-{application,ui}`. Aucune
      lib ne saute de couche (ex. `ui` n'importe jamais `-data` directement).
- [x] `eslint` sur l'app + les 4 libs propre (les ~3.4k erreurs remontées par
      `eslint .` sur tout le repo viennent uniquement de fichiers hors périmètre
      — vendor bundlé `.angular/cache/**` et `tools/seos-adapter/adapt.mjs`
      préexistant — aucune ne touche `coverage-areas` ni les fichiers modifiés
      ici).
- [x] Smoke test backend direct (curl contre le mock, cf. Phase 7) : liste,
      select, find-one, création, activation, désactivation, mise à jour,
      suppression — tous verts.
- [x] `npx nx lint` + `npx nx serve` (poste macOS) — **confirmés conformes par
      l'utilisateur** (2026-07-27), le sandbox Linux arm64 ne pouvant pas
      exécuter les binaires natifs `@nx/nx-*` (`darwin-arm64`).
- [x] Commits conventionnels par couche (7 commits, un par phase 1 à 7).
- [x] Mettre ce document à jour (statut fait + écarts réels + noter la suite).

## Bilan réel (2026-07-27)

Écarts entre le plan initial et l'exécution réelle, tous découverts et corrigés
en marge (pas silencieusement) :

1. **`value-objects/site-group-filter.vo.ts` manquant en Phase 2** — le
   validateur (`validateSiteGroupFilter`) avait été écrit, pas le VO qui
   l'appelle. Détecté par `tsc` en Phase 4 (le use-case l'importait), corrigé
   immédiatement + exporté dans le barrel domaine avant de continuer.
2. **`SiteGroupFacade` étend `CollectionResourceFacade`, pas
   `PaginatedResourceFacade`** comme prévu dans le plan initial (Phase 4) — le
   gabarit choisi (`InfrastructureTypeFacade`) étend en réalité
   `CollectionResourceFacade` ; vérifié par lecture directe du fichier source
   avant d'écrire, plutôt que de suivre l'intitulé du plan à l'aveugle.
3. **Namespace i18n `COVERAGE_AREAS.SITE_GROUP` modelé sur `REGION`, pas sur
   `INFRASTRUCTURE_TYPE`** — ce dernier s'est avéré manquer un bloc `TOOLTIP`
   utilisé par son propre composant (gap pré-existant, non corrigé ici, hors
   périmètre de ce module).
4. **Route app `coverage-areas/site-groups`** choisie par cohérence avec le nom
   du domaine/scope Nx plutôt que de recopier `infrastructures/site-groups`
   (l'URL wire de l'API source) — décision documentée en Phase 6, pas un oubli.
5. `ngc`/`nx lint`/`nx serve` : mêmes limitations sandbox que les modules
   précédents — validation statique (`tsc`, `ngc --strictTemplates` contre
   l'app, `eslint`, grep de boundaries) faite ici ; `nx lint`/`nx serve` réels
   confirmés conformes par l'utilisateur sur son poste macOS (2026-07-27).

**Suite** : `site-group` est le seul des 6 concepts du domaine `coverage-areas`
reconstruit. `mobile-network`, `optical-fiber-network`, `radio-relay-links`
(CRUD complets) et `fiber-constructor`, `tower-type` (select seul) restent à
construire **dans les mêmes 4 libs** (même scope Nx, cf. décision 5) — pas de
nouvelles libs par entité.

---

# `mobile-network` — 2ᵉ entité du domaine (2026-07-27)

- **Statut :** livré, Phases 1 à 8 complètes (2026-07-27). Validation statique
  (`tsc` par lib, `ngc --strictTemplates` sur l'app, `eslint`, smoke test mock)
  faite en sandbox ; `nx lint`/`nx serve` réels restent à confirmer par
  l'utilisateur sur son poste macOS (même limitation sandbox que `site-group`).
- **Gabarit de référence :** archétype CRUD standard (`site-group`), mais avec
  relations externes — plus proche d'`administrative-boundary` (région/
  département avec référence `{id,name}`) que de `site-group` sur ce point
  précis.

## Forme métier réelle (source lu, pas supposé)

`mobile-network` (classée « Proche » 89 % côté source, pas « Conforme ») a deux
champs qui rompent avec le CRUD plat de `site-group` :

- `technology: Technology[]` (multi-select `2G/3G/4G/5G`) et `operator`
  (`MTN`/`Orange`/`Moov`) — deux enums **propres à `mobile-network`**, pas
  partagés avec `site-group`.
- **`status`** : le source déclare un `mobile-network-status.enum.ts` dupliqué
  (identique à celui de `site-group`). Décision : **réutiliser l'enum `Status`
  déjà présent dans `coverage-areas-domain`** au lieu de le redupliquer —
  cohérent avec le précédent intra-module d'`administrative-boundary`
  (région/département/commune partagent un seul `Status` dans la même lib), pas
  avec la règle _inter-module_ (chaque domaine a son propre `Status`). Les deux
  règles coexistent : un `Status` par lib, pas par entité.

## Découverte : la vraie relation cachée derrière un nom trompeur

Le contrat (`create`/`update`/wire) porte trois champs `siteId`, `siteName`,
`infrastructureType`. Rien dans leur nom n'indique une dépendance vers
`site-group`. Lecture du composant formulaire source
(`mobile-network-form.component.ts`) :

- `siteId` et `siteName` sont des **champs texte libres** (aucun binding vers un
  select) — malgré leur nom, ce ne sont pas des références résolues.
- `infrastructureType` est en réalité bindé à **`SiteGroupSelectFacade`** (le
  port select construit mais non branché à la fin du plan `site-group`,
  décision 4) : le libellé UI et le nom de champ suggèrent un concept « type
  d'infrastructure », mais la valeur stockée est l'uniqId d'un `site-group`.

C'est une incohérence de nommage du source, pas une supposition de ce plan.
Décision : **conserver le nom `infrastructureType` tel quel** (fidélité au
contrat wire `infrastructure_type`, déjà répliqué dans toutes les couches Phase
2/3), mais documenter la réalité en commentaire directement dans
`MobileNetworkFindOneProps` (`props/mobile-network-find-one.props.ts`) plutôt
que de renommer silencieusement ou de laisser l'incohérence sans trace.

## Découverte : `tower-type`, le 2ᵉ concept select-only, doit être construit maintenant

`towerTypeId` est bindé à `TowerTypeSelectFacade` — un port select **réel** (pas
une confusion de nommage), sur un concept `tower-type` jusqu'ici seulement
recensé (décision du plan `site-group`, jamais construit). Contrairement à
`infrastructureType`, celui-ci n'a **aucun** détour : le domaine source
`tower-type` ne contient que 8 fichiers, tous select
(`TowerTypeSelectRepository → ...Mapper → ...Api`, endpoint
`infrastructures/tower-types/select-field`). Construit ici en Phase 2/3, dans
les mêmes libs `coverage-areas` (pas de nouvelle lib), sans props/entité — le
port renvoie directement `SelectOption[]`, comme `SiteGroupSelectRepository`.

## Décisions d'ingénieur

1. **Pas de nouveau pattern archétype** — CRUD standard + 2 select externes
   consommés en Phase 5 (UI), déjà vu conceptuellement avec les relations
   `{id,name}` d'`administrative-boundary`.
2. **`Status` partagé avec `site-group`** dans la même lib domaine — pas de
   dupliqué `mobile-network-status.enum.ts` (cf. section forme métier).
3. **`Operator`/`Technology`** : deux enums locaux à `mobile-network`, format
   const-object + guard `isOperator`/`isTechnology`, comme `Status`.
4. **`infrastructureType` conservé tel quel**, incohérence de nommage source
   documentée en commentaire de code, pas corrigée silencieusement ni renommée
   (cf. découverte ci-dessus).
5. **`tower-type` select construit maintenant** (Phase 2/3), branché dès la
   Phase 5 (seul consommateur connu : le formulaire `mobile-network`) —
   contrairement au select `site-group` qui reste non branché.
6. **Historique** toujours hors périmètre (route `history` présente dans le
   source, jamais construite, décision constante depuis `site-group`).

## Phase 1 — Scaffolding

- [x] Aucune nouvelle lib : `mobile-network`/`tower-type` s'ajoutent dans
      `libs/coverage-areas/{domain,data,application,ui}` déjà scaffoldées.

## Phase 2 — Domaine

- [x] `enums/mobile-network-{operator,technology}.enum.ts`.
- [x] `props/mobile-network.props.ts`, `props/mobile-network-find-one.props.ts`
      (avec le commentaire sur `infrastructureType`).
- [x] `entities/mobile-network.entity.ts`, `-find-one.entity.ts`,
      `-filter.entity.ts`.
- [x] `contracts/mobile-network-{create,update,delete,enable,disable,filter,     find-one-filter}.contract.ts` +
      `.validate-contract.ts`.
- [x] `validators/` (7 fichiers, `GenericRequiredError` sauf filter).
- [x] `value-objects/` (7 fichiers, **filter inclus dès le départ** — leçon
      retenue de l'écart Phase 2→4 sur `site-group`).
- [x] `repositories/mobile-network.repository.ts`,
      `mobile-network-find-one.repository.ts`,
      `tower-type-select.repository.ts`.
- [x] Barrel ; `tsc` + `eslint` propres.

## Phase 3 — Data

- [x] `endpoints/coverage-areas.endpoints.ts` — ajout
      `MOBILE_NETWORK:     'infrastructures/coverage-areas'` et
      `TOWER_TYPE:     'infrastructures/tower-types'` (les 2 clés restantes du
      source, `OPTICAL_FIBER_NETWORK`/`RADIO_RELAY_LINKS`/`FIBER_CONSTRUCTOR`,
      toujours hors périmètre).
- [x] `dtos/mobile-network-*-api.dto.ts` (9 fichiers,
      `technology: string[] |     string` conservé fidèlement — le wire source
      renvoie parfois une chaîne simple),
      `dtos/tower-type-select-response-api.dto.ts`.
- [x] `mappers/mobile-network*.mapper.ts` (normalisation
      `string[] | string → Technology[]` reproduite telle quelle dans
      `mapItemFromDto`), `mappers/tower-type-select.mapper.ts`.
- [x] `sources/mobile-network*.api.ts`, `sources/tower-type-select.api.ts` —
      `HttpClient` + `SETTINGS_API_URL`, `tower-type` sur `/select-field`
      (confirmé par lecture du source).
- [x] `repositories/*.repository.impl.ts` (3 fichiers).
- [x] Barrel ; `tsc` + `eslint` propres.

## Phase 4 — Application

- [x] `use-cases/mobile-network*.use-case.ts`, `tower-type-select.use-case.ts`.
- [x] `facades/mobile-network.facade.ts` (`CollectionResourceFacade`, même base
      que `SiteGroupFacade`), `mobile-network-find-one.facade.ts`
      (`ResourceFacade`), `tower-type-select.facade.ts` (`ResourceFacade`, même
      forme que `SiteGroupSelectFacade`).
- [x] Barrel ; `tsc` + `eslint` propres — aucun écart cette fois (leçon Phase
      2/4 de `site-group` appliquée : VO filter écrit dès la Phase 2).

## Phase 5 — UI

- [x] `constants/mobile-network-{paths,filter-keys,table}.constant.ts`.
- [x] `adapters/mobile-network-vm-props.interface.ts` + `.presenter.ts` —
      **réutilise** `STATUS_LABEL`/`statusStyleOf` de `site-group`
      (`Status`/`StatusStyle` partagés au niveau lib, décision Phase 2) ; dette
      de nommage documentée en commentaire plutôt que masquée.
- [x] `stores/mobile-network-filter.store.ts`, `mobile-network-form.store.ts` —
      `technology` (multi-valeur) validé par `validate()` (longueur > 0), pas
      par `required()` seul (un tableau vide reste "présent" pour `required()`).
- [x] `features/mobile-network-list.component.ts` (filtres `technology`/
      `operator` en `select` avec options = valeurs brutes de l'enum, pas de
      table de libellés — ces enums sont déjà des chaînes d'affichage, pas des
      clés i18n, contrairement à `Status`), `mobile-network-form.component.ts`
      (`infrastructureType`/`towerTypeId` en `<select>` alimentés par
      `SiteGroupSelectFacade`/`TowerTypeSelectFacade` ; `technology` en cases à
      cocher, hors `[formField]`, pilotées par `store.toggleTechnology()`).
- [x] `mobile-network.routes.ts` — liste + form, pas de route historique.
- [x] Barrel ; `tsc` + `eslint` propres (2 imports inutilisés retirés après
      premier passage eslint : `labelsToFilterOptions`/`STATUS_LABEL`,
      finalement pas nécessaires côté filtre `mobile-network`).

## Phase 6 — Câblage app + i18n

- [x] `coverage-areas.providers.ts` étendu : `MobileNetworkRepository`,
      `MobileNetworkFindOneRepository`, `TowerTypeSelectRepository` → leurs
      impls (`@cmz/coverage-areas-data`), à côté des bindings `site-group` déjà
      en place.
- [x] `app.routes.ts` : route `coverage-areas/mobile-networks` →
      `MOBILE_NETWORK_ROUTES` (lazy), même pattern que `site-groups`.
- [x] `fr.translation.ts` : namespace `COVERAGE_AREAS.MOBILE_NETWORK`
      (`FORM`/`FILTER`/`TABLE`/`TOOLTIP`/`SWEET_ALERT`) ajouté à côté de
      `SITE_GROUP`, clés alignées sur celles déjà référencées par les composants
      Phase 5.
- [x] **Bug trouvé par `ngc --strictTemplates` app-level** (absent du
      `tsc`/`eslint` lib-par-lib de la Phase 5) : `mobile-network-form.store.ts`
      typait `operator: Operator | null`, mais `[formField]` sur un `<select>`
      natif exige une valeur `string`-compatible non nullable (même contrainte
      que `infrastructureType`/`towerTypeId`, déjà en `string` avec défaut
      `''`). Corrigé en alignant `operator` sur le même pattern :
      `Operator | ''` avec défaut `''` (dans `model`, et dans `reset()`).
      Répercussion dans `mobile-network-form.component.ts#onSubmit` :
      `operator ?? undefined` devient `operator || undefined` (`??` ne convertit
      pas `''` en `undefined`, seul `||` le fait ici puisque toutes les valeurs
      d'`Operator` sont des chaînes non vides). **Leçon** : valider au niveau
      app (`ngc -p apps/.../tsconfig.app.json`) et pas seulement lib par lib
      avant de considérer une UI phase close — ce type d'erreur de binding de
      formulaire n'apparaît qu'à la compilation des templates de l'app
      consommatrice.
- [x] `ngc --strictTemplates` (tsconfig app) + `eslint` sur les fichiers touchés
      : propres après le correctif ci-dessus.

## Phase 7 — Mock backend (mobile-network + tower-type)

- [x] Seed `towerTypes` (3 entrées, select seul) et `mobileNetworks` (3 entrées,
      référençant `site-groups`/`tower-types` seedés via
      `infrastructure_type`/`tower_type_id`).
- [x] Route `infrastructures/tower-types/select-field` (GET) — select pur, pas
      de CRUD (cohérent avec le port `TowerTypeSelectRepository`, pas de
      `Repository` plein).
- [x] Route `infrastructures/coverage-areas` — **particularité** : cette base
      URL sert à la fois la liste paginée (`?page=`,
      `MobileNetworkApi.     readAll`) et le find-one (`/id`,
      `MobileNetworkFindOneApi.execute`), contrairement à `site-groups` qui n'a
      pas de find-one séparé sur la même base. CRUD complet :
      `store`/`{id}/update`/`{id}/delete` (méthode
      `DELETE`)/`{id}/enable`/`{id}/disable` (méthode `PUT`), même pattern que
      `site-groups`. `update`/`store` recalculent `tower_type_name` depuis
      `tower_type_id` (petite dérivation, comme `region`/`department` dans
      `administrative-boundary`).
- [x] Vérifié via curl (port 3499) : liste paginée, select tower-type, find-one,
      store, update (avec recalcul `tower_type_name`), enable, disable, delete —
      tous corrects, y compris la relecture de la liste après delete (3 → 2
      seed + 1 créé = 3 items restants, id supprimé absent).

## Phase 8 — Validation & livraison

- [x] `tsc --noEmit` sur les 4 libs `coverage-areas` (domain/data/application/
      ui) individuellement — propres.
- [x] `ngc --strictTemplates` sur `apps/backoffice-angular` (tsconfig app
      complet, pas seulement les libs) — propre **après correctif** (cf. écart 1
      ci-dessous, seule erreur trouvée à ce niveau).
- [x] `eslint` sur les 4 libs `coverage-areas` + les 3 fichiers app modifiés
      (`coverage-areas.providers.ts`, `app.routes.ts`, `fr.translation.ts`) —
      propre.
- [x] Smoke test backend direct (curl contre le mock, cf. Phase 7) : liste,
      find-one, select tower-type, création, mise à jour, activation,
      désactivation, suppression — tous verts.
- [x] Commits conventionnels par couche (7 commits, un par phase 2 à 7 — Phase 1
      déjà faite lors du scaffolding `site-group`, libs réutilisées).
- [x] Mettre ce document à jour (statut fait + écarts réels + noter la suite).
- [ ] `npx nx lint` + `npx nx serve` (poste macOS) — **à confirmer par
      l'utilisateur**, comme pour `site-group` : le sandbox Linux arm64 ne peut
      pas exécuter les binaires natifs `@nx/nx-*` (`darwin-arm64`).

## Bilan réel `mobile-network` (2026-07-27)

Écarts entre le plan initial et l'exécution réelle, tous découverts et corrigés
en marge (pas silencieusement) :

1. **Bug de binding Signal Forms trouvé seulement à la compilation app-level**,
   pas pendant la Phase 5 (UI) elle-même : `mobile-network-form.store.ts` typait
   `operator: Operator | null`, incompatible avec `[formField]` sur un
   `<select>` natif (qui exige une valeur `string`-compatible non nullable, même
   contrainte que `infrastructureType`/`towerTypeId`). `tsc`/`eslint`
   lib-par-lib (Phase 5) ne l'ont pas détecté — seul `ngc --strictTemplates`
   contre le `tsconfig.app.json` de l'app (Phase 6) l'a révélé, car c'est la
   compilation des templates de l'app **consommatrice** qui vérifie la
   compatibilité de type du binding, pas celle de la lib isolée. Corrigé en
   Phase 6 : `operator: Operator | ''` avec défaut `''` (même pattern que les
   autres champs select), et `operator ?? undefined` → `operator || undefined`
   dans `onSubmit`. **Leçon retenue pour les entités suivantes** : toujours
   valider avec `ngc` contre le tsconfig de l'app avant de considérer une phase
   UI/câblage close.
2. **`tower-type` (select seul) construit en Phase 2-3-4**, alors qu'il n'était
   que recensé dans le plan `site-group` (jamais construit à l'époque) —
   nécessaire ici car `mobile-network-form` en dépend réellement (`towerTypeId`
   bindé à `TowerTypeSelectFacade`). Confirme la prédiction initiale : 8
   fichiers, aucun CRUD, pur select.
3. **`infrastructureType` documenté, pas renommé** — le champ porte en réalité
   l'uniqId d'un `site-group` sélectionné (incohérence de nommage du source, cf.
   section « Découverte » plus haut). Fidélité au contrat wire conservée ;
   réalité documentée en commentaire JSDoc sur `MobileNetworkFindOneProps`
   plutôt que masquée ou silencieusement corrigée.
4. **Réutilisation des fichiers `site-group-status-{label,style}` par
   `mobile-network`** (pas de duplication) — cohérent avec la règle « un
   `Status`/`StatusStyle` par lib, pas par entité » déjà établie ; dette de
   nommage (fichiers préfixés `site-group` mais consommés par `mobile-network`)
   documentée en commentaire plutôt que corrigée par un renommage disruptif des
   fichiers déjà livrés.
5. **Aucune multi-sélection native fournie par le design-system** pour
   `technology` (`Technology[]`) — résolu par cases à cocher natives + méthode
   `store.toggleTechnology()`, hors `[formField]`, plutôt que de forcer un
   `<select multiple>` (binding de tableau peu fiable côté Angular value
   accessors). Décision d'ingénieur pragmatique, pas un contournement caché.
6. `ngc`/`nx lint`/`nx serve` : même limitation sandbox que `site-group` —
   validation statique complète faite ici (`tsc` × 4 libs,
   `ngc --strictTemplates` app, `eslint`, smoke test mock) ;
   `nx lint`/`nx serve` réels restent à confirmer par l'utilisateur sur son
   poste macOS.

**Suite** : `site-group` et `mobile-network` sont livrés. Restent
`optical-fiber-network`, `radio-relay-links` (CRUD complets) et
`fiber-constructor` (select seul, même famille que `tower-type`) — à construire
**dans les mêmes 4 libs** (scope Nx `coverage-areas` inchangé).

---

# `optical-fiber-network` — 3ᵉ entité du domaine (2026-07-27)

- **Statut :** livré, Phases 1 à 8 complètes (2026-07-27). Validation statique
  (`tsc` par lib, `ngc --strictTemplates` app, `eslint`, smoke test mock) faite
  au fil des phases et reconfirmée en Phase 8 après le passage prettier ;
  `nx lint`/`nx serve` réels restent à confirmer par l'utilisateur sur son poste
  macOS.
- **Gabarit de référence :** archétype CRUD standard, mais avec une **première**
  dans ce socle : un champ fichier (`geomFile`, upload `multipart/form-data`).

## Forme métier réelle (source lu, pas supposé)

`optical-fiber-network` (`name`, `operator`, `fiberConstructorId`/
`fiberConstructorName`, `type`, `status`) ressemble à `mobile-network` pour la
structure CRUD, mais introduit deux nouveautés :

1. **Upload de fichier** — `geomFile: File` (tracé GeoJSON de la fibre), requis
   en création, optionnel en modification (fidèle au source : ne pas forcer un
   ré-upload). Le wire envoie un `FormData`
   (`Content-Type: multipart/form-data`), pas du JSON — premier endpoit du socle
   dans ce cas. `buildFormData` (`@cmz/shared-data`) a été ajouté pour ça,
   portage direct de `formDataBuilder` (source,
   `src/shared/constants/formDataBuilder.constant.ts`) : `undefined`/`null`/
   `''` ignorés, `File` ajouté tel quel, tableaux/objets sérialisés en JSON,
   reste en `String(value)`.
2. **Aperçu cartographique interactif** — le formulaire source affiche le tracé
   du fichier uploadé via `GeojsonLineMapComponent` (dépendance Leaflet dédiée,
   ~kernel `shared/components/geojson-line-map`). **Décision : hors périmètre de
   cette reconstruction** — pas de brique carto dans ce socle à ce stade,
   remplacé par une simple mention textuelle « fichier existant » en mode
   édition/détails. Même logique que la tab Historique écartée pour `site-group`
   : un chantier `shared/map` à part entière si le besoin redevient prioritaire,
   pas une variation de ce module.
3. **Export Excel** — présent côté source (liste), non reconstruit ici, comme
   pour `site-group`/`mobile-network` (jamais construit dans ce socle, décision
   implicite constante depuis le début).

## Découverte : `Operator` réutilisé de `mobile-network`, pas redupliqué

Le source déclare un `optical-fiber-network-operator.enum.ts` **identique**
(`MTN`/`Orange`/`Moov`) à celui de `mobile-network` — même règle que
`Status`/`StatusStyle` : un opérateur télécom n'est pas un concept propre à
l'entité. Décision : importer `Operator` depuis
`../enums/mobile-network-operator.enum` plutôt que le redupliquer — dette de
nommage déjà documentée pour `Status`, même traitement ici.

## Découverte : `fiber-constructor`, 2ᵉ concept select-only du domaine

`fiberConstructorId` est bindé à `FiberConstructorSelectFacade` — même forme
exacte que `TowerTypeSelectRepository`/`TowerTypeSelectFacade` (8 fichiers, pas
de CRUD, `SelectOption[]` direct). Construit dans les mêmes phases que l'entité
principale (précédent : `tower-type` construit avec `mobile-network`).

## Décisions d'ingénieur

1. **`geomFile` requis conditionnellement au mode** — `required()` seul ne sait
   pas être conditionnel ; utilisé `validate()` avec un test sur `isCreate()`,
   même pattern que `technology` (mobile-network) qui utilisait déjà
   `validate()` pour une contrainte non standard.
2. **Pas de `[formField]` pour `geomFile`** — un `<input type="file">` natif ne
   se binde pas via Signal Forms (la valeur DOM d'un input file n'est pas
   assignable programmatiquement). Le composant appelle
   `store.setGeomFile(file)` sur `(change)`, même logique que
   `toggleTechnology()` pour la case à cocher `technology`.
3. **Aperçu cartographique explicitement hors périmètre** (cf. section
   Découverte ci-dessus) — décision documentée, pas un oubli.
4. **`buildFormData` ajouté à `@cmz/shared-data`**, pas dans
   `coverage-areas-data` — utilitaire générique réutilisable par tout futur
   endpoint à upload, même logique que `buildHttpPayload`/`buildHttpParams` déjà
   dans ce lib partagé.
5. **Mock backend : parseur `multipart/form-data` minimal ajouté**
   (`readFormData`) — le mock ne stocke pas le contenu binaire du fichier,
   seulement son nom (suffisant pour tester « un fichier a bien été envoyé »).

## Phase 2 — Domaine

- [x] `enums/optical-fiber-network-type.enum.ts` (`FiberType`, pattern
      const-object + `isFiberType()`, même forme que `Technology`).
- [x] `props/optical-fiber-network.props.ts` (+ `find-one`, avec `geomUrl`/
      `geom`), réutilisant `Operator` (mobile-network) et `Status` (partagé).
- [x] `entities/optical-fiber-network{,-find-one,-filter}.entity.ts`.
- [x] `contracts/optical-fiber-network-{create,update,delete,enable,disable,     filter,find-one-filter}.contract.ts` +
      `.validate-contract.ts` — `update.validate-contract` garde `geomFile`
      optionnel (fidèle source).
- [x] `validators/` — `create` : tous les champs requis dont `geomFile` ;
      `update` : idem sauf `geomFile` (pas requis, cf. décision).
- [x] `value-objects/` — VO filter écrit dès cette phase (leçon `site-group`
      appliquée, comme pour `mobile-network`).
- [x] `repositories/optical-fiber-network{,-find-one}.repository.ts` +
      `fiber-constructor-select.repository.ts` (port select-only).
- [x] Barrel ; `tsc` propre.

## Phase 3 — Data

- [x] `endpoints/coverage-areas.endpoints.ts` —
      `OPTICAL_FIBER_NETWORK:     'infrastructures/optical-fibers'`,
      `FIBER_CONSTRUCTOR:     'infrastructures/fiber-constructors'`.
- [x] `dtos/optical-fiber-network-*-api.dto.ts` (9 fichiers) +
      `fiber-constructor-select-response-api.dto.ts`.
- [x] `mappers/` (9 + 1 select) — mêmes bases (`PaginatedMapper`,
      `SimpleResponseMapper`, `ArrayResponseMapper`) que `site-group`/
      `mobile-network`.
- [x] `sources/optical-fiber-network.api.ts` — `create`/`update` construisent un
      `FormData` via `buildFormData` (nouveau) au lieu d'un payload JSON ; seule
      différence structurelle avec les sources précédentes.
- [x] `repositories/*.repository.impl.ts` (3 fichiers).
- [x] `@cmz/shared-data` : `buildFormData` ajouté (`build-form-data.util.ts`) +
      export barrel.
- [x] Barrel ; `tsc` propre (lib + `shared-data`).

## Phase 4 — Application

- [x] `use-cases/optical-fiber-network{,-find-one}.use-case.ts` +
      `fiber-constructor-select.use-case.ts`.
- [x] `facades/optical-fiber-network.facade.ts` (`CollectionResourceFacade`),
      `optical-fiber-network-find-one.facade.ts` (`ResourceFacade`),
      `fiber-constructor-select.facade.ts` (`ResourceFacade`, même forme que
      `TowerTypeSelectFacade`).
- [x] Barrel ; `tsc` + `eslint` propres.

## Phase 5 — UI

- [x] `constants/optical-fiber-network-{paths,filter-keys,table}.constant.ts`.
- [x] `adapters/optical-fiber-network-vm-props.interface.ts` + `.presenter.ts` —
      réutilise `STATUS_LABEL`/`statusStyleOf` de `site-group` (même règle que
      `mobile-network`).
- [x] `stores/optical-fiber-network-filter.store.ts`,
      `optical-fiber-network-form.store.ts` — `geomFile` validé
      conditionnellement (`validate()` + `isCreate()`), `setGeomFile()` hors
      `[formField]`.
- [x] `features/optical-fiber-network-list.component.ts` (filtres `search`/
      `operator`/dates, pas de filtre `type` — fidèle au filtre source),
      `optical-fiber-network-form.component.ts` (`fiberConstructorId` en
      `<select>` alimenté par `FiberConstructorSelectFacade` ; `geomFile` en
      `<input type="file">` natif + mention texte du fichier existant en
      détails, pas d'aperçu carto — cf. décision).
- [x] `optical-fiber-network.routes.ts` — liste + form, pas de route historique.
- [x] Barrel ; `tsc` + `eslint` propres.

## Phase 6 — Câblage app + i18n

- [x] `coverage-areas.providers.ts` étendu : `OpticalFiberNetworkRepository`,
      `OpticalFiberNetworkFindOneRepository`, `FiberConstructorSelectRepository`
      → leurs impls.
- [x] `app.routes.ts` : route `coverage-areas/optical-fiber-networks` →
      `OPTICAL_FIBER_NETWORK_ROUTES`.
- [x] `fr.translation.ts` : namespace `COVERAGE_AREAS.OPTICAL_FIBER_NETWORK`
      ajouté.
- [x] `ngc --strictTemplates` (tsconfig app, timeout sandbox élevé — la
      compilation app complète prend plus de 40s, relancée en arrière-plan pour
      confirmer le succès) + `eslint` sur les fichiers touchés : propres, aucun
      écart cette fois (leçon Phase 6 `mobile-network` appliquée :
      `operator`/`type` du form store typés `X | ''` dès le départ, pas
      `X | null`).

## Phase 7 — Mock backend (optical-fiber-network + fiber-constructor)

- [x] Seed `fiberConstructors` (3, select seul) et `opticalFiberNetworks` (3,
      référençant les constructeurs seedés).
- [x] Route `infrastructures/fiber-constructors/select-field` (GET).
- [x] Route `infrastructures/optical-fibers` — liste paginée + find-one sur la
      même base (même particularité que `mobile-network`). CRUD complet ;
      `store`/`update` recalculent `fiber_constructor_name`.
- [x] **Nouveau côté mock : parseur `multipart/form-data`** (`readFormData`) —
      le `readBody` existant (`JSON.parse`) échoue silencieusement sur un body
      multipart (résout `{}`), donc `store`/`update` d' `optical-fiber-network`
      utilisent `readFormData` à la place. Ne stocke que le nom du fichier
      (`geom_url` simulé), pas le contenu binaire.
- [x] Vérifié via curl (port 3599) : select fiber-constructor, liste, find-one,
      **store avec upload réel d'un fichier**
      (`curl -F     geom_file=@trace.geojson`, `geom_url` généré correctement
      côté mock), update sans fichier (géométrie existante préservée), enable,
      disable, delete — tous corrects.

## Phase 8 — Validation & livraison

- [x] `tsc --noEmit` sur les 4 libs `coverage-areas` + `shared-data`
      individuellement — propres.
- [x] `ngc --strictTemplates` sur `apps/backoffice-angular` (tsconfig app
      complet) — propre.
- [x] `eslint` sur les 4 libs `coverage-areas`, `shared-data`,
      `tools/mock-server.mjs` et les 3 fichiers app modifiés — propre.
- [x] Smoke test backend re-confirmé après le passage prettier du commit Phase 7
      (liste, select `fiber-constructor`) — toujours vert, aucune régression de
      formatage n'a cassé le mock.
- [x] Commits conventionnels par couche (7 commits, Phase 2 à 7 — Phase 1 déjà
      faite avec `site-group`, libs réutilisées).
- [x] Mettre ce document à jour (statut fait + écarts réels + noter la suite).
- [ ] `npx nx lint` + `npx nx serve` (poste macOS) — **à confirmer par
      l'utilisateur**, même limitation sandbox que `site-group`/
      `mobile-network`.

## Bilan réel `optical-fiber-network` (2026-07-27)

Écarts entre le plan initial et l'exécution réelle :

1. **Aperçu cartographique (`GeojsonLineMapComponent`) explicitement hors
   périmètre** — dépendance Leaflet dédiée, aucune brique carto dans ce socle à
   ce stade. Remplacé par une mention textuelle du fichier existant. Même
   logique que la tab Historique écartée pour `site-group` : documenté, pas
   silencieusement oublié.
2. **`buildFormData` ajouté à `@cmz/shared-data`** — première apparition d'un
   endpoint à upload de fichier dans ce socle ; utilitaire générique, pas
   spécifique à `coverage-areas`, pour rester réutilisable par de futurs
   modules.
3. **Mock backend : parseur `multipart/form-data` ajouté** (`readFormData`) — le
   `readBody` existant (`JSON.parse`) ne pouvait pas gérer un body multipart ;
   vérifié par un test curl avec upload réel d'un fichier
   (`-F geom_file=@trace.geojson`), le nom de fichier apparaît correctement dans
   le `geom_url` simulé retourné par le mock.
4. **`Operator` réutilisé de `mobile-network`** (pas de nouvel enum) — même
   valeurs, même règle que `Status`/`StatusStyle` partagés par lib.
5. **`geomFile` requis conditionnellement au mode** (`validate()` +
   `isCreate()`, pas `required()` seul) — cohérent avec le pattern déjà utilisé
   pour `technology` (`mobile-network`).
6. `ngc`/`nx lint`/`nx serve` : même limitation sandbox que les entités
   précédentes — validation statique complète faite ici ; `nx lint`/ `nx serve`
   réels restent à confirmer par l'utilisateur sur son poste macOS.

**Suite** : les 4 entités CRUD du domaine sont livrées
(`site-group`/`mobile-network`/`optical-fiber-network`/`radio-relay-links` + 2
concepts select `tower-type`/`fiber-constructor`). Domaine `coverage-areas`
terminé.

# `radio-relay-links` — 4ᵉ et dernière entité du domaine (2026-07-27)

## Forme métier réelle (source lu, pas supposé)

CRUD standard (`name`/`operator`/`frequency`/`startDate`/`endDate`/`status`)
avec find-one enrichi d'une géométrie en lecture seule (`geom_url`/`geom`) —
**pas d'upload de fichier** côté formulaire, contrairement à
`optical-fiber-network` : la géométrie est fournie côté backend, jamais poussée
par l'UI. Filtre : `search`/`operator`/plage de dates.

## Découverte : `RadioRelayLinksOperator` n'est pas l'`Operator` partagé

Contrairement à `optical-fiber-network` (qui réutilise l'`Operator` de
`mobile-network` sans modification), le source définit un
`RadioRelayLinksOperator` aux valeurs différentes (`MTN`/`MOOV`/`ORANGE` en
majuscules, contre `MTN`/`Moov`/`Orange` ailleurs). Vérifié en lisant le fichier
source avant de décider — pas de fusion silencieuse de deux enums aux valeurs
incompatibles. Nouvel enum dédié créé, avec le même pattern const-object + garde
de type (`isRadioRelayLinksOperator`) que les précédents.

## Découverte : incohérence UI/contrat sur le champ `frequency` du filtre

Le formulaire de filtre du source affiche un champ `frequency`, mais le contrat
wire réellement envoyé (`RadioRelayLinksFilterContract`) ne le contient pas.
Décision : fidélité au contrat effectivement transmis à l'API, pas au formulaire
— pas de champ `frequency` dans le filtre reconstruit (documenté par commentaire
à la fois dans le contrat domaine et la constante de clés UI).

## Découverte : lacune de validation dans le source (corrigée, pas reproduite)

Les validateurs `create`/`update` du source appellent `assertValidDateRange`
mais ne vérifient jamais explicitement que `startDate`/`endDate` sont présents
avant cet appel (`assertValidDateRange` ne contrôle que l'ordre, pas la
présence). Écart corrigé dans la reconstruction : présence explicitement
vérifiée avant l'appel à `assertValidDateRange`, dans les deux validateurs.

## Décisions d'ingénieur

1. **Pas de réutilisation de l'`Operator` partagé** — valeurs incompatibles,
   confirmé par lecture directe du source (cf. Découverte ci-dessus).
2. **`startDate`/`endDate` modélisées en chaînes ISO (`YYYY-MM-DD`) dans le
   store de formulaire**, converties en `Date` uniquement au submit — évite par
   construction de reproduire le bug de binding `Operator | null` déjà trouvé et
   corrigé sur `mobile-network` (`ngc --strictTemplates` rejette `string | null`
   sur un `<input>` non nullable).
3. **JSON simple (`buildHttpPayload`), pas de `multipart/form-data`** — le
   source construit un `FormData` pour `create`/`update` via `formDataBuilder`
   alors qu'aucun champ fichier n'existe sur cette entité (contrairement à
   `optical-fiber-network`). Écart délibéré : le multipart n'apporte rien ici,
   JSON aligné sur le pattern `mobile-network`.
4. **Validateurs fonctionnels (`asserts contract is X`), pas la classe
   `XxxValidator.assert()` du source** — normalisé sur le pattern déjà utilisé
   partout ailleurs dans ce socle.
5. **Réponse paginée normalisée à la forme `PaginatedResponseDto<T>` partagée**
   — le DTO du source (`{data, meta:{current_page,…}}`) diffère de la forme
   Laravel plate utilisée ailleurs ; normalisé pour rester cohérent avec
   `PaginatedMapper` et le mock.
6. **Gap de validation `startDate`/`endDate` corrigé**, pas reproduit (cf.
   Découverte ci-dessus).
7. **Pas de champ `frequency` dans le filtre reconstruit** — fidélité au contrat
   wire, pas au formulaire du source (cf. Découverte ci-dessus).

## Phase 2 — Domaine

- [x] `enums/radio-relay-links-operator.enum.ts` (nouvel enum, pas de
      réutilisation), `enums/radio-relay-links-frequency.enum.ts`.
- [x] `props/radio-relay-links.props.ts` (+ `find-one`, avec `geomUrl`/`geom` en
      lecture seule), réutilisant `Status` (partagé).
- [x] `entities/radio-relay-links{,-find-one,-filter}.entity.ts`.
- [x] `contracts/radio-relay-links-{create,update,delete,enable,disable,     filter,find-one-filter}.contract.ts` +
      `.validate-contract.ts` — filtre sans `frequency` (cf. décision).
- [x] `validators/` — `create`/`update` : présence de `startDate`/`endDate`
      explicitement vérifiée avant `assertValidDateRange` (gap corrigé).
- [x] `value-objects/` (7 fichiers).
- [x] `repositories/radio-relay-links{,-find-one}.repository.ts` — pas de
      concept select externe pour cette entité (contrairement aux 3
      précédentes).
- [x] Barrel ; `tsc` + `eslint` propres.

## Phase 3 — Data

- [x] `endpoints/coverage-areas.endpoints.ts` —
      `RADIO_RELAY_LINKS: 'infrastructures/radio-relay-links'`.
- [x] `dtos/radio-relay-links-*-api.dto.ts` (9 fichiers).
- [x] `mappers/` (9 fichiers) — mêmes bases (`PaginatedMapper`,
      `SimpleResponseMapper`) que les entités précédentes.
- [x] `sources/radio-relay-links{,-find-one}.api.ts` — `create`/`update` en JSON
      (`buildHttpPayload`), pas de `FormData` (cf. décision).
- [x] `repositories/*.repository.impl.ts` (2 fichiers).
- [x] Barrel ; `tsc` + `eslint` propres.

## Phase 4 — Application

- [x] `use-cases/radio-relay-links{,-find-one}.use-case.ts`.
- [x] `facades/radio-relay-links.facade.ts` (`CollectionResourceFacade`),
      `radio-relay-links-find-one.facade.ts` (`ResourceFacade`).
- [x] Barrel ; `tsc` + `eslint` propres.

## Phase 5 — UI

- [x] `constants/radio-relay-links-{paths,filter-keys,table}.constant.ts` — pas
      de clé `frequency` dans le filtre (cf. décision).
- [x] `adapters/radio-relay-links-vm-props.interface.ts` + `.presenter.ts` —
      réutilise `STATUS_LABEL`/`statusStyleOf` de `site-group` ; `startDate`/
      `endDate` formatées `YYYY-MM-DD` pour l'affichage tableau.
- [x] `stores/radio-relay-links-filter.store.ts`,
      `radio-relay-links-form.store.ts` — `startDate`/`endDate` en chaînes ISO
      dans le modèle (cf. décision), converties en `Date` au submit du
      composant.
- [x] `features/radio-relay-links-list.component.ts` (filtres `search`/
      `operator`/dates), `radio-relay-links-form.component.ts`
      (`<input     type="date">` natif pour les dates, `<select>` pour
      opérateur/fréquence).
- [x] `radio-relay-links.routes.ts` — liste + form, pas de route historique.
- [x] Barrel ; `tsc` + `eslint` propres.

## Phase 6 — Câblage app + i18n

- [x] `coverage-areas.providers.ts` étendu : `RadioRelayLinksRepository`,
      `RadioRelayLinksFindOneRepository` → leurs impls.
- [x] `app.routes.ts` : route `coverage-areas/radio-relay-links` →
      `RADIO_RELAY_LINKS_ROUTES`.
- [x] `fr.translation.ts` : namespace `COVERAGE_AREAS.RADIO_RELAY_LINKS` ajouté.
- [x] `ngc --strictTemplates` (tsconfig app) + `eslint` sur les fichiers touchés
      : propres, aucun problème de binding (leçon `mobile-network` appliquée dès
      la conception du store, cf. décision).

## Phase 7 — Mock backend (radio-relay-links)

- [x] Seed `radioRelayLinks` (3 entrées, `geom_url` simulé).
- [x] Route `infrastructures/radio-relay-links` — liste paginée + find-one sur
      la même base (même particularité que `mobile-network`/
      `optical-fiber-network`). CRUD complet (JSON simple, pas de multipart).
- [x] Vérifié via curl (port 3399) : liste, find-one, create, enable, delete —
      tous corrects.

## Phase 8 — Validation & livraison

- [x] `tsc --noEmit` sur les 4 libs `coverage-areas` — propres.
- [x] `ngc --strictTemplates` sur `apps/backoffice-angular` (tsconfig app
      complet) — propre, exit 0.
- [x] `eslint` sur les 4 libs `coverage-areas`, `tools/mock-server.mjs` et les 3
      fichiers app modifiés — propre.
- [x] Smoke test backend (readAll, findOne, create, enable, delete) — vert.
- [x] Commits conventionnels par couche (6 commits, Phase 2 à 7).
- [x] Mettre ce document à jour (statut fait + écarts réels).
- [x] `npx nx lint` + `npx nx serve` (poste macOS) — **confirmés par
      l'utilisateur** (2026-07-27) : lint propre, build/serve OK. Les erreurs
      `ECONNREFUSED` observées dans le proxy Vite au démarrage étaient dues au
      mock backend non lancé, pas à un problème de code — non-bloquant.

## Bilan réel `radio-relay-links` (2026-07-27)

Écarts entre le plan initial et l'exécution réelle :

1. **`RadioRelayLinksOperator` non réutilisé** — enum dédié créé car les valeurs
   diffèrent de l'`Operator` partagé (confirmé par lecture du source avant
   décision).
2. **Gap de validation `startDate`/`endDate` corrigé** dans les validateurs
   `create`/`update` — le source ne vérifiait que l'ordre des dates, pas leur
   présence.
3. **Filtre reconstruit sans champ `frequency`** — fidélité au contrat wire
   réel, pas au formulaire du source qui en expose un.
4. **JSON simple au lieu du `multipart/form-data` du source** — aucun champ
   fichier sur cette entité, le multipart du source n'apportait rien.
5. **Dates modélisées en chaînes ISO dans le store de formulaire** — décision
   préventive pour éviter de reproduire le bug de binding déjà rencontré et
   corrigé sur `mobile-network`.
6. `nx lint`/`nx serve` confirmés par l'utilisateur sur son poste macOS
   (2026-07-27) — dernière étape après la validation statique complète en
   sandbox.

**Suite** : le domaine `coverage-areas` est **terminé et confirmé** — 4 entités
CRUD (`site-group`, `mobile-network`, `optical-fiber-network`,
`radio-relay-links`) + 2 concepts select (`tower-type`, `fiber-constructor`),
toutes validées statiquement en sandbox **et** confirmées par `nx lint`/
`nx serve` réels sur le poste macOS de l'utilisateur.

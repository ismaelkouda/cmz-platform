# Module `coverage-areas` — plan de reconstruction

- **Créé :** 2026-07-27
- **Statut :** livré (pilote `site-group`, 2026-07-27) — Phases 1 à 8 complètes,
  `nx lint`/`nx serve` confirmés conformes par l'utilisateur (poste macOS). Cf.
  « Bilan réel » en fin de document.
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

- **Statut :** en cours (Phase 3/8 terminée).
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

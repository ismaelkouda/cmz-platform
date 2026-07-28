# Module `monitoring` — plan de reconstruction

- **Créé :** 2026-07-28
- **Statut :** livré, **validation technique complète**. 4 sous-pages
  (`processing-status`/`services-states`/`resources-states`/`jobs`), toutes
  des embeds Grafana en lecture seule. Phases 1 à 8 complètes. `tsc
  --noEmit` + `eslint --max-warnings=0` clean sur les 4 libs `monitoring`,
  sur `@cmz/shared-ui` (nouveau composant) et sur l'app ; `ngc
  --strictTemplates` clean (0 erreur), confirmé significatif : les 4 pages
  sont compilées dans `dist/out-tsc` (routées sous `/monitoring`, atteintes
  par le compilateur). Mock backend testé via `curl`.
- **Gabarit de référence :** `module-dashboard.md` pour l'archétype général
  (`ResourceFacade`, objet unique). Particularité de ce module : les 4
  « entités » sont strictement identiques — cf. décision de consolidation
  ci-dessous, la vraie nouveauté de ce module par rapport aux précédents.

## Forme métier

Une seule entité, réutilisée par les 4 pages :

```ts
class GrafanaDashboardEntity {
    constructor(public readonly grafanaLink: string) {}
}
```

### Consolidation actée : 4 verticals identiques → 1

Le source déclarait, pour `node`/`services`/`resources`/`jobs`, 4 entités
(`NodeEntity`/`ServicesEntity`/`ResourcesEntity`/`JobsEntity`), 4 DTOs, 4
mappers, 4 interfaces de repository, 4 implémentations, 4 sources HTTP, 4
use-cases — **strictement identiques dans leur forme** (un seul champ
`grafanaLink`/`string`, une seule méthode `get*`). Deux faits confirment
qu'il ne s'agit pas de 4 concepts métier distincts mais d'un seul concept
paramétré :

1. `MONITORING_ENDPOINTS` du source vaut `{ NODE: 'variables', SERVICES:
   'variables', VARIABLES: 'variables', JOBS: 'variables' }` — les 4 « clés
   » distinctes désignent la même ressource. Confirmé aussi dans
   `reporting.endpoints.ts` et `interactive-map.endpoints.ts` (non encore
   reconstruits), qui référencent le même `'variables'` — cette ressource
   de configuration est donc partagée par plusieurs modules futurs.
2. Les 4 DTOs du source ne déclarent chacun qu'**un seul champ** de la
   réponse (`useOfServersResourcesLink` pour node/services,
   `useOfResourcesLink` pour resources, `impactJobs` pour jobs) — typage
   structurel sur un sous-ensemble d'une seule et même réponse wire, jamais
   4 réponses différentes.

Domaine/data consolidés en conséquence : 1 entité (`GrafanaDashboardEntity`),
1 DTO wire complet (`MonitoringVariablesItemDto`, les 3 champs), 1
repository (`MonitoringRepository.execute(section, options)`), 1 API
(`MonitoringApi.getVariables()`), 1 mapper paramétré par section
(`GrafanaDashboardMapper`, construit avec la `MonitoringSection` et pluckant
le bon champ via `MONITORING_SECTION_FIELD`).

**Application** volontairement non consolidée : 4 façades distinctes
(`NodeFacade`/`ServicesFacade`/`ResourcesFacade`/`JobsFacade`), chacune un
singleton `providedIn: 'root'` distinct hardcodant sa section dans
`stream()`. Une façade générique unique aurait partagé un seul état
(`_params`/`resource`) entre les 4 pages — sans risque fonctionnel réel vu
le routage exclusif, mais une façade par page reste le choix le plus sûr et
le plus proche du découpage du source à ce niveau.

### `MonitoringSection` : pas de validation

Contrairement à `Period` (dashboard), la section n'est jamais une saisie
utilisateur : elle est fixée par la façade concrète injectée dans chaque
page. Pas de `DomainError`/validateur/value-object ici — juste un enum +
guard n'aurait ajouté aucune valeur.

## Décisions actées

- **Namespace i18n `JOBS` aligné sur `MONITORING`, pas `REPORTING`** — le
  source utilisait `REPORTING.JOBS.*` pour cette page alors qu'elle vit
  structurellement dans l'arbre de routes `monitoring` (même
  `monitoring.routes.ts`, mêmes providers `monitoring.providers.ts`) : une
  incohérence de nommage du source, pas une frontière de module réelle.
  Alignée sur `MONITORING.JOBS.*`.
- **`GrafanaEmbedComponent` construit dans `@cmz/shared-ui`, pas dans
  `monitoring/ui`** — le source plaçait déjà `DashboardViewerComponent` dans
  `shared/components/`, et `reporting`/`interactive-map` (non reconstruits)
  y font potentiellement référence pour le même type d'embed. Reconstruit
  en composant design-system pur (`--cmz-*`, `styles` inline, comme
  [[PaginationComponent]]), pas de dépendance à Tailwind ni à une lib UI
  tierce.
- **Pas de police d'icônes (`pi pi-*`)** — `primeicons` n'est pas une
  dépendance de ce monorepo (confirmé : absent de `package.json` et de
  `node_modules`). Les classes `pi pi-*` du source (et donc du composant
  `dashboard` construit précédemment) ne rendent en réalité **aucune
  icône** dans ce monorepo — un gap pré-existant, non corrigé ici (hors
  périmètre de ce module), mais qu'il fallait éviter de reproduire.
  `GrafanaEmbedComponent` utilise des icônes SVG inline à la place
  (refresh, plein écran, erreur, spinner).
- **`console.log` de debug non reproduit** — le `JobsMapper` du source
  loggait `'dto impactJobs: '` à chaque mapping, et
  `DashboardViewerComponent.ngOnInit` loggait `this.grafanaLink()` — deux
  résidus de debug, absents de la reconstruction.
- **Pas de `BreadcrumbComponent`/`PageTitleComponent`** — aucun équivalent
  dans ce monorepo ; la donnée `breadcrumb` reste posée sur les routes
  (`data.breadcrumb`, une chaîne — même convention que
  `administrative-boundary` dans `app.routes.ts`) mais n'est rendue nulle
  part, precedent déjà établi (cf. doc `dashboard`).
- **Redirection par défaut de `/monitoring` vers `processing-status`** —
  même comportement que le source (`'**' → NODE_ROUTE`), plus un `path:
  ''` explicite en tête (le source ne redirigeait la racine que via le
  wildcard `'**'`, ambigu — rendu explicite ici).

## Phases

1. **Lecture source** — 4 sous-arbres quasi identiques confirmés
   (`node`/`services`/`resources`/`jobs`), tous des embeds Grafana via
   `DashboardViewerComponent` (`shared/components/`), tous sur la ressource
   `variables`. ✅
2. **Scaffolding Nx** — 4 libs, tags `scope:monitoring` (isolation
   classique, comme `dashboard`). ✅
3. **Domaine** — `MonitoringSection` (enum, pas de validation),
   `GrafanaDashboardEntity` (1 seule classe pour les 4 sections),
   `MonitoringRepository` (1 seule méthode paramétrée). ✅
4. **Data** — `MonitoringVariablesItemDto` (les 3 champs wire réels),
   `GrafanaDashboardMapper` (paramétré par section),
   `MonitoringApi.getVariables()` (`SETTINGS_API_URL`, 1er module dont la
   ressource est explicitement documentée comme partagée avec des modules
   futurs), `MonitoringRepositoryImpl`. ✅
5. **Application** — `MonitoringUseCase` (paramétré par section, `defer`),
   4 façades dédiées (`NodeFacade`/`ServicesFacade`/`ResourcesFacade`/
   `JobsFacade`), chacune un `ResourceFacade<GrafanaDashboardEntity,
   FetchOptions>` hardcodant sa section. ✅
6. **UI** — `GrafanaEmbedComponent` construit dans `@cmz/shared-ui`
   (icônes SVG inline, pas de police d'icônes, `--cmz-*`), 4 pages minces
   (`NodePageComponent`/etc.) l'utilisant chacune avec sa façade,
   `MONITORING_ROUTES` (redirection par défaut + wildcard vers
   `processing-status`). ✅
7. **Câblage app + i18n + mock backend** — route `monitoring`,
   `provideMonitoring()`, namespace `MONITORING.*` (+ `COMMON.RETRY`/
   `COMMON.ENTER_FULLSCREEN`/`COMMON.EXIT_FULLSCREEN`, absents jusqu'ici),
   nouveau marqueur `variables` dans `rel()` du mock-server (terminal, pas
   de `/` — la ressource n'a pas de sous-chemin), route `GET variables`
   retournant les 3 champs wire simultanément. Testé via `curl`. ✅
8. **Validation & livraison** — `tsc --noEmit` + `eslint
   --max-warnings=0` clean sur les 4 libs `monitoring`, sur le nouveau
   composant `shared-ui`, sur l'app et sur `tools/mock-server.mjs`. `ngc
   --strictTemplates` clean (0 erreur) après correction d'un vrai rejet du
   compilateur (`grafanaLink() | safeUrl` sur un type `string | undefined`
   sans narrowing — corrigé via `@else if (grafanaLink(); as link)`). ✅

## Bilan réel

Module dont la découverte principale n'est pas un bug de mapping isolé
(comme `dashboard`) mais une duplication structurelle à l'échelle du
module entier : 4 « verticals » du source, présentées comme 4 concepts
métier séparés par l'arborescence de dossiers, qui s'avèrent être un seul
concept (un embed Grafana lu depuis une ressource de configuration
partagée) recopié 4 fois. La correction n'est pas cosmétique : elle réduit
domaine/data de 4 entités/DTOs/mappers/repositories/use-cases à 1 de
chacun, tout en conservant volontairement 4 façades distinctes côté
application — un compromis assumé plutôt qu'une consolidation totale
aveugle. Deuxième découverte notable : la ressource `variables` est
référencée par 2 autres modules non reconstruits (`reporting`,
`interactive-map`) — signalé pour that le composant `GrafanaEmbedComponent`
et le concept `variables` pourraient mériter une vraie consolidation
inter-modules quand ces derniers seront construits, décision explicitement
reportée plutôt que anticipée. Enfin, ce module a révélé un gap
pré-existant (icônes `pi pi-*` inertes faute de `primeicons` installé,
affectant aussi le module `dashboard`) — corrigé localement (SVG inline)
sans être rétrofité sur `dashboard`, hors périmètre de cette session.

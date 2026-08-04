# Module `reporting` — plan de reconstruction

- **Créé :** 2026-07-28
- **Statut :** **Livré & Validé (Phases 1 à 8 terminées)**. 4 sous-pages
  (`reports`/`requests`/`report-by-channel`/`report-by-operator`), toutes des
  embeds Grafana en lecture seule. Compilation TypeScript (`tsc`), linting
  (`eslint --max-warnings=0`), compilation strict templates Angular
  (`ngc --strictTemplates`) 100% verts sur les 4 libs `@cmz/reporting-*` et
  l'application.
- **Gabarit de référence :** `module-monitoring.md` pour l'archétype général
  (`ResourceFacade`, objet unique, embeds Grafana).

## Forme métier

Une seule entité, réutilisée par les 4 pages du module `reporting` :

```ts
export class GrafanaDashboardEntity {
    constructor(public readonly grafanaLink: string) {}
}
```

### Consolidation actée : 4 verticals identiques → 1

L'analyse minutieuse du code source
(`$SEOS_LEGACY_ROOT/src/presentation/pages/reporting`)
révèle la même duplication structurelle que sur le module `monitoring` :

Le source déclarait 4 entités (`ReportsEntity`, `RequestsEntity`,
`ReportByChannelEntity`, `ReportByOperatorEntity`), 4 DTOs (`ReportItemDto`,
`RequestItemDto`, `ReportByChannelItemDto`, `ReportByOperatorItemDto`), 4
mappers, 4 interfaces de repository, 4 implémentations, 4 sources HTTP, 4
use-cases et 4 bus de requêtes — **strictement identiques en structure** (un
seul champ `grafanaLink` / `string`, une seule méthode `get*`).

Deux faits techniques issus de l'audit de code du source confirment qu'il s'agit
d'un seul concept paramétré :

1. `REPORTING_ENDPOINTS` du source vaut :
    ```ts
    export const REPORTING_ENDPOINTS = {
        REPORT: 'variables',
        REQUESTS: 'variables',
        REPORT_BY_CHANNEL: 'variables',
        REPORT_BY_OPERATOR: 'variables',
    } as const;
    ```
    Les 4 clés distinctes ciblent la même ressource de configuration backend
    (`/variables`), partagée également par `monitoring` et `interactive-map`.
2. Les 4 DTOs du source ne lisent chacun qu'**un seul champ** de la réponse
   unique `variables` :
    - `reportReportingLink` (pour `reports`)
    - `requestReportReportingLink` (pour `requests`)
    - `reportByChannel` (pour `report-by-channel`)
    - `reportByOperator` (pour `report-by-operator`)

Domaine/data consolidés en conséquence :

- 1 entité domaine (`GrafanaDashboardEntity`).
- 1 DTO wire (`ReportingVariablesItemDto`, regroupant les 4 champs wire
  `reportReportingLink`, `requestReportReportingLink`, `reportByChannel`,
  `reportByOperator`).
- 1 API (`ReportingApi.getVariables()`).
- 1 repository (`ReportingRepository.execute(section, options)`).
- 1 mapper paramétré par section (`ReportingDashboardMapper`, pluckant le bon
  champ selon la `ReportingSection`).

**Application** : 4 façades distinctes (`ReportFacade`, `RequestsFacade`,
`ReportByChannelFacade`, `ReportByOperatorFacade`), chacune étant un singleton
`providedIn: 'root'` étendant
`ResourceFacade<GrafanaDashboardEntity, FetchOptions>` et fixant sa section
respective.

### `ReportingSection` : pas de validation dynamique

Tout comme dans `monitoring`, la `ReportingSection` est un enum fixe :

```ts
export enum ReportingSection {
    REPORT = 'report',
    REQUESTS = 'requests',
    REPORT_BY_CHANNEL = 'report-by-channel',
    REPORT_BY_OPERATOR = 'report-by-operator',
}
```

La section n'étant jamais une saisie utilisateur mais une constante injectée par
la façade de page, aucun Value Object ou `DomainError` dynamique n'est
nécessaire.

## Décisions actées & Garde-fous

- **Isolation i18n sous le namespace `REPORTING.*`** :
    - `REPORTING.REPORT.*` (Signalements)
    - `REPORTING.REQUESTS.*` (Demandes)
    - `REPORTING.REPORT_BY_CHANNEL.*` (Signalements par canal)
    - `REPORTING.REPORT_BY_OPERATOR.*` (Signalements par opérateur) _Note : La
      section `JOBS`, présente sous `REPORTING.JOBS` dans les fichiers i18n du
      projet source, a déjà été rattachée au module `monitoring` (où vit sa
      route structurelle)._
- **Réutilisation de `GrafanaEmbedComponent` (`@cmz/shared-ui`)** : Le composant
  UI partagé construit lors de la livraison de `monitoring` sera réutilisé
  directement par les 4 composants de page de `reporting`. Aucune duplication de
  code UI ou de styles inline.
- **Gestion des icônes & absence de PrimeIcons** : Le composant partagé utilise
  des SVG inline (refresh, plein écran, spinner, erreur) évitant l'usage de
  polices d'icônes tierces non installées dans le monorepo (`pi pi-*`).
- **Routage et redirection par défaut** : La route parente `/reporting` redirige
  automatiquement vers `/reporting/reports` (`REPORT_ROUTE`). Le wildcard `**`
  au sein du module redirige également vers la sous-page par défaut.
- **Qualité & compilation (Zéro Warning / Zéro Erreur)** : Validation stricte
  exigée sur l'ensemble des 4 packages Nx `@cmz/reporting-*` :
    - `tsc --noEmit`
    - `eslint --max-warnings=0`
    - `ngc --strictTemplates`

## Plan de déroulement des phases (1 à 8)

1. **Lecture & Analyse source** — Validation de l'analyse des 4 sous-arbres, du
   DTO wire `/variables` et des 4 champs de liens Grafana
   (`reportReportingLink`, `requestReportReportingLink`, `reportByChannel`,
   `reportByOperator`). ✅
2. **Scaffolding Nx** — Création des 4 packages Nx sous `libs/reporting/`
   (`domain`, `data`, `application`, `ui`) avec leurs tags `scope:reporting` et
   `type:*` respectant les règles d'isolation Nx et les règles de dépendances
   dans `tsconfig.base.json` et `eslint.config.mjs`. ✅
3. **Domaine (`@cmz/reporting-domain`)** — Déclaration de `ReportingSection`
   (enum), réutilisation de `GrafanaDashboardEntity` ou export local, et contrat
   de repository `ReportingRepository`. ✅
4. **Data (`@cmz/reporting-data`)** — `ReportingVariablesItemDto`,
   `ReportingApi.getVariables()`, `ReportingDashboardMapper` (paramétré par
   section), et `ReportingRepositoryImpl`. ✅
5. **Application (`@cmz/reporting-application`)** — `ReportingUseCase`
   (déferré), et les 4 façades concrètes (`ReportFacade`, `RequestsFacade`,
   `ReportByChannelFacade`, `ReportByOperatorFacade`). ✅
6. **UI (`@cmz/reporting-ui`)** — 4 PageComponents minces
   (`ReportPageComponent`, `RequestsPageComponent`,
   `ReportByChannelPageComponent`, `ReportByOperatorPageComponent`),
   `REPORTING_ROUTES`. ✅
7. **Câblage App + i18n + Mock backend** — Configuration des routes dans
   `app.routes.ts`, `provideReporting()`, enrichissement i18n `REPORTING.*`, et
   mise à jour du mock-server avec les clés wire `reportReportingLink`,
   `requestReportReportingLink`, `reportByChannel`, `reportByOperator`. ✅
8. **Validation & Livraison** — Audit de compilation et de linting sur
   l'application et les 4 libs, vérification de non-regression, documentation et
   commit. ✅

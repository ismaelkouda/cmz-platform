# Module `interactive-map` — Plan de reconstruction Big Tech (META / Google Rigor)

- **Créé :** 2026-07-28
- **Dernière mise à jour :** 2026-07-31
- **Statut :** **⚠️ IR partielle avancée** — visualization ✅ ; **SIG v1** ✅
  (OpenLayers lazy + signalements `GET report/all`) ; couverture réseau /
  clusters / filtres legacy **P2**. Corpus 28 paires. Voir
  [`audits/interactive-map-meta-verification.md`](audits/interactive-map-meta-verification.md).
- **Objectif :** Aligner le module `interactive-map` sur le pattern SEOS
  `read-only-view` du monorepo (2 volets `/interactive-map/interactive` et
  `/interactive-map/visualization`), garantir le câblage end-to-end (domain →
  data → application → UI → providers → routes → i18n → mock). SIG v1 : carte
  OSM + marqueurs signalements ; parité legacy complète (filtres, tuiles,
  heatmap) en tranches ultérieures.

---

## 🏛️ 1. Analyse & Archétype du Module

Le module `interactive-map` du projet source est composé de **deux vues
complémentaires** :

1. **Vue Carte Interactive (`interactive`)** : Carte SIG dynamique alimentée par
   OpenLayers (`ol`), permettant de visualiser en temps réel les signalements
   géolocalisés (`zob`, `cpo`, `cps`, `abi`), les zones de couverture réseau
   (fibre optique, faisceau hertzien) et les clusters d'équipements par
   région/département/commune.
2. **Vue Tableau de bord interactif (`visualization`)** : Embed Grafana de la
   carte réutilisant l'archétype `GrafanaEmbedComponent` (`@cmz/shared-ui`)
   alimenté par la clé `mapLink` de l'endpoint backend `/variables`.

---

## 📦 2. Scaffolding Nx (`libs/interactive-map/`)

Le module sera découpé en **4 packages Nx strictement isolés** :

```
libs/interactive-map/
├── domain/       # @cmz/interactive-map-domain (Entities, Value Objects, Repository Ports)
├── data/         # @cmz/interactive-map-data (Endpoints, DTOs, Mappers, APIs, Repositories Impl)
├── application/  # @cmz/interactive-map-application (Use-Cases, Façades & Signal Stores)
└── ui/           # @cmz/interactive-map-ui (PageComponents, GIS Map Adapters, Routes)
```

---

## 🔑 3. Contrat d'Endpoints (`interactive-map.endpoints.ts`)

Conformément à la rigueur Big Tech et à la norme du monorepo, l'ensemble des
routes HTTP sera isolé dans le contrat canonique :

```ts
// libs/interactive-map/data/src/lib/endpoints/interactive-map.endpoints.ts
export const INTERACTIVE_MAP_ENDPOINTS = {
    MAP_CLUSTERS: 'map/clusters',
    REPORTS: 'all',
    COVERAGE_AREAS_GEOJSON: 'coverage-areas/geojson',
    COVERAGE_AREAS_TILES: 'coverage-areas/tiles/{z}/{x}/{y}',
    MAP: 'variables',
} as const;
```

---

## 🌍 4. Clés i18n (`fr.translation.ts`)

Isolation complète sous le namespace `INTERACTIVE_MAP` dans
`apps/backoffice-angular/src/app/i18n/fr.translation.ts` :

```ts
    INTERACTIVE_MAP: {
        BREADCRUMB: {
            LABEL: 'Vue Interactive',
            ROUTE: 'map',
            ICON: 'pi pi-map',
        },
        LABEL: 'Vue Interactive',
        MAP: {
            BREADCRUMB: {
                LABEL: 'Carte interactive',
                ROUTE: 'interactive',
            },
            TITLE: 'Carte interactive',
            LABEL: 'Carte interactive',
            LOADING_DESCRIPTION: 'Suivi des performances en cours…',
            ERROR_DESCRIPTION:
                'Une erreur est survenue lors du chargement du tableau de bord - Carte interactive.',
        },
        DASHBOARD: {
            BREADCRUMB: {
                LABEL: 'Tableau de bord interactif',
                ROUTE: 'visualization',
            },
            TITLE: 'Tableau de bord interactif',
            LABEL: 'Tableau de bord interactif',
            LOADING_DESCRIPTION: 'Suivi des performances en cours…',
            ERROR_DESCRIPTION:
                'Une erreur est survenue lors du chargement du tableau de bord - Carte interactive.',
        },
    },
```

---

## 📅 5. Plan d'Exécution en 8 Phases

1. **Phase 1 : Analyse & Spécification** — Audit des 2 vues (`interactive` et
   `visualization`), définition des DTOs, Mappers et Façades. ✅
2. **Phase 2 : Scaffolding Nx & Configuration** — Création des 4 packages Nx
   `@cmz/interactive-map-*`, mise à jour de `tsconfig.base.json` et
   `eslint.config.mjs` avec le tag `scope:interactive-map`. ✅
3. **Phase 3 : Domaine (`@cmz/interactive-map-domain`)** — Déclaration de
   `MapEntity`, `InteractiveMapReportEntity`, `Bounds`, `ReportFilters` et
   `InteractiveMapRepository`. ✅
4. **Phase 4 : Data (`@cmz/interactive-map-data`)** —
   `interactive-map.endpoints.ts`, `MapResponseDto`, `MapMapper`, `MapApi`,
   `InteractiveMapReportsApi`, `InteractiveMapRepositoryImpl`. ✅
5. **Phase 5 : Application (`@cmz/interactive-map-application`)** —
   `MapUseCase`, `MapFacade`, `InteractiveMapStore` (Gestion d'état Signal du
   viewport et des filtres). ✅
6. **Phase 6 : UI (`@cmz/interactive-map-ui`)** — `MapPageComponent` (embed
   Grafana), `InteractiveMapComponent` (vue SIG), et `INTERACTIVE_MAP_ROUTES`.
   ✅
7. **Phase 7 : Câblage App, i18n & Mock Server** — Composition Root dans
   `apps/backoffice-angular/src/app/providers/interactive-map.providers.ts`,
   `app.routes.ts`, dictionnaire i18n `fr.translation.ts`, et mock endpoints
   dans `tools/mock-server.mjs`. ✅
8. **Phase 8 : Oracle de Vérification Stricte & Livraison** — Verification
   `tsc --noEmit`, `eslint --max-warnings=0`, `ngc --strictTemplates`, Smoke
   test `curl` & Commit Git. ✅

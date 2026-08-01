# Archétype `read-only-view` — vues analytiques query-only

- **Créé :** 2026-08-01
- **Pattern JSON :**
  [`read-only-view.pattern.json`](../patterns/read-only-view.pattern.json) v0
- **Modules validés :** `monitoring`, `reporting`, `dashboard` ✅
- **Module partiel :** `interactive-map` ⚠️ (Grafana OK ; SIG hors périmètre IR)
- **Référence :** [`module-monitoring.md`](../module-monitoring.md)

---

## 1. Périmètre

Famille **lecture seule** : pages sans mutation métier, sans liste paginée CRUD,
sans workflow take/treat.

| Inclus                                  | Exclu                                   |
| --------------------------------------- | --------------------------------------- |
| Embed Grafana (`GrafanaEmbedComponent`) | CRUD entité (`crud-entity`)             |
| `ResourceFacade` + `rxResource`         | Workflow file (`workflow-action`)       |
| `GET …/variables` (settings)            | Commandes (`action-request`)            |
| 1 entité lien par vue                   | `filter-store`, `vm-props`, `cmz-table` |

---

## 2. Sous-graphes

### `grafana_multi_section` — monitoring, reporting

**Legacy :** N verticals dupliqués (entité + DTO + mapper + API + repo +
use-case + facade + page par section).

**Nx :** consolidation domaine/data :

```
domain/   GrafanaDashboardEntity + {Module}Section + {Module}Repository.execute(section)
data/     {Module}VariablesItemDto + GrafanaDashboardMapper + {Module}Api.getVariables()
application/  1 {Module}UseCase + N façades (1 par page)
ui/       N *PageComponent → cmz-grafana-embed
```

**Règle de pluck :** `{MODULE}_SECTION_FIELD` mappe chaque section vers un champ
du DTO wire unique.

Exemple monitoring :

| Section            | Champ wire                  |
| ------------------ | --------------------------- |
| `NODE`, `SERVICES` | `useOfServersResourcesLink` |
| `RESOURCES`        | `useOfResourcesLink`        |
| `JOBS`             | `impactJobs`                |

**Pourquoi N façades et pas 1 générique ?** Chaque page = singleton
`providedIn: 'root'` distinct — évite le partage d'état `rxResource` entre
routes (navigations croisées). Domaine/data restent consolidés.

### `grafana_single_view` — interactive-map `/visualization`

Même pipeline sans enum section : `MapEntity` + `getMap()` + `MapFacade` +
`MapPageComponent`.

### `gis_map_view` — interactive-map `/interactive` ⚠️

Legacy : OpenLayers (`ol`), clusters, tuiles couverture. **Nx v0 :** coquille
statique (`InteractiveMapPageComponent`) — **pas de rebuild SIG** ; endpoints
SIG déclarés dans `interactive-map.endpoints.ts` non câblés.

### `aggregated_stats_view` — dashboard

Objet agrégé unique (`DashboardProps`) — **pas d'embed Grafana**. Pipeline :
`DashboardFilterVo` + `DashboardRepository.execute()` + `DashboardFacade`
(`ResourceFacade`) + cartes statistiques.

**Exceptions autorisées** au `forbidden_in_nx` read-only-view : `filter-store`,
`vm-presenter` (sélecteur période + projection cartes).

---

## 3. Contrats par couche

### Domain

| Rôle       | Règle                                                                     |
| ---------- | ------------------------------------------------------------------------- |
| Entité     | 1 classe lien (`grafanaLink: string`) — pas de props métier riches        |
| Section    | Enum ou const object — **jamais saisie utilisateur**, fixée par la façade |
| Repository | 1 port paramétré `execute(section, options?)` ou `getMap(options?)`       |
| Validation | **Aucune** sur section (contrast avec `Period` dashboard)                 |

### Data

| Rôle     | Règle                                                             |
| -------- | ----------------------------------------------------------------- |
| Endpoint | `{MODULE}_ENDPOINTS.VARIABLES = 'variables'` → `SETTINGS_API_URL` |
| DTO      | 1 item DTO regroupant **tous** les champs wire du module          |
| Mapper   | Constructeur prend `section` ; pluck via `{MODULE}_SECTION_FIELD` |
| API      | 1 méthode `getVariables()` — pas N APIs                           |

### Application

| Rôle         | Règle                                                                        |
| ------------ | ---------------------------------------------------------------------------- |
| Use-case     | 1 classe, `execute(section?, options?)` wrapped in `defer()`                 |
| Façade       | `extends ResourceFacade<Entity, FetchOptions>` ; `stream()` hardcode section |
| Méthode load | `load(options?)` → `setParams(options ?? {})`                                |

### UI

| Rôle        | Règle                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| Page        | Standalone, imports `[GrafanaEmbedComponent]`                                                        |
| Template    | `[grafanaLink]="facade.value()?.grafanaLink"`, `[loading]`, `[error]`, `(refresh)="facade.reload()"` |
| Constructor | `this.facade.load()` — déclenchement initial                                                         |
| Routes      | `{ path: '', redirectTo: DEFAULT }`, 1 route par section, `{ path: '**', redirectTo }`               |

---

## 4. Kernel partagé

| Symbole                                       | Package                   |
| --------------------------------------------- | ------------------------- |
| `ResourceFacade`                              | `@cmz/shared-application` |
| `GrafanaEmbedComponent` (`cmz-grafana-embed`) | `@cmz/shared-ui`          |
| `FetchOptions`                                | `@cmz/shared-domain`      |

Legacy `DashboardViewerComponent` → `GrafanaEmbedComponent` (cross-module).

---

## 5. Composition root

```typescript
// apps/backoffice-angular/src/app/providers/{module}.providers.ts
export function provide{ModulePascal}(): Provider[] {
  return [{ provide: {Module}Repository, useClass: {Module}RepositoryImpl }];
}
```

Routes lazy : `path: '{module}'` →
`import('@cmz/{module}-ui').then(m => m.{MODULE}_ROUTES)`.

---

## 6. Réplication

| Module            | Préfixe façade                      | Sections                 |
| ----------------- | ----------------------------------- | ------------------------ |
| `monitoring`      | `NodeFacade`, `ServicesFacade`, …   | 4                        |
| `reporting`       | `ReportFacade`, `RequestsFacade`, … | 4                        |
| `interactive-map` | `MapFacade`                         | 1 Grafana (+ 1 SIG stub) |

Même pattern, modules différents — **consolidation domain/data obligatoire** si
N verticals legacy identiques.

---

## 7. Oracle de sortie (module read-only-view)

```bash
bunx nx run-many -t build --projects=tag:scope:monitoring
bunx eslint libs/monitoring --max-warnings=0
bunx nx build backoffice-angular   # Tier 2 — pages compilées strictTemplates
```

Corpus :

```bash
node tools/corpus/emit-pairs.mjs monitoring --verify    # ✅ 51 paires
node tools/corpus/emit-pairs.mjs reporting --verify     # ✅ 51 paires
node tools/corpus/emit-pairs.mjs dashboard --verify       # ✅ 25 paires (aggregated_stats_view)
node tools/corpus/emit-pairs.mjs interactive-map --verify  # ⚠️ 28 paires (partiel)
```

---

## 8. Écarts volontaires (P2)

| Écart                            | Module            | Statut                                |
| -------------------------------- | ----------------- | ------------------------------------- |
| SIG OpenLayers                   | `interactive-map` | Hors périmètre IR — coquille statique |
| Endpoints clusters/tiles/geojson | `interactive-map` | Déclarés, non câblés                  |
| `InteractiveMapReportEntity`     | `interactive-map` | Domaine déclaré, non wired            |

---

## Références

- [`module-monitoring.md`](../module-monitoring.md) — consolidation 4→1
- [`module-reporting.md`](../module-reporting.md) — réplication
- [`module-interactive-map.md`](../module-interactive-map.md) — statut partiel
- [`module-dashboard.md`](../module-dashboard.md) — antécédent `ResourceFacade`
- [`patterns/README.md`](../patterns/README.md)

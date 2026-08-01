# Vérification Meta — module `interactive-map` (clôture IR partielle)

- **Date :** 2026-08-01
- **Pattern :** `read-only-view` — sous-graphes `grafana_single_view` +
  `gis_map_view` ⚠️
- **Référence :** [`module-interactive-map.md`](../module-interactive-map.md)
- **Périmètre :** `libs/interactive-map/*` — volet **visualization** ✅ ; volet
  **interactive** (SIG) hors IR

---

## Scorecard final

| #   | Critère Meta                                            | Résultat                                    |
| --- | ------------------------------------------------------- | ------------------------------------------- |
| 1   | DTO wire `mapLink` / variables                          | ✅                                          |
| 2   | Pipeline MapEntity → repository → mapper → facade       | ✅ (visualization)                          |
| 3   | Application `defer()` + `MapFacade` / `ResourceFacade`  | ✅                                          |
| 4   | Page Grafana `MapPageComponent` + embed                 | ✅                                          |
| 5   | Isolation cross-module                                  | ✅                                          |
| 6   | Routes `/visualization` + `/interactive`                | ✅                                          |
| 7   | Endpoints SIG déclarés (`clusters`, `tiles`, `geojson`) | ⚠️ déclarés, non câblés                     |
| 8   | Carte SIG OpenLayers legacy                             | ⚠️ coquille statique Nx — hors périmètre IR |
| 9   | i18n `INTERACTIVE_MAP.*`                                | ✅                                          |
| 10  | `provideInteractiveMap()` + mock variables              | ✅                                          |
| 11  | Build oracle 4 libs                                     | ✅                                          |
| 12  | Corpus 100 % applicable sur périmètre déclaré           | ✅ 28 paires, 3 chaînes                     |

**Verdict Meta : ⚠️ IR partielle — visualization clôturée ; SIG explicitement
différée**

---

## Oracle exécuté (2026-08-01)

| Tier          | Commande                                                         | Résultat              |
| ------------- | ---------------------------------------------------------------- | --------------------- |
| 1 build       | `bunx nx run-many -t build --projects=tag:scope:interactive-map` | ✅                    |
| 1 lint        | `bunx eslint libs/interactive-map --max-warnings=0`              | ✅                    |
| 1 corpus      | `bun run corpus:interactive-map`                                 | ✅ 3/3 tranche-closed |
| 2 intégration | `bun run check:tier2`                                            | ✅                    |

---

## Corpus

| Métrique                          | Valeur                               |
| --------------------------------- | ------------------------------------ |
| Fichier                           | `corpus/interactive-map.pairs.jsonl` |
| Paires                            | 28                                   |
| `verified`                        | 21                                   |
| `n/a`                             | 7 (CQRS + SIG legacy non porté)      |
| `pending` / `emitted` / `blocked` | 0                                    |

Chaînes : `interactive-map.visualization.view`,
`interactive-map.interactive.view` (stub), `interactive-map.module.shell`.

---

## Écarts volontaires (hors clôture IR)

| Écart                         | Statut                                |
| ----------------------------- | ------------------------------------- |
| Rebuild OpenLayers / clusters | Décision produit — non reconstruit v0 |
| `InteractiveMapReportEntity`  | Domaine déclaré, non wired            |
| Facade / store / adapter SIG  | Legacy mappé `n/a` dans corpus        |

---

## Prochaine clôture IR complète

Nécessite décision produit + rebuild SIG (`gis_map_view`) — hors scope Phase 07
read-only-view v0.

---

## Références

- [`read-only-view.pattern.json`](../patterns/read-only-view.pattern.json) —
  `partial_validation`
- [`archetypes/read-only-view.md`](../archetypes/read-only-view.md)

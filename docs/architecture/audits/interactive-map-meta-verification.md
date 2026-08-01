# Vérification Meta — module `interactive-map` (clôture IR)

- **Date :** 2026-08-01 (révision clôture famille read-only-view)
- **Pattern :** `read-only-view` — `grafana_single_view` + `gis_map_view` v1
- **Référence :** [`module-interactive-map.md`](../module-interactive-map.md)
- **Périmètre :** `libs/interactive-map/*` — visualization ✅ ; interactive SIG
  v1 ✅ ; parité legacy complète (clusters, tuiles, filtres avancés) **P2** —
  [A-2026-08-01-02](../../seos/Assumptions-Register.md#a-2026-08-01-02--sig-interactive-map-p2-hors-génération-v0)

---

## Scorecard final

| #   | Critère Meta                                      | Résultat                                   |
| --- | ------------------------------------------------- | ------------------------------------------ |
| 1   | DTO wire `mapLink` / variables                    | ✅                                         |
| 2   | Pipeline MapEntity → repository → mapper → facade | ✅                                         |
| 3   | Application `defer()` + facades ResourceFacade    | ✅ `MapFacade` + `InteractiveMapSigFacade` |
| 4   | Page Grafana `MapPageComponent` + embed           | ✅                                         |
| 5   | Isolation cross-module                            | ✅                                         |
| 6   | Routes `/visualization` + `/interactive`          | ✅                                         |
| 7   | Endpoints SIG (`clusters`, `tiles`, `geojson`)    | ⚠️ déclarés — **P2 génération**            |
| 8   | Carte SIG OpenLayers                              | ✅ **v1** — OL lazy + `report/all`         |
| 9   | i18n `INTERACTIVE_MAP.*`                          | ✅                                         |
| 10  | `provideInteractiveMap()` + mock                  | ✅ variables + `report/all` geo            |
| 11  | Build oracle 4 libs                               | ✅                                         |
| 12  | Corpus 100 % applicable sur périmètre déclaré     | ✅ 28 paires, 3 chaînes                    |

**Verdict Meta : ✅ conforme — module clôturé IR** (écarts SIG P2 documentés,
non bloquants Phase 08)

---

## Oracle exécuté (2026-08-01)

| Tier          | Commande                                                         | Résultat |
| ------------- | ---------------------------------------------------------------- | -------- |
| 1 build       | `bunx nx run-many -t build --projects=tag:scope:interactive-map` | ✅       |
| 1 lint        | `bunx eslint libs/interactive-map --max-warnings=0`              | ✅       |
| 1 corpus      | `bun run corpus:interactive-map`                                 | ✅       |
| 2 intégration | `bun run check:tier2`                                            | ✅       |

---

## Corpus

| Métrique | Valeur                                                   |
| -------- | -------------------------------------------------------- |
| Fichier  | `corpus/interactive-map.pairs.jsonl`                     |
| Paires   | 28 (21 verified + 7 n/a)                                 |
| Chaînes  | `visualization.view`, `interactive.view`, `module.shell` |

---

## Écarts P2 (hors génération v0)

| Écart                                                 | Statut                          |
| ----------------------------------------------------- | ------------------------------- |
| Clusters `map/clusters`, tuiles couverture, geojson   | P2 — assumption A-2026-08-01-02 |
| Filtres legacy multi-critères, heatmap, dialog détail | P2                              |
| Store / adapter SIG legacy complets                   | n/a corpus — non requis IR      |

---

## Références

- [`read-only-view.pattern.json`](../patterns/read-only-view.pattern.json) —
  `fourth_validation`
- [`generation-from-patterns.md`](../generation-from-patterns.md)

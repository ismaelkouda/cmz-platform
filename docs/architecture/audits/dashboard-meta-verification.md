# Vérification Meta — module `dashboard` (clôture IR)

- **Date :** 2026-08-01
- **Pattern :** `read-only-view` — sous-graphe `aggregated_stats_view`
- **Référence :** [`module-dashboard.md`](../module-dashboard.md)
- **Périmètre :** `libs/dashboard/*` — objet agrégé unique + filtre période

---

## Scorecard final

| #   | Critère Meta                                              | Résultat                |
| --- | --------------------------------------------------------- | ----------------------- |
| 1   | DTO wire fidèle (`DashboardItemApiDto` snake/camel mix)   | ✅                      |
| 2   | Pipeline filtre contract → vo → validator → repo → mapper | ✅                      |
| 3   | Application `defer()`, sans CQRS bus/handler              | ✅                      |
| 4   | `DashboardFacade` extends `ResourceFacade` (objet unique) | ✅                      |
| 5   | Isolation cross-module (0 import inter-domaine)           | ✅                      |
| 6   | Correction bug mapping InProcessing/Rejected              | ✅                      |
| 7   | Section performance complétée (source jamais rendue)      | ✅                      |
| 8   | `ThousandsSeparatorPipe` — formatage UI, pas data         | ✅                      |
| 9   | Redirection app `'' → dashboard`                          | ✅                      |
| 10  | i18n `DASHBOARD.*` + libellés période réels               | ✅                      |
| 11  | `provideDashboard()` + mock `report/statistics`           | ✅                      |
| 12  | Corpus 100 % applicable (`verified` / `n/a`)              | ✅ 25 paires, 2 chaînes |

**Verdict Meta : ✅ conforme — module clôturé IR**

---

## Oracle exécuté (2026-08-01)

| Tier          | Commande                                                   | Résultat              |
| ------------- | ---------------------------------------------------------- | --------------------- |
| 1 build       | `bunx nx run-many -t build --projects=tag:scope:dashboard` | ✅                    |
| 1 lint        | `bunx eslint libs/dashboard --max-warnings=0`              | ✅                    |
| 1 corpus      | `bun run corpus:dashboard`                                 | ✅ 2/2 tranche-closed |
| 2 intégration | `bun run check:tier2`                                      | ✅ initial ~856 kB    |

---

## Corpus

| Métrique                          | Valeur                                              |
| --------------------------------- | --------------------------------------------------- |
| Fichier                           | `corpus/dashboard.pairs.jsonl`                      |
| Paires                            | 25                                                  |
| `verified`                        | 18                                                  |
| `n/a`                             | 7 (CQRS legacy + nx-only filter-store/vm-presenter) |
| `pending` / `emitted` / `blocked` | 0                                                   |

Chaînes : `dashboard.view`, `dashboard.module.shell`.

---

## Exceptions pattern `read-only-view`

| Écart autorisé        | Justification                                              |
| --------------------- | ---------------------------------------------------------- |
| `filter-store`        | Sélecteur période UI — sous-graphe `aggregated_stats_view` |
| `vm-presenter`        | Projection 3 sections cartes — pas embed Grafana           |
| Cartes non cliquables | Routes workflow pas encore câblées au clic — P2            |

---

## Références

- [`read-only-view.pattern.json`](../patterns/read-only-view.pattern.json) —
  `aggregated_stats_view`
- [`archetypes/read-only-view.md`](../archetypes/read-only-view.md)

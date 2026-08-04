# Vérification Meta — module `reporting` (clôture IR, écrite a posteriori)

- **Date d'écriture de ce document :** 2026-08-04
- **Date de la construction du module :** 2026-07-28 ([`module-reporting.md`](../module-reporting.md))
- **Date de l'émission corpus :** 2026-08-02 (`corpus/reporting.pairs.jsonl`)
- **Pattern :** `read-only-view` — sous-graphe `grafana_multi_section`
  ([`read-only-view.pattern.json`](../patterns/read-only-view.pattern.json),
  `second_validation`, réplication stricte du schéma `monitoring`)
- **Périmètre :** `libs/reporting/*` — 4 embeds Grafana
  (`report`/`requests`/`report-by-channel`/`report-by-operator`),
  domaine/data consolidés en 1 seul concept paramétré

## Pourquoi ce document est écrit maintenant, et pas le 2026-07-28

Même constat et même motivation que
[`monitoring-meta-verification.md`](./monitoring-meta-verification.md) : la
cartographie du 2026-08-04 a nommé explicitement l'écart entre le statut
`STATUS.md` (« Compilant ») et le statut réel des 6 autres modules à corpus
(« Module IR clôturé », preuve écrite via `*-meta-verification.md`).
`reporting` a un corpus (51 paires, `verified` le 2026-08-02) et une entrée
`second_validation` dans `read-only-view.pattern.json`, mais aucun document
de synthèse humainement lisible avant ce fichier.

## Scorecard

| #   | Critère Meta                                                          | Résultat | Preuve |
| --- | ------------------------------------------------------------------- | :---: | --- |
| 1   | DTO wire fidèle (`ReportingVariablesItemDto`, 4 champs réels)         | ✅ | `module-reporting.md` — `reportReportingLink`, `requestReportReportingLink`, `reportByChannel`, `reportByOperator` |
| 2   | Pipeline entité→repository→mapper paramétré par section              | ✅ | 1 `GrafanaDashboardEntity` (réutilisée), `ReportingRepository.execute(section, options)`, `ReportingDashboardMapper` |
| 3   | Application `defer()` + 4 façades `ResourceFacade` dédiées           | ✅ | `ReportFacade`/`RequestsFacade`/`ReportByChannelFacade`/`ReportByOperatorFacade` |
| 4   | Consolidation domaine/data 4×vertical→1 actée et justifiée            | ✅ | `REPORTING_ENDPOINTS` (4 clés → même ressource `variables`, partagée avec `monitoring`/`interactive-map`) + 4 DTOs source à 1 champ chacun |
| 5   | Isolation cross-module (0 import interdit `scope:reporting`)          | ✅ **revérifié 2026-08-04** | `node tools/check-boundary-negative.mjs` → `OK : import interdit scope:monitoring → scope:reporting rejeté par ESLint` (test négatif ciblant directement cette paire de modules) |
| 6   | `GrafanaEmbedComponent` réutilisé (`@cmz/shared-ui`), pas dupliqué    | ✅ **revérifié 2026-08-04** | `node tools/check-duplicate-files.mjs` → 0 doublon byte-identique cross-module (global, inclut reporting) ; réutilisation explicite du composant construit pour `monitoring`, pas de copie |
| 7   | Namespace i18n `REPORTING.*` (`JOBS` exclu — rattaché à `monitoring`) | ✅ | Décision actée, `module-reporting.md` §Décisions |
| 8   | Icônes SVG inline — pas de police `pi pi-*` (absente du monorepo)     | ✅ | Composant partagé, même garde-fou que `monitoring` |
| 9   | Redirection `/reporting` → `/reporting/reports` (+ wildcard interne)  | ✅ | `module-reporting.md` §Décisions |
| 10  | `provideReporting()` + mock backend (4 champs `variables`)            | ⚠️ construit et validé le 2026-07-28 (`module-reporting.md` §Phase 7) — **non rejoué aujourd'hui** | — |
| 11  | Build + lint 4/4 libs `@cmz/reporting-*`                              | ✅ **revérifié 2026-08-04** | Voir Oracle exécuté ci-dessous — 4/4 build, 4/4 lint (`--max-warnings=0`), 0 erreur |
| 12  | Corpus 100 % applicable (`verified` / `n/a`)                          | ✅ | 51 paires : 41 `verified` + 10 `n/a` (même nature que monitoring — CQRS legacy + shell consolidé) |

**Verdict Meta : ✅ conforme — clôture documentée a posteriori, mêmes
réserves que `monitoring` (critère 10, corpus non rejoué à l'identique
cette passe).**

## Oracle exécuté

| Tier | Commande | Résultat | Date |
| --- | --- | --- | --- |
| 1 build | `node node_modules/.bin/nx run @cmz/reporting-domain:build` | ✅ | 2026-08-04 |
| 1 build | `node node_modules/.bin/nx run @cmz/reporting-data:build` | ✅ | 2026-08-04 |
| 1 build | `node node_modules/.bin/nx run @cmz/reporting-application:build` | ✅ | 2026-08-04 |
| 1 build | `node node_modules/.bin/nx run @cmz/reporting-ui:build` | ✅ | 2026-08-04 |
| 1 lint | `node node_modules/.bin/nx run @cmz/reporting-domain:lint` (`eslint . --max-warnings=0`) | ✅ | 2026-08-04 |
| 1 lint | idem `@cmz/reporting-data` | ✅ | 2026-08-04 |
| 1 lint | idem `@cmz/reporting-application` | ✅ | 2026-08-04 |
| 1 lint | idem `@cmz/reporting-ui` | ✅ | 2026-08-04 |
| boundary | `node tools/check-boundary-negative.mjs` | ✅ | 2026-08-04 |
| duplicates | `node tools/check-duplicate-files.mjs` | ✅ 0 doublon | 2026-08-04 |
| corpus (legacy diff, 51 paires) | `bun run corpus:reporting --verify` | ✅ (enregistré) | **2026-08-02** — non rejoué à l'identique cette passe |
| 2 intégration (`ngc --strictTemplates`, app complète) | `bunx ngc -p apps/backoffice-angular/tsconfig.app.json --noEmit` | dernière mesure connue : ✅ 0 erreur | non revérifié cette passe |
| corpus:ci (structural-only, bloquant en CI) | `bun run corpus:ci` (inclut `reporting`) | job `corpus` de `ci.yml`, `needs: guardrails` | bloquant en CI sur chaque PR |

### Limite connue — identique à `monitoring`

Même tentative, même blocage : le corpus complet (`--verify` avec
`SEOS_LEGACY_ROOT`) exécute jusqu'à 51 invocations `nx run <target>:build`
séquentielles (1,5 à 6 s chacune, cache local à 0 % de hit entre appels dans
ce sandbox), dépassant la limite de 45 s par commande et sans possibilité de
processus persistant en arrière-plan (vérifié). Voir le détail complet dans
[`monitoring-meta-verification.md`](./monitoring-meta-verification.md#limite-connue--pourquoi-le-corpus-na-pas-été-rejoué-à-lidentique-aujourdhui).
Commande de reproduction : `SEOS_LEGACY_ROOT=<repo legacy> node
tools/corpus/emit-pairs.mjs reporting --verify`.

## Corpus

| Métrique | Valeur |
| --- | --- |
| Fichier | `corpus/reporting.pairs.jsonl` |
| Paires | 51 |
| `verified` | 41 |
| `n/a` | 10 |
| `pending`/`emitted`/`blocked` | 0 |
| `legacy_ref.commit` (pinné) | `cb15bf80fa072e12e9d4fce4b9236abe6ac78058` (2026-07-31) |
| `verified_at` | 2026-08-02 |

Chaînes : `reporting.report.view`, `reporting.requests.view`,
`reporting.report-by-channel.view`, `reporting.report-by-operator.view`,
`reporting.module.shell`.

### Détail des 10 `n/a`

| Paire | Raison |
| --- | --- |
| `{report,requests,report-by-channel,report-by-operator}.rov-section-query-legacy` (×4) | CQRS `query` legacy — supprimé par le pattern `read-only-view` |
| `{report,requests,report-by-channel,report-by-operator}.rov-section-query-handler-legacy` (×4) | idem, `query-handler` legacy |
| `reporting.shell.module-routes-legacy` | Routes migrées vers `libs/reporting/ui` |
| `reporting.shell.module-providers-legacy` | DI module legacy → composition root app Nx |

## Références

- [`read-only-view.pattern.json`](../patterns/read-only-view.pattern.json)
  — `second_validation` (réplication stricte du schéma `monitoring`)
- [`module-reporting.md`](../module-reporting.md)
- [`monitoring-meta-verification.md`](./monitoring-meta-verification.md)
  — module jumeau, même pattern, même passe de clôture a posteriori
- [`cartographie-modules-2026-08-04.md`](../cartographie-modules-2026-08-04.md)
  §4 — écart nommé qui a motivé ce document

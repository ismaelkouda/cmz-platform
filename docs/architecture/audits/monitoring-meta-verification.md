# Vérification Meta — module `monitoring` (clôture IR, écrite a posteriori)

- **Date d'écriture de ce document :** 2026-08-04
- **Date de la construction du module :** 2026-07-28 ([`module-monitoring.md`](../module-monitoring.md))
- **Date de l'émission corpus :** 2026-08-02 (`corpus/monitoring.pairs.jsonl`)
- **Pattern :** `read-only-view` — sous-graphe `grafana_multi_section`
  ([`read-only-view.pattern.json`](../patterns/read-only-view.pattern.json),
  `monitoring` = `reference_module` du pattern)
- **Périmètre :** `libs/monitoring/*` — 4 embeds Grafana
  (`node`/`services`/`resources`/`jobs`), domaine/data consolidés en 1 seul
  concept paramétré

## Pourquoi ce document est écrit maintenant, et pas le 2026-07-28

La cartographie du 2026-08-04
([`cartographie-modules-2026-08-04.md`](../cartographie-modules-2026-08-04.md),
§4) a relevé que `monitoring`/`reporting` sont les 2 seuls modules à corpus
(51 paires chacun) **sans** fichier `*-meta-verification.md`, contrairement
aux 6 autres modules à corpus (`dashboard`, `finalization`,
`interactive-map`, `processing`, `report-states`, `requests`). Ce n'est
**pas** une absence de vérification mécanique — `monitoring` est le
`reference_module` du pattern `read-only-view` et son corpus est déjà
`verified` en base (voir ci-dessous) — c'est une absence du document de
synthèse humainement lisible. Ce fichier comble cet écart en s'appuyant sur
des preuves déjà existantes (pas rejouées à l'identique) et sur une
re-vérification partielle faite aujourd'hui.

## Scorecard

| #   | Critère Meta                                                          | Résultat | Preuve |
| --- | ----------------------------------------------------------------------| :---: | --- |
| 1   | DTO wire fidèle (`MonitoringVariablesItemDto`, 3 champs réels)        | ✅ | `module-monitoring.md` §Phase 4 — champs dérivés des 4 DTOs source (`useOfServersResourcesLink`, `useOfResourcesLink`, `impactJobs`) |
| 2   | Pipeline entité→repository→mapper paramétré par section              | ✅ | 1 `GrafanaDashboardEntity`, `MonitoringRepository.execute(section, options)`, `GrafanaDashboardMapper` + `MONITORING_SECTION_FIELD` |
| 3   | Application `defer()` + 4 façades `ResourceFacade` dédiées           | ✅ | `NodeFacade`/`ServicesFacade`/`ResourcesFacade`/`JobsFacade`, chacune `providedIn: 'root'`, section hardcodée |
| 4   | Consolidation domaine/data 4×vertical→1 actée et justifiée            | ✅ | 2 preuves techniques dans `module-monitoring.md` : `MONITORING_ENDPOINTS` (4 clés → même ressource `variables`) + 4 DTOs source ne lisant chacun qu'1 champ de la même réponse |
| 5   | Isolation cross-module (0 import interdit `scope:monitoring`)         | ✅ **revérifié 2026-08-04** | `node tools/check-boundary-negative.mjs` → `OK : import interdit scope:monitoring → scope:reporting rejeté par ESLint` (10 s) |
| 6   | `GrafanaEmbedComponent` partagé (`@cmz/shared-ui`), pas dupliqué      | ✅ **revérifié 2026-08-04** | `node tools/check-duplicate-files.mjs` → 0 doublon byte-identique cross-module (global, inclut monitoring) |
| 7   | Namespace i18n `MONITORING.*` (dont `JOBS` réaligné, pas `REPORTING.JOBS`) | ✅ | Décision actée, `module-monitoring.md` §Décisions |
| 8   | Icônes SVG inline — pas de police `pi pi-*` (absente du monorepo)     | ✅ | Décision actée, gap pré-existant (aussi `dashboard`) documenté, non reproduit |
| 9   | Redirection `/monitoring` → `processing-status` (+ wildcard, `path: ''` explicite) | ✅ | `module-monitoring.md` §Décisions |
| 10  | `provideMonitoring()` + mock backend (`variables`, 3 champs simultanés) | ⚠️ construit et testé via `curl` le 2026-07-28 (`module-monitoring.md` §Phase 7) — **non rejoué aujourd'hui** (mock-server non relancé cette passe) | — |
| 11  | Build + lint 4/4 libs `@cmz/monitoring-*`                             | ✅ **revérifié 2026-08-04** | Voir Oracle exécuté ci-dessous — 4/4 build, 4/4 lint (`--max-warnings=0`), 0 erreur |
| 12  | Corpus 100 % applicable (`verified` / `n/a`)                          | ✅ | 51 paires : 41 `verified` + 10 `n/a` (CQRS legacy query/handler absents du pattern read-only-view + shell routes/providers consolidés) |

**Verdict Meta : ✅ conforme — mais clôture documentée a posteriori, pas au
moment de la livraison (2026-07-28/2026-08-02).** Le critère 10 reste sur
preuve datée (non rejouée cette passe) — signalé, pas masqué.

## Oracle exécuté

| Tier | Commande | Résultat | Date |
| --- | --- | --- | --- |
| 1 build | `node node_modules/.bin/nx run @cmz/monitoring-domain:build` | ✅ | 2026-08-04 |
| 1 build | `node node_modules/.bin/nx run @cmz/monitoring-data:build` | ✅ | 2026-08-04 |
| 1 build | `node node_modules/.bin/nx run @cmz/monitoring-application:build` | ✅ | 2026-08-04 |
| 1 build | `node node_modules/.bin/nx run @cmz/monitoring-ui:build` | ✅ | 2026-08-04 |
| 1 lint | `node node_modules/.bin/nx run @cmz/monitoring-domain:lint` (`eslint . --max-warnings=0`) | ✅ | 2026-08-04 |
| 1 lint | idem `@cmz/monitoring-data` | ✅ | 2026-08-04 |
| 1 lint | idem `@cmz/monitoring-application` | ✅ | 2026-08-04 |
| 1 lint | idem `@cmz/monitoring-ui` | ✅ | 2026-08-04 |
| boundary | `node tools/check-boundary-negative.mjs` | ✅ | 2026-08-04 |
| duplicates | `node tools/check-duplicate-files.mjs` | ✅ 0 doublon | 2026-08-04 |
| corpus (legacy diff, 51 paires) | `bun run corpus:monitoring --verify` | ✅ (enregistré) | **2026-08-02** — non rejoué à l'identique cette passe (voir « Limite connue » ci-dessous) |
| 2 intégration (`ngc --strictTemplates`, app complète) | `bunx ngc -p apps/backoffice-angular/tsconfig.app.json --noEmit` | dernière mesure connue : ✅ 0 erreur | non revérifié cette passe |
| corpus:ci (structural-only, bloquant en CI) | `bun run corpus:ci` (inclut `monitoring`) | job `corpus` de `ci.yml`, `needs: guardrails` | bloquant en CI sur chaque PR — pas rejoué manuellement cette passe |

### Limite connue — pourquoi le corpus n'a pas été rejoué à l'identique aujourd'hui

Tentative faite : `SEOS_LEGACY_ROOT=<repo legacy> node tools/corpus/emit-pairs.mjs
monitoring --verify` (avec et sans `--structural-only`). Le gate H-2/H-3
passe (build+lint OK, 0 doublon), puis le script exécute un oracle `nx run
<target>:build` **par paire** (jusqu'à 51 invocations). Chaque invocation
individuelle prend 1,5 à 6 s (démarrage Node + résolution `bunx`/`npx`, cache
Nx local à 0 % de hit d'une invocation à l'autre dans ce bac à sable) — le
temps total dépasse la limite de 45 s par commande shell de ce
sandbox, et aucun processus lancé en arrière-plan (`nohup`/`setsid`) ne
survit à la fin d'un appel (vérifié explicitement : un job de 20 s lancé en
fond n'a laissé aucune trace au second appel). **Rejouer le corpus complet
nécessite soit une CI réelle (`corpus:ci` structural-only y est déjà
routinier), soit une machine locale sans cette contrainte de temporisation
par commande.** Commande de reproduction exacte donnée ci-dessus. Ceci
rejoint les limitations déjà documentées pour I-8 (test d'intégration
backend réel) et `nginx -t` (pas de root) — même catégorie : blocage
d'exécution du sandbox, pas un doute sur le résultat.

Ce qui **a** été vérifié directement aujourd'hui à la place (build, lint,
boundary, duplicates) couvre le tier structurel complet (`H-2`/`H-3`) — la
seule pièce non rejouée est le diff ligne-à-ligne contre le legacy
(`legacy_ref` pinné au commit `cb15bf80fa072e12e9d4fce4b9236abe6ac78058`,
même SHA que `check:legacy-lock`), déjà enregistré comme `verified` le
2026-08-02.

## Corpus

| Métrique | Valeur |
| --- | --- |
| Fichier | `corpus/monitoring.pairs.jsonl` |
| Paires | 51 |
| `verified` | 41 |
| `n/a` | 10 |
| `pending`/`emitted`/`blocked` | 0 |
| `legacy_ref.commit` (pinné) | `cb15bf80fa072e12e9d4fce4b9236abe6ac78058` (2026-07-31) |
| `verified_at` | 2026-08-02 |

Chaînes : `monitoring.node.view`, `monitoring.services.view`,
`monitoring.resources.view`, `monitoring.jobs.view`, `monitoring.module.shell`.

### Détail des 10 `n/a`

| Paire | Raison |
| --- | --- |
| `{node,services,resources,jobs}.rov-section-query-legacy` (×4) | CQRS `query` legacy — supprimé par le pattern `read-only-view` (`legacy_layers_dropped_in_nx`, use-case direct remplace la cérémonie CQRS) |
| `{node,services,resources,jobs}.rov-section-query-handler-legacy` (×4) | idem, `query-handler` legacy |
| `monitoring.shell.module-routes-legacy` | Routes migrées vers `libs/monitoring/ui` (structure Nx, pas de correspondance 1:1) |
| `monitoring.shell.module-providers-legacy` | DI module legacy → composition root app Nx (`apps/backoffice-angular/src/app/providers`) |

Ces 10 `n/a` sont **structurels au pattern**, pas des paires abandonnées —
identiques en nature aux `n/a` de `dashboard` (CQRS legacy + nx-only
filter-store/vm-presenter, voir `dashboard-meta-verification.md`).

## Références

- [`read-only-view.pattern.json`](../patterns/read-only-view.pattern.json)
  — `reference_implementation` (monitoring = module de référence du pattern)
- [`module-monitoring.md`](../module-monitoring.md)
- [`cartographie-modules-2026-08-04.md`](../cartographie-modules-2026-08-04.md)
  §4 — écart nommé qui a motivé ce document

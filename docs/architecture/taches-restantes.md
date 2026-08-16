# Tâches restantes — cmz-platform

- **Créé :** 2026-08-05
- **Consolidation stratégique 2026-08-14** :
  [ADR-0029](../adr/0029-perimetre-capacites-plateforme-generation.md) supersède
  la promesse non bornée d'ADR-0026. Le dépôt vise une plateforme extensible
  pour applications métier data-centric, avec claims promus par la
  [matrice de capacités](./generation-platform-capability-matrix.md).
- **Refonte structurelle 2026-08-13** : réorganisation complète du document
  (ancienne structure : 13 audits Big Tech T1→T13 dans leur ordre historique,
  tableaux à cellules-paragraphes). Cette refonte ne change **aucun fait, aucun
  état, aucune donnée vérifiée** — elle reclasse les mêmes items selon la
  priorité réelle issue de
  [ADR-0026](../adr/0026-reorientation-objectif-generation-generique.md),
  désormais supersédé par ADR-0029. Tous les ids historiques (`Txx-y`, `OPS-y`,
  `ROAD-y`, `P2-*`) restent valides et cherchables — voir l'Annexe « Index de
  correspondance » en fin de fichier pour retrouver un id par sa nouvelle
  section.
- **Statut :** source de vérité des travaux **encore ouverts / partiels**.
- **Référentiel d'évaluation :** 13 audits Big Tech (Meta / Google / Amazon /
  Microsoft) — Architecte Senior / Principal Engineer. Principes : machine avant
  opinion (Shift-Left CI/CD) ; revues de jalon (Design/Architectural Review
  Board) pour les décisions humaines ; une règle non instrumentée n'est qu'une
  intention.

### Comment lire

| Colonne    | Sens                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------- |
| **Id**     | Stable : `T{n}-{k}` = audit historique ; `PLAT-{k}` = programme plateforme ADR-0029 ; alias entre parenthèses   |
| **État**   | `ouvert` · `partiel` · `en cours` · `bloqué-humain` · `décision` · `différé` · `en pause` · `fait`              |
| **Crit.**  | P0 · P1 · P2 · Ops                                                                                              |
| **Effort** | S / M / L / XL                                                                                                  |
| **Classe** | voir légende ci-dessous — jugement du 2026-08-13, base = texte factuel déjà écrit dans ce fichier avant refonte |

**Légende Classe** (introduite par la refonte, consolidée par ADR-0029) :

- **ORACLE** = principes communs de vérification
  (build/lint/test/CI/architecture), implémentés par des plugins et commandes
  propres à chaque cible — priorité actuelle du dépôt.
- **PIPELINE** = fait avancer concrètement le pipeline de génération
  multi-source (Figma ou autre), au sens de
  [`conception-pipeline-figma-vers-code.md`](./conception-pipeline-figma-vers-code.md).
- **SEOS** = spécifique au raffinement du contenu Angular/SEOS lui-même
  (traductions, données legacy, RBAC métier) — toujours légitime, secondaire
  dans le cadrage élargi.
- **OPS** = hygiène de dépôt/forge toujours pertinente quel que soit l'objectif
  (CI, protection de branche, hooks, gouvernance, sécurité, licences).
- **REQUALIFIÉ** = pertinence réévaluée à l'aune d'ADR-0029, justification
  donnée en section 5.

---

## 0. Statut du projet en une page

- **Objectif réel du dépôt (ADR-0029, 2026-08-14)** : construire une plateforme
  extensible de compilation de spécifications pour applications métier
  data-centric. Une source ou cible est supportée seulement après preuve
  reproductible. SEOS/Angular est le **golden reference industriel**.
- **Ce qui a été prouvé hors Angular** (POC React+TS, ROAD-3c) : le principe
  build/lint/test et certaines règles de couches peuvent être transposés. Ce POC
  hors dépôt ne prouve pas encore un renderer, une IR ou un Oracle multi-stack
  reproductible.
- **Ce qui n'est encore qu'une conception, non implémentée** : le pipeline
  Figma→code (4 couches, voir
  [`conception-pipeline-figma-vers-code.md`](./conception-pipeline-figma-vers-code.md)).
  4 critères de passage à l'implémentation définis en §7 de ce document, aucun
  engagé — trackés individuellement en §2 ci-dessous.
- **Priorité de lecture de ce fichier** : §1 (Oracle), §2 (preuve plateforme) et
  la Phase 09 SEOS sont prioritaires. §3 reste le golden reference produit ; §4
  est transverse et permanent.
- **Mesure git 2026-08-06** (dernière mesure connue) : `main` = post PR #3
  (sync), #12 (`nxCloudId` claimé), #13 (knip bloquant, corpus, câblage
  `NX_CLOUD_ACCESS_TOKEN`). Smoke local OK. Nx Cloud : login + id OK, fin de
  setup VCS en cours (OPS-3/T6-4).

### Cartographie 13 audits ⇄ outillage déjà en place (baseline 2026-08-06)

| #   | Audit Big Tech                    | Instrumentation monorepo (déjà là)                                                                              | Score baseline |
| --- | --------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | Boundaries & dependency graph     | ESLint `@nx/enforce-module-boundaries`, `check:declared-deps`, `check:boundary-negative`, tags `scope:`/`type:` | fort           |
| 2   | API contract & schema governance  | 21 `contracts/*.md`, pair schema, mappers, mock-server domaines                                                 | partiel        |
| 3   | State & domain model              | Clean/DDD 4 couches, entities/VO, `DomainError`, facades Signal                                                 | partiel        |
| 4   | AppSec SAST/DAST                  | ESLint, CSP, `bun audit` CI, Dependabot, gitleaks (T4-5 pre-push + CI), secrets non en dur (ADR-0017)           | partiel        |
| 5   | IAM / RBAC·ABAC                   | `authGuard`, `pathsGuard`, `permissionGuard`, `authInterceptor`                                                 | partiel        |
| 6   | Supply chain & licenses           | Dependabot, overrides, `licences-tierces.md`, bun.lock, pin engines                                             | partiel        |
| 7   | Privacy & data governance         | ADR-0019 (corpus), pages légales CMS                                                                            | faible         |
| 8   | Bundle & Core Web Vitals          | budgets ADR-0016, `bundle-metrics.json`, nightly composition                                                    | partiel        |
| 9   | Telemetry & log health            | `LoggerPort` + console adapter, `GlobalErrorHandler`                                                            | partiel        |
| 10  | Fault tolerance & resilience      | `errorInterceptor`/`DomainError`, pas retry/circuit                                                             | faible         |
| 11  | Code health / zero tech debt      | `check:all`, eslint max-warnings 0, convention-profile, duplicates, weight, knip bloquant                       | fort           |
| 12  | Testing pyramid & oracle severity | Vitest, a11y axe, Playwright smoke+login+RBAC mock, corpus structural H-1/H-2                                   | partiel        |
| 13  | ADR & docs freshness              | `check:docs-freshness`, `generate:status`/`adr-index`, ADR 0001–0026                                            | fort           |

fort = machine bloquante quasi complète · partiel = outillage partiel · faible =
intention/doc peu ou pas instrumentée.

### Sources audits workspace locaux

`[audit-workspace-2026-08-02.md](./audit-workspace-2026-08-02.md)` ·
[addendum](./audit-workspace-2026-08-02-addendum.md) ·
[revue-finale](./audit-workspace-2026-08-02-revue-finale.md) ·
[08-03](./audit-workspace-2026-08-03.md) ·
[cartographie 08-04](./cartographie-modules-2026-08-04.md) · ensemble de
`docs/**`.

---

## 1. Oracle & fondations réutilisables (ORACLE) — priorité actuelle

Ces items renforcent les principes communs du socle machine
(build/lint/test/CI/architecture). Chaque cible conserve toutefois ses propres
plugins et commandes ; voir ADR-0029/0030.

### 1.1 Isolation en couches & graphe de dépendances (ex-T1)

**Attendu :** graphe de dépendances machine-vérifiable ; zéro import illégal ;
tags de couche ; test négatif prouvant que la règle fire encore.

- **T1-1** — ouvert (partiel), S, P1, alias `D/A-12`. Maintenir
  `check:boundary-negative` + `declared-deps` verts après chaque PR (déjà
  bloquant) — pas de dette structurelle.
- **T1-2** — décision (ARB), L, P2, alias `plan D3 · ROAD-4`. Scinder `shared`
  UI (historique ~351 fichiers, plan D3).
- **T1-3** — **fait** (clos ADR-0022, 2026-08-11), L, P2, alias `O-X·O-3/O-4`.
  Dette family-dup tranchée pour `report-states`/`requests` (Option B exécutée)
  ; reste non-régression pour `processing`/`finalization` (non concernés).
  Baseline `family-duplication-metrics.json` : 29,6 % → 28,1 %.
- **T1-4** — **fait**, portée domain uniquement, L, P2, alias
  `O-3 O-4, clos ADR-0022`. `libs/workflow-details/domain`
  (`@cmz/workflow-details-domain`) créé — domaine uniquement ; couche
  data/application/ui non entreprise (risque DI/RBAC, cf. ADR-0022).
- **T1-5** — **fait** (clos ADR-0022, 2026-08-10), L, **P1**, alias
  `NOUVEAU 2026-08-10, lié T1-4/T13-10`. Duplication confirmée
  `report-states`/`requests` (12 fichiers domaine dupliqués) migrée vers
  `@cmz/workflow-details-domain`. Vérifié : build/lint/test 2×4 couches +
  `workflow-details-domain` (28 tests) OK ; `backoffice-angular` 34/34 OK ;
  `ngc` 0 erreur ; `check:boundary-negative`/`check:duplicates` OK ;
  `check:pattern-nx:crud-entity` 20/20 non-régression ; corpus SEOS
  `emit-pairs --verify` 100 % verified/tranche-closed sur les 3 chaînes
  concernées.
- **T1-6** — **fait**, S, P2, alias `NOUVEAU 2026-08-10, clos 2026-08-10`.
  Duplicata trivial `GrafanaDashboardEntity`/`MapEntity` → `GrafanaLinkEntity`
  unique dans `@cmz/shared-domain`, 24 fichiers repointés. **Note** : ce
  refactor a laissé un corpus périmé, corrigé plus tard en T13-15.

### 1.2 Contrats d'API & gouvernance des schémas (ex-T2, sous-ensemble générique)

**Attendu :** schéma source de vérité ; compat breaking change gate ; DTOs
générés/validés ; mock dérivé du schéma. Le mécanisme (schéma versionné, gate
CI, contrats machine-readable) est générique ; T2-4 (correction d'un mock SEOS
précis) est classé SEOS en §3.

- **T2-1** — **partiel** (Option A exécutée 2026-08-13), M, P0, alias `P-8`.
  Schéma OpenAPI _backend réel_ toujours bloqué-humain (Options B/C du mémo —
  accès staging ou coordination équipe backend requis, hors portée d'un agent).
  **Option A livrée à la place** : schéma JSON Schema (draft 2020-12)
  rétro-ingénié depuis les 303 DTOs TypeScript existants via l'API TypeScript
  Compiler — `docs/architecture/schema/dto.schema.json` (432 `$defs`), généré
  par `tools/schema/generate-dto-schema.mjs` (`bun run generate:dto-schema`).
  **Limite assumée et documentée** (mémo `docs/architecture/memo-openapi.md` §4)
  : ce schéma hérite de toute erreur déjà présente dans les DTOs actuels et ne
  garantit **pas** la conformité avec ce que retourne le backend réel — c'est un
  filet anti-dérive interne (DTO ↔ schéma), pas une preuve de contrat externe.
  Limite de portée connue : 3 champs de `ReportLocationDto` référencent des
  types `@cmz/shared-domain` (hors périmètre `dtos/*.ts` scanné), modélisés `{}`
  non contraints et signalés en avertissement, pas silencieusement ignorés. =
  ROAD-3b/S-1 (chantier IDL-first, ne pas traiter séparément pour un schéma
  backend réel).
- **T2-2** — **partiel** (2026-08-13), L, P0, alias `P-9`. Gate CI de
  **fraîcheur schéma↔DTO** livré : `tools/check-dto-schema.mjs`
  (`bun run check:dto-schema`, branché dans `check:all` après
  `check:pair-schema`) régénère le schéma en mémoire et échoue si `git diff`
  détecte une divergence avec `dto.schema.json` committé — même mécanisme que
  `check:docs-freshness`. **Reste à faire** : la partie « mappers conformes au
  schéma » (valider que `libs/*/data/src/lib/mappers/*.ts` produit bien des
  objets domaine cohérents avec le DTO source) et « breaking change = fail »
  (diff sémantique entre deux versions du schéma, pas juste présence/absence) ne
  sont pas couvertes — chantier distinct, non entamé.
- **T2-3** — ouvert, L, P1, alias `P-10`. Dériver `tools/mock-server` du schéma
  (fin maintenance manuelle multi-domaines).
- **T2-5** — **fait**, M, P2, alias `H-4-UI`. `contracts/component.contract.md`
    - `route.contract.md` (couche UI).
- **T2-6** — **fait** (2026-08-13), L, P2, alias `GVR-3`. Contrat
  machine-readable unifié pour les patterns d'archétype — voir
  [ADR-0027](../adr/0027-noyau-verbes-structurels-catalogue-ouvert-patterns.md)/[ADR-0028](../adr/0028-execution-topology-compositions-memorisees.md).
  `docs/architecture/patterns/pattern-core.schema.json` (JSON Schema draft
  2020-12) : noyau de 5 verbes structurels (Collection, Entity, Transition,
  Composite Read, Custom) + `execution_topology` (axe orthogonal ouvert). Les 3
  patterns existants migrés de façon additive (`composition` + `$schema`
  corrigé, aucune donnée historique perdue) ;
  `docs/architecture/patterns/action-request.pattern.json` créé de zéro (jamais
  eu de fichier Nx-shaped propre, `core_files_nx` dérivé de l'inspection réelle
  de `libs/authentication`, 17 fichiers/opération). Validateur
  `docs/architecture/patterns/validate-pattern-core.mjs` (sans Ajv, même
  doctrine que `validate-pair-schema.mjs`). `tools/check-pattern-nx.mjs`
  généralisé (`--files-field`, `--set`) — vérifie désormais n'importe quel
  pattern du catalogue, plus seulement `crud-entity`. **Gap connu, non traité
  ici** : `workflow-action.composition` a révélé 6 sous-graphes réels
  (`list_volet`, `list_export`, `details`, `details_permissions`,
  `details_qualification`, `tasks_actions`) contre 1 seule instance `transition`
  fourre-tout avant correction — corrigé dans ce lot. `read-only-view` révèle un
  vrai gap préexistant (`grafana-dashboard.entity.ts`/`map.entity.ts` consolidés
  en `GrafanaLinkEntity` par T1-6, templates non mis à jour) — signalé, pas
  corrigé (hors périmètre de cette migration additive). **Requalification
  2026-08-14 :** ADR-0030 classe ce contrat comme profil structurel Angular/Nx
  transitoire, et non comme IR canonique multi-stack.
- **T2-7** — **fait**, M, P1, alias `H-5`. `pair.schema.json` étendu : oracle
  structuré horodaté `{build,lint,test,…}`.
- **T2-8** — **fait** (2026-08-13), L, P1, alias `J-9a · GVR-6`. Pattern Nx
  `action-request` formalisé (voir T2-6) + jobs CI
  `check:pattern-nx:workflow-action`/`check:pattern-nx:action-request` ajoutés à
  `package.json`, branchés dans `check:all`. Couverture réelle découverte en
  vérifiant chaque module contre `scope.json` (5 modules
  `class: "workflow-action"`, pas les 2 que `validated_on` du pattern
  documentait avant ce lot) : `processing`/`requests` (déjà connus) +
  **`finalization`/`report-states` nouvellement vérifiés, 11 volets à 100 %**
  (`finalization` queues/tasks/all ; `report-states`
  approve/close/download/evaluate/reject — noms de volets métier plutôt que
  génériques, mais même structure `list_volet_core_files_nx`). **Découverte
  tranchée le 2026-08-14** : `team-organization/agents-performances` et
  `daily-goal` étaient classées `workflow-action` dans
  `docs/architecture/scope.json` par erreur — reclassées `collection`, preuve
  croisée sur 3 sources indépendantes (legacy CQRS = aucun dossier `commands*/`
  pour ces 2 entités contre présence confirmée sur `report-states`/`processing`
  ; code Nx actuel = aucune mutation, uniquement `http.get` et
  `Observable<PageResult<...>>` ; ADR-0027/0028 = forme d'un `Collection` pur,
  jamais d'un `Transition`). `daily-goal` était déjà correctement classée «
  Divers » dans l'annexe source (`analyse-du-projet-source.md`), donc l'erreur
  avait été introduite dans `scope.json` lui-même, pas héritée de l'annexe. Voir
  notes horodatées dans `scope.json`. **Généralisation livrée le 2026-08-14** :
  `check:pattern-nx-coverage.mjs` croise désormais les **4 classes**
  (`crud-entity`/`workflow-action`/`action-request`/`read-only-view`) via une
  Map `CLASS_TO_SCRIPT` à un seul point d'édition. Deux catégories d'écart
  traitées distinctement : `KNOWN_GAPS` (manques temporaires, vide actuellement)
  et `STRUCTURAL_EXCEPTIONS` (les 4 entrées `*/details` de `workflow-action` —
  couvertes par les variantes `transition`, jamais par un volet direct, donc pas
  un gap mais une limite structurelle documentée de la correspondance 1:1).
  Préalable réglé au passage : `read-only-view.pattern .json` référençait encore
  `grafana-dashboard.entity.ts`/`map.entity.ts` comme fichiers par module —
  périmé depuis la consolidation T1-6 (`GrafanaLinkEntity` unique dans
  `@cmz/shared-domain`), jamais répercuté dans le pattern ; corrigé par
  inspection directe de `monitoring`/`reporting`/`interactive-map`. Nouveau
  script `check:pattern-nx:read-only-view`, branché dans `check:all`.
  **Requalification stricte du 2026-08-16 :** le contrôle de couverture a
  détecté que `dashboard/dashboard` était bien dans le scope mais absent du
  pattern. Aucune exception n'a été ajoutée : une composition
  `compositeRead/aggregated_stats_view` et sa liste explicite de 20 artefacts
  ont été définies, puis vérifiées 20/20 contre le module réel. Résultat final :
  51 entités auditées, 47 couvertes directement, ainsi que 4 exceptions
  structurelles documentées, 0 gap réel sur la cible supportée ; les 10 entités
  `read-only-view` passent individuellement leur gate.

### 1.3 Modèle de données & gestion d'état — patterns génériques (ex-T3, sous-ensemble)

- **T3-1** — **fait** (clos 2026-08-10), M, P1, alias `OUVERT-2`. Narrowing des
  `catch` archétype d'erreur. Défaut réel trouvé : `ResourceFacade`/
  `CollectionResourceFacade` faisaient `handler.handle(err as DomainError)`
  (cast, pas conversion, sur `unknown`) — corrigé par garde
  `instanceof DomainError` + fallback `UnknownError`. Vérifié : build/lint
  72/72, `ngc --strictTemplates` 0 erreur.
- **T3-7** — **fait** (clos 2026-08-13), S, P1, alias `T12-3`. Unhandled promise
  rejection dans `SessionService.loadToken()`/`StorePathsService.load()`
  (`try/finally` sans `catch`). Corrigé par `console.error` en filet minimal
  (pas de nouveau token `LOGGER_PORT` — hors périmètre `type:application`, choix
  d'architecture non improvisé pour un correctif ponctuel). Vérifié :
  `tsc --noEmit` 0 erreur, eslint 0 warning, 11/11 tests. _(Note technique :
  cette ligne apparaissait dupliquée à l'identique deux fois dans le fichier
  d'origine — un seul item réel, dédupliqué ici.)_

### 1.4 Sécurité applicative & IAM — mécanismes génériques (ex-T4/T5, sous-ensemble)

- **T4-3** — **partiel** (2026-08-11), M, P1, alias `Big Tech gap`. SAST
  (Semgrep, pas CodeQL — gratuit sans plan GitHub Advanced Security). Job CI
  `sast` en rapport seul (`continue-on-error: true`), pas encore exécuté faute
  d'accès réseau sandbox. `check:sast` local créé, hors `check:all`. Reste :
  faire tourner sur PR réelles, trier faux positifs, repasser bloquant.
- **T5-3** — **fait**, M, P1, alias `IAM`. Tests e2e/intégration refus route
  hors path (RBAC) — mock pathsGuard + matrice WA unit + hydrate session.

### 1.5 Code health & zero tech debt — mécanismes machine (ex-T11, sous-ensemble)

- **T11-1** — **fait**, M, P1, alias `C-9 · carto #13`. knip `dead-code`
  bloquant (`continue-on-error` retiré, contrat `knip-contrat.md`).
- **T11-5** — **fait**, S, P2, alias `DT-3`. Référence `tools/eslint-rules/**`
  réparée (inputs retirés, 0 rule custom).
- **T11-7** — **fait**, S, P1, alias `J · crud · 2026-08-11`. Angle mort trouvé
  : `check:pattern-nx:crud-entity` n'était pas à 100 % (2 entités
  `coverage-areas` absentes). Corrigé + nouveau job CI bloquant
  `tools/check-pattern-nx-coverage.mjs` qui croise `scope.json` ↔
  `check:pattern-nx:crud-entity` en continu — c'est ce garde-fou permanent, pas
  la correction ponctuelle, qui est générique.

### 1.6 Matrice de tests & sévérité de l'oracle — infrastructure (ex-T12, sous-ensemble)

**Attendu :** pyramide unit → integration → e2e ; oracle multi-niveaux ;
couverture non-régression ; gate emission.

- **T12-4** — **fait** (2026-08-11), S, P1.
  [ADR-0021](../adr/0021-seuils-de-couverture-tests-par-couche.md) : seuils de
  couverture par couche (`domain` 85 %, `data` 80 %, `application` 75 %,
  `shared`/`core` 85 %, `ui` 55 %) + mécanisme de **ratchet** (plancher CI =
  première mesure réelle une fois câblé, jamais la cible tant qu'elle n'est pas
  atteinte). Constat de départ vérifié : couverture jamais mesurée avant
  (`@vitest/coverage-v8` non installé).
- **T12-5** — ouvert, M, P2, alias `C-5 C-6`. Vitest coverage + artefact + gate
  PR (mappers d'abord).
- **T12-6** — **fait**, L, P0, alias `C-7`. Playwright (ADR-0008) + smoke login
  mock (3 specs) + job CI `e2e-smoke`.
- **T12-7** — bloqué-humain, L, P0, alias `I-8 · P-11/12`. e2e réel staging
  (auth + path garde + page métier).
- **T12-8** — **fait**, M, P1, alias `M-9 · A11Y-`. a11y : axe util (gate
  critical|serious, WCAG A/AA) + specs crud-entity/WA/RO-view, exécuté en CI.
- **T12-10** — partiel, L, P1, alias `H-6`. Rejouer toutes paires corpus oracles
  durcis (H-1/H-2) + réémettre.
- **T12-11** — ouvert, M, P1, alias `CORPUS-8`. Durcir mapping oracle ↔ fichier
  nx (éviter `:test` vert sans toucher le `.ts` de la paire).
- **T12-12** — partiel, S, P1, alias `B-5`. Prouver `corpus-full` + legacy
  checkout verts en continuous sur forge.
- **T12-13** — ouvert, XL, P0, alias `PH9- · ADR-0013`. Phase 09 : cadre +
  scénarios équivalence + outillage (= ROAD-2).
- **T12-14** — ouvert, M, P1, alias `J-7`. Génération lit
  `angular-22.profile.json`.
- **T12-15** — ouvert, L, P1, alias `J-9b`. `check-semantics.mjs` porté Nx + CI.
- **T12-16** — ouvert, L, P1, alias `GVR-1`. Générateur chaînes depuis pattern
  JSON seul.
- **T12-18** — **fait** (2026-08-10), M, **P0**. `crud-entity.mjs` : champ
  `legacy` synthétique jamais résolu — corrigé.
- **T12-18b** — **fait**, S, **P0**. Défaut préexistant `pair.schema.json` —
  `properties.id.pattern` élargi pour autoriser `:` (séparateur
  `chain_id::node`).
- **T12-14** _(voir aussi T12-3, T12-25 ci-dessous — infrastructure de test du
  kernel partagé, directement réutilisable pour tout futur module quelle que
  soit la stack)_ :
    - **T12-3** — **partiel**, L, P0, alias `C-3`. Généraliser tests kernel
      `shared/` — recadré 2026-08-12 : périmètre réel ~2,5× plus petit que
      l'estimation initiale (68 fichiers testables sur 208, après lecture
      exhaustive un par un). **Avancement 2026-08-13 : P1/P2 clos (~50 fichiers,
      ~230 tests)** ; P0 = 11/13 fait (mappers wire↔domaine, facades
      `rxResource`, `browser-storage.adapter`, `session.service`,
      `store-paths.service`) ; **reste 3 fichiers P0 bloqués par un défaut
      d'écosystème, voir T12-25**.
    - **T12-25** — ouvert, M, P1, alias `T12-3, 2026-08-13`. Impossible de
      tester unitairement les composants Angular à `input.required<...>()`
      signal avec l'outillage Vitest actuel — bug d'écosystème confirmé
      (`angular/angular#54013`, `vitest-dev/vitest#8795` fermé « not planned »),
      reproduit sur un composant Angular trivial isolé hors dépôt. 6 fichiers
      concernés (`table`, `pagination`, `filter`, `field`, `grafana-embed`,
      `action-dropdown`). Décision arbitrée 2026-08-13 :
      `@analogjs/vite-plugin-angular` identifié comme voie correcte (revenir à
      `@angular/build:unit-test` casserait l'architecture package-based,
      ADR-0001). POC tenté et bloqué par l'environnement sandbox (pas de
      `bun install` possible, incompatibilité `darwin-arm64`/`linux-arm64` des
      binaires natifs déjà présents) — **doit être exécuté sur le poste de
      l'utilisateur**, étapes documentées dans l'item lui-même prêtes à l'emploi
      (`bun add -D @analogjs/vite-plugin-angular`, config `*.analog.spec.ts`).
- **T13-14** — **fait** (2026-08-11), M, **P1**, alias
  `NOUVEAU 2026-08-11, audit self-review SEOS`. L'Oracle de statut du corpus
  SEOS (`resolveStatus`, `emit-pairs.mjs`) n'avait aucun test — corrigé, extrait
  dans `tools/corpus/resolve-status.mjs` (fonction pure), 9 cas + 46 tests sur 3
  autres fichiers de logique pure jamais testés. Nouveau script
  `check:corpus-tools` ajouté à `check:all` **et** au job CI `guardrails`, avec
  `check:pair-schema` (existait mais n'était jamais exécuté par aucun gate —
  même bug : un contrôle qui existe sans jamais s'exécuter n'est qu'une
  intention).
- **T13-16** — **fait** (2026-08-11), S, **P1**, alias
  `NOUVEAU 2026-08-11, gap process ADR-0022`. `libs/workflow-details/domain`
  sans `package.json` + 2 arêtes de dépendance non déclarées — révélé par
  `check:declared-deps` (jamais lancé dans le pass d'audit ADR-0022 ni le
  self-review précédent, gap de process). Corrigé : `package.json` créé, 2
  arêtes ajoutées, `vitest` fantôme retiré. Vérifié : `check:declared-deps` → «
  scan 72 libs », 0 arête manquante/fantôme.
- **T13-17** — **fait** (2026-08-14), M, **P0**, alias
  `NOUVEAU 2026-08-14, audit Big Tech Meta/Google`. 3e récurrence de la même
  classe de bug que T13-14/T13-16 (« un script `check:*` ajouté à `check:all`
  n'est bloquant que s'il a AUSSI une step CI ou un hook husky dédié —
  `check:all` lui-même n'est jamais invoqué automatiquement ») : audit factuel
  (agent dédié, mesures reproductibles, pas d'opinion) a trouvé 4 scripts
  `check:dto-schema`/`check:pattern-nx:workflow-action`/
  `check:pattern-nx:action-request`/`check:pattern-nx:read-only-view` documentés
  « branchés dans check:all » (T2-2, T2-8, T2-8 suite) mais jamais invoqués
  individuellement en CI — donc réellement non bloquants malgré la
  documentation. `check:pattern-nx-coverage` (T11-7) manquait même de
  `check:all`. Corrigé : 5 steps CI ajoutées (`docs-freshness` pour dto-schema,
  `duplicates` pour les 4 pattern-nx). **Root cause traitée, pas seulement le
  symptôme** : nouveau script `tools/check-ci-wiring.mjs` (`check:ci-wiring`,
  dernière step du job `guardrails`) croise mécaniquement chaque
  `bun run check:x` de `check:all` avec le contenu réel de
  `.github/workflows/*.yml` et `.husky/*` — toute future addition à `check:all`
  sans step CI/husky dédiée fait désormais échouer la CI elle-même, plutôt que
  d'attendre le prochain audit manuel pour être découverte. Testé positif
  (script orphelin simulé → détecté, exit 1) et négatif. **Requalification du
  2026-08-16 :** l'état réel du dépôt compte désormais 26/26 scripts de
  `check:all` câblés, exit 0.

### 1.7 Documentation & fraîcheur ADR — mécanisme générique (ex-T13, sous-ensemble)

- **T13-1** — partiel, S, P2, alias `DT-4`. Resync cartographie/STATUS/LLM après
  push corpus (générateurs).
- **T13-18** — **fait** (2026-08-16, commit `f92c6a6`), S, P0. Revue effectuée,
  `git add -A` justifié (tous les fichiers modifiés relevaient du même lot
  PLAT-1…5F cohérent, aucun n'a été exclu arbitrairement), commit unique
  documentant l'ensemble des vérifications passées. `bun run
  check:docs-freshness` confirmé vert après commit (STATUS.md, README.md,
  LLM_CONTEXT.md, docs/architecture/etat-du-socle.md, docs/adr/README.md,
  docs/README.md — aucun diff généré résiduel).

---

## 2. Plateforme de génération (PIPELINE) — preuves avant extension

Périmètre et gates de promotion :
[`generation-platform-capability-matrix.md`](./generation-platform-capability-matrix.md),
[ADR-0029](../adr/0029-perimetre-capacites-plateforme-generation.md),
[ADR-0030](../adr/0030-ir-canonique-et-profils-cibles.md) et
[ADR-0031](../adr/0031-graphe-execution-et-manifests-composition.md). Conception
Figma, désormais source partielle différée :
[`conception-pipeline-figma-vers-code.md`](./conception-pipeline-figma-vers-code.md)
(non implémentée).

### 2.0 Programme de preuve prioritaire — nouveau cadrage

- **PLAT-1** — **fait** (2026-08-14), L, P0. Evidence model et Semantic model
  minimaux versionnés sur `action-request`, sans chemin ni concept de framework
  dans l'IR canonique. La tranche couvre 3 commandes, 14 sources SHA-256, 12
  faits, 3 inconnues et 2 décisions. Schémas, fixture, invariants
  inter-documents, 6 tests de mutation et gate CI :
  [`tools/generator-platform`](../../tools/generator-platform/README.md).
- **PLAT-2** — **fait** (2026-08-14), L, P0. Deux adaptateurs indépendants et
  fail-closed convergent sur la même observation normalisée puis la même IR :
  spécification JSON versionnée et AST TypeScript du legacy réel. Provenance
  SHA-256 séparée, inconnues explicites, décisions humaines isolées dans une
  policy neutre, égalité profonde + fixture golden + mutations testées dans
  [`tools/generator-platform`](../../tools/generator-platform/README.md).
- **PLAT-3** — **fait localement** (2026-08-14), XL, P0. Deux renderers ne
  consommant que les modèles canoniques, l'Artifact Plan et leur profil
  produisent chacun 7 fichiers : bibliothèque Angular injectable et client/hooks
  ReactJS. Les deux arbres compilent en mode strict ; manifests versionnés
  couvrant hash IR, hash plan, hash profil, responsabilité, ownership, politique
  d'écriture, hashes fichiers et hash d'arbre ; mutation d'endpoint détectée sur
  les deux cibles. Les modules générés passent aussi un Oracle runtime commun
  sur les validations, les trois commandes HTTP publiques, l'ordre de
  persistance de session et les échecs transport/session :
  [`validation-runtime-action-request.md`](./validation-runtime-action-request.md).
  Gate `check:generator-platform` déjà câblé en CI. Promotion M3 conditionnée à
  la première exécution CI verte du lot. Une seconde définition `support`, sans
  vocabulaire d'authentification ni port de session, passe le parcours
  déclaratif complet sur les deux cibles. Commande et procédure :
  [`creer-une-action-request.md`](../guides/creer-une-action-request.md).
- **PLAT-4** — **fait localement** (2026-08-14), XL, P0. Le cas réel
  `requests-details` + export est extrait par un adaptateur fail-closed vers un
  Evidence Model séparé et un Behavior Model neutre. Les renderers Angular et
  ReactJS compilent et exécutent le même Oracle d'états, permissions, branches,
  validations conditionnelles, erreurs et callback applicatif asynchrone
  attendu. Les mutants de permission, garde d'état, branche de rejet,
  `callbackType` et causalité d'écriture sont tués sur les deux cibles :
  [`validation-runtime-workflow-action.md`](./validation-runtime-workflow-action.md).
  Une définition JSON indépendante converge sur le même Behavior Model ; la
  commande `generate:workflow-action` génère Angular/ReactJS, compile
  strictement et refuse écrasement, règles ou compositions non supportées.
  Procédure :
  [`creer-un-workflow-action.md`](../guides/creer-un-workflow-action.md).
  Promotion conditionnée à une CI verte ; validation sur un second domaine réel
  encore ouverte.
- **PLAT-5** — **fait localement** (2026-08-14), L, P0. Le même Oracle tue sur
  Angular et ReactJS trois mutations structurellement valides : suppression de
  la contrainte d'égalité de confirmation, suppression de l'effet de session et
  passage de `public/none` à `authenticated/bearer`. La campagne a révélé puis
  corrigé le contrat d'authentification absent du `FetchPort` ReactJS et la
  génération inconditionnelle des ports de session. Détails et limites :
  [`validation-runtime-action-request.md`](./validation-runtime-action-request.md).
  Promotion M4 conditionnée à la première exécution CI verte du lot.
- **PLAT-5A** — **fait localement** (2026-08-16), L, P0. Un Artifact Plan
  target-neutral et déterministe décrit les responsabilités logiques communes.
  Les renderers Angular et ReactJS doivent rattacher exhaustivement chaque
  fichier au plan et refusent un plan périmé. Le manifest 1.1 enregistre
  `artifact_id`, `owner` et `write_policy`; cette tranche initiale ne produisait
  encore que `generator-owned/replace`. La lacune
  `planning.shared-artifact-plan` est retirée du contrat directeur.
- **PLAT-5B** — **fait localement** (2026-08-16), L, P0. Les deux commandes
  acceptent `--dry-run` et produisent un Change Set déterministe sans écriture.
  Une sortie absente produit des `create`; une sortie propre des `unchanged`;
  une définition évoluée des `replace`; un artefact obsolète un `delete`. Toute
  dérive d'un fichier `generator-owned` est refusée avant planification. La
  capacité `regeneration.dry-run-drift-detection` est prouvée ; l'application du
  Change Set alors encore ouverte est livrée par PLAT-5E.
- **PLAT-5C** — **fait localement** (2026-08-16), L, P0. Un contrat typé et un
  fichier `src/after-success.extension.ts` physiquement séparé sont produits
  pour `action-request` et `workflow-action`, sur Angular et ReactJS. Le fichier
  est `human-owned/preserve`; le dry-run capture son hash courant comme hash
  avant/après, refuse sa suppression et refuse toute combinaison d'ownership non
  prouvée. Un Oracle exécute une implémentation humaine instrumentée dans les
  quatre parcours. La lacune `extensions.human-owned-preservation` est retirée
  du contrat directeur ; la publication effective alors encore ouverte est
  livrée par PLAT-5E.
- **PLAT-5D** — **fait localement** (2026-08-16), M, P0. Le gate de la
  plateforme est séparé en trois niveaux explicites : core `node:test`, Angular
  Vitest + environnement zoneless jsdom + `TestBed`, et ReactJS Vitest +
  React/ReactDOM + React Testing Library. Les deux runners natifs compilent les
  arbres TypeScript fraîchement générés et leurs specs en mode strict, pas une
  copie manuelle. Angular rejoue le workflow complet et les succès/échecs RxJS
  d'`action-request`; ReactJS prouve les états réels des hooks, le refus de
  permission et l'attente d'un export asynchrone. Un renderer futur doit fournir
  son gate natif séparé : le seul Oracle neutre ne suffit pas à déclarer une
  cible supportée.
- **PLAT-5E** — **fait localement** (2026-08-16), L, P0. Les deux commandes
  acceptent désormais `--apply <change_set_id>` pour une sortie existante.
  L'identifiant lie l'écriture au dry-run effectivement revu et tout plan périmé
  est refusé. Le plan de contrôle racine possède son propre manifest ; le drift,
  les fichiers sans owner et les régénérations partielles ambiguës sont refusés.
  La plateforme prépare une arborescence sœur, y conserve les extensions
  `human-owned` octet par octet, compile les sorties, replanifie contre l'état
  vivant, puis publie avec rollback sur erreur. Un double échec conserve
  explicitement la version précédente dans un chemin de récupération. Preuves :
  évolution `action-request` sur Angular et ReactJS, application
  `workflow-action`, rejet du drift du plan de contrôle, rejet d'un fichier sans
  owner, échec de compilation avant commit, rollback injecté et ajout de ReactJS
  à une sortie Angular seule. `regeneration.existing-output` est retirée des
  lacunes du contrat directeur.
- **PLAT-5F** — **implémentation terminée localement ; promotion externe
  bloquée-humain** (2026-08-16), M, P1. La stratégie retenue est le journal de
  reprise : verrou exclusif par sortie publié atomiquement, récupération d'un
  verrou local périmé, fichiers candidats synchronisés, répertoires
  synchronisés, journal remplacé atomiquement et phases `prepared`,
  `previous-moved`, `candidate-published`. À la tentative de publication
  suivante, la plateforme restaure la version précédente si elle a été déplacée,
  ou finalise la nouvelle seulement si le manifest de contrôle, les manifests
  cibles et chaque fichier correspondent aux hashes attendus. Tout état ambigu
  échoue fermé et conserve l'arbre de secours. Les tests couvrent concurrence de
  deux créations, verrou vivant/périmé, crash simulé entre renommages, processus
  enfant réellement tué par `SIGKILL` après chacun des deux renommages,
  publication interrompue valide, contenu publié contradictoire, journal
  sur-spécifié, rollback et double échec, ainsi que l'échec du journal sur une
  première publication. **Décision fermée par ADR-0035 :** la sortie v1 est
  inactive pendant la commande et activée uniquement après succès ; les lecteurs
  externes concurrents ne sont pas supportés. APFS/macOS et ext4/Linux locaux
  sont les seuls profils admis, contrôlés par `statfs` avant écriture. Le gate
  `check:publication-durability` exerce les primitives réelles et les crashs ;
  la CI possède une matrice bloquante `macos-14`/APFS + `ubuntu-24.04`/ext4. Le
  code est séparé entre orchestration/candidats (`generation-publication.mjs`),
  transaction durable (`generation-transaction.mjs`) et contrat de stockage
  (`publication-durability.mjs`) ; chaque module et suite reste sous 800 lignes,
  sans dérogation. **Seule action restante avant promotion M3 :** obtenir la
  première exécution verte de cette matrice externe après revue/indexation et
  push ; ne pas inventer ce résultat depuis le poste local.
- **PLAT-6** — différé, L, P1. Ajouter Figma comme source de Presentation intent
  après clôture de PLAT-1 à PLAT-5.

### 2.1 Preuves empiriques déjà produites

- **ROAD-3c** — **fait** (2026-08-12), M, P2, alias `React POC 2026-08-12`. POC
  transposition multi-stack : `libs`-équivalent React+TS pour
  `settings-security/users` construit hors dépôt (scratch, jamais copié dans
  `libs/`), Oracle réel exécuté (`tsc --noEmit`, `eslint --max-warnings=0`,
  `vitest run`) → 0 erreur, 25/25 tests, domain 100 % statements. **Portée de la
  preuve :** les principes de vérification se transposent à React. Aucun code
  ajouté au dépôt : ce résultat ne compte pas comme renderer reproductible ni
  comme preuve de l'IR multi-stack d'ADR-0030.
- **ROAD-3d** — **fait**, M, P2, alias `2026-08-12`. Échantillonnage du corpus
  pour mesurer le taux de règles métier non déductibles d'un legacy : 8/44
  chaînes → 37 % mécanique / 37 % déductible avec contexte / 25 % non
  déductible. Cf.
  [`echantillonnage-regles-non-deductibles.md`](./echantillonnage-regles-non-deductibles.md).
  Sert de base de calibrage à ROAD-3e et de contraste au 100 % structurel de la
  couche 3 Figma (§2.4 du document de conception).
- **ROAD-3e** — **fait** (conception + test manuel), M, P2, alias `2026-08-12`.
  Propositions de garde-fou pour génération LLM+Oracle semi-autonome (registre
  de motifs à risque + arrêt sur absence de preuve, calqué sur Google
  arXiv:2504.09691). Cf.
  [`propositions-automatisation-seos.md`](./propositions-automatisation-seos.md),
  testé sur 2 cas réels dans
  [`test-e2e-oracle-punt-check.md`](./test-e2e-oracle-punt-check.md). **Non
  branché en pipeline exécutable** — préalable identifié en ROAD-3f.
- **ROAD-3g** — **en pause** (pas abandonné), M, P2, alias `2026-08-11`. POC
  mobile natif (Kotlin/Swift), même module de preuve que ROAD-3c
  (`settings-security/users`). Bloqué par l'allowlist réseau du sandbox
  d'exécution (`repo1.maven.org`, `release-assets.githubusercontent.com`,
  `download.swift.org` tous `blocked-by-allowlist`) — raison d'environnement,
  pas désaccord de fond. Reprise conditionnée à accès réseau débloqué ou machine
  du porteur de projet. Bloc A (principes transposés, sur papier) valide — cf.
  `docs/seos/principes-transferables-multi-plateforme.md` et
  `docs/seos/poc-mobile-bloque-acces-sandbox.md`.

### 2.2 Préalable identifié : découplage DI (déjà exécuté)

- **ROAD-3a** — **fait, Q-1…Q-8 clos** (2026-08-12), L, P1, alias `Q-1…Q-8`.
  Chantier Q (découpler la DI Angular des ports `shared-domain`/
  `shared-application`) — cf.
  [`strategie-cross-stack-revue.md`](./strategie-cross-stack-revue.md) §3,
  formalisé par [ADR-0024](../adr/0024-decouplage-di-ports-shared.md) et
  [ADR-0025](../adr/0025-perimetre-purete-framework-domaine.md). 8 ports mesurés
  (`LoggerPort`, `NavigationPort`, `StoragePort`, `TrustedOriginPort`,
  `ExcelExportPort`, `ConfirmDialogPort`, `NotificationPort`, `TranslationPort`)
  sont des interfaces pures avec `InjectionToken` colocalisé. Garde statique
  bloquant en CI (`tools/check-framework-purity.mjs`, job `guardrails`) : 0
  import `@angular/*` dans les 19 libs `type:domain`/`type:constants` (1068
  fichiers). Test destructif Q-8 : retrait physique réversible des paquets
  `@angular/*` du store bun, `tsc --noEmit` des 19 libs → 0 échec.
- **ROAD-3b** — ouvert, L, P1, alias `S-1…S-7, = T2-1`. Chantier S (IDL-first :
  OpenAPI → DTO générés, tokens de design en JSON plutôt qu'en CSS Angular).
  **Recoupe directement T2-1/T2-2/T2-3 (§1.2) — ne pas traiter séparément**, S-1
  = T2-1.

### 2.3 Adaptateur Figma — différé après la matrice web 2×2

- **ROAD-3f** — différé, XL, P1, alias `2026-08-12, bloqué-accès pour couche 1`.
  Conception d'un pipeline de génération ex nihilo depuis une maquette Figma
  (extraction MCP+Code Connect → suggestion de pattern → spec métier humaine
  courte → G-V-R). Cf.
  [`conception-pipeline-figma-vers-code.md`](./conception-pipeline-figma-vers-code.md).
  **Non implémenté et non prioritaire avant PLAT-1…PLAT-5.** Nécessite ensuite
  un accès Figma réel (fichier + Figma desktop
    - bibliothèque Code Connect configurée) pour la première validation.

    Les 4 critères de passage à l'implémentation (§7 du document de conception),
    à éprouver **dans cet ordre**, chacun avec un test réel :

    1. **Couche 1 seule** — accès réel au MCP Figma (maquette réelle + Figma
       desktop pour `get_variable_defs`) ; vérifier sur un écran connu que
       l'extraction n'invente aucun composant absent de Code Connect. **Non
       engagé — bloqué sur l'accès Figma du porteur de projet.**
    2. **Couche 2 seule** — tester la table de décision heuristique (§3.2 du
       document) sur les 4 patterns déjà validés (`crud-entity`,
       `workflow-action`, `read-only-view`, `action-request`), en redessinant
       leurs structures existantes. **Non engagé.**
    3. **Couche 3** — valider le format de spec courte (§3.3) sur un cas réel
       avec le porteur de projet, mesurer le temps réel vs écriture manuelle.
       **Non engagé.**
    4. **Couche 4** — déjà partiellement éprouvée
       (`test-e2e-oracle-punt-check.md`, = ROAD-3e) ; étendre le motif R-3
       (composant/logique non résolu depuis Figma) et re-tester. **Partiel** via
       ROAD-3e.

---

## 3. Golden reference SEOS/Angular (SEOS) — produit et preuve sémantique

Ces items raffinent le contenu du cas d'usage SEOS→Angular spécifiquement
(traductions, données legacy, RBAC métier, budgets bundle Angular). Le travail
reste nécessaire pour livrer ce cas d'usage et alimenter la Phase 09. Il ne doit
pas être sacrifié à des POC non reproductibles ; voir ADR-0029.

### 3.1 Contrats & données SEOS spécifiques

- **T2-4** — **fait** (2026-08-11), S, P2, alias `DT-2 · 2026-08-11`. Domaine
  mock `reporting` manquant — en réalité `reporting`/`monitoring`/
  `interactive-map` appellent le même endpoint réel
  `GET {SETTINGS_API_URL}/variables`. Fichier renommé
  (`dashboard-variables.mjs`) avec inventaire champ→module en commentaire, pas
  de second handler (aurait dupliqué la logique).

### 3.2 Modèle de données & RBAC SEOS spécifiques

- **T3-2** — **fait** (2026-08-11), S, P0, alias `OPS-7 · I-7`. Format réel
  `CurrentUser.paths` confirmé par l'utilisateur (JSON réel d'un
  `POST /auth/login` staging) = chemins absolus avec slash. `pathsGuard`
  corrigé. **A révélé T3-2b, non résolu.**
- **T3-2b** — ouvert, L, P0, alias `T3-2, 2026-08-11`. Désalignement quasi total
  entre les segments `app.routes.ts` (Angular) et les chemins réels
  `CurrentUser.paths` du backend — ne casse pas la sécurité (fail-closed déjà en
  vigueur) mais rend la quasi-totalité des routes protégées **inaccessibles à
  tout utilisateur réel**, silencieusement. **Décision produit requise**
  (renommer les segments Angular ou mapping explicite segment↔path) — nécessite
  autorité produit, pas une correction technique unilatérale.
- **T3-3** — **fait** (2026-08-11), M, P1, alias `C-4`.
  `settings-security/domain` avait 0 spec sur 15 VO et 7 entities (8,21 %
  statements). 34 fichiers `.spec.ts` ajoutés → 97,94 % statements / 91,42 %
  branches / 96,2 % functions (95 tests, 37 fichiers).
- **T3-4** — fait, S, P1, alias `DT-6`. Risque `provideDevPermissions()` :
  preuve exclusion prod.
- **T3-5** — partiel, M, P2, alias `domaine`. Invariants filtre/période
  (`InvalidPeriodError`) : matrix tests croisée modules RO + WA.
- **T3-6** — **fait** (2026-08-10), S, P1, alias
  `NOUVEAU 2026-08-10, clos 2026-08-10`. Comportement
  `reportStatesDetailsPermissionsReject`/`requestsDetailsPermissionsReject`
  confirmé intentionnel (pas un bug) ; cas croisé de test ajouté + commentaire
  anti-régression.
- **T5-1** — bloqué-humain, L, P0, alias `I-8 · C-8 · P-12`. e2e authN : login,
  token sur requête, 401 → logout.
- **T5-2** — ouvert, M, P0, alias `I-7`. Matrix tests `pathsGuard` × formats
  `paths` réels (après T3-2).
- **T5-4** — partiel, M, P2, alias `I-7 doc`. Document/ADR matrice permission
  legacy ↔ monorepo.
- **T5-5** — **fait** (2026-08-10, commit `1bb564a`), M, **P0**, alias
  `NOUVEAU 2026-08-10, clos 2026-08-10`. `pathsGuard` était limité aux 4 modules
  workflow-action — 24 segments de route CRUD restants ont reçu
  `canActivate: [pathsGuard]` (total 28/28). Erreur d'arithmétique dans la
  spécification d'origine (23/27 au lieu de 24/28) trouvée et corrigée. **Note
  process** : ce commit a utilisé `--no-verify` (problème d'environnement
  documenté, pas de contenu) — pratique interdite depuis.

### 3.3 Performance, observabilité, résilience — spécifiques à l'app Angular

- **T8-1** — partiel, S, P1, alias `P-7`. CI fail sur delta
  `bundle-metrics.json`.
- **T8-2** — partiel, M, P1, alias `P-5`. Composition bundle publiée +
  réutilisable (source-map-explorer artefact CI).
- **T8-3** — ouvert, L, P1, alias `P-6`. Découper chunk commun (CDK, OL,
  date-fns…) marge ≥ 150 kB.
- **T8-4** — décision, S, P2, alias `CI-3`. Nightly composition : passer de
  `continue-on-error` à bloquant si signal stable.
- **T8-5** — ouvert, M, P2, alias `Big Tech gap`. Lighthouse/CWV (LCP CLS INP)
  lab en nightly.
- **T8-6** — partiel, S, P2, alias `ADR-0016`. Budgets lazy chunks (ExcelJS/ OL
  déjà lazy — documenter plafonds séparés).
- **T9-1** — décision, M, P1, alias `P-3`. Choisir + câbler collecteur
  (Sentry/OTel) + DSN + CSP `connect-src`. Mémo produit :
  `docs/architecture/memo-telemetrie.md` (état `LoggerPort`/
  `ConsoleLoggerAdapter`, aucune sortie réseau — décision réservée à un humain).
- **T9-2** — partiel, S, P1, alias `P-2`. Brancher `GlobalErrorHandler` +
  `LoggerPort` sur le collecteur.
- **T9-3** — ouvert, M, P1, alias `P-4`. Correlation-id HTTP (auth/error
  interceptors) ↔ télémétrie.
- **T9-4** — partiel, S, P2, alias `P-1`. Docs d'usage LoggerPort (niveaux,
  redaction PII).
- **T9-5** — différé, M, P2, alias `SRE`. SLO front basiques (error rate, auth
  fail rate) + alerte.
- **T10-1** — ouvert, M, P1, alias `Big Tech gap`. Politique HTTP : timeout
  explicite par API_URL + retry idempotent GET.
- **T10-2** — ouvert, M, P1, alias `Big Tech gap`. Mode dégradé UI quand API
  0/5xx (empty states documentés + tests).
- **T10-3** — ouvert, M, P2, alias `Big Tech gap`. Circuit/backoff pour boucles
  facade `resource` (éviter storm).
- **T10-4** — ouvert, M, P1, alias `croise T12`. Smoke « back offline » : auth +
  pages clés restent safe.
- **T10-5** — **fait** (même revue que T4-6, 2026-08-11), S, P2. Runbook
  `docs/architecture/runbook-csp-grafana.md` — comportement fail-closed déjà
  correct dans le code, seulement documenté en commentaires dispersés avant ce
  jour.

### 3.4 Qualité de code — corrections ponctuelles SEOS (ex-T11, sous-ensemble)

- **T11-2** — fait, S, P2, alias `CI-2`. `check:i18n` local aligné sur CI
  bloquante (retrait `--warn-only`).
- **T11-3** — **fait** (2026-08-11), M, P2. Purge clés i18n orphelines : 255
  signalées → 200 faux positifs confirmés (construction dynamique) + 55 clés
  confirmées mortes par grep exhaustif, supprimées. Flag `--list-unused` ajouté
  à `tools/check-i18n.mjs` pour pouvoir les nommer (auparavant, seul un compte
  était affiché).
- **T11-4** — ouvert, M, P2, alias `K-6`. Union littérale clés i18n (tsc).
- **T11-6** — **fait**, S, P2, alias `F-6, clos 2026-08-10`. Plafond poids
  fichiers : `ALLOWLIST_LIGNES` confirmée vide (0 exemption silencieuse). Le
  vrai défaut trouvé : le message d'erreur du script recommandait lui-même
  `--no-verify`, à l'exact opposé de la règle « jamais contourner pre-commit » —
  retiré.
- **T11-8** — ouvert, M, P1, alias
  `NOUVEAU 2026-08-10, précisé après vérification HttpCacheStore`. Pattern
  `entityCache = new Map()` non borné, dupliqué indépendamment dans 67 fichiers
  mapper. Nuancé après vérification croisée avec `HttpCacheStore` : pas une
  fuite permanente stricte (`SessionService.clear()` recharge la page), mais
  croissance non bornée pendant une session active longue, jamais mesurée. Mémo
  produit : `docs/architecture/politique-cache-mappers.md` (conception
  `CachedEntityMapper`/LRU proposée, aucun mapper modifié — décision de
  migration réservée à un humain).
- **T11-9** — **fait** (2026-08-10), S, P2, alias
  `NOUVEAU 2026-08-10, clos 2026-08-10`. 3 composants dérogeant à la convention
  Signal Forms migrés (dont fusion parent+enfant sur instruction explicite «
  jamais de `ReactiveFormsModule` »).
  `grep -rl "ReactiveFormsModule" libs/ apps/` → 0 import réel restant.

### 3.5 Tests spécifiques aux modules SEOS (ex-T12, sous-ensemble)

- **T12-1** — **fait**, L, P0, alias `C-2`. Target `test` + suites
  dashboard/monitoring/reporting/interactive-map (mappers + filtres +
  presenter).
- **T12-2** — **fait**, S, P0, alias `C-5a`. Specs orphelines settings-security
  (domain/app/ui) câblées dans `project.json`.
- **T12-9** — ouvert, L, P2, alias `K-9`. Revue WCAG AA `shared-ui`.
- **T12-17** — partiel, L, P1, alias `L-CORE · L-UI`. Specs unit restantes
  `core` + `shared-ui` composants.
- **T12-19** — **fait** (2026-08-10), S, P1. 4 use-cases sur 6 sans test dans
  `report-states/application` — 4 specs ajoutées.
- **T12-20** — **fait** (2026-08-10), S, P1, alias
  `NOUVEAU 2026-08-10, découvert en produisant P1-1, clos 2026-08-10`.
  `RequestsDetailsMapper` sans test unitaire — découvert en produisant le mémo
  P1-1, son équivalent `ReportStatesDetailsMapper` avait, lui, un test.
- **T12-21** — **fait** (2026-08-10), S, P2. Code mort public confirmé
  (`isReportStatesDetailsQualificationState`) — supprimé.
- **T12-22** — **fait** (2026-08-10), S, P1. Même classe de fuite i18n que
  T13-10, préfixe différent : `report-states-details-status-label.constant.ts`
  empruntait `REQUESTS.ALL.FILTER.STATUS_*` pour 6 des 7 statuts.
- **T12-23** — **fait**, S, P2, alias
  `NOUVEAU 2026-08-10, découvert en exécutant P2-1`. `[formField]` (Signal
  Forms) interdit l'attribut natif `maxlength` — découvert en migrant
  `tasks-actions-processing-form-dialog.component.ts`.
- **T12-24** — **fait** (2026-08-10), S, P2, alias
  `NOUVEAU 2026-08-10, découvert en traitant T12-21, clos 2026-08-10`. Autres
  type-guards d'énum morts, même famille que T12-21
  (`isReportStatesDetailsStatus`, `isProcessingDetailsState`,
  `isProcessingDetailsProcessingState`) — supprimés.
- **T13-12** — **fait** (2026-08-11), S, P2, alias
  `lié T12-3/T12-5, clos 2026-08-11`. `@cmz/workflow-details-domain` sous le
  seuil ADR-0021 : 71,3 % → 96,5 % statements.
- **T13-13** — **fait** (2026-08-11), S, P2. Catch-block validation UI jamais
  testé — specs créées pour les deux dialogs (report-states/ requests), 3 cas
  chacun.
- **T13-15** — **fait** (2026-08-11), M, **P1**, alias
  `NOUVEAU 2026-08-11, même classe que T1-5/ADR-0022`. Corpus
  `monitoring`/`reporting`/`interactive-map` périmé depuis T1-6 (nœuds corpus
  pointaient encore vers les 3 anciens chemins d'entités supprimées). Corrigé,
  100 % verified/tranche-closed après régénération.

### 3.6 Documentation & ADR spécifiques SEOS (ex-T13, sous-ensemble)

- **T13-2** — partiel, S, P2, alias `ROAD-1`. Clôturer ou corriger Phase 06
  feuille-de-route (largement fait en pratique).
- **T13-3** — ouvert, M, P2, alias `OUVERT-1 · GVR-5`. Cadrage IA local
  documenté (skills, MCP Nx, Web Codegen Scorer).
- **T13-4** — partiel, M, P1, alias `CORPUS-1`. Finaliser commit des 10 JSONL
  corpus + coverage générée.
- **T13-5** — ouvert, L, P1, alias `CORPUS-2`. Meta 12/12 ou règle écrite « hors
  scorecard IR » pour modules crud.
- **T13-7** — bloqué-humain, M, P1, alias `OPS-5`. Revue humaine ton des ~320
  traductions auto.
- **T13-8** — partiel, S, P2, alias `GVR-8`. Documenter `corpus:all`/ `emit-all`
  dans guides.
- **T13-9** — différé, S, P2, alias `ADR-0015`. ADR-0015 option : `oracle.mode`
  dans JSONL.
- **T13-10** — **fait** (2026-08-10), S, **P1**, alias
  `NOUVEAU 2026-08-10, clos 2026-08-10`. Fuite i18n confirmée : `report-states`
  (fiche « details ») utilisait le namespace `REQUESTS.DETAILS.*` au lieu de
  `REPORT_STATES.DETAILS.*`. Grep exhaustif a trouvé 15 fichiers (pas 10 comme
  le constat d'origine, 5 manquants dont 2 `.spec.ts`).
- **T13-11** — **fait** (2026-08-10), S, P2. Convention DI incohérente non
  documentée — 2 erreurs factuelles dans le constat initial corrigées après
  vérification (66 `@Injectable()` réels, pas 41 ; 555 `@Service()`, pas 554).
  Section ajoutée dans `LLM_CONTEXT.md` §2 avec la règle et les chiffres
  corrigés.

### 3.7 Backlog produit P2 (hors score IR, non bloquants Meta)

Ce sont des items produit purs, listés ici sans détail individuel car le fichier
source ne les détaille pas ligne à ligne (table synthétique) :

| Id           | Module                        | Tâche                                                     | Origine                |
| ------------ | ----------------------------- | --------------------------------------------------------- | ---------------------- |
| P2-WA-1      | workflow-action               | Parité ManagementDialog (tabs/photos/map/sweet-alert)     | processing/requests    |
| P2-WA-2      | processing                    | Operators multi-select                                    | processing             |
| P2-WA-3      | processing tasks/actions      | Sweet-alert + radio-card operator                         | processing             |
| P2-WA-4      | processing                    | Tranche D presenters UI + export Playwright               | processing             |
| P2-REQ-1     | requests                      | OSM link, mutations inline, chatbot UX                    | requests               |
| P2-MAP-1     | interactive-map               | Clusters/tuiles/geojson/filtres (= SIG P2)                | interactive-map · DT-1 |
| P2-INFRA-1…3 | administrative-infrastructure | Carte position, cascade geo, export listes                | admin-infra            |
| P2-COV-1…3   | coverage-areas                | Historique shared, GeoJSON preview, Excel                 | coverage-areas         |
| P2-CMS-1…2   | content-management            | Rich-text, preview média                                  | content-management     |
| P2-TEAM-1…3  | team-organization             | participants assign, free participants, arbre permissions | team-organization      |
| P2-BOUND-1   | administrative-boundary       | Smoke navigateur cascade/delete                           | admin-boundary         |
| P2-MON-1     | monitoring→dashboard          | Retrofit Grafana SVG                                      | monitoring             |

Tous **ouverts**, non détaillés individuellement dans le fichier source.

---

## 4. Hygiène opérationnelle permanente (OPS)

Pertinente quel que soit l'objectif du dépôt — CI, protection de branche, hooks,
gouvernance, sécurité, licences.

### 4.1 Préalable forge / ARB

- **OPS-1** — partiel, M, P0 Ops, alias `P0-N1`. Push + PR + CI verte (36
  commits + dirty).
- **OPS-2** — partiel, S, P1 Ops, alias `G-2`. Revalider protection `main` UI
  GitHub.
- **OPS-3** — en cours, S, P1 Ops, alias `G-7 · T6-4`. Claim compte Nx Cloud
  (id + PAT login OK) ; reste fin de setup VCS/GitHub wizard + bandeau «
  complete setup » + token CI secret. _(= T6-4, même item, deux ids
  historiques.)_
- **OPS-4** — bloqué-humain, S, P1, alias `P1-13`. Second relecteur CODEOWNERS.
- **OPS-8** — ouvert, S, P1 Ops, alias `carto #6`. `nginx -t` réel conf + CSP.
  _(recoupe T4-1, même sujet.)_
- **OPS-9** — **fait localement** (2026-08-16), M, P0 Ops. Cause racine isolée
  sous Node `22.22.3` : ce n'était ni TypeScript, ni le code applicatif, ni Nx
  Cloud. Le cache compilateur persistant optionnel d'Angular ouvrait
  `angular-compiler.db` avec le binding natif LMDB `3.5.4` sur macOS arm64 ; le
  processus Node terminait en `SIGABRT`
  (`pointer being freed was not allocated`, pile native `EnvWrap::open`). Le
  message esbuild `all goroutines are asleep - deadlock` observé ensuite était
  secondaire à la disparition du processus hôte. Un cache existant mis en
  quarantaine puis une base neuve ont reproduit le même crash : l'hypothèse
  d'une simple corruption de cache est donc réfutée. Correctif minimal dans
  `apps/backoffice-angular/project.json` : `cli.cache.enabled=false` désactive
  seulement ce cache Angular pour cette application ; le cache de tâches Nx
  reste actif. Preuves sans `CI=true`, sans Nx Cloud et sans cache Nx : builds
  `development` et `production` verts, `ngc --noEmit` vert et suite officielle
  `@angular/build:unit-test` verte (14 fichiers, 57 tests). Le build production
  reste dans le budget initial (`872.64 kB` pour une limite d'avertissement à
  `900 kB`).
- **OPS-10** — **fait localement** (2026-08-16), S, P0 Ops. Node `22.22.3` était
  disponible via NVM et a été explicitement activé conformément à `.nvmrc`.
  `bun run check:engines` est vert, puis `bun install --frozen-lockfile` a
  terminé avec succès. Les gates rejoués dans ce runtime conforme sont verts :
  plateforme de génération (94 tests core + 4 Angular + 5 ReactJS), Oracle des
  targets (72 bibliothèques), `ngc`, tests Angular et deux builds d'OPS-9. Le
  dépôt conserve son contrôle fail-closed : un shell parent qui n'active pas
  `.nvmrc` et reste en `22.21.0` sera toujours refusé ; il doit exécuter
  `nvm use` avant Bun. Au passage, `check:targets` a été rendu compatible avec
  les deux sorties réelles de `nx show projects` (noms ligne par ligne ou
  tableau JSON compact), supprimant un faux négatif de 144 violations sans
  affaiblir l'oracle.

### 4.2 Sécurité applicative & chaîne d'approvisionnement (ex-T4/T6, sous-ensemble générique)

- **T4-1** — ouvert, S, P1, alias `OPS-8`. `nginx -t` + vérif CSP réelle en
  image Docker. _(doublon fonctionnel avec OPS-8 — même sujet, deux entrées
  distinctes dans le fichier source, non fusionnées pour ne pas perdre la trace
  des deux ids.)_
- **T4-2** — partiel, S, P1, alias `CI-4`. Pipeline Dependabot : absorber PR
  sécu, maintenir `bun audit --high` = 0.
- **T4-4** — différé, M, P2, alias `Big Tech gap`. DAST minimal staging (OWASP
  ZAP baseline ou équivalent) post-I-8.
- **T4-5** — fait, S, P1, alias `Big Tech gap`. Secret scanning pre-push + CI
  (gitleaks v8.24.3 piné, `check:secrets`).
- **T4-6** — **fait** (2026-08-11), S, P2. Revue configs `frame-src` Grafana —
  confirmé fail-closed par construction (CSP réseau + `TrustedOriginPort`
  applicatif). Doc périmée corrigée au passage (le commentaire affirmait
  `SafeUrlPipe` « non résolu » alors que le correctif existait déjà). Runbook
  créé (voir aussi T10-5, même revue).
- **T6-1** — décision, M, P1, alias `OPS-6`. Revue juridique
  `licences-tierces.md` + `LICENSE` + régime SEOS/corpus.
- **T6-2** — **fait**, S, P2, alias `2026-08-11`. Job CI inventaire licences
  automatisé (`tools/check-licenses.mjs`), gate production 100 % permissive.
  Découverte en l'écrivant : `licences-tierces.md` était déjà périmé (axe-core
  MPL-2.0 ajouté 2026-08-04, jamais reporté) — corrigé.
- **T6-3** — ouvert, M, P2, alias `Big Tech gap`. Générer SBOM cyclonedx/spdx en
  CI artifact.
- **T6-4** — en cours, S, P1, alias `OPS-3`. _(= OPS-3, voir §4.1.)_

### 4.3 IAM/RBAC — mécanisme générique (ex-T5, sous-ensemble)

_(T5-1 à T5-5 sont spécifiques au RBAC SEOS et déjà classés en §3.2 — T5-3 est
le seul mécanisme suffisamment générique pour figurer en §1.4.)_

### 4.4 Confidentialité & protection des données (ex-T7, générique par nature)

- **T7-1** — décision, M, P1, alias `CORPUS-6 · P1-N6`. Cadrage réglementaire
  données perso. Mémo produit : `docs/architecture/memo-donnees-personnelles.md`
  (inventaire factuel des champs personnels dans les 4 modules workflow, aucune
  politique de rétention proposée — décision réservée à un humain).
- **T7-2** — ouvert, M, P1, alias `ADR-0019`. Politique : le corpus JSONL ne
  doit jamais emporter PII (hash/path only) — contrôle machine.
- **T7-3** — ouvert, M, P1, alias `T9 croisé`. Politique logs (LoggerPort) : pas
  de PII en clair, scrub intercepteurs.
- **T7-4** — décision, M, P2, alias `CORPUS-5`. Durabilité/rétention archive
  corpus de recherche.
- **T7-5** — décision, S, P2, alias `K-11`. ADR mono-langue vs multi-locale
  (i18n données affichées).

---

## 5. Items requalifiés / écartés (REQUALIFIÉ)

Ces items ne sont pas supprimés — leur pertinence a été réévaluée à l'aune
d'ADR-0029, avec justification explicite.

- **T13-6** — état **différé** (inchangé), XL, P2, alias
  `ADR-0019, annoté 2026-08-12`. « Si stratégie ML : nouvel ADR + schéma contenu
  — interdit d'improviser. » **Requalifié** : l'obstacle juridique qui bloquait
  l'Option B d'ADR-0019 est levé par
  [ADR-0023](../adr/0023-titularite-des-droits-sur-le-legacy.md), mais la
  question technique préalable a été tranchée entre-temps par le POC few-shot
  (`poc-few-shot-legacy-nx.md`) puis l'échantillonnage (ROAD-3d, §2.1) :
  l'ambition retenue est une génération LLM+Oracle **avec garde-fou et revue
  humaine** (ROAD-3e), jamais une génération autonome sans supervision. Le
  chantier fine-tuning proprement dit (N-2/N-3/N-5, distinct de ROAD-3e) **reste
  interdit d'improviser** — même logique de rejet que celle qui a écarté
  l'hypothèse d'un volume de données suffisant pour faire émerger une
  information absente de l'input (cf. §2.4 du document de conception pipeline
  Figma, qui généralise cette même conclusion à toute source visuelle). Non
  clos, mais sa légitimité dans le cadrage actuel est jugée **basse** : ce n'est
  pas la voie retenue pour avancer sur l'objectif générique.

Aucun autre item du fichier source ne contredit directement ADR-0029 — le reste
du backlog (SEOS, opérationnel, Oracle) reste pertinent, seulement reclassé par
priorité en §1–§4.

---

## Fermetures (ne pas re-ouvrir sans régression mesurée)

Mécanisme conservé tel quel — ids d'un schéma de nommage antérieur (lettres
A–P), différent du schéma `Txx-y` actuel. Certains servent encore d'alias dans
la colonne Alias des tableaux ci-dessus (ex. `D/A-12` pour T1-1, `C-2` pour
T12-1). Ne pas rouvrir sans preuve de régression mesurée :

A- · B-1…B-4,B-6…B-8 · D- · E- · F-1…F-6 · G-3…G-6,G-8 · H-1…H-3 + pattern
family-dupe (id pattern **H-4** ≠ H-4-UI contracts) · I-1…I-7,I-9…I-15 ·
J-1…J-6,J-8,J-10…J-12 · K-1…K-4 · M-1…M-8 (52/52) · N-1,N-4,N-6,N-7 ·
O-1,O-2,O-5,O-6 · P-1/P-2 code paths · Meta IR 8/8 12/12 · crud-entity 100 %
pattern · i18n 0 manquante + CI bloquante · security-audit bloquant.

**Items `Txx-y`/`OPS-y`/`ROAD-y` à l'état `fait` au 2026-08-13** (ne pas rouvrir
sans régression mesurée) : T1-3, T1-4, T1-5, T1-6, T2-4, T2-5, T2-7, T3-1, T3-3,
T3-4, T3-6, T3-7, T4-5, T4-6, T5-3, T5-5, T6-2, T10-5, T11-1, T11-3, T11-5,
T11-6, T11-7, T11-9, T12-1, T12-2, T12-4, T12-6, T12-8, T12-18, T12-18b, T12-19,
T12-20, T12-21, T12-22, T12-23, T12-24, T13-10, T13-11, T13-12, T13-13, T13-14,
T13-15, T13-16, ROAD-3a, ROAD-3c, ROAD-3d.

---

## Séquencement Big Tech (Shift-Left)

Conservé tel quel du fichier source (référence historique de planning par
semaine, antérieure à cette refonte — reflète l'état au moment où il a été
écrit, pas nécessairement l'ordre de priorité recommandé aujourd'hui, qui est
désormais §1 → §2 → §3 → §4 de ce document) :

```
Immédiat   OPS-1 push/PR (quand Actions OK)
           T12-2 settings-security → fait
           T6-4 / OPS-3 Nx Cloud → en cours (lien VCS)
           T3-2 / OPS-7 paths (staging) quand accès
           T11-2 check:i18n local = CI → fait

Semaine 1  T12-1 tests RO-view → fait (16× test + mappers/filtres/presenter)
           T12-8 a11y CI → fait (gate critical|serious + 3 archétypes)
           T2-5 contracts UI · T2-7 pair oracle schema → fait
           T11-1 knip → fait (bloquant CI)

Semaine 2  T12-6 Playwright + smoke mock → fait (CI e2e-smoke)
           T5-3 e2e refus pathsGuard mock → fait (7 e2e verts)
           T2-1 OpenAPI (porteur)
           T12-12 corpus-full forge
           T12-10 re-emit corpus

Semaine 3  T9-1…T9-3 télémétrie
           T8-1…T8-3 bundle
           T10-1…T10-2 résilience HTTP
           T4-5 secrets gitleaks → fait
           T4-3 SAST (CodeQL/Semgrep)

Semaine 4+ T5/T12 e2e réel · T12-13 Phase 09
           T2-2…T2-3 schema→DTO→mock
           T7 privacy machine
           P2 métier par priority produit
```

**Revues de jalon (ARB/Design Review) requises pour :** T1-2/T1-3, T2-1, T7-1,
T9-1, T12-4, T13-6, factorisation O, multi-stack ROAD-3.

---

## Controverses documentaires (ne pas re-ouvrir faux)

| Sujet                                      | Verdict 2026-08-05                                                                                                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-N1 « 482 non commis »                   | Périmé comme bloc unique ; **OPS-1** reste (push 36 + dirty)                                                                                                     |
| security/i18n non bloquants                | **Fermé** 2026-08-04                                                                                                                                             |
| daily-goal hors scope                      | **Fermé** 52/52                                                                                                                                                  |
| H-4                                        | pattern family-dupe ✅ vs **T2-5** contracts UI ✅                                                                                                               |
| Chantier L                                 | scope ✅ vs tests shared = **T12-3**                                                                                                                             |
| CODEOWNERS « fait »                        | zoné ✅ ≠ **OPS-4** second regard                                                                                                                                |
| « 2,2 % tests »                            | Périmé ; unit RO-view ✅ · e2e smoke mock ✅ · staging = T12-7                                                                                                   |
| Corpus `verified` = comportement           | **T12-11** encore vrai risque                                                                                                                                    |
| Corpus 18/18 modules couverts (2026-08-10) | **Volume seulement.** 7 modules crud-entity sur 18 ont un `legacy` synthétique non vérifié — **T12-18**. Ne pas rapporter « corpus complet » sans cette réserve. |

---

## Actualisation

```bash
bun run generate:status
find libs -name '*.spec.ts' | sed 's|libs/\([^/]*\)/.*|\1|' | sort | uniq -c
rg -n 'continue-on-error' .github/workflows/*.yml
node tools/check-duplicate-files.mjs && node tools/check-duplicate-files.mjs --family
git rev-list --count origin/main..HEAD
# revues Big Tech : ce fichier §§ 1-4
```

---

## Annexe — Index de correspondance ancien id → nouvelle section

Table de recherche rapide : chaque id historique pointe vers sa nouvelle section
dans ce document.

| Id               | Nouvelle section | Id      | Nouvelle section |
| ---------------- | ---------------- | ------- | ---------------- |
| OPS-1            | §4.1             | T7-5    | §4.4             |
| OPS-2            | §4.1             | T8-1    | §3.3             |
| OPS-3 (=T6-4)    | §4.1             | T8-2    | §3.3             |
| OPS-4            | §4.1             | T8-3    | §3.3             |
| OPS-5 (=T13-7)   | §3.6             | T8-4    | §3.3             |
| OPS-6 (=T6-1)    | §4.2             | T8-5    | §3.3             |
| OPS-7 (=T3-2)    | §3.2             | T8-6    | §3.3             |
| OPS-8 (≈T4-1)    | §4.1             | T9-1    | §3.3             |
| OPS-9            | §4.1             | OPS-10  | §4.1             |
| T13-18           | §1.7             | —       | —                |
| P2-* (toutes)    | §3.7             | T9-2    | §3.3             |
| ROAD-1 (=T13-2)  | §3.6             | T9-3    | §3.3             |
| ROAD-2 (=T12-13) | §1.6             | T9-4    | §3.3             |
| ROAD-3 (chapeau) | §2               | T9-5    | §3.3             |
| ROAD-3a          | §2.2             | T10-1   | §3.3             |
| ROAD-3b (=T2-1)  | §2.2 / §1.2      | T10-2   | §3.3             |
| ROAD-3c          | §2.1             | T10-3   | §3.3             |
| ROAD-3d          | §2.1             | T10-4   | §3.3             |
| ROAD-3e          | §2.1             | T10-5   | §3.3             |
| ROAD-3f          | §2.3             | T11-1   | §1.5             |
| ROAD-3g          | §2.1             | T11-2   | §3.4             |
| ROAD-4 (=T1-2)   | §1.1             | T11-3   | §3.4             |
| T1-1             | §1.1             | T11-4   | §3.4             |
| T1-2             | §1.1             | T11-5   | §1.5             |
| T1-3             | §1.1             | T11-6   | §3.4             |
| T1-4             | §1.1             | T11-7   | §1.5             |
| T1-5             | §1.1             | T11-8   | §3.4             |
| T1-6             | §1.1             | T11-9   | §3.4             |
| T2-1             | §1.2             | T12-1   | §3.5             |
| T2-2             | §1.2             | T12-2   | §3.5             |
| T2-3             | §1.2             | T12-3   | §1.6             |
| T2-4             | §3.1             | T12-4   | §1.6             |
| T2-5             | §1.2             | T12-5   | §1.6             |
| T2-6             | §1.2             | T12-6   | §1.6             |
| T2-7             | §1.2             | T12-7   | §1.6             |
| T2-8             | §1.2             | T12-8   | §1.6             |
| T3-1             | §1.3             | T12-9   | §3.5             |
| T3-2             | §3.2             | T12-10  | §1.6             |
| T3-2b            | §3.2             | T12-11  | §1.6             |
| T3-3             | §3.2             | T12-12  | §1.6             |
| T3-4             | §3.2             | T12-13  | §1.6             |
| T3-5             | §3.2             | T12-14  | §1.6             |
| T3-6             | §3.2             | T12-15  | §1.6             |
| T3-7             | §1.3             | T12-16  | §1.6             |
| T4-1             | §4.2             | T12-17  | §3.5             |
| T4-2             | §4.2             | T12-18  | §1.6             |
| T4-3             | §1.4             | T12-18b | §1.6             |
| T4-4             | §4.2             | T12-19  | §3.5             |
| T4-5             | §4.2             | T12-20  | §3.5             |
| T4-6             | §4.2             | T12-21  | §3.5             |
| T5-1             | §3.2             | T12-22  | §3.5             |
| T5-2             | §3.2             | T12-23  | §3.5             |
| T5-3             | §1.4             | T12-24  | §3.5             |
| T5-4             | §3.2             | T12-25  | §1.6             |
| T5-5             | §3.2             | T13-1   | §1.7             |
| T6-1             | §4.2             | T13-2   | §3.6             |
| T6-2             | §4.2             | T13-3   | §3.6             |
| T6-3             | §4.2             | T13-4   | §3.6             |
| T6-4             | §4.2             | T13-5   | §3.6             |
| T7-1             | §4.4             | T13-6   | §5               |
| T7-2             | §4.4             | T13-7   | §3.6             |
| T7-3             | §4.4             | T13-8   | §3.6             |
| T7-4             | §4.4             | T13-9   | §3.6             |
| —                | —                | T13-10  | §3.6             |
| —                | —                | T13-11  | §3.6             |
| —                | —                | T13-12  | §3.5             |
| —                | —                | T13-13  | §3.5             |
| —                | —                | T13-14  | §1.6             |
| —                | —                | T13-15  | §3.5             |
| —                | —                | T13-16  | §1.6             |

---

## Index

| Doc                                                                                                                    | Rôle                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Ce fichier                                                                                                             | Backlog machine + ARB, consolidé par ADR-0029 (preuve plateforme + golden reference SEOS) |
| [`etat-du-socle.md`](./etat-du-socle.md)                                                                               | 2 points ouverts historiques + renvoi                                                     |
| [`STATUS.md`](../../STATUS.md)                                                                                         | Chiffres générés                                                                          |
| [`LLM_CONTEXT.md`](../../LLM_CONTEXT.md)                                                                               | Directives agents                                                                         |
| [`../adr/0029-perimetre-capacites-plateforme-generation.md`](../adr/0029-perimetre-capacites-plateforme-generation.md) | ADR de cadrage courant                                                                    |
| [`generation-platform-capability-matrix.md`](./generation-platform-capability-matrix.md)                               | Claims, niveaux de maturité et matrice de preuve                                          |
| [`conception-pipeline-figma-vers-code.md`](./conception-pipeline-figma-vers-code.md)                                   | Conception détaillée du pipeline §2 (non implémentée)                                     |
| Audits 08-02→08-04                                                                                                     | Historique ; ce document prime si date conflict                                           |

---

_Clôture d'un item = commande/PR, jamais déclaration seule. Si un « fait »
regresse à la mesure, le reclasser ici avec date._

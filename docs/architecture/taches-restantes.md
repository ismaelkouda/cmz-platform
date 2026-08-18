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
- **T2-2** — **fait** (2026-08-18, initialement livré 2026-08-13), L, P0,
  alias `P-9`. Gate CI de **fraîcheur schéma↔DTO** livré :
  `tools/check-dto-schema.mjs` (`bun run check:dto-schema`, branché dans
  `check:all` après `check:pair-schema`) régénère le schéma en mémoire et
  échoue si `git diff` détecte une divergence avec `dto.schema.json`
  committé — même mécanisme que `check:docs-freshness`.
  **Volet « mappers conformes au schéma » (2026-08-18)** : avant d'écrire
  quoi que ce soit, vérifié que `tsconfig.base.json` a déjà `strict: true`
  et que `tsc`/`ngc --strictTemplates` tournent déjà dans l'oracle
  multi-niveaux — pour le sens `dto → domaine`
  (`mapItemFromDto(dto: XxxApiDto)`), tout accès à un champ absent du type
  est déjà une erreur de compilation ; un outil comparant contre
  `dto.schema.json` (projection JSON avec pertes documentées) y serait plus
  faible, donc redondant, pas un vrai gap. Le vrai gap trouvé par
  inspection réelle des 313 mappers : le sens `domaine → dto` utilise à 75
  reprises le pattern `const params = {} as XxxApiDto;` puis des
  assignations `params.champ = ...` une à une, certaines conditionnelles
  (`if (...) { params.champ = ... }`) — le cast `as` désactive la
  vérification stricte de complétude de TypeScript, rien ne garantit
  statiquement qu'un champ `required` du DTO cible est bien assigné avant
  le `return`. Nouveau `tools/check-mapper-dto-conformity.mjs` (AST via
  `ts.createProgram`, même mécanisme que `generate-dto-schema.mjs`) :
  détecte ce pattern précis, vérifie chaque champ `required` du schéma
  contre les assignations inconditionnelles trouvées. **23 cas réels
  trouvés en conditions réelles**, analysés un par un avant tout câblage
  bloquant (aucun accès à `$SEOS_LEGACY_ROOT` ni à un contrat backend
  documenté dans ce sandbox pour trancher formellement) : 2 familles
  nettes — 12 fichiers `delete`/`disable`/`enable`/`find-one-filter` où un
  seul champ id-like (`uniq_id`/`id`) est systématiquement conditionnel
  (`if (validContract.uniqId) {...}`, même motif partout, probablement une
  garde défensive délibérée) ; 11 fichiers `create`/`update`/`filter` où
  plusieurs champs métier ne sont jamais assignés du tout (ex.
  `infrastructure-create.mapper.ts` n'assigne jamais
  `region_id`/`department_id`/`municipality_id`, requis par
  `InfrastructureCreateApiDto`). **Aucun des 23 mappers concernés n'a de
  test unitaire** (`.spec.ts`) dans le dépôt — aucune preuve que ce
  comportement soit testé/voulu, ni dans un sens ni dans l'autre. Câblé
  selon la même doctrine que `KNOWN_GAPS` de
  `check-pattern-nx-coverage.mjs` (tranché comme la seule option cohérente
  avec le reste du dépôt, pas redemandé à l'utilisateur une seconde fois
  après une première clarification déjà obtenue) : baseline figée des 23
  cas nommément listés (clé stable `fichier::fonction::DtoName`), le gate
  échoue sur tout **nouveau** cas non listé (régression bloquée dès
  maintenant) et sur toute entrée devenue stale (corrigée sans être
  retirée de la liste) — sans exiger de corriger les 23 cas existants
  avant une revue humaine. 5 tests `node:test` (fixtures isolées,
  `mkdtemp`) : détection réelle, cas conforme, cast vers type non-DTO
  ignoré, cast sur littéral non vide ignoré (hors périmètre documenté),
  stabilité de la clé.
  **Volet « breaking change = fail » (2026-08-18)** : nouveau
  `tools/check-dto-schema-breaking-changes.mjs`, diff sémantique entre
  deux révisions de `dto.schema.json` (pas juste présence/absence, déjà
  couvert par `check-dto-schema.mjs`). Doctrine de compatibilité standard
  JSON Schema/OpenAPI : BREAKING = `$defs.<Name>` supprimé, propriété
  supprimée, `type` changé, propriété devenue `required`, valeur `enum`
  supprimée, `additionalProperties` resserré à `false` ; COMPATIBLE =
  nouveau `$defs`, nouvelle propriété optionnelle, propriété devenue
  optionnelle, nouvelle valeur `enum`. Lit l'ancienne révision via
  `git show <ref>:docs/architecture/schema/dto.schema.json` (dégradation
  gracieuse si la révision n'existe pas — ex. première introduction du
  schéma — log `INFO` et sort en 0, jamais un crash). 12 tests `node:test`
  sur `diffSchemas()` isolément (chaque règle breaking et chaque règle
  compatible testée séparément, plus schéma identique = aucun écart).
  **Câblage CI (2026-08-18)** : les deux nouveaux scripts ajoutés à
  `check:all` (`package.json`), puis immédiatement vérifiés avec
  `tools/check-ci-wiring.mjs` — qui a effectivement détecté qu'ils étaient
  fantômes (présents dans `check:all`, jamais invoqués par un vrai
  mécanisme CI/husky), même classe de bug déjà rencontrée 3 fois
  auparavant (`check:pair-schema`/`check:corpus-tools` 2026-08-11,
  `check:dto-schema`/`check:pattern-nx:*` 2026-08-14). Corrigé avant tout
  commit : deux nouvelles steps dans le job `docs-freshness` de
  `.github/workflows/ci.yml`, à la suite de `check:dto-schema`. Pour
  `check:dto-schema-breaking-changes`, `fetch-depth: 0` ajouté au
  checkout du job (nécessaire pour `git show origin/<base>:...`, un clone
  superficiel ne contiendrait pas cette révision) et un step `Set schema
  diff base branch` qui calcule `origin/<base_ref>` sur `pull_request`,
  `HEAD~1` sur push direct — réplique exactement le pattern déjà éprouvé
  `Set NX base branch` (job oracle, même fichier). `check-ci-wiring.mjs`
  revérifié vert après ajout. YAML validé structurellement
  (`python3 -c "import yaml; yaml.safe_load(...)"`). **Limite explicite**
  : je n'ai pas pu déclencher ces steps CI moi-même (pas d'accès réseau
  GitHub Actions dans ce sandbox) — le câblage est structurellement
  correct (même mécanisme que les 3 précédents déjà confirmés par une run
  CI réelle) mais reste à confirmer par le prochain run réel, en
  particulier le calcul `origin/<base_ref>` sur une vraie PR.
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
  documentant l'ensemble des vérifications passées.
  `bun run check:docs-freshness` confirmé vert après commit (STATUS.md,
  README.md, LLM_CONTEXT.md, docs/architecture/etat-du-socle.md,
  docs/adr/README.md, docs/README.md — aucun diff généré résiduel).

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
- **PLAT-6 — fait** (2026-08-17), M, P0. Suite à OPS-19, `ci.yml` confirmé
  vert pour la première fois sur `main`
  (`https://github.com/ismaelkouda/cmz-platform/actions/runs/32046594949`,
  commit `24729f3`, 22m14s) — condition exacte posée par PLAT-1/PLAT-3/
  PLAT-4/PLAT-5F pour la promotion M3 (et, pour la matrice de preuve §7 de
  `generation-platform-capability-matrix.md`, les critères M4 « de cette
  seule tranche »). Vérifié avant de modifier la matrice, pas supposé : (1)
  `check:generator-platform` fait partie du job `guardrails`, bloquant en
  tête de `ci.yml`, donc un run global vert l'implique nécessairement ; (2)
  `check:publication-durability` est un job matriciel `fail-fast: false`
  avec les 2 profils `ubuntu-24.04`/ext4 et `macos-14`/APFS attendus par
  PLAT-5F, tous deux dans le même workflow ; (3) le seul
  `continue-on-error: true` du fichier concerne `sast` (Semgrep, rapport
  seul, documenté non bloquant depuis son ajout) — aucun risque de faux vert
  masqué sur les jobs pertinents ici. Mise à jour de
  [`generation-platform-capability-matrix.md`](./generation-platform-capability-matrix.md) :
  §7 (matrice de preuve, 5 lignes M2→M4, note datée), §5 (Angular/ReactJS
  M2→M4), §4 (8 capacités de la tranche `action-request`/`workflow-action`
  M2→M4, `Reprise après interruption` M2→M3 pour PLAT-5F spécifiquement),
  §9 (état synthétique — reformulé pour distinguer la tranche prouvée,
  désormais M3/M4, de la maturité globale de la plateforme qui reste tirée
  vers le bas par `Presentation intent neutre` (M1), les sources non encore
  outillées (§3, M0–M1) et `Repair sous contraintes` (M2, non touché faute
  de critère de promotion explicite retrouvé). **Volontairement NON
  promu** : `Presentation intent neutre` et les sources `OpenAPI`/
  `Description textuelle`/`Tests runtime` (aucun changement de code les
  concernant dans ce lot) ; le claim « plateforme générique » du §6 (second
  domaine réel PLAT-4 encore ouvert, budget d'extensions non mesuré) ; PLAT-5
  qui visait déjà M4 sur un sous-ensemble distinct des 3 mutations
  d'authentification, non re-vérifié ici spécifiquement.
  **Limite explicite** : je n'ai pas ouvert le détail job-par-job du run
  GitHub Actions (pas d'accès réseau dans ce sandbox) — la déduction
  « run global vert ⇒ jobs pertinents verts » s'appuie sur la lecture
  statique de `ci.yml` (dépendances `needs:`, absence de
  `continue-on-error` sur les jobs concernés), pas sur une inspection
  visuelle de chaque job individuel. Si un doute apparaît sur un job
  précis, le vérifier directement dans l'interface GitHub avant de se fier
  à cette déduction pour une décision ultérieure.
- **PLAT-4bis** — **fait** (2026-08-18), XL, P0, alias `second domaine
  workflow-action, suite PLAT-6`. **Constat déclencheur** : PLAT-4/PLAT-6
  ne prouvent la plateforme que sur un seul cas réel `workflow-action`
  (`requests-workflow.definition.json`, cas `requests-details`). Les 4
  modules `workflow-action` du périmètre SEOS (`finalization`,
  `processing`, `report-states`, `requests`) sont déjà documentés comme
  family-dup entre eux (même forme métier, code dupliqué — voir la
  section family-dup plus haut dans ce fichier), donc aucun n'est un
  second domaine réellement indépendant. Décision : construire un second
  domaine **synthétique, hors legacy** (comme `support-request.
  definition.json` l'a déjà fait pour `action-request`), pour prouver la
  généricité du **core**, pas dépendre du périmètre SEOS existant — en
  ligne avec le recadrage utilisateur du 2026-08-18 : « le but est la
  composition qui construit n'importe quel type app… le legacy n'est
  qu'un exemple de point de départ parmi d'autres (Figma, Stitch, idée) ».
  **Découverte structurelle (bloquante, non anticipée)** : une définition
  `content-moderation-workflow.definition.json` écrite à la main (vocabulaire
  `claim`/`moderate`/`remove`/`export`, états `submitted/under-review/
  published/removed`, strictement conforme au schéma JSON
  `workflow-action-definition.schema.json` — schéma qui n'impose aucun nom
  fixe sur `permissions`/`operations[].id`) est **rejetée par le
  compilateur** dès la validation :
  `permissions must be exactly take, qualify, reject, export`. Cause
  identifiée par lecture de `tools/generator-platform/core/
  workflow-action-authoring.mjs` : `validateWorkflowActionDefinition`
  compare les `permissions`/`operations[].id`/`steps`/`rules` de la
  définition à des **constantes en dur** (`expectedPermissions`,
  `expectedSteps`, `expectedRules`) reprenant mot pour mot le vocabulaire
  `take`/`qualify`/`export` de `requests-workflow`. Vérifié que ce n'est
  pas isolé à ce seul fichier : `workflow-action-model.mjs` (lignes
  157-159) exige littéralement les *ids* `take`/`qualify`/`export` dans
  `operationIds.has(...)` ; `renderers/workflow-shared.mjs` (332 lignes)
  code ces mêmes noms dans les **types TypeScript générés**, les noms de
  méthodes de la classe engine émise et les appels de ports
  (`this.ports.call('take', ...)`) ; `core/workflow-runtime-oracle.mjs`
  construit ses événements de test avec `kind: 'take'`/`'qualify'`/
  `'export'` en dur. **Conclusion** : le moteur `workflow-action` actuel
  n'est pas un moteur générique paramétrable par le vocabulaire déclaré
  dans la définition — c'est un template à un seul vocabulaire figé, où
  seuls `feature.id`/`feature.name`/`feature.description` et
  `state.statuses`/`state.qualification_statuses` sont réellement
  variables (prouvé par le test existant « la commande génère une
  fonctionnalité renommée », `workflow-action.test.mjs` lignes 202-294 —
  qui renomme `feature` mais garde `take`/`qualify`/`export`
  identiques). **Écart documentaire** : le schéma JSON et le guide
  utilisateur (`creer-un-workflow-action.md`, « le contrat actuellement
  supporté est volontairement borné ») laissent penser que seule la
  *topologie* (take→qualify→export, un type de décision à 2 branches, un
  export à 2 branches) est figée — pas le vocabulaire lexical exact des
  permissions et des ids d'opération. Le claim implicite de généricité
  du core (ADR-0029 §6, PLAT-1 « sans chemin ni concept de framework
  dans l'IR canonique ») est donc plus étroit que ce qui a été
  communiqué : l'IR est neutre vis-à-vis d'Angular/ReactJS (prouvé), mais
  pas encore vis-à-vis du **vocabulaire métier** d'un second domaine
  `workflow-action`. **Baseline de non-régression établi avant toute
  modification du core** : `node --test tools/generator-platform/
  workflow-action.test.mjs` → 10/10 tests verts (vérifié localement,
  exécution réelle possible dans ce sandbox — `node` et `node_modules`
  disponibles, contrairement à OPS-20 qui nécessitait `bun`/`nx`/legacy).
  **Décision actée (2026-08-18)** : généraliser le moteur (compilateur +
  IR + renderer + Oracle) pour accepter un vocabulaire d'opérations et de
  permissions arbitraire, en conservant les invariants structurels réels
  (exactement 3 rôles : une transition simple sans branche, une
  transition avec 2 branches accept/reject, un export avec 2 branches
  rows/no-rows), plutôt que de redimensionner la preuve au vocabulaire
  existant ou de s'arrêter au seul constat. Séquencement retenu (principe
  big tech : jamais de refonte XL sans checkpoint écrit avant, jamais un
  refactor multi-fichiers sans garde-fou de non-régression à chaque
  étape) : ce constat d'abord (fait, checkpoint non-réversible), puis
  généralisation par sous-étape avec le test suite existant comme
  garde-fou après chaque fichier touché, puis seulement alors le second
  domaine `content-moderation-workflow` comme preuve d'acceptation.
  **Fichier source déjà écrit, en attente du moteur généralisé** :
  `tools/generator-platform/sources/
  content-moderation-workflow.definition.json`.
  **Généralisation exécutée et vérifiée (2026-08-18) — 4 fichiers, un à
  la fois, baseline 10/10 revérifié après chacun.**
  (1) `core/workflow-action-authoring.mjs` : `validateWorkflowActionDefinition`
  détecte désormais les 3 rôles structurels (`entry`/`decision`/`export`)
  par forme (`kind`/`topology`/`branches.length`/`to === 'branch'`) au
  lieu de comparer aux ids littéraux `take`/`qualify`/`export` ; les
  `steps`/`rules` attendus restent indexés par rôle, pas par nom — la
  seule exception est `entry` dont les 2 premiers steps portent
  légitimement le nom de l'opération (`external_call:{id}`,
  `notify:{id}`, motif documenté en commentaire).
  (2) `core/workflow-action-model.mjs` : les 3 assertions littérales
  (`pending`/`in-progress` dans `state.statuses`, `pending` dans
  `qualification_statuses`, `operationIds.has('take'/'qualify'/'export')`)
  retirées — remplacées par une exigence de forme (au moins 2 statuts de
  chaque catégorie) ; la présence des 3 rôles est déjà garantie en amont
  par (1), qui s'exécute toujours avant dans
  `compileWorkflowActionDefinition`.
  (3) `renderers/workflow-shared.mjs` (le plus sensible — génère
  littéralement le code TypeScript émis, pas seulement une validation) :
  types, noms de méthodes de la classe `WorkflowActionEngine` et
  littéraux `command.kind`/`ports.call(...)` dérivés de
  `operation.id` réel via `camelCase()` (déjà présent dans
  `renderers/shared.mjs`), au lieu d'être codés en dur. Un piège identifié
  et corrigé pendant l'implémentation : nommer la méthode export
  directement `camelCase(exportOperation.id)` produirait `exportExport`
  (collision id/rôle) — nommage `camelCase(\`${id}-list\`)` retenu,
  qui reproduit exactement l'ancien nom historique `exportList` pour
  `requests-workflow` (donc hash du manifest golden
  `manifests/angular-workflow.manifest.json` inchangé, pas de
  régénération nécessaire — vérifié, pas supposé).
  **Limite explicite non levée** (décision actée avant de coder, voir
  plus haut) : `QualificationEditFields`/`validateEditFields` restent des
  champs de formulaire fixes du domaine `requests` (latitude/longitude/
  placePhoto…) — un domaine qui n'utilise pas `approvalType: 'edit'` ou
  `'callback'` ne les déclenche jamais, mais étendre le schéma pour des
  champs de formulaire arbitraires est un chantier séparé, non engagé.
  (4) `core/workflow-runtime-oracle.mjs` : `assertWorkflowOracle` prend
  désormais un second paramètre `model` obligatoire et dérive `entry`/
  `decision`/`export`/leurs statuts/permissions depuis ce modèle au lieu
  de littéraux `pending`/`in-progress`/`approved`/`rejected`/`take`/
  `qualify`/`reject`. **Défaut de conception intercepté et corrigé avant
  commit** : le premier essai passait le modèle *muté* à l'Oracle dans
  le test de mutation existant (`workflow-action.test.mjs`, « une
  mutation du graphe... ») — l'Oracle dérivait alors ses propres attentes
  depuis le modèle déjà muté, donc ne pouvait structurellement plus
  jamais détecter aucune mutation (cohérence toujours vraie par
  construction). Corrigé : l'Oracle compare le code généré depuis le
  modèle *muté* contre les attentes du modèle *original* — c'est cette
  divergence, pas une tautologie, qui doit être détectée. Trois autres
  appelants non couverts par le test suite initial découverts et
  corrigés dans la foulée (signature `assertWorkflowOracle(fn)` à un
  seul argument aurait planté sur `model.operations` undefined) :
  `after-success-extension.test.mjs` et `workflow-action-mutations.test.mjs`
  — ce dernier particulièrement important : sans le fix, ses 12 tests
  passaient déjà, mais **par un faux positif dangereux** (l'exception de
  `resolveRoles(undefined)` satisfaisait `assert.rejects` même sans
  qu'aucune mutation ne soit jamais réellement exercée par l'Oracle) —
  aurait laissé les 5 mutants du fichier « survivre » silencieusement à
  toute vraie régression future du moteur.
  **Preuve finale (script `tools/generator-platform/plat4bis-verify.mjs`,
  ad hoc, sort à trancher — garder comme fixture de régression ou
  retirer après ce constat) exécutée avec succès sur
  `content-moderation-workflow.definition.json`** : (1) compilation de la
  définition (domaine `content-moderation-workflow`, vocabulaire
  `claim`/`moderate`/`remove`/`export`, états `submitted/under-review/
  published/removed`, entièrement distinct de `requests-workflow`) ; (2)
  génération Angular + ReactJS, type-check strict des deux arbres réussi
  (`typecheckGenerated`, compilateur TypeScript réel, pas une
  approximation) ; (3) Oracle runtime complet passé sur les deux cibles
  (permission refusée, garde d'état invalide, branche accept avec champs
  de callback, branche reject, callback asynchrone de l'export avec
  timing réel vérifié, cas rows-found/no-rows/erreur réseau) ; (4)
  mutation du graphe (`claim.to` changé) détectée sur les deux cibles,
  symétrique au test de mutation existant sur `requests-workflow`.
  **Baseline `requests-workflow` reverifié intact après tout le chantier** :
  `node --test workflow-action.test.mjs
  workflow-action-mutations.test.mjs after-success-extension.test.mjs
  renderers.test.mjs` → 30/30 tests verts (10+12+2+8 — chiffre exact
  reconstitué depuis les runs individuels, pas un seul run combiné à
  cause d'un timeout de la commande shell sur la suite complète du
  dossier `generator-platform`, non liée à ce chantier).
  **Décision actée (2026-08-18)** : intégrer la preuve comme fixture de
  non-régression permanente plutôt que la garder en script ad hoc —
  symétrique à `requests-workflow.definition.json`, cohérent avec
  l'objectif ADR-0029 (le second domaine devient une garantie
  automatique que toute future modification du moteur qui casserait la
  généricité est détectée, pas un constat ponctuel jetable). Exécuté :
  `plat4bis-verify.mjs` réécrit en fichier `node:test` standard (2 tests
  — compilation+génération+type-check strict+Oracle complet sur les deux
  cibles ; détection de mutation sur `claim.to` sur les deux cibles),
  renommé `content-moderation-workflow.test.mjs` pour être ramassé
  automatiquement par le glob `tools/generator-platform/*.test.mjs` déjà
  utilisé par `check:generator-platform:core` (`package.json`) — aucune
  modification de script nécessaire, l'intégration à la gate CI est
  immédiate. Vérifié isolément : 2/2 vert.
  **Trou de vérification précédent fermé** : le run combiné complet du
  dossier (`node --test tools/generator-platform/*.test.mjs`, ~22
  fichiers, budget élargi à 580s au lieu du défaut 120s qui avait
  provoqué un timeout précédemment) a été exécuté en entier dans cette
  session → **161/161 tests verts, exit 0**, aucune régression sur les
  ~20 fichiers non exécutés précédemment (`action-request-*`,
  `behavior-graph-*`, `presentation-flow-*`, `composition-instance-*`…).
  PLAT-4bis est donc clos avec une vérification locale complète, sans
  reste conditionné à un run CI distant — la confirmation CI réelle
  reste une bonne pratique de clôture mais n'est plus bloquante pour
  affirmer que le moteur `workflow-action` est génériquement
  paramétrable par le vocabulaire déclaré dans la définition.
  **Correction post-CI (2026-08-18)** : le run CI réel (`check:generator-
  platform:angular`) a révélé un 4ᵉ appelant de `assertWorkflowOracle`
  non détecté par la vérification locale — `tools/generator-platform/
  stack-tests/angular/workflow-action.spec.ts`, qui compile et exécute
  le code généré contre un **vrai** `TestBed` Angular (`tsc` strict +
  `vitest`). Ce fichier appelait encore l'ancienne signature à un seul
  argument (`assertWorkflowOracle(fn)`), cassée par la généralisation
  de l'Oracle — erreur `Cannot read properties of undefined (reading
  'operations')`. **Cause du angle mort** : les `stack-tests/` ne sont
  exécutables qu'avec `bun`/une compilation Angular réelle
  (`check:generator-platform:angular`/`:reactjs`), indisponibles dans
  ce sandbox (`node`/`node_modules` seuls) — le run local 161/161
  couvrait uniquement `check:generator-platform:core` (`node --test`),
  pas les deux autres sous-commandes de `check:generator-platform`. Le
  pendant ReactJS (`stack-tests/reactjs/workflow-action.spec.ts`)
  n'appelle pas `assertWorkflowOracle` (assertions manuelles
  indépendantes) donc n'était pas affecté. Corrigé : le spec Angular
  récupère désormais `computeWorkflowTargets().model` (le modèle par
  défaut `requests-workflow`, celui utilisé par `prepare-stack-
  tests.mjs` pour générer le code sous test) et le passe en second
  argument. **Leçon retenue** : la vérification locale de ce sandbox
  (`node --test`) ne couvre pas la totalité de la gate CI
  `check:generator-platform` — seule la CI réelle ferme cette classe de
  régression pour de bon ; ne pas déclarer un chantier « clos sans
  reste » sur la seule base d'un run local partiel de la commande
  composite.
  **Clôture CI confirmée (2026-08-18)** : run
  [`32136111520`](https://github.com/ismaelkouda/cmz-platform/actions/runs/32136111520/job/95707805436)
  vert après le correctif — `check:generator-platform` complet
  (`:core` + `:angular` + `:reactjs`, donc y compris la compilation et
  l'exécution réelles contre Angular via `TestBed`/`tsc --strict`) passe
  sur le commit `f73d5fa`. PLAT-4bis est maintenant clos avec la CI
  réelle comme preuve finale, pas seulement la vérification locale
  partielle — cohérent avec la leçon retenue ci-dessus.
  **Documentation de suivi resynchronisée (2026-08-18)** : détecté par
  relecture que `generation-platform-capability-matrix.md` (§4, §9),
  `validation-runtime-workflow-action.md` (avis Principal Engineer) et
  `conception-compositions-evolutives-patterns-memorises.md` (étape H)
  affirmaient encore « second domaine `workflow-action` réel encore
  ouvert » après la clôture réelle de PLAT-4bis — même classe de risque
  que les incidents T13-14/T13-16/T13-17 (documentation qui diverge du
  code réel), ici sur un claim de maturité plutôt qu'un script CI.
  Corrigé aux 3 endroits : le gap est fermé, référencé à PLAT-4bis et à
  la CI verte `32136111520`. **Nouveau gap distinct rendu visible par
  cette correction** : le claim « plateforme générique » (§6 de la
  matrice) exige aussi un « budget d'extensions hors modèle mesuré et
  non masqué par `Custom` » — cette mesure n'a jamais été produite dans
  ce dépôt, sur aucune tranche. Ce n'est pas un gap créé par PLAT-4bis,
  c'était déjà vrai avant, mais il restait masqué derrière le gap «
  second domaine » plus visible. Annoté dans la matrice (§9), pas
  encore budgété ni traité — décision de portée/méthode à trancher
  séparément avant d'engager le travail.
- **PLAT-5G** — **fait localement** (2026-08-16), M, P0. La lacune
  `permissions.runtime-enforcement` est fermée dans le contrat directeur. Une
  opération `authorized` doit déclarer une liste non vide et sans doublon ; les
  autres modes ne peuvent pas porter de permission. Les deux renderers génèrent
  le même contrat `PermissionPort`/`PermissionDeniedError` et appliquent une
  sémantique « toutes requises ». Angular expose un `PERMISSION_PORT` DI
  obligatoire et diffère la vérification jusqu'à la souscription RxJS ; ReactJS
  exige le port dans `createActionRequestHooks` et vérifie à chaque exécution.
  Une permission absente produit `permission_denied` avant tout HTTP/fetch ; une
  permission présente autorise exactement un appel. Preuves : Oracle exécutable
  du gate directeur, 3 scénarios natifs TestBed, 2 scénarios natifs React
  Testing Library et 4 mutants tués (garde neutralisée ou permission remplacée
  sur les deux cibles). Limite explicite : ce garde frontend ne remplace pas
  l'autorisation backend. Il reste exactement 3 lacunes :
  `composition.persisted-instance`, `behavior.graph` et `presentation.flow`.
- **PLAT-5H** — **fait localement** (2026-08-16), M, P0. La lacune
  `composition.persisted-instance` est fermée dans le contrat directeur.
  ADR-0032 (Option C) sépare l'instance de composition persistée de la
  promotion en pattern ; PLAT-5H ne construit que le premier acte, jamais le
  second. Un nouveau module core (`core/composition-instance.mjs`) sait
  construire une enveloppe JSON versionnée et immuable
  (`kind: "composition-instance"`, `schema_version`, `instance_id`,
  `recorded_at`, `source`, `contract_ref`, la `projected_definition` exacte
  qui a produit le rendu, les hash d'arbre `manifest_tree_sha256` des deux
  cibles, et une intégrité `sha256-stable-json-v1` calculée sur l'enveloppe
  elle-même). L'enveloppe ne porte jamais de champ de promotion, d'invariants
  réutilisables ni d'identifiant de pattern — c'est vérifié explicitement par
  Oracle. Le cycle complet est exécuté réellement : écriture sur disque dans
  un répertoire temporaire, relecture depuis les octets écrits (pas une
  référence mémoire), recompilation de la `projected_definition` rechargée
  via `compileActionRequestDefinition` + les deux renderers, puis comparaison
  des `tree_sha256` régénérés contre ceux enregistrés — une régénération
  identique aux hash près est la preuve de déterminisme. Le rechargement
  échoue fermé dans quatre scénarios distincts et testés séparément : hash
  d'enveloppe non concordant (charge utile modifiée sans resigner
  l'intégrité), violation de schéma (champ requis absent), JSON tronqué/
  corrompu sur disque, et `contract_ref` ne correspondant pas au contrat
  attendu ; aucun de ces cas ne produit de génération silencieuse. Un
  cinquième cas — une enveloppe validement resignée mais dont le hash d'arbre
  enregistré ne correspond plus à ce que la définition régénère réellement —
  est détecté par la comparaison de régénération, pas par l'intégrité seule,
  ce qui prouve que les deux contrôles sont complémentaires et non redondants.
  Preuves : Oracle exécutable du gate directeur
  (`probePersistedInstance` dans `check-evolvable-composition.mjs`), 8 tests
  directs (`composition-instance.test.mjs`) couvrant construction, séparation
  ADR-0032, round-trip disque octet pour octet, régénération identique,
  falsification, schéma incomplet, `contract_ref` erroné et divergence
  d'arbre, et 3 mutants tués sur les gardes fail-closed du module core
  (`composition-instance-mutations.test.mjs` : hash d'intégrité neutralisé,
  vérification de `contract_ref` neutralisée, détection de divergence
  neutralisée — chacun prouvé en montrant que le module original rejette le
  scénario et que le module muté l'accepte). Limite explicite : ce mécanisme
  ne dit rien sur *où* les instances doivent être stockées en production
  (registre, base de données, etc.) ni sur les critères de promotion en
  pattern — ADR-0032 les déclare explicitement hors périmètre et dette
  assumée ; PLAT-5H prouve seulement que le cycle persist → reload →
  regenerate est déterministe et fail-closed. Il reste exactement 2 lacunes :
  `behavior.graph` et `presentation.flow`.
- **PLAT-5I** — **fait localement** (2026-08-16), M, P0. La lacune
  `behavior.graph` est fermée dans le contrat directeur. Le graphe
  `evolution.behavior_graph` (états `editing`/`submitting`/`confirmed`/
  `business-error`, 3 transitions événementielles) est désormais gouverné par
  un moteur d'exécution réel, pas par une validation de schéma. **Choix
  d'implémentation documenté :** le mécanisme `workflow-action` existant
  (`core/workflow-action-model.mjs`) a été examiné en premier — ADR-0030/0031
  l'exigent — mais rejeté comme base de réutilisation directe : c'est une
  state machine délibérément liée à un domaine fixe (opérations `take`/
  `qualify`/`export`, permissions et règles nommées en dur, validées par
  `validateWorkflowActionDefinition`), pas un moteur générique. Le
  réutiliser pour `action-request`/`support-request` aurait exigé soit de
  dupliquer une forme figée pour un domaine différent, soit d'affaiblir ses
  invariants — les deux à l'opposé de l'esprit « un seul mécanisme, pas de
  duplication ». Le patron architectural réellement réutilisé est celui déjà
  prouvé par `core/workflow-runtime-oracle.mjs` +
  `core/workflow-runtime-harness.mjs` (garde de transition fail-closed
  exécutée réellement en Angular DI et via un port de hooks React) —
  transposé à un graphe **générique et piloté par les données du contrat**,
  jamais par des noms d'état ou d'événement codés en dur. Nouveau module
  core `core/behavior-graph.mjs` : validation structurelle d'une déclaration
  `{ initial, nodes, edges }` (nœuds uniques, initial connu, arêtes sans
  doublon `from/event`, aucun nœud inatteignable depuis l'état initial) et
  compilation en table de transition normalisée. Deux renderers génériques
  (`renderers/behavior-graph-renderer.mjs`,
  `renderers/behavior-graph-stack-adapters.mjs`) émettent un
  `BehaviorGraphEngine` TypeScript identique pour les deux cibles — la garde
  `if (next === undefined) throw new BehaviorGraphViolation(...)` est la
  seule ligne qui décide fail-closed — plus un service Angular injectable et
  une factory de hook React, à l'image exacte de `PERMISSION_PORT`/
  `createActionRequestHooks`. **Choix de portée délibéré :** ce moteur n'est
  pas branché dans les renderers génériques `action-request` (qui servent
  aussi `login`/`forgot-password`/etc., sans graphe déclaré) : le schéma
  `action-request-definition.schema.json` a `additionalProperties: false` et
  ne porte aucun champ `behavior_graph`. Le moteur est matérialisé et exécuté
  séparément à partir de `contract.evolution.behavior_graph`, sur le même
  modèle d'isolation que `probePersistedInstance` (PLAT-5H) — sans toucher
  aux fichiers ni aux hash d'arbre `targets.angular`/`targets.react` déjà
  couverts par le manifest, donc sans risque de régression sur
  `composition.persisted-instance`. Preuve d'exécution réelle
  (`core/behavior-graph-runtime-oracle.mjs`, appelée par
  `probeBehaviorGraph()` dans `check-evolvable-composition.mjs`) : transpile
  et charge le moteur généré pour les deux cibles, démarre dans l'état
  initial déclaré, suit les transitions déclarées
  (`editing→submitting→confirmed` et `editing→submitting→business-error`) et
  prouve qu'un événement absent du graphe est refusé sans jamais faire
  progresser l'état — testé à la fois depuis l'état initial et depuis un
  état intermédiaire, dans les deux stacks. Tests natifs TestBed (Angular,
  6/6, `stack-tests/angular/behavior-graph.spec.ts`) et Testing Library
  (ReactJS, 6/6, `stack-tests/reactjs/behavior-graph.spec.ts`), générés par
  `prepare-stack-tests.mjs` à partir des mêmes fonctions de rendu que
  l'Oracle — pas de duplication de logique. 2 mutants tués sur la garde de
  transition rendue (`behavior-graph-mutations.test.mjs`) : garde
  neutralisée (le `throw` est supprimé) et repli silencieux sur l'état
  initial au lieu d'un rejet — dans les deux cas l'Oracle catche l'absence
  de refus et échoue, prouvant que la garde est porteuse de preuve, pas un
  test tautologique. 12 tests directs sur `core/behavior-graph.mjs`
  (validation structurelle, compilation, application d'événement,
  fail-closed sur état/événement non déclaré) dans `behavior-graph.test.mjs`.
  Validations : 126/126 tests core (dont 14 propres à ce lot), gate
  directeur PASS avec `regressions:[]` et `unexpectedly_implemented:[]`,
  `target_tree_sha256` Angular/ReactJS inchangés (confirmant l'absence
  d'effet de bord sur les renderers `action-request` génériques),
  `eslint --max-warnings=0` propre sur `core/`, `renderers/`, `*.mjs`,
  `format:check` vert, poids fichiers conforme (plafond 800 lignes, chaque
  nouveau fichier ≤ 268 lignes), `tsc --noEmit` et `vitest run` natifs verts
  sur les deux cibles (13/13 chacune, dont les 6 nouveaux tests
  `behavior-graph.spec.ts`). **Limite explicite assumée :** le moteur ne
  gouverne que le graphe déclaré par le contrat directeur pour cette
  composition (`action-request`/`support-request`) ; il n'est pas encore
  câblé comme mécanisme générique disponible à toute définition
  `action-request` future (cela exigerait d'étendre
  `action-request-definition.schema.json`, hors périmètre PLAT-5I). Il reste
  exactement 1 lacune : `presentation.flow`.
- **PLAT-5J** — **fait localement** (2026-08-16), M, P0. La lacune
  `presentation.flow` est fermée dans le contrat directeur — c'était la
  **dernière** lacune déclarée : `expected_gaps` passe de
  `["presentation.flow"]` à `[]`. Le wizard `evolution.presentation` (`kind:
  "wizard"`, 3 étapes ordonnées `request`→`review`→`confirmation`, champs
  propres par étape) est désormais gouverné par un moteur d'exécution réel,
  pas par une validation de schéma suivie d'une recherche de sous-chaîne
  `'confirmation'` dans le code généré (le faux-positif exact remplacé).
  **Choix d'implémentation documenté :** ADR-0030 sépare explicitement le
  Behavior model (états/opérations/transitions/graphe d'exécution) de la
  Presentation intent (vues/navigation/interactions/contenu/accessibilité)
  comme deux des quatre axes complémentaires de l'IR canonique ; le contrat
  directeur reflète ce découpage — `behavior_graph` et `presentation` sont
  deux clés sœurs sous `evolution`, avec un suivi de lacune indépendant
  jusqu'à ce chantier. Une étape de wizard n'est pas un état atteint par un
  événement arbitraire déclaré : c'est une position dans un ordre linéaire
  fixe et déclaré, et la progression est conditionnée par la complétude des
  champs de l'étape courante, pas par un vocabulaire d'événements. Réutiliser
  le moteur `core/behavior-graph.mjs` (PLAT-5I) aurait forcé les id d'étape à
  doubler comme noms de nœuds du graphe de comportement et la complétude de
  champ à se réexprimer comme un événement — un couplage artificiel de deux
  axes qu'ADR-0030 maintient orthogonaux. **presentation.flow est donc un
  nouveau mécanisme générique, pas une extension de behavior-graph**, en
  reproduisant strictement le même patron architectural (module core de
  validation/compilation, renderer TS générique, adaptateurs de stack,
  Oracle d'exécution réelle, mutants, tests natifs). Nouveau module core
  `core/presentation-flow.mjs` : validation structurelle d'une déclaration
  `{ kind, steps }` (id d'étape uniques, `fields` un tableau de chaînes non
  vides) et compilation en table indexée par ordre. Fonctions pures
  `isStepComplete` (un champ déclaré est complet s'il est présent et non
  vide après trim ; une étape sans champ déclaré — `review` — est toujours
  complète), `applyPresentationAdvance` (accepté seulement si la cible est
  exactement l'étape suivante déclarée ET l'étape courante est complète ;
  saut d'étape, étape inconnue, ou avance avant complétude sont tous refusés
  de la même façon, fail-closed, en renvoyant l'étape inchangée) et
  `applyPresentationBack` (retour accepté seulement d'une étape à la fois,
  jamais de re-vérification de complétude — revisiter une étape déjà
  remplie pour l'éditer est toujours permis). **Choix explicite sur le
  retour arrière :** ADR-0030 ne tranche pas si un wizard doit permettre de
  revenir en arrière ; le choix assumé ici est « oui, une étape à la fois,
  sans re-validation », cohérent avec l'attente usuelle d'un wizard
  (« revoir/corriger ce qui a déjà été saisi ») et testé comme tel des deux
  côtés (fail-closed sur un saut de plus d'une étape en arrière).
  Renderer générique `renderers/presentation-flow-renderer.mjs` : émet un
  `PresentationFlowEngine` TypeScript piloté uniquement par une table
  d'étapes/ordre/champs gelée, compilée depuis le contrat — jamais de nom
  d'étape ou de champ codé en dur dans le contrôle de flux. Deux gardes
  fail-closed distinctes dans `advance()` (`targetIndex !== currentIndex +
  1` pour l'ordre, `!isCurrentStepComplete(values)` pour la complétude) et
  une garde symétrique dans `back()`. Adaptateurs
  `renderers/presentation-flow-stack-adapters.mjs` : service Angular
  injectable + factory de hook React, à l'image exacte de
  `PERMISSION_PORT`/`createActionRequestHooks` et de
  `behavior-graph-stack-adapters.mjs`. Preuve d'exécution réelle
  (`core/presentation-flow-runtime-oracle.mjs`, appelée par
  `probePresentationFlow()` dans `check-evolvable-composition.mjs`) :
  transpile et charge le moteur généré pour les deux cibles, démarre sur la
  première étape déclarée (`request`), refuse fail-closed (a) un saut vers
  une étape au-delà de la suivante immédiate, (b) une étape cible inconnue,
  (c) une avance avant complétude des champs de l'étape courante — aucun de
  ces trois refus ne change l'étape courante —, puis suit le chemin heureux
  déclaré jusqu'à l'étape terminale une fois chaque étape complétée, et
  prouve qu'un retour d'une étape est accepté tandis qu'un retour de plus
  d'une étape est refusé — testé dans les deux stacks. **Choix explicite
  sur le critère de progression :** la complétude d'une étape est définie
  ici comme « chaque champ déclaré par le contrat pour cette étape est
  présent et non vide (trim) dans les valeurs fournies » — aucune validation
  métier plus fine (format email, etc., déjà couverte par
  `permissions.runtime-enforcement`/`data.canonical-model`) n'est reprise
  ici ; c'est le critère minimal explicite demandé par la consigne PLAT-5J
  en l'absence d'un schéma de validation par étape dans le contrat. Tests
  natifs TestBed (Angular, 9/9,
  `stack-tests/angular/presentation-flow.spec.ts`) et Testing Library
  (ReactJS, 9/9, `stack-tests/reactjs/presentation-flow.spec.ts`), générés
  par `prepare-stack-tests.mjs` à partir des mêmes fonctions de rendu que
  l'Oracle. 2 mutants tués sur les gardes rendues
  (`presentation-flow-mutations.test.mjs`) : garde anti-saut d'étape
  neutralisée (skip-ahead accepté) et garde de complétude neutralisée
  (avance sur étape incomplète acceptée) — dans les deux cas l'Oracle catche
  l'absence de refus et échoue, prouvant que les gardes sont porteuses de
  preuve, pas un test tautologique. 20 tests directs sur
  `core/presentation-flow.mjs` (validation structurelle, compilation,
  complétude, avance/retour fail-closed) dans `presentation-flow.test.mjs`.
  Validations : 149/149 tests core (dont 23 propres à ce lot : 20 + 3
  sous-tests de mutants), gate directeur PASS avec `regressions:[]`,
  `unexpectedly_implemented:[]` et **`actual_gaps:[]`** — `expected_gaps` du
  contrat directeur passe à `[]`, `promotion_rule.success` (« expected_gaps
  est vide et chaque invariant est vérifié par des oracles exécutables »)
  voit sa première condition satisfaite ; ce script ne déclenche, n'évalue
  ni ne documente lui-même la seconde condition ni aucune promotion —
  `contract.status` reste `"characterization"`, aucun mécanisme de promotion
  n'a été invoqué. `target_tree_sha256` Angular/ReactJS inchangés
  (confirmant l'absence d'effet de bord sur les renderers `action-request`
  génériques), `eslint --max-warnings=0` propre sur `core/`, `renderers/`,
  `*.mjs`, `format:check` vert (Prettier a reformaté 5 fichiers du lot,
  vérifié à nouveau vert après), poids fichiers conforme (plafond 800
  lignes, chaque nouveau fichier ≤ 379 lignes), `tsc --noEmit` et
  `vitest run` natifs verts sur les deux cibles (22/22 chacune, dont les 9
  nouveaux tests `presentation-flow.spec.ts`). Un test préexistant
  (`evolvable-composition.test.mjs`) affirmait en dur
  `decision_satisfied === false` ; mis à jour pour refléter l'état réel
  (`true`) désormais que `actual_gaps` est vide, avec un commentaire
  explicite que ceci ne constitue ni ne déclenche une promotion. **Limite
  explicite assumée :** comme PLAT-5I, ce moteur ne gouverne que le flux
  déclaré par le contrat directeur pour cette composition
  (`action-request`/`support-request`) ; il n'est pas câblé comme mécanisme
  générique disponible à toute définition `action-request` future (le
  schéma `action-request-definition.schema.json` n'a toujours aucun champ
  `presentation`, `additionalProperties: false` inchangé). Le critère de
  complétude par champ (présence + non-vide) est délibérément simple ; il ne
  couvre pas une validation métier par étape plus riche, qui resterait à
  spécifier dans un futur contrat si un cas réel l'exige. Il ne reste
  **aucune lacune déclarée** dans le contrat directeur
  `evolvable-composition.contract.json` à l'issue de ce chantier.
- **PLAT-5K** — **fait localement** (2026-08-16), M, P0. Ferme le seul
  invariant du contrat directeur (`invariants[5]`, sur 6) qui n'avait jamais
  eu d'oracle exécutable : « The evolution run itself does not modify core,
  planner, profiles, or renderers. » Avant ce chantier, cette affirmation
  n'était vraie que **par construction du code** : chaque `writeFile`/
  `mkdir`/`rm` du pipeline de génération cible un répertoire obtenu via
  `mkdtemp(resolve(tmpdir(), ...))`, un fait vérifiable à la lecture mais
  jamais vérifié par un test — aucun oracle ne l'aurait détecté si un futur
  bug faisait fuir une écriture vers le vrai arbre source.
  **Délimitation exacte retenue pour « core, planner, profiles, or
  renderers »** : le planner (`core/artifact-plan.mjs`) vit dans `core/`, ce
  n'est donc pas un répertoire frère distinct — le protéger revient à
  protéger `core/` entier. L'ensemble protégé retenu est **tout l'arbre
  source `tools/generator-platform/`**, à l'exception unique du répertoire
  scratch gitignored `.stack-test-runtime/` (régénéré par un script sans
  rapport, `prepare-stack-tests.mjs`, jamais touché par une exécution
  d'évolution) : `core/`, `renderers/`, `profiles/`, `adapters/`, `schemas/`,
  `manifests/`, `contracts/`, `policies/`, `sources/`, `acceptance/`,
  `fixtures/`, `test-support/`, `stack-tests/`, et chaque fichier
  `.mjs`/`.json` directement sous `tools/generator-platform/` (y compris
  `check-evolvable-composition.mjs`, `render-targets.mjs`,
  `workflow-targets.mjs`, `generate-action-request.mjs`,
  `generate-workflow-action.mjs`, `validate-ir.mjs`). Ce périmètre est
  délibérément plus large que les quatre noms cités par le contrat : un bug
  qui corromprait un schéma ou une fixture serait tout aussi grave que s'il
  corrompait `core/`, et l'intention de l'invariant (« l'exécution
  n'altère pas la plateforme ») est mieux servie en ne pré-décidant pas quelle
  sous-zone un bug futur toucherait. **Nouveau module
  `core/run-isolation-oracle.mjs`** : `snapshotProtectedTree(root)` hash
  chaque octet de chaque fichier sous `root` (sha256 + taille, clé = chemin
  relatif) ; `diffProtectedTreeSnapshots(before, after)` détecte fichier
  modifié / ajouté / supprimé ; `assertRunIsolation(run, { root })` prend un
  instantané, exécute `run()` réellement, reprend un instantané, et lève une
  erreur listant chaque violation si un seul octet a changé. **Câblage dans
  le gate directeur** : `check-evolvable-composition.mjs` extrait le corps
  entier de `probeEvolvableComposition()` (calcul des cibles **et** les 5
  probes existants — permissions, instance persistée, graphe de
  comportement, flux de présentation, sortie existante/dry-run/apply — en
  parallèle) dans `runEvolutionOnce()`, puis l'enveloppe entièrement dans
  `assertRunIsolation(runEvolutionOnce)` contre `generatorPlatformRoot` (le
  vrai `tools/generator-platform/`). Ce choix — protéger l'exécution
  complète, pas seulement un sous-probe — est déterminant : un bug pourrait
  fuir depuis n'importe quel probe futur aussi bien que depuis celui
  d'aujourd'hui, et l'invariant ne fait pas cette distinction. Le rapport du
  gate expose un nouveau champ `run_isolation: { invariant, files_checked,
  violated }` — non ajouté à `expected_supported`/`expected_gaps` : le
  contrat directeur n'a pas de slot pour les invariants eux-mêmes (seulement
  pour les 14 capacités numérotées sous `evolution.*`), et forcer un
  identifiant de capacité artificiel aurait déformé cette structure sans
  raison. **Preuve que l'oracle n'est pas une tautologie (« mutant tué »
  appliqué à une absence d'effet de bord plutôt qu'à une garde rendue)** :
  nouveau fichier `run-isolation.test.mjs`, 10 tests. Sur un arbre fixture
  isolé (jamais le vrai dépôt, construit et détruit dans `mkdtemp`) :
  détection d'un octet modifié, d'un fichier ajouté, d'un fichier supprimé,
  et absence de faux positif entre deux instantanés identiques. Le test
  négatif décisif : `assertRunIsolation` reçoit une fonction `run()` qui
  écrit délibérément un octet dans un fichier de la fixture protégée
  (simulant l'échec futur exact que l'invariant existe pour prévenir — une
  résolution de chemin qui fuit hors du `mkdtemp`) ; l'oracle doit lever, le
  test vérifie `assert.rejects(..., /run isolation violated/)`, **puis relit
  le fichier corrompu pour prouver que la mutation a réellement eu lieu**
  (l'oracle ne fait que détecter, jamais de rollback) — élimine la
  possibilité que le rejet vienne d'un chemin court-circuité plutôt que
  d'une vraie comparaison de hash. Un test symétrique prouve qu'une
  exécution qui n'écrit que hors de la racine protégée résout proprement
  (`filesChecked` > 0, pas de faux positif systématique). Le dernier test
  est l'intégration bout en bout : il appelle le vrai
  `probeEvolvableComposition()` (calcul de cibles réel, 5 probes réels, pas
  simulé) et vérifie `report.run_isolation.violated === false` et
  `files_checked > 0` contre le vrai `generatorPlatformRoot`. **Découverte
  réelle en cours de route, corrigée** : le premier lancement du nouvel
  oracle contre la suite complète a échoué de façon intermittente
  (`removed: core/composition-instance.mutant.self-hash-mismatch-guard-neutralis-.mjs`)
  — `composition-instance-mutations.test.mjs` (PLAT-5H) écrivait
  auparavant son mutant comme fichier frère réel dans
  `core/` (pour que ses imports relatifs résolvent), puis le supprimait dans
  un `finally`. Sous la parallélisation par défaut de `node --test`, une
  fenêtre de snapshot du nouvel oracle pouvait chevaucher cette écriture
  transitoire — un vrai (bien que bref et nettoyé) effet de bord sur l'arbre
  protégé, que l'oracle a correctement détecté. Corrigé en réécrivant
  `loadMutant()` : le mutant est désormais écrit dans un `mkdtemp` dédié,
  avec `generation-manifest.mjs` et `validate-ir.mjs` symlinkés au même
  chemin relatif pour que les imports du module continuent de résoudre, sans
  jamais toucher le vrai `core/`. Ce n'est pas un contournement de l'oracle :
  c'est la correction d'un vrai défaut latent qu'aucun test précédent
  n'aurait pu révéler avant ce chantier. **Validations exécutées
  personnellement** : `node --test tools/generator-platform/*.test.mjs` →
  **159/159** (149 préexistants + 10 nouveaux dans `run-isolation.test.mjs`),
  relancé 3 fois consécutives sans flakiness. `npx eslint
  tools/generator-platform/renderers tools/generator-platform/core
  tools/generator-platform/*.mjs --max-warnings=0` → 0 sortie, exit 0.
  `node tools/run-prettier.mjs --check` → vert (2 fichiers reformatés par
  `--write` puis revérifiés). `node tools/check-file-weight.mjs --all` →
  OK (`core/run-isolation-oracle.mjs` 145 l., `run-isolation.test.mjs` 211
  l., `check-evolvable-composition.mjs` 645 l., tous sous le plafond de 800).
  `node tools/generator-platform/check-evolvable-composition.mjs` → gate
  PASS, `regressions:[]`, `unexpectedly_implemented:[]`, `actual_gaps:[]`,
  `run_isolation.files_checked: 110`, `run_isolation.violated: false`,
  `target_tree_sha256` Angular/ReactJS **inchangés** par rapport à avant ce
  chantier (`77452f6c...b408` / `f0f8db27...091f0`), confirmant l'absence
  d'effet de bord sur les renderers `action-request` génériques. **Fichiers
  créés** : `tools/generator-platform/core/run-isolation-oracle.mjs`,
  `tools/generator-platform/run-isolation.test.mjs`. **Fichiers modifiés** :
  `tools/generator-platform/check-evolvable-composition.mjs` (extraction de
  `runEvolutionOnce()`, câblage `assertRunIsolation`, nouveau champ
  `run_isolation` dans le rapport),
  `tools/generator-platform/composition-instance-mutations.test.mjs`
  (correction du chemin d'écriture du mutant, cf. découverte ci-dessus).
  **Limite explicite assumée :** l'oracle protège l'arbre source de
  `tools/generator-platform/` tel que délimité ci-dessus ; il ne protège pas
  le reste du monorepo (`apps/`, `libs/`) — hors périmètre du contrat
  directeur, qui porte spécifiquement sur le pipeline de génération. Il ne
  protège pas non plus contre une corruption qui se répare elle-même avant
  la deuxième capture de hash (fenêtre de détection = durée de
  `runEvolutionOnce()`) ; c'est la même limite de principe que toute preuve
  par comparaison avant/après, partagée avec `generation-change-set.test.mjs`
  pour la préservation des extensions.
  **Conclusion sur `promotion_rule.success` (« expected_gaps est vide et
  chaque invariant est vérifié par des oracles exécutables »)** : les 2
  conditions cumulatives sont maintenant, à ma connaissance et sur la base
  des preuves listées dans ce fichier, **toutes les deux satisfaites**.
  Condition 1 (`expected_gaps` vide) : acquise depuis PLAT-5J, confirmée par
  ce lancement (`"expected_gaps": []`). Condition 2 (chaque invariant vérifié
  par un oracle exécutable) : les 6 invariants de
  `evolvable-composition.contract.json` → `invariants` ont chacun un oracle
  exécutable réel — invariants 1 à 5 fermés par PLAT-5G à PLAT-5J
  (`renderers.test.mjs`, `check-evolvable-composition.mjs` capacité
  `targets.renderer-separation`, `validate-ir.test.mjs`,
  `generation-change-set.test.mjs`), invariant 6 fermé par ce chantier
  (`run-isolation.test.mjs` + `assertRunIsolation` intégré au gate
  directeur). **Ce constat n'est cependant qu'une lecture locale et n'a la
  valeur que des preuves listées ici** : PLAT-5K ne déclenche, n'active ni
  ne câble aucun mécanisme de promotion. `contract.status` reste
  `"characterization"` (inchangé, vérifié par `assertContract` dans
  `check-evolvable-composition.mjs`), aucun champ du contrat JSON n'a été
  modifié, et la décision d'agir sur cette conclusion (déclencher une
  promotion, faire réviser ce constat par une revue humaine, etc.) reste
  explicitement hors périmètre de ce chantier.
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
- **OPS-16** — ouvert, M, P1, alias `réflexion 2026-08-17, suite OPS-15`.
  **Détection de dérive automatique du corpus vs legacy, avant que le
  gate casse en silence.** Constat : le même problème (chemins `legacy`
  périmés dans `corpus/*.pairs.jsonl` suite à une restructuration du
  dépôt legacy source) s'est produit deux fois pour les mêmes modules
  (`monitoring`/`reporting`) — une première fois sous T13-15
  (2026-08-11), une seconde fois découverte le 2026-08-17 (OPS-15) —
  et les deux fois, la découverte n'a eu lieu qu'en lançant `bun run
  corpus:full` manuellement, jamais via une alerte proactive. Coût
  direct : 61 chemins cassés d'un coup à corriger via un agent dédié
  (OPS-15), plutôt qu'une dérive détectée et corrigée au fil de l'eau.
  Root cause structurelle (pas un bug de code, une absence
  d'observabilité) : rien ne surveille si le contenu du legacy au SHA
  pinné (`legacy.lock.json`) a divergé de ce que le corpus déclare,
  entre deux exécutions de `corpus-full.yml` (qui ne tourne que sur
  push `main` + déclenchement manuel, jamais en continu).
  Justification de la priorité (P1, pas différé) : ADR-0029 (ligne 76)
  tranche explicitement que « SEOS/Angular reste le golden reference,
  le terrain de mesure ... Il n'est ni abandonné ni relégué derrière
  des POC spéculatifs » — le corpus n'est donc pas un vestige à
  déprioriser, c'est le seul étalon de fidélité de migration dont
  dispose le projet aujourd'hui (voir aussi ADR-0019 : le corpus est
  un index de correspondances traçables, pas un jeu d'apprentissage —
  mais cet usage-là reste actif et voulu). Le vrai défaut n'est pas
  « faut-il le garder » mais « pourquoi le découvre-t-on en mode
  pompier ».
  Piste de solution (non implémentée, à trancher/budgéter) : (1) job
  CI léger et régulier (hebdomadaire, ou déclenché à chaque
  modification de `legacy.lock.json`) qui compare uniquement
  l'existence des chemins `legacy` déclarés contre le contenu réel du
  legacy au SHA pinné — sans lancer tout `corpus:full` (donc sans
  dépendance à Nx Cloud/build/lint/test), juste un diagnostic rapide
  de dérive de chemins, sur le modèle du script `resolve-status.mjs`
  déjà existant ; (2) séparer plus nettement le gate structurel
  (`corpus:ci`/`--structural-only`, ADR-0015, déjà non-bloquant sur le
  legacy) du gate de fidélité historique (`corpus:full`/`--verify`,
  dépendant d'une source externe qui peut dériver hors du contrôle de
  ce dépôt) dans la fréquence d'exécution et le niveau de criticité
  attendu.
  Aucune action entreprise sur ce point au-delà de cette
  documentation — décision explicitement laissée au porteur du projet,
  par cohérence avec la façon dont ADR-0019 a traité une question
  similaire (« reste ouverte et n'est pas tranchée ici »).
- **OPS-20** — **fait** (2026-08-18), S, P1, alias `audit 2026-08-17, suite PLAT-6`.
  **`corpus-full.yml` ne persiste jamais son résultat dans le dépôt.**
  Distinct d'OPS-16 (dérive du contenu legacy) : ici le problème existe
  même sans aucune dérive. `emit-pairs.mjs`, via `corpus:full`, écrit
  `corpus/*.pairs.jsonl` dans le working tree du runner GitHub Actions
  — confirmé en lisant `.github/workflows/corpus-full.yml` en entier :
  aucun step `git commit`/`git push`, aucun `actions/upload-artifact`,
  aucun mécanisme de rapatriement quel qu'il soit après le step
  `Corpus full (--verify, sans --structural-only)`. Concrètement : le
  run vert obtenu après OPS-17/OPS-18
  (`monitoring`/`reporting` à `verified/applicable=100%`,
  `blocked=0`) a recalculé des `corpus/monitoring.pairs.jsonl` et
  `corpus/reporting.pairs.jsonl` corrects **dans l'éphémère du
  runner**, puis les a jetés à la fin du job. Les fichiers réellement
  committés sur `main` restent ceux d'OPS-18 (édités à la main via le
  générateur, jamais réellement passés par une exécution de
  `emit-pairs.mjs` que j'aurais pu observer moi-même — `bun`/`nx`
  absents de mon sandbox tout du long d'OPS-15 à OPS-18). Rien
  n'indique une divergence fonctionnelle actuelle (le run CI confirme
  que le générateur produit les bons chemins), mais rien ne le
  garantit non plus au niveau octet — `verified_at`, ordre des clés,
  ou un champ additionnel du générateur que je n'aurais pas anticipé
  pourraient différer entre ma version committée à la main et une
  vraie sortie de `emit-pairs.mjs`. Ce même défaut vaut pour les 18
  modules, pas seulement `monitoring`/`reporting` — aucun des
  `corpus/*.pairs.jsonl` committés n'a jamais été garanti identique à
  une sortie CI réelle depuis la création de ce workflow.
  **Décision utilisateur** : « approche big tech ». Traduit en choix
  concret entre les deux options posées (commit-back automatique vs
  fail loud) : un run CI ne doit jamais pousser silencieusement sur
  `main` sans revue humaine/PR, même pour un artefact dérivé — c'est le
  principe qui prime chez les éditeurs qui traitent le contenu généré
  comme une source à revoir, pas comme un cache à rafraîchir en
  arrière-plan (le risque inverse : un bug du générateur commit-back
  silencieusement une régression business dans le corpus, jamais vue
  par personne). Retenu : **fail loud sur divergence**, pas de
  commit-back automatique.
  **Première implémentation invalidée le jour même par le premier run
  réel.** `git diff --exit-code --stat -- corpus/` a échoué sur les
  **18 modules** (1507 insertions/1507 suppressions, symétrique) —
  pas seulement `monitoring`/`reporting`. Diagnostic avant de conclure
  à une vraie divergence : `oracle_report.ran_at` (et tout `*.at`
  imbriqué) est horodaté avec `new Date().toISOString()` à **chaque**
  appel de `buildOracleReport()` (`tools/corpus/oracle-report.mjs`,
  « evidence horodatée » par conception, ligne 2 du commentaire du
  fichier) — un diff texte brut divergerait donc à *chaque* exécution
  future, même sans aucun changement fonctionnel réel. Le gate tel
  qu'écrit initialement aurait donc bloqué `corpus-full.yml`
  indéfiniment, sur un faux positif structurel, pas sur la vraie
  dérive qu'il visait à détecter.
  Corrigé : `tools/corpus/check-corpus-committed.mjs` (nouveau script,
  ~190 lignes) remplace le `git diff` brut. Il compare `git show
  HEAD:<fichier>` (version committée) au fichier régénéré dans le
  working tree, **paire par paire** (indexées par `id`), après avoir
  retiré récursivement toute clé `ran_at`/`at` de chaque objet JSON —
  pas un diff texte. Exposé via `bun run check:corpus-committed`
  (`package.json`), appelé par `corpus-full.yml` après `corpus:full`.
  **Vérifié par test empirique local, pas seulement par lecture du
  code** : (1) contre `HEAD` inchangé → `OK`, 18 fichiers ; (2)
  modification volontaire d'un `id` de paire (`dash-legacy-entity` →
  `...-TEST`) → détecté correctement (`paire disparue` +
  `paire nouvelle`), exit 1 ; (3) tous les `ran_at`/`at` du fichier
  réécrits à un horodatage différent (simulant un vrai run
  `corpus:full`, rien d'autre changé) → `OK`, aucun faux positif,
  exit 0. Les 3 cas couvrent exactement le défaut trouvé et sa
  correction. `node --check` (syntaxe) + `node
  tools/run-prettier.mjs --check`/`--write` (formatage) +
  `python3 -c "import yaml; yaml.safe_load(...)"` (YAML de
  `corpus-full.yml`) + `python3 -c "import json; json.load(...)"`
  (`package.json`) tous verts.
  **Limite explicite reconnue avant le fait suivant** : les 3 tests
  ci-dessus ont été faits avec `node` seul, jamais dans les conditions
  exactes du job CI — un vrai run CI a immédiatement invalidé cette
  seconde version aussi.
  **Deuxième itération, le jour même.** Le premier run CI réel de
  `check:corpus-committed` a échoué sur **1507/1507 paires — la
  totalité du corpus, tous les 18 modules**, y compris des modules
  jamais touchés par une édition manuelle (`report-states`,
  `processing`…), stables depuis longtemps. Ce taux de 100% (pas un
  sous-ensemble ciblé) indiquait un second défaut structurel du
  comparateur, pas une vraie divergence de contenu — confirmé en
  isolant le premier diff affiché
  (`report-states.approve.list-item-props`) : seul son champ
  `verified_at` (`"2026-08-11"`) aurait changé. Root cause : `emit-
  pairs.mjs` fixe `verified_at = today` (`ranAt.slice(0, 10)`, la date
  du jour d'exécution) pour **toute** paire `status: "verified"` — la
  quasi-totalité du corpus — à chaque run. Ce champ vit à la racine de
  la paire, pas dans `oracle_report`, donc la première version du
  script (qui n'excluait que `ran_at`/`at`) ne le voyait pas.
  Corrigé : `verified_at` ajouté à `VOLATILE_KEYS` dans
  `check-corpus-committed.mjs`. Avant de considérer le correctif
  complet, recherche exhaustive de toute autre clé du même type :
  script Python listant toutes les clés (récursif, tous niveaux)
  réellement présentes dans les 18 `corpus/*.pairs.jsonl` actuels —
  47 clés distinctes recensées. Seule `legacy_ref.date` restait à
  vérifier (autre candidat plausible « date ») : tracée jusqu'à
  `legacy.lock.json#date` (`loadLegacyRef()`, `emit-pairs.mjs`) — fixe
  tant que le pin legacy ne change pas, pas un horodatage d'exécution,
  donc légitimement comparable, non exclue.
  Re-vérifié empiriquement après ce second correctif : (1) contre
  `HEAD` inchangé → `OK` ; (2) `verified_at`+`ran_at`+`at` réécrits sur
  **les 18 fichiers simultanément** (reproduction exacte du scénario
  du run CI, rien d'autre changé) → `OK`, exit 0, aucun faux positif ;
  (3) modification volontaire d'un `id` de paire → toujours détectée
  correctement, exit 1 (la détection réelle n'a pas été cassée en
  élargissant l'exclusion). `node --check` + `node
  tools/run-prettier.mjs --check` verts.
  **Limite explicite, inchangée** : toujours pas de vraie exécution de
  `bun run corpus:full` suivie de ce step dans les conditions exactes
  de `corpus-full.yml` — seulement des simulations `node` locales,
  aussi proches que possible du scénario réel observé. Un troisième
  champ volatil non anticipé reste possible ; seul un nouveau run CI
  réel le confirmera ou l'infirmera. Si ce step réussit au prochain
  run, cela confirmera que le JSONL édité à la main depuis OPS-18 est
  fonctionnellement identique (hors horodatage) à la sortie réelle du
  générateur corrigé par OPS-17.
  **Troisième itération (2026-08-17, même jour) — root cause réelle,
  pas un champ volatil.** Diagnostic temporaire ajouté à
  `corpus-full.yml` (`git diff --stat` + `git diff -U5` brut sur
  `corpus/shared.pairs.jsonl`, avant tout filtrage — commit
  `1dbbc89`, retiré après diagnostic) plutôt que deviner un 4e candidat
  sans preuve. Le diff CI réel obtenu montre, pour **chaque** paire des
  18 fichiers : `"oracle_report":{"mode":"structural-only", ...}` (côté
  committé, `verified_at:"2026-08-10"`) vs
  `"oracle_report":{"mode":"full", ...}` (côté régénéré par le run,
  `verified_at:"2026-08-17"`). Root cause confirmée par lecture croisée
  de `package.json` (`corpus:ci` = `--structural-only`, utilisé par
  `ci.yml` ; `corpus:full` = sans `--structural-only`, utilisé par
  `corpus-full.yml`) et `git log --oneline -- corpus/shared.pairs.jsonl`
  (5 commits, tous via `corpus:ci`/édition manuelle — jamais un commit
  généré par une exécution réelle de `corpus:full`). **Ce n'est pas un
  artefact volatil comme `ran_at`/`verified_at`** : `oracle_report.mode`
  porte un signal réel (sous quel régime la paire a été vérifiée — avec
  ou sans correspondance legacy). L'ajouter à `VOLATILE_KEYS` masquerait
  une vraie question de fond plutôt que de la résoudre.
  **Question posée à l'utilisateur avant toute action** : `corpus-full.yml`
  doit-il vraiment tourner en mode `full` ? Réponse tranchée par relecture
  d'ADR-0015 et ADR-0029 : **oui, sans ambiguïté**. ADR-0015 §Décision
  point 4 : « Correspondance legacy : uniquement via `--verify` **sans**
  `--structural-only` (job `corpus-full`) ». ADR-0029 : « SEOS/Angular
  reste le **golden reference** ». Le mode `full` de `corpus-full.yml`
  est la seule vérification de correspondance legacy qui existe dans
  tout le dépôt — la réexaminer reviendrait à contredire ces deux ADR
  sans justification nouvelle. Conclusion : **le mode `full` est correct
  et volontaire ; le vrai défaut est que `corpus/*.pairs.jsonl` committé
  sur `main` n'a jamais reflété une exécution réelle de `corpus:full`
  depuis la création du corpus** — confirmé par l'historique git complet
  du fichier (aucun des 5 commits touchant `shared.pairs.jsonl` ne
  provient d'un run `corpus:full` réel, cohérent avec l'absence
  documentée de tout mécanisme de commit-back dans `corpus-full.yml`,
  cf. plus haut dans cette même entrée).
  **Reste à faire (non trivial, hors capacité de mon sandbox actuel)** :
  régénérer les 18 `corpus/*.pairs.jsonl` en mode `full` réel (nécessite
  `bun`/`nx`/`SEOS_LEGACY_ROOT`, absents de mon environnement
  d'exécution) et les committer, pour que le corpus committé corresponde
  enfin à ce que `corpus-full.yml` vérifie réellement. Option retenue et
  exécutée (commit `47a4abd`) : publication de `corpus/*.pairs.jsonl`
  régénéré via `actions/upload-artifact` dans `corpus-full.yml` quand
  `check:corpus-committed` échoue (`if: failure() &&
  steps.check_corpus.outcome == 'failure'`) — étape diagnostique
  temporaire retirée dans le même commit.
  **Quatrième itération (2026-08-18) — clôture.** Run CI suivant
  (déclenché par `47a4abd`) a échoué comme attendu sur
  `check:corpus-committed` (même signature 1507/1507, cohérente avec le
  diagnostic — le corpus committé restait encore en `structural-only`
  à ce stade), et a publié l'artefact
  `corpus-full-regenerated-47a4abd8f3ca0e17bcb2d4355621184560c433bb`
  comme prévu. Utilisateur a téléchargé et fourni l'accès au dossier
  extrait. Avant de committer aveuglément, vérification programmatique
  complète (Python, comparaison paire par paire par `id`) :
  (1) même nombre de lignes par fichier (1507 total, 18/18 fichiers
  identiques en compte) — aucune perte de paire ; (2) mêmes 1507 `id`
  exactement des deux côtés (`old_ids == new_ids` sur chaque fichier) ;
  (3) distribution des `status` : `n/a` 922→924, `verified` 585→583,
  seulement **2 changements** de statut sur 1507 paires —
  `monitoring.shell.rov-section-enum` et
  `reporting.shell.rov-section-enum`, tous deux `verified → n/a`,
  avec `notes` confirmant « Enum section — pas de contrepartie legacy
  (design absent, confirmé par recherche exhaustive OPS-15) » —
  cohérent avec la requalification déjà actée sous OPS-18, pas une
  régression. (4) tous les fichiers de l'artefact confirmés `"mode":
  "full"` (18/18). Aucun signal de régression détecté : copie des 18
  fichiers effectuée (`cp corpus-full-regenerated-.../*.pairs.jsonl
  corpus/`), JSON revalidé ligne par ligne sur les 18 fichiers après
  copie. Committé (`e78be02`).
  **Clôture confirmée (2026-08-18).** Commit du corpus régénéré a
  mécaniquement fait dériver `check:docs-freshness` (E-5/P1-9) —
  attendu et correct, pas un nouveau bug : les 2 changements de statut
  (`verified→n/a`) déplacent les compteurs agrégés dans
  `STATUS.md`/`LLM_CONTEXT.md` (585→583 correspondances, 922→924
  décisions `n/a`, couverture fichiers 914→918, 33.5%→33.6%). Corrigé
  via `bun run generate:status` exécuté par l'utilisateur en local
  (commit `e0d66d6`), pas de valeurs éditées à la main. **Run CI
  `corpus-full.yml` suivant (déclenché par `e0d66d6`, run
  [32126888570](https://github.com/ismaelkouda/cmz-platform/actions/runs/32126888570))
  : `Success`, 22m0s au total (job `corpus-full` : 19m47s). `bun run
  check:corpus-committed` passe au vert pour la première fois** —
  preuve CI réelle, indépendante de toute simulation locale, que le
  corpus committé sur `main` correspond enfin à la sortie réelle de
  `corpus:full`. Boucle des 4 itérations OPS-20 close : (1) `git diff`
  brut → faux positif `ran_at`/`at` ; (2) `verified_at` manqué → faux
  positif ; (3) root cause réelle `oracle_report.mode`
  structural-only/full, tranchée non-négociable par ADR-0015/ADR-0029,
  corpus jamais régénéré en mode `full` depuis sa création ; (4)
  régénération réelle via artefact CI + vérification programmatique
  paire par paire + commit + confirmation CI verte end-to-end.

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
- **OPS-11** — **fait localement, à revoir/committer séparément** (2026-08-16),
  S, P0 Ops. `format:check` signalait exactement **29 fichiers** suivis, et non
  99 : 4 fichiers application/tests, 16 `project.json` de
  dashboard/interactive-map/monitoring/reporting, 2 specs dashboard, `nx.json`
  et 6 outils Node. Le formatage Prettier mécanique produit 64 insertions/133
  suppressions sans changement intentionnel de comportement. Preuves après
  réécriture : `format:check` vert, `git diff --check` vert et `check:all`
  complet vert. Ne pas mélanger ce lot au prochain changement de capacité de la
  plateforme.
- **OPS-1** — **fait** (2026-08-16), M, P0 Ops, alias `P0-N1`. Push
  `feature/plat-5-generator-platform` (109 commits, PLAT-5G→5K inclus)
  effectué avec succès (`git push origin feature/plat-5-generator-platform`,
  gitleaks 0 leak). `main` a également reçu ces commits directement (push
  précédent). Première CI réelle observée : **run #39**
  (`https://github.com/ismaelkouda/cmz-platform/actions/runs/31975317345`,
  commit `ebd6df1`, déclenchée par le push direct sur `main`) — **statut
  global rouge à l'observation initiale**, 3 causes distinctes identifiées et
  documentées séparément sous **OPS-12** ci-dessous. Aucune des 3 causes n'est
  liée au contenu de PLAT-5G→5K (tests, gate directeur, oracle d'exécution) :
  ce sont des défauts de câblage CI préexistants et une dette de sécurité
  transitive, découverts seulement maintenant faute d'exécution CI antérieure
  sur ce lot. **Limite explicite :** je n'ai pas personnellement inspecté
  chaque job de la matrice `check:publication-durability`
  (`macos-14`/APFS + `ubuntu-24.04`/ext4) attendue par PLAT-5F — seul le
  statut global de la run a été rapporté, d'abord comme vert puis corrigé en
  rouge par l'utilisateur avec les logs exacts des 3 échecs. La promotion
  PLAT-5F → M3 reste donc **non confirmée** tant qu'une run CI verte n'a pas
  été observée après correction d'OPS-12.
- **OPS-12** — **partiel** (2026-08-16), M, P0 Ops. Trois causes distinctes de
  rouge sur la run CI #39, aucune liée au contenu PLAT-5G→5K :
    - **OPS-12a — fait.** `check:dto-schema` (ajouté au job `docs-freshness`
      par T13-17/OPS le 2026-08-14) importe `typescript` via
      `tools/schema/generate-dto-schema.mjs`, mais ce job était conçu Node pur
      (`check:docs-freshness` ne lit que `project.json`/corpus, sans
      dépendance npm) — jamais de `bun install`, donc
      `ERR_MODULE_NOT_FOUND 'typescript'` dès la première exécution réelle du
      step. Aucune run CI n'avait encore exercé ce chemin avant #39, d'où
      l'angle mort resté invisible. Corrigé : `oven-sh/setup-bun@v2` +
      `bun install --frozen-lockfile` ajoutés au job `docs-freshness` dans
      `.github/workflows/ci.yml`, avant le step `check:dto-schema`. Vérifié
      **localement** avec `node_modules` déjà installé (le sandbox ne peut pas
      exécuter `bun`, seulement `node`/`npx`) : `node tools/check-dto-schema.mjs`
      → `OK` (432 définitions, 303 DTOs, 3 avertissements de portée non
      bloquants déjà documentés en T2-1). YAML validé structurellement
      (`python3 -c "import yaml; yaml.safe_load(...)"`), mais **le job CI
      complet avec `bun install` réel n'a pas été rejoué par moi** — à
      confirmer par la prochaine run CI.
    - **OPS-12b — fait.** `bun run check:dead-code` (knip) échouait avec
      « Unlisted binaries (1) : `semgrep` — `package.json` » : `semgrep`
      apparaît dans le script `check:sast` de `package.json` mais est un
      outil Python installé via `pip install semgrep==1.172.0` dans un job CI
      séparé (`sast`), jamais un binaire npm/bun — faux-positif de détection
      knip, pas un vrai défaut. Corrigé : ajout de
      `"ignoreBinaries": ["semgrep"]` à `knip.json`, champ de premier niveau
      confirmé dans le code source de `knip@6.31.0` (`ConfigurationChief.js`,
      valeur par défaut `[]`). **Limite explicite : je n'ai pas pu exécuter
      `knip` en entier dans ce sandbox** (`RangeError: Array buffer allocation
      failed` dans le parseur `oxc-parser`, contrainte mémoire de
      l'environnement, sans rapport avec la modification) — la correction est
      structurellement correcte et validée par lecture du schéma/code source
      de l'outil, mais pas par une exécution réelle réussie ; à confirmer par
      la prochaine run CI.
    - **OPS-12c — fait** (2026-08-17). `bun audit --audit-level=high`
      remontait 4 vulnérabilités high dans des dépendances transitives
      (confirmé deux fois par l'utilisateur en CI réelle, `bun` absent du
      sandbox d'exécution local). L'utilisateur a lancé `bun update` de son
      côté : n'a bumpé que des dépendances directes proches de leur plage
      déjà satisfaite (`@commitlint/cli`, `@typescript-eslint/utils`,
      `lint-staged`, `angular-eslint`) sans toucher aux 3 paquets vulnérables
      — attendu, `bun update` respecte les plages semver déclarées par les
      paquets parents et ne peut pas les forcer au-delà. **2 CVE sur 3
      corrigées par `overrides` ciblé dans `package.json`**, versions
      vérifiées individuellement sur le registre npm avant écriture (pas de
      supposition), puis `bun.lock` régénéré côté utilisateur (`bun install`
      sans `--frozen-lockfile`) et poussé (commit `d4af5e7`). **Confirmé
      résolu par une exécution CI réelle** (log `bun audit` collé par
      l'utilisateur le 2026-08-17 après push) : `nanoid` et `js-yaml`
      n'apparaissent plus dans le rapport, seule l'exception `image-size`
      documentée ci-dessous subsiste :
        - `nanoid` `<3.3.18` (via `postcss` — boucle infinie si `size=0`,
          [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8))
          → `overrides["nanoid"] = "3.3.18"`, dernière version publiée de la
          ligne 3.x (dist-tag `legacy`, confirmée existante sur le registre).
        - `js-yaml` `>=4.0.0 <4.3.1` (via `eslint`/`@eslint/eslintrc`,
          `@commitlint/cli`/`cosmiconfig`,
          `@nx/js`/`babel-plugin-macros`/`cosmiconfig`,
          `@nx/angular`/`@nx/rspack`/`postcss-loader`/`cosmiconfig`,
          `@nx/web`/`@nx/webpack`/`postcss-loader`/`cosmiconfig` —
          CVE-2026-59870, consommation CPU quadratique en résolution
          `!!omap`) → `overrides["js-yaml"] = "4.3.1"`, version publiée
          2026-07-31 (plus d'un mois après `4.3.0`, cohérent avec un
          correctif de sécurité), confirmée existante sur le registre.
        - **`image-size` `<=2.0.2` — non corrigé, exception assumée et
          documentée.** Vérification sur le registre npm :
          **`image-size@2.0.2` est la dernière version publiée** ; aucun
          correctif n'est disponible en amont à ce jour. Une première
          tentative d'`overrides["image-size"] = "2.0.3"` a été écrite par
          erreur (version inventée sans vérification préalable), détectée et
          corrigée avant tout commit en revérifiant le registre. Un
          `overrides` vers `2.0.2` (seule version existante) serait sans
          effet — toujours la version vulnérable. Investigation de l'usage
          réel : `image-size` n'est jamais une dépendance directe — c'est une
          dépendance optionnelle transitive de `less` (`optionalDependencies`
          de `less@4.5.1`), lui-même déclaré uniquement comme
          `peerDependency` **optionnelle** de `@angular/build`, `@nx/webpack`
          et `vite`. **Aucun fichier `.less` n'existe dans `apps/` ni
          `libs/`** (`find … -iname "*.less"` vide) — le projet est
          exclusivement Tailwind/CSS. `less` est physiquement présent dans
          `node_modules/.bun/` (résolu par le lockfile car peer dep
          optionnelle listée) mais son code, et donc celui d'`image-size`,
          n'est jamais chargé à l'exécution : le parseur ICNS/JXL/HEIF
          vulnérable ne s'exécute que si `less` traite un fichier `.less`,
          ce qui n'arrive jamais dans ce dépôt. Tentative de neutralisation
          via `overrides` explorée et abandonnée : la documentation officielle
          Bun (`bun.com/docs/pm/overrides`, section Limitations) confirme
          explicitement que Bun ne supporte pas la forme pnpm `"pkg@"`
          (sélecteur vide) ni `"-"` (suppression de dépendance) — toute
          tentative de ce type est silencieusement ignorée avec un
          avertissement, donc inefficace. **Risque résiduel accepté et
          documenté** : CVSS 8.7 (DoS/disponibilité uniquement, pas de RCE ni
          fuite de données — `AV:N/AC:L … VC:N/VI:N/VA:H`), EPSS 0.43%
          (34ᵉ percentile, faible probabilité d'exploitation), déclenchable
          uniquement en traitant un buffer ICNS/JXL/HEIF malveillant via
          `less`, jamais invoqué dans ce dépôt.
          **Post-régénération du lockfile (2026-08-17)** : le rapport CI
          confirmé liste désormais 2 lignes pour cette même CVE au lieu
          d'1 (`@angular/build › less › image-size` et une deuxième ligne
          mentionnant `workspace:@cmz/administrative-boundary-data ›
          vitest`). Vérifié dans `bun.lock` : une seule version
          d'`image-size` est verrouillée (`0.5.5`, uniquement via
          `less@4.5.1`) — `vitest@4.1.10` n'a aucune dépendance vers
          `less` ni `image-size` dans son arbre (`node_modules/.bun/`
          confirme une seule installation physique du paquet). La
          deuxième ligne est un artefact d'affichage de `bun audit`
          (regroupement par workspace consommateur dans le graphe
          partagé du lockfile), pas une seconde occurrence réelle du
          paquet ni une CVE distincte. Le risque documenté ci-dessus
          reste inchangé et s'applique identiquement à la version
          verrouillée `0.5.5` — l'advisory GHSA-w3rx-r6r6-pgpr ne
          déclare aucune plage de version affectée structurée
          (« Affected versions: Unknown » sur la page GitHub), seul le
          texte « through 2.0.2 » la mentionne dans sa description,
          cohérent avec une couverture de toute la ligne 0.x/2.x tant
          qu'aucun correctif n'est publié. À rouvrir si `less` cesse
          d'être une dépendance dormante (ajout d'un fichier `.less`) ou si
          les mainteneurs d'`image-size` publient un correctif.
    - **OPS-12e — fait** (2026-08-17). `bun audit` (sans `--audit-level`,
      donc incluant `moderate`/`low`, non bloquant en CI qui ne filtre
      que `high`) remonte 13 vulnérabilités sur 6 paquets
      supplémentaires. Analysés un par un avant toute action, avec la
      même discipline que OPS-12c (CVSS/EPSS, chemin de dépendance
      réel, vérification registre npm avant écriture) :
        - `postcss` `<=8.5.22` (chemin direct + via `@angular/build`,
          `@tailwindcss/postcss`, `@nx/angular`/`@nx/webpack`,
          `@nx/web`/`@nx/webpack` — CVE-2026-69153, correctif incomplet
          d'un CVE antérieur permettant la lecture arbitraire de
          fichiers `.map` via `sourceMappingURL` quand `from` n'est pas
          fourni ; CVSS 6.3, confidentialité faible uniquement) →
          `overrides["postcss"] = "8.5.23"`, version patchée officielle
          publiée par les mainteneurs, confirmée existante sur le
          registre, compatible avec toutes les plages `^8.x` déclarées
          par les consommateurs (aucun saut majeur).
        - `undici` `<6.28.0` (via `@angular/cli` › `pacote` ›
          `@npmcli/run-script` › `node-gyp` — build-time uniquement,
          jamais en runtime) — désynchronisation de réponse HTTP via
          `interceptors.retry()` (CVE-2026-16728, CVSS 4.8, nécessite un
          upstream malveillant/défaillant et un proxy qui relaie
          `Content-Length` sans le recalculer — inapplicable au profil
          d'usage réel mais corrigé par prudence) →
          `overrides["undici"] = "6.28.0"`, patch officiel dans la
          ligne 6.x elle-même (pas de saut majeur), confirmé existant
          sur le registre.
        - `@hono/node-server` `<1.19.15` et `hono` `<4.12.34` (chemin
          unique : `@angular/cli` › `@modelcontextprotocol/sdk` — cette
          paire n'est qu'une dépendance transitive de l'outil CLI
          Angular utilisé en local/CI, jamais chargée dans le code
          applicatif servi aux utilisateurs) — plusieurs CVE moderate/low
          (ReDoS CORS, fuite cross-utilisateur du cache SSR `memo()`,
          désynchronisation proxy, ReDoS middleware langue) →
          `overrides["@hono/node-server"] = "1.19.15"` et
          `overrides["hono"] = "4.12.34"`, versions patchées confirmées
          existantes sur le registre, compatibles avec les plages
          `^1.19.9`/`^4.11.4` déclarées par
          `@modelcontextprotocol/sdk@1.29.0` (aucun saut majeur).
        - `uuid` `<11.1.1` (via `workspace:@cmz/shared-browser` ›
          `exceljs` — `exceljs@4.4.0` déclare `"uuid": "^8.3.0"`, et
          `8.3.2` est la dernière version publiée de la ligne 8.x ;
          aucun correctif n'existe dans cette plage, le patch minimum
          `11.1.1` casserait la contrainte semver déclarée par
          `exceljs`) — **exception assumée et documentée, pas
          d'`overrides` écrit.** CVE-2026-41907 (CVSS 6.3, intégrité
          faible) : absence de vérification de bornes dans les méthodes
          `v3()`/`v5()`/`v6()` de l'API `uuid` quand un buffer de sortie
          est fourni explicitement par l'appelant. Vérifié
          indépendamment (`grep -rn "require('uuid')"
          node_modules/exceljs/lib`, confirmant une note d'audit
          antérieure du 2026-08-03) : un seul point d'appel dans
          `exceljs`, `cf-rule-ext-xform.js`, qui utilise exclusivement
          `v4()` sans buffer — hors du périmètre exact de cette CVE.
          Risque résiduel jugé négligeable. À rouvrir si `exceljs`
          publie une version compatible `uuid >=11.1.1`, ou si un usage
          direct de `uuid` avec buffer apparaît ailleurs dans le code.
        - `esbuild` `>=0.27.3 <0.28.1` — **correction du diagnostic
          initial du 2026-08-17** : la première analyse n'avait vérifié
          que la résolution top-level (`esbuild@0.28.1` via
          `@angular/build`, hors plage vulnérable) et avait conclu à un
          faux positif. Après régénération réelle de `bun.lock` par
          l'utilisateur (`bun install`), `bun audit` a persisté à
          signaler ce paquet — vérification approfondie du lockfile
          (`grep -o '"esbuild@[0-9.]*"' bun.lock`) révèle en fait
          **deux résolutions distinctes coexistant dans le graphe** :
          `esbuild@0.28.1` au niveau `@angular/build` (version exacte,
          hors plage vulnérable) et `esbuild@0.27.7` sous
          `vite@7.3.5` (`"esbuild": "^0.27.0"`), cette dernière bien
          `>=0.27.3 <0.28.1` — dans la plage vulnérable. Ce n'était donc
          pas un faux positif : un vrai second exemplaire vulnérable
          existe, manqué par la première analyse faute d'avoir vérifié
          l'exhaustivité des résolutions imbriquées avant de conclure.
          **Exception assumée, pas d'`overrides` écrit** : en semver
          `0.x`, `^0.27.0` se comporte comme un verrou strict sur la
          ligne `0.27.x` (pas d'extension au `0.28.x`) ; aucune version
          `0.27.x` publiée n'atteint `0.28.1`, donc aucune version
          compatible avec la contrainte déclarée par `vite@7.3.5`
          n'existe hors de la plage vulnérable — un `overrides` forcé à
          `0.28.x` violerait cette contrainte et risquerait de casser
          la résolution de `vite`. Risque résiduel jugé négligeable :
          GHSA-g7r4-m6w7-qqqr (severity low, CVSS 2.5, `AV:L/AC:H/PR:L`)
          concerne un traversal de chemin dans le dev server
          `esbuild --servedir` via des backslashes, **exclusivement
          exploitable sous Windows** (`path.Clean()` de Go est
          POSIX-only), et nécessite déjà des privilèges locaux ; ce
          dépôt exécute sa CI sur `ubuntu-24.04`/`macos-14`
          uniquement (matrice `check:publication-durability`) et
          n'expose jamais ce dev server en production. À rouvrir si
          `vite` publie une version majeure compatible `esbuild
          >=0.28.1`, ou si une matrice CI Windows est introduite.
      Toutes les versions `overrides` ci-dessus vérifiées existantes
      sur le registre npm (`curl
      https://registry.npmjs.org/<pkg>` + inspection `versions.keys()`)
      avant écriture dans `package.json`. **`bun.lock` non régénéré
      dans ce commit** — même limite structurelle que OPS-12c : `bun`
      absent du sandbox d'exécution. Nécessite `bun install` (sans
      `--frozen-lockfile`) côté utilisateur avant que ces `overrides`
      prennent effet et que la CI (`bun install --frozen-lockfile`) ne
      les valide.
    - **OPS-14 — fait** (2026-08-17). `bun run corpus:full` (job
      `corpus-full.yml`, déclenché manuellement après OPS-13/13b)
      échouait sur les 18 modules du corpus, chacun avec le même motif :
      `NX Cloud: Workspace is unable to be authorized. Exiting run. /
      Invalid Credentials (Nx Cloud ID)`, précédant tout essai réel de
      `build`/`lint`/`test`. Root cause identifiée par lecture directe
      de `.github/workflows/corpus-full.yml` et comparaison avec
      `ci.yml` : `nx.json` déclare un `nxCloudId`
      (`69cfa6ba213c8001d0f75641`), et `ci.yml` injecte le secret
      `NX_CLOUD_ACCESS_TOKEN` en variable d'environnement (ligne 28)
      pour authentifier chaque appel `nx`, mais `corpus-full.yml` ne
      l'a jamais fait — oubli distinct de la régression `check:dto-schema`
      d'OPS-12a, sur un autre workflow. Aggravé par
      `tools/corpus/module-gate.mjs` (`runMany()`) : le gate H-2 traite
      tout échec du process `bunx nx run-many` comme un échec de
      build/lint/test, sans distinguer un refus d'authentification Nx
      Cloud (bruit réseau, dégradable selon le commentaire de `ci.yml`
      lui-même : « Sans claim + secret : bruit 401 / pas de remote
      cache — acceptable temporairement ») d'un vrai échec de code —
      et Nx CLI lui-même n'a pas dégradé gracieusement ici : le message
      « Exiting run » confirme que l'absence de token a arrêté
      l'exécution entière, pas seulement désactivé le cache distant.
      Fix : ajout de `env: NX_CLOUD_ACCESS_TOKEN:
      ${{ secrets.NX_CLOUD_ACCESS_TOKEN }}` à `corpus-full.yml`,
      identique à `ci.yml`, avec un commentaire expliquant pourquoi ce
      workflow y est plus sensible que `ci.yml` (jobs indépendants côté
      `ci.yml`, gate agrégé fail-closed côté `module-gate.mjs`).
      Confirmé avec l'utilisateur que le secret `NX_CLOUD_ACCESS_TOKEN`
      existe déjà dans les settings GitHub Actions du repo — le fix
      n'a donc pas nécessité de créer/réclamer un nouveau workspace Nx
      Cloud, seulement de propager le secret déjà valide au workflow
      qui en manquait.
      Vérification avant commit : YAML validé (`python3 -c "import
      yaml; yaml.safe_load(...)"`), clé `NX_CLOUD_ACCESS_TOKEN` bien
      présente dans le bloc `env` parsé, `node tools/run-prettier.mjs
      --check` vert. **Limite explicite** : je n'ai pas pu déclencher
      `corpus-full.yml` moi-même (pas d'accès réseau GitHub Actions
      dans ce sandbox) — le fix est structurellement correct (même
      mécanisme que `ci.yml`, secret confirmé existant par
      l'utilisateur) mais reste à confirmer par le prochain run réel,
      qui devra alors atteindre les étapes `build`/`lint`/`test` de
      chaque module et échouer ou réussir sur leur mérite réel, pas sur
      un refus d'authentification en amont.
    - **OPS-15 — fait** (2026-08-17). Confirmation par le run réel :
      OPS-14 a résolu l'authentification Nx Cloud, `corpus:full` a
      atteint build/lint/test sur les 18 modules — 16/18 ont réussi.
      2 échecs réels, distincts, restants : `monitoring` et `reporting`,
      chacun avec plusieurs traceurs à `verified/applicable=29%`
      (`blocked` élevé), sous le seuil `≥80%` requis par
      `resolveStatus()`/`printReport` pour `corpus-ready`. Root cause :
      les champs `legacy` de 27/43 paires (`monitoring`) et 34/49
      paires (`reporting`) pointaient vers des chemins qui n'existent
      plus dans le dépôt legacy au SHA pinné `cb15bf80fa072e12e9d4fce4b9236abe6ac78058` —
      même classe de problème que **T13-12** (2026-08-11, déjà résolu
      une fois pour ces mêmes 2 modules — signe que le legacy source a
      probablement été restructuré une seconde fois côté GitLab, avant
      que ce SHA précis ne soit re-figé ; cause exacte non élucidée,
      non supposée).
      Vérifié personnellement avant toute délégation : clone réel du
      legacy au SHA pinné (`git clone --filter=blob:none --depth=1` +
      `git fetch`/`checkout` du SHA exact), comparaison chemin par
      chemin — confirmé que `report-states` (module qui avait réussi)
      a 0/187 chemin manquant contre ce même clone, éliminant
      l'hypothèse d'une divergence globale de miroir ; le problème est
      bien localisé à `monitoring`/`reporting`.
      Délégué à un agent (protocole identique PLAT-5H..5K) avec
      consigne explicite : ne jamais fabriquer de correspondance sans
      preuve, documenter plutôt que deviner en cas d'incertitude,
      aucun `git add`/commit. L'agent a retracé chaque chemin manquant
      contre son propre clone du même SHA et corrigé uniquement le
      champ `legacy` de chaque paire concernée (3 motifs de divergence
      identifiés : sous-dossier par entité supprimé côté legacy —
      ex. `application/services/node/node.facade.ts` →
      `application/services/node.facade.ts` ; renommage de pattern
      architectural — `application/queries/<x>.query.ts` →
      `application/queries-bus/<x>.bus.ts` ; renommage de fichier —
      `domain/repositories/<x>.repository.ts` →
      `domain/repositories/<x>-repository.interface.ts`,
      `<x>-response-api.dto.ts` → `<x>-response.dto.ts`, composants
      déplacés sous `pages/<x>-page/`). 2 gaps non résolus, documentés
      plutôt que devinés : `monitoring.shell.rov-section-enum` et
      `reporting.shell.rov-section-enum` pointent vers
      `domain/enums/node/node.enum.ts`, introuvable sous quelque nom
      que ce soit dans les arborescences `monitoring`/`reporting` du
      clone (confirmé par une recherche exhaustive `find -iname
      "*enum*"` sur tout le legacy : aucun fichier enum n'existe dans
      ces deux modules à ce SHA — ce n'est pas un renommage caché).
      **Revue staff indépendante effectuée avant ce commit** (pas
      seulement confiance au rapport de l'agent) :
        - `git diff` : nombre de paires identique avant/après sur les
          2 fichiers (51 chacun), et comparaison programmatique
          confirmant qu'aucun champ autre que `legacy` n'a changé (30
          changements sur monitoring, 34 sur reporting, 0 diff
          résiduel après normalisation de ce seul champ).
        - Chaque nouveau chemin `legacy` re-testé indépendamment
          contre mon propre clone (distinct de celui de l'agent) :
          1 seul chemin manquant par module, exactement les 2 gaps
          `node.enum.ts` documentés — aucune régression, aucune
          correspondance fantaisiste introduite.
        - Recalcul manuel du taux `verified/applicable` par traceur
          (réimplémentation de la logique de `resolveStatus.mjs`) :
          tous les traceurs `monitoring`/`reporting` atteignent
          désormais ≥92% (`module.shell`, à cause du gap enum
          persistant) ou 100% (les 4 autres traceurs par module) —
          au-dessus du seuil `≥80%` requis, donc les deux modules
          devraient passer le gate `corpus-ready` au prochain run.
        - `node tools/run-prettier.mjs --check`, `node
          tools/check-file-weight.mjs`, validité JSON ligne par ligne
          des 2 fichiers : tous verts.
      **Limite explicite** : je n'ai pas pu exécuter `bun run
      corpus:full` moi-même (ni l'agent — `bunx`/`bun` absents des
      deux sandboxes), donc ni moi ni l'agent n'avons vu le gate H-2
      (build/lint/test) tourner après cette correction — seule la
      logique de résolution des chemins `legacy` a été vérifiée
      directement (2 fois, indépendamment). Le gap `node.enum.ts`
      reste ouvert : à investiguer si le fichier a été supprimé
      délibérément côté legacy (auquel cas la paire correspondante
      devrait être requalifiée `n/a` plutôt que rester `blocked`) ou
      s'il a été déplacé sous un nom non trouvé par la recherche.
    - **OPS-17 — fait** (2026-08-17). Un run `corpus:full` frais
      (déclenché via « Run workflow », pas un re-run — écarté comme
      cause après vérification du log complet) a montré
      `monitoring`/`reporting` retombés **exactement** sur les chiffres
      pré-OPS-15 (`blocked=5`, `29%`/`46%`/`23%`), alors que le commit
      OPS-15 était vérifié correct et présent sur `HEAD` trois fois de
      suite. Root cause réelle, distincte d'OPS-15 : `emit-pairs.mjs`
      **régénère** `corpus/{monitoring,reporting}.pairs.jsonl` à chaque
      exécution depuis les templates de chemins codés dans
      `tools/corpus/read-only-view-nodes.mjs`/`read-only-view.mjs` — le
      correctif OPS-15 avait édité le fichier `.pairs.jsonl` **de
      sortie** directement, un fichier entièrement écrasé à chaque run
      par le générateur qui, lui, n'avait jamais été corrigé. Chaque
      run CI « frais » régénérait donc fidèlement les mêmes chemins
      périmés — ce n'était pas un problème de cache ni de re-run, mais
      un fix appliqué à un artefact dérivé plutôt qu'à sa source.
      Diagnostic : clone legacy frais au pin exact (nouvelle instance,
      sans réutiliser aucun clone précédent) comparé champ par champ
      aux templates de `read-only-view-nodes.mjs`/`-shared.mjs` — a mis
      en évidence non seulement les 3 motifs déjà identifiés par
      OPS-15 (toujours présents dans le générateur, jamais corrigés
      là-bas) mais aussi 2 bugs supplémentaires jamais vus par OPS-15
      car invisibles au niveau JSONL : (1) le nœud `module.shell` sans
      `chain.section` hardcodait `legacyFolder: 'node'` pour **tous**
      les modules, y compris `reporting` qui n'a pas de section `node`
      — `reporting.module.shell` pointait donc plusieurs nœuds vers des
      chemins monitoring inexistants côté reporting ; (2) plusieurs
      convention irrégulières propres au legacy (repository/mapper/
      api/facade en dossier plat, sans sous-dossier de section — sauf
      `*.repository.impl.ts` qui reste au pluriel `legacyFolder`, pas
      singulier `legacyFlat` ; DTO en sous-dossier `facadeKebab`, pas
      `legacyFolder` ; `reporting.route.ts` singulier vs
      `monitoring.routes.ts` pluriel ; page components sous
      `pages/<facadeKebab>-page/`). Correctif : ajout d'un champ
      `legacyFlat` dédié (stem plat, distinct de `legacyFolder` et de
      `facadeKebab`) à `MONITORING_SECTIONS`/`REPORTING_SECTIONS`
      (`read-only-view-shared.mjs`), correction du fallback de contexte
      `module.shell` pour qu'il dérive du module courant plutôt que de
      hardcoder `'node'` (`read-only-view.mjs`), et récriture de 11
      templates de chemins dans `read-only-view-nodes.mjs` pour
      refléter exactement l'arborescence constatée. **Vérification
      indépendante avant commit** : script autonome important les
      fonctions réelles de production (`expandReadOnlyViewChain`,
      pas une réimplémentation) et testant `existsAt` contre le clone
      legacy frais pour les 9 chaînes `monitoring`/`reporting` — 0
      `blocked` inattendu sur les 4 traceurs `*.view` par module (100%)
      et 1 seul `blocked` par module sur `module.shell` (92%), dans les
      deux cas l'unique gap déjà documenté `rov-section-enum` (confirmé
      encore absent sur ce nouveau clone) — aucune régression, aucun
      nouveau gap. Vérification symétrique côté `nx` : les 2×15 chemins
      `nx` de sortie existent tous dans le monorepo. `node --check`
      (syntaxe) + `node tools/run-prettier.mjs --check`/`--write`
      (formatage) verts sur les 3 fichiers modifiés.
      **Limite explicite** : comme pour OPS-14/OPS-15, ni `bun`/`bunx`
      ni `nx` ne sont disponibles dans ce sandbox — je n'ai pas pu
      exécuter `emit-pairs.mjs` réellement (il appelle
      `assertModuleGate()`, qui invoque `bunx nx`, de façon
      inconditionnelle dès `--verify` ou écriture). Le fichier
      `corpus/{monitoring,reporting}.pairs.jsonl` committé reste donc
      celui d'OPS-15 (partiellement correct, mais pas identique à ce
      que le générateur corrigé produirait, et ne couvrant pas du tout
      `module.shell` qu'OPS-15 n'avait pas touché) — il sera régénéré
      et écrasé automatiquement par le prochain `corpus:full` réel,
      qui est désormais le générateur corrigé. Cela doit être confirmé
      par un run CI frais (« Run workflow », pas re-run) montrant
      `monitoring`/`reporting` passer `corpus-ready` (`≥80%`).
    - **OPS-18 — fait** (2026-08-17). Confirmation par le run réel
      post-OPS-17 : `monitoring`/`reporting` atteignent bien
      `corpus-ready` sur les 9 traceurs comme prévu par la vérification
      indépendante (4 traceurs `*.view` à 100%, `module.shell` à 92%
      dans les deux modules, `blocked=1` = le seul gap
      `rov-section-enum` déjà documenté). Les deux modules restent
      néanmoins en `❌ Échec` dans le log car `emit-pairs.mjs --verify`
      exige `tranche-closed` (100%) sur toutes les chaînes du module,
      pas seulement `corpus-ready`. Ce gap unique par module
      (`{monitoring,reporting}.shell.rov-section-enum` →
      `domain/enums/node/node.enum.ts`) est une absence de design
      légitime côté legacy, pas un renommage caché — confirmé par
      recherche exhaustive `find -iname "*enum*"` sur tout l'arbre
      legacy lors d'OPS-15 : des enums existent pour d'autres modules
      (`finalization`, `requests`, `coverage-areas`…) mais jamais pour
      `monitoring`/`reporting`. Décision utilisateur (AskUserQuestion,
      option recommandée retenue) : requalifier ce nœud en `n/a` plutôt
      que de le laisser indéfiniment `blocked` — même traitement que
      les autres nœuds `*-query-legacy`/`module-routes-legacy` déjà
      `n/a` dans le même pattern read-only-view. Correctif :
      `statusOverride: 'n/a'` ajouté au nœud `rov-section-enum` dans
      `read-only-view-nodes.mjs`, avec commentaire explicite sur la
      justification (l'artefact Nx `${module}-section.enum.ts` reste
      réel — unification `MonitoringSection`/`ReportingSection` — seule
      la correspondance legacy est déclarée absente par décision).
      Vérifié via le même script indépendant (fonctions de production
      réelles, pas de réimplémentation) contre le clone legacy frais :
      `blocked=0` sur les 9 chaînes des deux modules, `module.shell`
      passe de `n/a=2` à `n/a=3` (12/12 `exists`) — 100% attendu sur
      `verified/applicable`, débloquant `tranche-closed`. `node --check`
      + `node tools/run-prettier.mjs --check` verts.
      **Limite explicite** : même limite qu'OPS-17 — pas de `bun`/`nx`
      dans ce sandbox, donc pas d'exécution réelle d'`emit-pairs.mjs`
      ni de régénération du JSONL committé ; à confirmer par un
      prochain run CI frais montrant `monitoring`/`reporting` en
      `tranche-closed` (100%) sur les 9 traceurs, plus aucun `❌ Échec`.
    - **OPS-19 — fait** (2026-08-17). En creusant l'objectif plateforme
      (composition depuis n'importe quelle source — legacy n'étant
      qu'un exemple — vers n'importe quelle stack), tentative de
      constater la promotion M2→M3 de PLAT-3/PLAT-4
      (`generation-platform-capability-matrix.md` §4/§7 posait déjà
      « Promotion M3 conditionnée à la première exécution CI verte du
      lot »). Utilisateur d'abord confirmé « ci.yml est vert », puis —
      questionné sur le lien exact du run par prudence (leçon de
      l'épisode #39/OPS-12 : un statut « vert » déjà rapporté à tort
      une fois) — a vérifié et corrigé : **`ci.yml` n'a pas de
      `workflow_dispatch`, seulement `push`/`pull_request` sur `main`,
      et échoue systématiquement depuis au moins le run #47** (56 runs
      listés, tous rouges y compris le dernier push `73adb74`/OPS-18,
      21m42s). Aucune promotion M3 ne pouvait donc être actée — écarté
      avant toute modification de la matrice de capacités.
      Root cause, 2 causes indépendantes dans 2 jobs distincts :
        1. `security-audit` (`bun audit --audit-level=high`) :
           `image-size <=2.0.2` (2 avisos high, DoS via boucles
           infinies ICNS/JXL/HEIF) — déjà documenté comme exception
           acceptée depuis OPS-12e (CVSS 8.7 mais code jamais exécuté,
           `less` n'a aucun fichier `.less` dans ce dépôt, `overrides`
           structurellement inefficace côté Bun pour neutraliser une
           dépendance transitive). **Cette exception n'avait jamais été
           reportée dans le gate CI lui-même** — seulement documentée
           en prose — donc le job échouait silencieusement depuis
           OPS-12e sans qu'aucun run `ci.yml` vert n'ait jamais été
           observé depuis. Vérifié sur le registre npm que `2.0.2`
           reste la dernière version publiée (`dist-tags.latest`,
           aucun correctif disponible). Vérifié la doc Bun officielle
           (`bun.com/docs/pm/cli/audit`, version documentée = 1.3.14,
           identique à celle de CI) : `--ignore <GHSA-id>` existe,
           répétable, agit sur le code de sortie. Corrigé :
           `--ignore GHSA-w3rx-r6r6-pgpr --ignore GHSA-5p2g-fcmc-qvqq`
           ajoutés à l'étape `bun audit` de `ci.yml`, avec commentaire
           expliquant pourquoi (renvoie aussi vers le risque déjà
           documenté OPS-12e plutôt que de le dupliquer).
        2. `check:licenses` (`node tools/check-licenses.mjs`, qui
           invoque `npx license-checker-rseidelsohn`) : `npm error code
           EOVERRIDE — Override for postcss@catalog: conflicts with
           direct dependency`. Root cause trouvée dans `package.json` :
           `postcss` est déclaré deux fois — comme dépendance directe
           du catalog Bun workspace (`workspaces.catalog.postcss`,
           `8.5.22`) **et** dans `overrides.postcss` (`8.5.23`, ajouté
           par OPS-12e pour corriger CVE-2026-69153 sans avoir vérifié
           que `postcss` était déjà catalog-résolu). `bun install`
           tolère silencieusement ce doublon, mais `npm` (invoqué via
           `npx` par `check-licenses.mjs`) le rejette explicitement —
           c'est une régression introduite par OPS-12e elle-même,
           jamais détectée faute de `ci.yml` vert depuis. Corrigé à la
           source plutôt qu'en contournant le symptôme : version du
           catalog relevée à `8.5.23` (la version déjà patchée), entrée
           dupliquée retirée d'`overrides` — `postcss` n'a plus qu'une
           seule déclaration de version dans tout `package.json`.
           Vérifié programmatiquement (script Python) qu'aucun autre
           paquet ne partage ce même risque : intersection vide entre
           les clés d'`overrides` et celles de tous les catalogs
           (`catalog` + `catalogs.tooling`). `bun.lock` déjà verrouillé
           sur `postcss@8.5.23` (résolu par l'ancien override avant
           suppression) — pas de régénération de lockfile nécessaire
           pour ce changement précis.
      Vérifié : `python3 -c "import json; json.load(...)"` (JSON valide)
      + `python3 -c "import yaml; yaml.safe_load(...)"` (YAML valide) +
      `node tools/run-prettier.mjs --check` verts sur `package.json` et
      `ci.yml`.
      **Limite explicite** : je n'ai ni `bun` ni accès réseau GitHub
      Actions dans ce sandbox — je n'ai pas pu exécuter `bun audit`
      moi-même pour confirmer que `--ignore` avec ces 2 GHSA IDs
      exacts ramène bien le code de sortie à 0, ni rejouer
      `check:licenses` réellement. Les deux causes sont corrigées sur
      la base d'une lecture directe des messages d'erreur et de la
      documentation officielle Bun, pas d'une exécution locale — à
      confirmer par le prochain run CI réel. Il est possible (mais non
      confirmé) que d'autres jobs de `ci.yml` échouent aussi pour des
      raisons encore non vues, puisqu'aucun run vert n'a permis de
      vérifier les jobs suivants dans l'ordre — à réévaluer si le
      prochain run échoue ailleurs.

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

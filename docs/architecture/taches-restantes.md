# Tâches restantes — cmz-platform

- **Créé :** 2026-08-05
- **Dernière mise à jour :** 2026-08-10 — audit fichier-par-fichier exhaustif
  de 8 modules restants (report-states, requests, processing, communication,
  finalization, authentication, dashboard, interactive-map, monitoring,
  reporting, core), rigueur Meta/Google, chaque fichier lu individuellement.
  Findings majeurs : **T5-5** (pathsGuard absent sur 23 routes CRUD, dont
  settings-security) ; **T1-5** (duplication complète report-states ↔
  requests, preuve = fuite i18n **T13-10**) ; **T12-18** (corpus
  `crud-entity.mjs` — 726 paires à `legacy` synthétique non vérifié) ; revue
  senior post-commit `c73d75d` (a11y sévérité, e2e RBAC, gitleaks,
  `whenReady()`, oracle_report, settings-security tests câblés).
- **Statut :** source de vérité des travaux **encore ouverts / partiels**
- **Référentiel d’évaluation :** 13 audits Big Tech (Meta / Google / Amazon /
Microsoft) — Architecte Senior / Principal Engineer. Principes :
  - **machine avant opinion** (Shift-Left CI/CD) ;
  - **revues de jalon** (Design / Architectural Review Board) pour les
  décisions humaines ;
  - une règle non instrumentée n’est qu’une intention.

### Comment lire


| Colonne    | Sens                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------ |
| **Id**     | Stable : `T{n}-{k}` = audit Big Tech nº n · under-id ; alias audit local entre parenthèses |
| **État**   | `ouvert` · `partiel` · `en cours` · `bloqué-humain` · `décision` · `différé` · `fait`      |
| **Crit.**  | P0 · P1 · P2 · Ops                                                                         |
| **Effort** | S / M / L / XL                                                                             |


**Mesure git 2026-08-06 :** `main` = post PR #3 (sync), #12 (`nxCloudId`
claimé), #13 (knip bloquant, corpus, câblage `NX_CLOUD_ACCESS_TOKEN`). Smoke
local OK. **Nx Cloud** : login + id OK ; fin de setup VCS (bandeau
`Please complete setup` / `UNABLE_TO_CREATE_PULL_REQUEST` au wizard) →
**en cours** ; CI Actions peut être hors-jeu en incident forge.

### Cartographie 13 audits ⇄ outillage déjà en place (baseline)


| #   | Audit Big Tech                    | Instrumentation monorepo (déjà là)                                                                              | Score baseline* |
| --- | --------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------- |
| 1   | Boundaries & dependency graph     | ESLint `@nx/enforce-module-boundaries`, `check:declared-deps`, `check:boundary-negative`, tags `scope:`/`type:` | fort            |
| 2   | API contract & schema governance  | 21 `contracts/*.md`, pair schema, mappers, mock-server domaines                                                 | partiel         |
| 3   | State & domain model              | Clean/DDD 4 couches, entities/VO, `DomainError`, facades Signal                                                 | partiel         |
| 4   | AppSec SAST/DAST                  | ESLint, CSP, `bun audit` CI, Dependabot, **gitleaks** (T4-5 pre-push + CI), secrets non en dur (ADR-0017)       | partiel         |
| 5   | IAM / RBAC·ABAC                   | `authGuard`, `pathsGuard`, `permissionGuard`, `authInterceptor`                                                 | partiel         |
| 6   | Supply chain & licenses           | Dependabot, overrides, `licences-tierces.md`, bun.lock, pin engines                                             | partiel         |
| 7   | Privacy & data governance         | ADR-0019 (corpus), pages légales CMS                                                                            | faible          |
| 8   | Bundle & Core Web Vitals          | budgets ADR-0016, `bundle-metrics.json`, nightly composition                                                    | partiel         |
| 9   | Telemetry & log health            | `LoggerPort` + console adapter, `GlobalErrorHandler`                                                            | partiel         |
| 10  | Fault tolerance & resilience      | `errorInterceptor`/`DomainError`, **pas** retry/circuit                                                         | faible          |
| 11  | Code health / zero tech debt      | `check:all`, eslint max-warnings 0, convention-profile, duplicates, weight, knip **bloquant** (T11-1)           | fort            |
| 12  | Testing pyramid & oracle severity | Vitest, a11y axe (T12-8), Playwright smoke+login+RBAC mock (T12-6/T5-3) ; corpus structural H-1/H-2          |     partiel     |
| 13  | ADR & docs freshness              | `check:docs-freshness`, `generate:status`/`adr-index`, ADR 0001–0020                                            | fort            |


fort = machine bloquante quasi complète · partiel = outillage partiel · faible
= intention/doc peu ou pas instrumentée.

### Sources audits workspace locaux

`[audit-workspace-2026-08-02.md](./audit-workspace-2026-08-02.md)` ·
[addendum](./audit-workspace-2026-08-02-addendum.md) ·
[revue-finale](./audit-workspace-2026-08-02-revue-finale.md) ·
[08-03](./audit-workspace-2026-08-03.md) ·
[cartographie 08-04](./cartographie-modules-2026-08-04.md) · ensemble de
`docs/**`.

### Fermetures (ne pas re-ouvrir sans régression mesurée)

A- · B-1…B-4,B-6…B-8 · D- · E- · F-1…F-6 · G-3…G-6,G-8 · H-1…H-3 + pattern
family-dupe (id pattern **H-4** ≠ H-4-UI contracts) · I-1…I-7,I-9…I-15 ·
J-1…J-6,J-8,J-10…J-12 · K-1…K-4 · M-1…M-8 (52/52) · N-1,N-4,N-6,N-7 ·
O-1,O-2,O-5,O-6 · P-1/P-2 code paths · Meta IR 8/8 12/12 · crud-entity 100 %
pattern · i18n 0 manquante + CI bloquante · security-audit bloquant.

---

## 0. Préalable forge / ARB (hors type, bloque la valeur)


| Id    | Tâche                                                                                                                | État          | Effort | Crit.  | Alias      |
| ----- | -------------------------------------------------------------------------------------------------------------------- | ------------- | ------ | ------ | ---------- |
| OPS-1 | Push + PR + CI verte (36 commits + dirty)                                                                            | partiel       | M      | P0 Ops | P0-N1      |
| OPS-2 | Revalider protection `main` UI GitHub                                                                                | partiel       | S      | P1 Ops | G-2        |
| OPS-3 | Claim compte **Nx Cloud** (id + PAT login OK ; setup VCS/GitHub wizard + bandeau `complete setup` + token CI secret) | en cours      | S      | P1 Ops | G-7 · T6-4 |
| OPS-4 | Second relecteur CODEOWNERS                                                                                          | bloqué-humain | S      | P1     | P1-13      |
| OPS-8 | `nginx -t` réel conf + CSP                                                                                           | ouvert        | S      | P1 Ops | carto #6   |


---

# Famille 1 — Architecture & structure

## T1 — Audit d’isolation des frontières & graphe de dépendances

**Attendu Big Tech :** graphe de dépendances machine-vérifiable ; zéro import
illégal ; tags de couche ; test négatif prouvant que la règle fire encore.


| Id   | Tâche                                                                                                                       | État     | Effort | Crit. | Alias            |
| ---- | --------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | ----- | ---------------- |
| T1-1 | Maintenir `check:boundary-negative` + `declared-deps` verts après chaque PR (déjà bloquant) — **pas de dette structurelle** | partiel  | S      | P1    | D / A-12         |
| T1-2 | Décision ARB : scinder `shared` UI (historique ~351 fichiers — D3 plan)                                                     | décision | L      | P2    | plan D3 · ROAD-4 |
| T1-3 | Décision ADR-0020 : baisser dette family-dup **sous** baseline (ou rester non-régression)                                   | décision | L      | P2    | O-X · O-3/O-4    |
| T1-4 | Si Option factorisation : `@cmz/shared-workflow` + contracts take/filter génériques                                         | différé  | L      | P2    | O-3 O-4          |
| T1-5 | **Duplication confirmée entités "details" `report-states` ↔ `requests`** : `ReportStatesDetailsEntity`/`RequestsDetailsEntity` (domain), permissions util, qualification VO, `*DetailsDialogComponent` (UI, template HTML identique caractère pour caractère) — **diff normalisé = 0 ligne de logique différente**, seuls les noms de classes changent. Preuve concrète de la dette T1-4 : la dérive a déjà eu lieu (5 clés i18n `REQUESTS.DETAILS.*` oubliées dans `report-states` lors du copier-coller, cf. T13-10). Reclasse T1-4 de "décision différée" à "dette mesurée avec preuve d'incident" — factoriser dans `@cmz/shared-workflow` réduirait ce risque à la source. | **ouvert** | L | **P1** | NOUVEAU 2026-08-10, lié T1-4/T13-10 |
| T1-6 | Duplicata trivial `GrafanaDashboardEntity`/`MapEntity` (`{ grafanaLink: string }`, constructeur identique) copié **3 fois** indépendamment dans `monitoring`, `reporting`, `interactive-map`. Enjeu faible (3 lignes, zéro logique) mais même défaut de principe que T1-5 : un concept transversal ("lien d'intégration Grafana") sans lib partagée. Envisager `@cmz/shared-domain` si un 4e cas apparaît. | ouvert | S | P2 | NOUVEAU 2026-08-10 |


## T2 — Audit des contrats d’API & gouvernance des schémas

**Attendu Big Tech :** schéma source de vérité (OpenAPI/Protobuf) ; compat
breaking change gate ; DTOs générés ou validés ; mock = dérivé du schéma.


| Id   | Tâche                                                                              | État          | Effort | Crit. | Alias        |
| ---- | ---------------------------------------------------------------------------------- | ------------- | ------ | ----- | ------------ |
| T2-1 | Verser **OpenAPI** (ou export back-end) versionné dans le dépôt                    | bloqué-humain | M      | P0    | P-8          |
| T2-2 | Gate CI : DTO / mappers **conformes** au schéma (breaking = fail)                  | ouvert        | L      | P0    | P-9          |
| T2-3 | Dériver `tools/mock-server` du schéma (fin maintenance manuelle multi-domaines)    | ouvert        | L      | P1    | P-10         |
| T2-4 | Domaine mock `**reporting**` manquant (15 domaines présents)                       | ouvert        | S      | P2    | DT-2         |
| T2-5 | `contracts/component.contract.md` + `route.contract.md` (couche UI)                | fait          | M      | P2    | H-4-UI       |
| T2-6 | Contrats archétype **machine-readable** (JSON schema) consommés par l’oracle G-V-R | ouvert        | L      | P2    | GVR-3        |
| T2-7 | Étendre `pair.schema.json` : oracle structuré horodaté `{build,lint,test,…}`       | fait          | M      | P1    | H-5          |
| T2-8 | Pattern Nx `**action-request**` + job pattern-nx (crud déjà CI)                    | ouvert        | L      | P1    | J-9a · GVR-6 |


## T3 — Audit du modèle de données & gestion d’état

**Attendu Big Tech :** invariants domaine testés ; états UI univoques ; erreurs
typées ; pas de state divergeant du wire.


| Id   | Tâche                                                                                          | État          | Effort | Crit. | Alias       |
| ---- | ---------------------------------------------------------------------------------------------- | ------------- | ------ | ----- | ----------- |
| T3-1 | Narrowing des `catch` archétype d’erreur (app stricte > SEOS)                                  | ouvert        | M      | P1    | OUVERT-2    |
| T3-2 | Confirmer format **réel** `CurrentUser.paths` vs `pathsGuard` (login staging). **Preuve concrète du risque** : `current-user.mapper.spec.ts` (authentication/data) utilise une fixture `paths: ['/admin', '/admin/users']` — chemins **absolus avec slash** — alors que `pathsGuard` compare contre `route.routeConfig?.path` (**segment nu**, ex. `"report-states"`, sans slash). Si le format réel du backend est absolu, `paths.includes(segment)` ne matchera jamais et `pathsGuard` bloquerait silencieusement tous les utilisateurs sur les 4 routes protégées — régression du même type que le bug I-7 historique. Cette fixture pourrait aussi induire en erreur un futur contributeur qui la prendrait pour référence du format réel : elle n'est pas vérifiée contre une vraie réponse serveur. | bloqué-humain | S      | P0    | OPS-7 · I-7 |
| T3-3 | Couvrir VO/entity/validators restants (esp. settings-security orphelins → T12)                 | partiel       | M      | P1    | C-4         |
| T3-4 | Risque `provideDevPermissions()` : preuve exclusion **prod** (`isDev` + check:dev-permissions-prod + unit) | fait          | S      | P1    | DT-6        |
| T3-5 | Invariants filtre/période (ex. `InvalidPeriodError`) : matrix tests croisée modules RO + WA    | partiel       | M      | P2    | domaine     |
| T3-6 | `reportStatesDetailsPermissionsReject`/`requestsDetailsPermissionsReject` autorisent le reject dès `status IN_PROGRESS`, **sans condition sur `qualificationState`** — contrairement à `permissionsQualify` qui exige `qualificationState === PENDING`. Dupliqué identiquement dans les 2 modules (cohérence inter-module = probablement voulu) mais **aucun test ne couvre le cas croisé** (reject alors que qualification déjà `COMPLETED`). Clarifier l'intention métier et ajouter le test manquant. | ouvert | S | P1 | NOUVEAU 2026-08-10 |


---

# Famille 2 — Sécurité, gouvernance & conformité

## T4 — Audit de sécurité applicative (AppSec SAST / DAST)

**Attendu Big Tech :** SAST bloquant ; audit deps ; surface HTTP CSP/HSTS ; DAST
/ scan dynamic sur staging ; pas de secrets en dépôt.


| Id   | Tâche                                                                    | État    | Effort | Crit. | Alias        |
| ---- | ------------------------------------------------------------------------ | ------- | ------ | ----- | ------------ |
| T4-1 | `nginx -t` + vérif CSP réelle en image Docker                            | ouvert  | S      | P1    | OPS-8        |
| T4-2 | Pipeline Dependabot : absorber PR sécu, maintenir `bun audit --high` = 0 | partiel | S      | P1    | CI-4         |
| T4-3 | Introduire **SAST** complementary (CodeQL / Semgrep / gitleaks) en CI    | ouvert  | M      | P1    | Big Tech gap |
| T4-4 | **DAST** minimal staging (OWASP ZAP baseline ou équivalent) post-I-8     | différé | M      | P2    | Big Tech gap |
| T4-5 | Secret scanning pre-push + CI (**gitleaks** v8.24.3 piné, `check:secrets`) | fait    | S      | P1    | Big Tech gap |
| T4-6 | Revue configs `frame-src` Grafana (fail-closed documenté — runbook ops)  | ouvert  | S      | P2    | CSP          |


## T5 — Audit d’identité & contrôle d’accès (IAM / RBAC·ABAC)

**Attendu Big Tech :** tout endpoint/page garde ; matrice de permissions testée
; pas de `VIEW` fantôme ; e2e authN/authZ.


| Id   | Tâche                                                                 | État          | Effort | Crit. | Alias            |
| ---- | --------------------------------------------------------------------- | ------------- | ------ | ----- | ---------------- |
| T5-1 | e2e authN : login · token sur requête · 401 → logout                  | bloqué-humain | L      | P0    | I-8 · C-8 · P-12 |
| T5-2 | Matrix tests `pathsGuard` × formats `paths` réels (après T3-2)        | ouvert        | M      | P0    | I-7              |
| T5-3 | Tests e2e / intégration **refus** route hors path (RBAC) — mock pathsGuard + matrice WA unit + hydrate session | fait          | M      | P1    | IAM              |
| T5-4 | Document / ADR matrice permission legacy ↔ monorepo (vocabulaire fin) | partiel       | M      | P2    | I-7 doc          |
| T5-5 | **`pathsGuard` limité aux 4 modules workflow-action** (`report-states`/`processing`/`requests`/`finalization`, `app.routes.ts` L61-94). **23 segments de route** CRUD (`equipments/*`, `territorial-structures/*`, `coverage-areas/*`, `team-organization/*`, `content-management/*`, **`settings-security/*` — gestion users/permissions incluse —**, `communication/*`) n'ont aucune garde au-delà de `authGuard` (authentifié = accès, zéro contrôle "cette page vous est-elle accordée"). Seule une vérif fine par action existe dans certains composants (`PermissionActionsService.can()`), jamais au niveau route. Invisible en dev (`provideDevPermissions()` bypass tout) — même classe de risque que le bug historique I-7, non résolu ici. Décision requise : étendre `pathsGuard` à tous les modules ou documenter/justifier l'exemption. | **ouvert** | M | **P0** | NOUVEAU 2026-08-10 |


## T6 — Audit chaîne d’approvisionnement & licences tierces

**Attendu Big Tech :** SBOM ; inventaire licences permissives ; pin tools ;
sign/attest optionnel.


| Id   | Tâche                                                                                                                                                                                                                    | État     | Effort | Crit. | Alias          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------ | ----- | -------------- |
| T6-1 | Revue juridique `licences-tierces.md` + `LICENSE` + regime SEOS/corpus                                                                                                                                                   | décision | M      | P1    | OPS-6          |
| T6-2 | Job CI inventaire licences (automatiser license-checker)                                                                                                                                                                 | ouvert   | S      | P2    | P1-N2 residual |
| T6-3 | Générer **SBOM** cyclonedx/spdx en CI artifact                                                                                                                                                                           | ouvert   | M      | P2    | Big Tech gap   |
| T6-4 | Claim + activer Nx Cloud : `nxCloudId` `6a6fc43…` en `nx.json` ; secret CI câblé en workflow ; **reste** fin lien VCS (wizard step 5 / `Connect manually`) + disparition bandeau local + re-run CI post-incident Actions | en cours | S      | P1    | OPS-3          |


## T7 — Audit confidentialité & protection des données

**Attendu Big Tech :** inventaire PII ; rétention ; minimisation corpus / logs ;
DPIA si requis.


| Id   | Tâche                                                                                                      | État     | Effort | Crit. | Alias            |
| ---- | ---------------------------------------------------------------------------------------------------------- | -------- | ------ | ----- | ---------------- |
| T7-1 | Cadrage réglementaire données perso (identité, localisation, contacts)                                     | décision | M      | P1    | CORPUS-6 · P1-N6 |
| T7-2 | Politique : le corpus JSONL **ne doit jamais** emporter PII (hash/path only — ADR-0019) : contrôle machine | ouvert   | M      | P1    | ADR-0019         |
| T7-3 | Politique logs (LoggerPort) : pas de PII en clair ; scrub intercepteurs                                    | ouvert   | M      | P1    | T9 croisé        |
| T7-4 | Durabilité / rétention archive corpus de recherche                                                         | décision | M      | P2    | CORPUS-5         |
| T7-5 | ADR mono-langue vs multi-locale (i18n données affichées)                                                   | décision | S      | P2    | K-11             |


---

# Famille 3 — Performance, observabilité & SRE

## T8 — Audit budget performance client (bundle & CWV)

**Attendu Big Tech :** budgets bloquants ; régression delta ; Lighthouse/CWV en
lab ; code-split.


| Id   | Tâche                                                                           | État     | Effort | Crit. | Alias        |
| ---- | ------------------------------------------------------------------------------- | -------- | ------ | ----- | ------------ |
| T8-1 | CI fail sur **delta** `bundle-metrics.json` (pas seulement seuil absolu)        | partiel  | S      | P1    | P-7          |
| T8-2 | Composition bundle publiée + réutilisable (source-map-explorer en artefact CI)  | partiel  | M      | P1    | P-5          |
| T8-3 | Découper chunk commun (CDK, OL, date-fns…) marge ≥ 150 kB                       | ouvert   | L      | P1    | P-6          |
| T8-4 | Nightly composition : passer de `continue-on-error` à bloquant si signal stable | décision | S      | P2    | CI-3         |
| T8-5 | Lighthouse / Core Web Vitals (LCP CLS INP) lab en nightly                       | ouvert   | M      | P2    | Big Tech gap |
| T8-6 | Budgets lazy chunks (ExcelJS / OL déjà lazy — documenter plafonds séparés)      | partiel  | S      | P2    | ADR-0016     |


## T9 — Audit d’observabilité & télémétrie

**Attendu Big Tech :** traces / erreurs / métriques ; SLO ; alerting ;
correlation-id.


| Id   | Tâche                                                                 | État     | Effort | Crit. | Alias |
| ---- | --------------------------------------------------------------------- | -------- | ------ | ----- | ----- |
| T9-1 | Choisir + câbler collecteur (Sentry / OTel) + DSN + CSP `connect-src` | décision | M      | P1    | P-3   |
| T9-2 | Brancher `GlobalErrorHandler` + `LoggerPort` sur le collecteur        | partiel  | S      | P1    | P-2   |
| T9-3 | Correlation-id HTTP (auth/error interceptors) ↔ telemetrie            | ouvert   | M      | P1    | P-4   |
| T9-4 | Docs d’usage LoggerPort (niveaux, redaction PII)                      | partiel  | S      | P2    | P-1   |
| T9-5 | SLO front basiques (error rate, auth fail rate) + alerte              | différé  | M      | P2    | SRE   |


## T10 — Audit de résilience & modes dégradés

**Attendu Big Tech :** timeouts, retry borné, circuit breaker, modes
offline/degraded UI, chaos de dépendances optionnel.


| Id    | Tâche                                                                   | État    | Effort | Crit. | Alias        |
| ----- | ----------------------------------------------------------------------- | ------- | ------ | ----- | ------------ |
| T10-1 | Politique HTTP : timeout explicite par API_URL + retry idempotent GET   | ouvert  | M      | P1    | Big Tech gap |
| T10-2 | Mode dégradé UI quand API 0/5xx (empty states documentés + tests)       | ouvert  | M      | P1    | Big Tech gap |
| T10-3 | Circuit / backoff pour boucles facade `resource` (éviter storm)         | ouvert  | M      | P2    | Big Tech gap |
| T10-4 | Smoke « back offline » : auth + pages clés restent safe (pas de crash)  | ouvert  | M      | P1    | croise T12   |
| T10-5 | Documenter fail-closed CSP sans Grafana frame (déjà partiel) en runbook | partiel | S      | P2    | CSP          |


---

# Famille 4 — Qualité de code & rigueur d’ingénierie

## T11 — Audit santé du code & analyse statique (zero tech debt)

**Attendu Big Tech :** lint/type bloquants ; complex/weight gates ; dead code ;
copie interdite ; convention machine.


| Id    | Tâche                                                                                    | État    | Effort | Crit. | Alias           |
| ----- | ---------------------------------------------------------------------------------------- | ------- | ------ | ----- | --------------- |
| T11-1 | knip `dead-code` : **bloquant** (`continue-on-error` retiré ; contrat `knip-contrat.md`) | fait    | M      | P1    | C-9 · carto #13 |
| T11-2 | Aligner `check:i18n` local (encore `--warn-only`) sur CI bloquante                       | fait    | S      | P2    | CI-2            |
| T11-3 | Purger clés i18n orphelines (~K-5) après revue dynamique                                 | ouvert  | M      | P2    | K-5             |
| T11-4 | Union littérale clés i18n (tsc)                                                          | ouvert  | M      | P2    | K-6             |
| T11-5 | Réparer référence `tools/eslint-rules/**` (inputs retirés — 0 rules custom)               | fait    | S      | P2    | DT-3            |
| T11-6 | Plafond poids fichiers : surveiller allowlist (pas d’extension silencieuse)              | partiel | S      | P2    | F-6             |
| T11-7 | `check:convention-profile` + pattern-nx : garder 100 % à chaque entité nouvelle          | partiel | S      | P1    | J · crud        |
| T11-8 | **Pattern `entityCache = new Map()` non borné, dupliqué indépendamment dans 67 fichiers mapper** à travers presque tous les modules (report-states, requests, processing, finalization, team-organization, communication, settings-security, content-management, coverage-areas, administrative-boundary, administrative-infrastructure, dashboard). Objectif probable = stabilité référentielle des entités pour `OnPush`/signals. **Nuance après vérification croisée avec `HttpCacheStore` (`libs/core/.../http-cache.store.ts`, même pattern `Map` non borné mais délibéré et documenté)** : `SessionService.clear()` déclenche `navigation.reload()`, ce qui efface la mémoire JS à la déconnexion par construction — donc le cache **n'est pas** une fuite permanente au sens strict. Le risque réel, plus précis : **croissance non bornée pendant une session active longue** (agents/opérateurs qui consultent des centaines de fiches sur plusieurs heures sans déconnexion), jamais évalué ni testé sous charge. **Aucune mutualisation** dans les classes de base `SimpleResponseMapper`/`PaginatedMapper` (vérifiées : juste `mapItemFromDto` abstrait, zéro infra cache) — 67 implémentations indépendantes, donc 67 points de divergence possible si la politique doit un jour changer. Décision requise : mesurer si le volume réel justifie une factorisation `CachedEntityMapper` avec LRU borné, ou documenter explicitement (comme pour `HttpCacheStore`) pourquoi la taille non bornée est acceptable en pratique. | ouvert | M | P1 | NOUVEAU 2026-08-10, précisé après vérification `HttpCacheStore` |
| T11-9 | 3 composants dérogent à la convention établie **Signal Forms** (`@angular/forms/signals`, `FormField` via `@cmz/shared-ui` `FieldComponent` — 48 fichiers) et utilisent `ReactiveFormsModule`/`FormGroup` directement : `report-states-details-edit-fields.component.ts`, `requests-details-edit-fields.component.ts` (paire dupliquée, cf. T1-5), `tasks-actions-processing-form-dialog.component.ts`. Documenter si voulu (dialogs complexes non couverts par `FieldComponent`) ou migrer vers Signal Forms pour cohérence. | ouvert | S | P2 | NOUVEAU 2026-08-10 |


## T12 — Audit matrice de tests & sévérité de l’oracle

**Attendu Big Tech :** pyramide unit → integration → e2e ; oracle multi-niveaux
(structurel / comportemental / fonctionnel) ; couverture non-régression ; gate
emission.


| Id     | Tâche                                                                                     | État          | Effort | Crit. | Alias           |
| ------ | ----------------------------------------------------------------------------------------- | ------------- | ------ | ----- | --------------- |
| T12-1  | Target `test` + suites **dashboard / monitoring / reporting / interactive-map** (mappers + filtres + presenter) | fait          | L      | P0    | C-2             |
| T12-2  | Câbler specs orphelines **settings-security** (domain/app/ui) dans `project.json`         | fait          | S      | P0    | C-5a            |
| T12-3  | Généraliser tests kernel `shared/` (carto ~173 fichiers sans test direct)                 | partiel       | XL     | P0    | C-3             |
| T12-4  | ADR seuils couverture par couche                                                          | ouvert        | S      | P1    | C-1             |
| T12-5  | Vitest coverage + artefact + gate PR (mappers d’abord)                                    | ouvert        | M      | P2    | C-5 C-6         |
| T12-6  | Installer **Playwright** (ADR-0008) + smoke login mock (3 specs) + job CI `e2e-smoke`    | fait          | L      | P0    | C-7             |
| T12-7  | e2e réel staging (auth + path garde + page métier)                                        | bloqué-humain | L      | P0    | I-8 · P-11/12   |
| T12-8  | a11y : axe util (gate **critical\|serious**, WCAG A/AA) + specs crud-entity · WA · RO-view — **exécuté** CI | fait          | M      | P1    | M-9 · A11Y-     |
| T12-9  | Revue WCAG AA `shared-ui`                                                                 | ouvert        | L      | P2    | K-9             |
| T12-10 | Rejouer **toutes** paires corpus oracles durcis (H-1/H-2) + réémettre                     | partiel       | L      | P1    | H-6             |
| T12-11 | Durcir mapping oracle ↔ fichier nx (éviter :test vert sans toucher le `.ts` de la paire)  | ouvert        | M      | P1    | CORPUS-8        |
| T12-12 | Prouver `corpus-full` + legacy checkout verts en continuous sur forge                     | partiel       | S      | P1    | B-5             |
| T12-13 | Phase **09** : cadre + scénarios équivalence + outillage                                  | ouvert        | XL     | P0    | PH9- · ADR-0013 |
| T12-14 | Génération lit `angular-22.profile.json` (J-7)                                            | ouvert        | M      | P1    | J-7             |
| T12-15 | `check-semantics.mjs` porté Nx + CI                                                       | ouvert        | L      | P1    | J-9b            |
| T12-16 | Générateur chaînes depuis pattern JSON seul                                               | ouvert        | L      | P1    | GVR-1           |
| T12-17 | Specs unit restantes `core` + `shared-ui` composants                                      | partiel       | L      | P1    | L-CORE · L-UI   |
| T12-18 | ~~`crud-entity.mjs` : champ `legacy` synthétique (`legacy/${module}/${node}`) jamais résolu~~ — **corrigé** (commit à suivre, exécuté via `docs/architecture/backlog-llm.md` P0-2) : `legacy` vaut désormais `null` + `status:'n/a'` + note explicite pour les 726 paires des 10 modules crud-entity (administrative-boundary, administrative-infrastructure, communication, content-management, coverage-areas, settings-security, team-organization, authentication, core, shared). Plus aucun placeholder ressemblant à un chemin réel. Vérifié : `grep -rn '"legacy":"legacy/'` sur les 10 fichiers → 0 résultat. | **fait** | M | **P0** | 2026-08-10 |
| T12-18b | **Défaut préexistant découvert pendant la vérification de T12-18/P0-2, deux volets cumulés sur les mêmes lignes crud-entity : (1) `pair.schema.json` (`properties.id.pattern`) est `^[a-z0-9][a-z0-9.-]*$`, qui interdit `:` — or tous les ids `crud-entity` utilisent `chain_id::node` (séparateur `::`), présent depuis la création du générateur (indépendant de T12-18) ; (2) `pair.schema.json` (`properties.legacy`) est typé `{"type":"string"}` sans `null` autorisé, alors que le correctif T12-18 (legacy synthétique → `null` explicite) est la remédiation correcte pour une correspondance non vérifiable — le schéma n'a jamais anticipé ce cas. Résultat : `node tools/corpus/validate-pair-schema.mjs` reste à 800 lignes en échec avant/après T12-18 (le compteur global compte les lignes en échec, pas les erreurs individuelles ; ces lignes échouaient déjà sur (1) avant que T12-18 n'ajoute (2) sur les mêmes lignes). Corriger le schéma : autoriser `:` dans `id` (ou changer le séparateur), et ajouter `null` aux types acceptés par `legacy`. Puis re-valider.** | **ouvert** | S | **P0** | NOUVEAU 2026-08-10, découvert en vérifiant P0-2 |
| T12-19 | **4 use-cases sur 6 sans test** dans `report-states/application` (close/download/evaluate/reject-report-states.use-case.ts) — seuls `approve` et `report-states-details` ont un `.spec.ts`. Pattern quasi-identique entre les 6, donc risque de divergence silencieuse non détectée. Ajouter les 4 specs manquantes (template déjà disponible via `approve-report-states.use-case.spec.ts`). | ouvert | S | P1 | NOUVEAU 2026-08-10 |


## T13 — Audit fraîcheur documentaire & déductions architecturales (ADR)

**Attendu Big Tech :** ADR pour chaque arbitrage structurant ; docs générées =
CI ; zéro doc périmée sur `main`.


| Id    | Tâche                                                                               | État          | Effort | Crit. | Alias            |
| ----- | ----------------------------------------------------------------------------------- | ------------- | ------ | ----- | ---------------- |
| T13-1 | Resync cartographie / STATUS / LLM après push corpus (générateurs)                  | partiel       | S      | P2    | DT-4             |
| T13-2 | Clôturer ou corriger **Phase 06** 🔧 feuille-de-route (largement fait en pratique)  | partiel       | S      | P2    | ROAD-1           |
| T13-3 | Cadrage IA local documenté (skills, MCP Nx, Web Codegen Scorer)                     | ouvert        | M      | P2    | OUVERT-1 · GVR-5 |
| T13-4 | Finaliser commit des 10 JSONL corpus + coverage générée                             | partiel       | M      | P1    | CORPUS-1         |
| T13-5 | Meta 12/12 **ou** règle écrite « hors scorecard IR » pour modules crud              | ouvert        | L      | P1    | CORPUS-2         |
| T13-6 | Si stratégie ML : nouvel ADR + schéma contenu (N-2/N-3) — **interdit d’improviser** | différé       | XL     | P2    | ADR-0019         |
| T13-7 | Revue humaine ton des ~320 traductions auto                                         | bloqué-humain | M      | P1    | OPS-5            |
| T13-8 | Documenter `corpus:all` / `emit-all` dans guides                                    | partiel       | S      | P2    | GVR-8            |
| T13-9 | ADR-0015 option : `oracle.mode` dans JSONL                                          | différé       | S      | P2    | ADR-0015         |
| T13-10 | **Fuite i18n confirmée** : `report-states` (fiche "details" — dialog, qualification form, VO) utilise le namespace `REQUESTS.DETAILS.*` au lieu de `REPORT_STATES.DETAILS.*` (32 occurrences / 12 fichiers, vs 48 occurrences correctes `REPORT_STATES.*` dans le reste du module). Cause racine identifiée : copier-coller du module `requests` (T1-5) sans renommage complet. Corriger les clés + vérifier leur existence dans le catalogue de traduction réel (T13-7). | **ouvert** | S | **P1** | NOUVEAU 2026-08-10 |
| T13-11 | Convention DI incohérente non documentée : `@Service()` (554 fichiers — services/mappers/facades/use-cases/repositories) vs `@Injectable()` sans `providedIn` (41 fichiers, exclusivement les `*-filter.store.ts` UI). Aucune règle eslint ni doc n'impose/justifie cette distinction. Documenter la convention (ADR ou `LLM_CONTEXT.md`) ou l'unifier. | ouvert | S | P2 | NOUVEAU 2026-08-10 |


---

# P2 métier hors score IR (produit, non bloquants Meta)


| Id           | Module                        | Tâche                                                     | Origine module doc     |
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


---

# Roadmap hors Angular backoffice


| Id     | Tâche                                                               | État    | Crit. |
| ------ | ------------------------------------------------------------------- | ------- | ----- |
| ROAD-3 | Stacks multi (React, RN, Kotlin, Swift, PHP, Spring, Rust, Grafana) | différé | P2    |
| ROAD-2 | Phase 09 (cf. T12-13)                                               | ouvert  | P0    |


---

# Séquencement Big Tech (Shift-Left)

```
Immédiat   OPS-1 push/PR (quand Actions OK)
           T12-2 settings-security → **fait**
           T6-4 / OPS-3 Nx Cloud → **en cours** (lien VCS)
           T3-2 / OPS-7 paths (staging) quand accès
           T11-2 check:i18n local = CI → **fait**

Semaine 1  T12-1 tests RO-view → **fait** (16× `test` + mappers/filtres/presenter)
           T12-8 a11y CI → **fait** (gate critical|serious + 3 archétypes)
           T2-5 contracts UI · T2-7 pair oracle schema → **fait**
           T11-1 knip → **fait** (bloquant CI)

Semaine 2  T12-6 Playwright + smoke mock → **fait** (CI `e2e-smoke`)
           T5-3 e2e refus pathsGuard mock → **fait** (7 e2e verts)
           T2-1 OpenAPI (porteur)
           T12-12 corpus-full forge
           T12-10 re-emit corpus

Semaine 3  T9-1…T9-3 télémétrie
           T8-1…T8-3 bundle
           T10-1…T10-2 résilience HTTP
           T4-5 secrets gitleaks → **fait**
           T4-3 SAST (CodeQL/Semgrep)

Semaine 4+ T5/T12 e2e réel · T12-13 Phase 09
           T2-2…T2-3 schema→DTO→mock
           T7 privacy machine
           P2 métier par priority produit
```

**Revues de jalon (ARB / Design Review) requises pour :** T1-2/T1-3, T2-1, T7-1,
T9-1, T12-4, T13-6, factorisation O, multi-stack ROAD-3.

---

# Controverses documentaires (ne pas re-ouvrir faux)


| Sujet                            | Verdict 2026-08-05                                           |
| -------------------------------- | ------------------------------------------------------------ |
| P0-N1 « 482 non commis »         | Périmé comme bloc unique ; **OPS-1** reste (push 36 + dirty) |
| security/i18n non bloquants      | **Fermé** 2026-08-04                                         |
| daily-goal hors scope            | **Fermé** 52/52                                              |
| H-4                              | pattern family-dupe ✅ vs **T2-5** contracts UI ✅             |
| Chantier L                       | scope ✅ vs tests shared = **T12-3**                          |
| CODEOWNERS « fait »              | zoné ✅ ≠ **OPS-4** second regard                             |
| « 2,2 % tests »                  | Périmé ; unit RO-view ✅ · e2e smoke mock ✅ · staging = T12-7 |
| Corpus `verified` = comportement | **T12-11** encore vrai risque                                |
| Corpus 18/18 modules couverts (2026-08-10) | **Volume seulement.** 7 modules crud-entity sur 18 ont un `legacy` synthétique non vérifié — **T12-18**. Ne pas rapporter "corpus complet" sans cette réserve. |


---

# Actualisation

```bash
bun run generate:status
find libs -name '*.spec.ts' | sed 's|libs/\([^/]*\)/.*|\1|' | sort | uniq -c
rg -n 'continue-on-error' .github/workflows/*.yml
node tools/check-duplicate-files.mjs && node tools/check-duplicate-files.mjs --family
git rev-list --count origin/main..HEAD
# revues Big Tech : ce fichier § familles T1–T13
```

---

# Index


| Doc                                      | Rôle                                                |
| ---------------------------------------- | --------------------------------------------------- |
| Ce fichier                               | **Backlog machine + ARB** par type d’audit Big Tech |
| `[etat-du-socle.md](./etat-du-socle.md)` | 2 points ouverts historiques + renvoi               |
| `[STATUS.md](../../STATUS.md)`           | Chiffres générés                                    |
| `[LLM_CONTEXT.md](../../LLM_CONTEXT.md)` | Directives agents                                   |
| Audits 08-02→08-04                       | Historique ; **ce document prime** si date conflict |


---

*Clôture d’un item = commande/PR, jamais déclaration seule. Si un « fait »
regresse à la mesure, le reclasser ici avec date.*
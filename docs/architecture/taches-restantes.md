# Tâches restantes — cmz-platform

- **Créé :** 2026-08-05
- **Dernière mise à jour :** 2026-08-05 — **matrice Big Tech (13 audits)**
    - audits workspace 08-02→08-04 + `docs/**` + contre-mesure dépôt
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
| **État**   | `ouvert` · `partiel` · `bloqué-humain` · `décision` · `différé`                            |
| **Crit.**  | P0 · P1 · P2 · Ops                                                                         |
| **Effort** | S / M / L / XL                                                                             |

**Mesure git 2026-08-05 :** `main` **+36** vs `origin/main` + dirty tree
(corpus, specs, tools). Sans **push + CI verte**, une large part des
remédiations locales n’ont pas de valeur d’équipe.

### Cartographie 13 audits ⇄ outillage déjà en place (baseline)

| #   | Audit Big Tech                    | Instrumentation monorepo (déjà là)                                                                              | Score baseline* |
| --- | --------------------------------- | --------------------------------------------------------------------------------------------------------------- | :-------------: |
| 1   | Boundaries & dependency graph     | ESLint `@nx/enforce-module-boundaries`, `check:declared-deps`, `check:boundary-negative`, tags `scope:`/`type:` |      fort       |
| 2   | API contract & schema governance  | 21 `contracts/*.md`, pair schema, mappers, mock-server domaines                                                 |     partiel     |
| 3   | State & domain model              | Clean/DDD 4 couches, entities/VO, `DomainError`, facades Signal                                                 |     partiel     |
| 4   | AppSec SAST/DAST                  | ESLint, CSP déploiement, `bun audit` CI, Dependabot, secrets non en dur (obf storage ADR-0017)                  |     partiel     |
| 5   | IAM / RBAC·ABAC                   | `authGuard`, `pathsGuard`, `permissionGuard`, `authInterceptor`                                                 |     partiel     |
| 6   | Supply chain & licenses           | Dependabot, overrides, `licences-tierces.md`, bun.lock, pin engines                                             |     partiel     |
| 7   | Privacy & data governance         | ADR-0019 (corpus), pages légales CMS                                                                            |     faible      |
| 8   | Bundle & Core Web Vitals          | budgets ADR-0016, `bundle-metrics.json`, nightly composition                                                    |     partiel     |
| 9   | Telemetry & log health            | `LoggerPort` + console adapter, `GlobalErrorHandler`                                                            |     partiel     |
| 10  | Fault tolerance & resilience      | `errorInterceptor`/`DomainError`, **pas** retry/circuit                                                         |     faible      |
| 11  | Code health / zero tech debt      | `check:all`, eslint max-warnings 0, convention-profile, duplicates, weight, knip (non bloquant)                 |      fort       |
| 12  | Testing pyramid & oracle severity | Vitest (~151 specs), corpus structural, H-1/H-2 gate ; **0 Playwright**                                         |     partiel     |
| 13  | ADR & docs freshness              | `check:docs-freshness`, `generate:status`/`adr-index`, ADR 0001–0020                                            |      fort       |

\*fort = machine bloquante quasi complète · partiel = outillage partiel · faible
= intention/doc peu ou pas instrumentée.

### Sources audits workspace locaux

[`audit-workspace-2026-08-02.md`](./audit-workspace-2026-08-02.md) ·
[addendum](./audit-workspace-2026-08-02-addendum.md) ·
[revue-finale](./audit-workspace-2026-08-02-revue-finale.md) ·
[08-03](./audit-workspace-2026-08-03.md) ·
[cartographie 08-04](./cartographie-modules-2026-08-04.md) · ensemble de
`docs/**`.

### Fermetures (ne pas re-ouvrir sans régression mesurée)

A-\* · B-1…B-4,B-6…B-8 · D-\* · E-\* · F-1…F-6 · G-3…G-6,G-8 · H-1…H-3 + pattern
family-dupe (id pattern **H-4** ≠ H-4-UI contracts) · I-1…I-7,I-9…I-15 ·
J-1…J-6,J-8,J-10…J-12 · K-1…K-4 · M-1…M-8 (52/52) · N-1,N-4,N-6,N-7 ·
O-1,O-2,O-5,O-6 · P-1/P-2 code paths · Meta IR 8/8 12/12 · crud-entity 100 %
pattern · i18n 0 manquante + CI bloquante · security-audit bloquant.

---

## 0. Préalable forge / ARB (hors type, bloque la valeur)

| Id    | Tâche                                     | État          | Effort | Crit.  | Alias    |
| ----- | ----------------------------------------- | ------------- | :----: | :----: | -------- |
| OPS-1 | Push + PR + CI verte (36 commits + dirty) | partiel       |   M    | P0 Ops | P0-N1    |
| OPS-2 | Revalider protection `main` UI GitHub     | partiel       |   S    | P1 Ops | G-2      |
| OPS-3 | Claim compte **Nx Cloud**                 | bloqué-humain |   S    | P1 Ops | G-7      |
| OPS-4 | Second relecteur CODEOWNERS               | bloqué-humain |   S    |   P1   | P1-13    |
| OPS-8 | `nginx -t` réel conf + CSP                | ouvert        |   S    | P1 Ops | carto #6 |

---

# Famille 1 — Architecture & structure

## T1 — Audit d’isolation des frontières & graphe de dépendances

**Attendu Big Tech :** graphe de dépendances machine-vérifiable ; zéro import
illégal ; tags de couche ; test négatif prouvant que la règle fire encore.

| Id   | Tâche                                                                                                                       | État     | Effort | Crit. | Alias            |
| ---- | --------------------------------------------------------------------------------------------------------------------------- | -------- | :----: | :---: | ---------------- |
| T1-1 | Maintenir `check:boundary-negative` + `declared-deps` verts après chaque PR (déjà bloquant) — **pas de dette structurelle** | partiel  |   S    |  P1   | D / A-12         |
| T1-2 | Décision ARB : scinder `shared` UI (historique ~351 fichiers — D3 plan)                                                     | décision |   L    |  P2   | plan D3 · ROAD-4 |
| T1-3 | Décision ADR-0020 : baisser dette family-dup **sous** baseline (ou rester non-régression)                                   | décision |   L    |  P2   | O-X · O-3/O-4    |
| T1-4 | Si Option factorisation : `@cmz/shared-workflow` + contracts take/filter génériques                                         | différé  |   L    |  P2   | O-3 O-4          |

## T2 — Audit des contrats d’API & gouvernance des schémas

**Attendu Big Tech :** schéma source de vérité (OpenAPI/Protobuf) ; compat
breaking change gate ; DTOs générés ou validés ; mock = dérivé du schéma.

| Id   | Tâche                                                                              | État          | Effort | Crit. | Alias        |
| ---- | ---------------------------------------------------------------------------------- | ------------- | :----: | :---: | ------------ |
| T2-1 | Verser **OpenAPI** (ou export back-end) versionné dans le dépôt                    | bloqué-humain |   M    |  P0   | P-8          |
| T2-2 | Gate CI : DTO / mappers **conformes** au schéma (breaking = fail)                  | ouvert        |   L    |  P0   | P-9          |
| T2-3 | Dériver `tools/mock-server` du schéma (fin maintenance manuelle multi-domaines)    | ouvert        |   L    |  P1   | P-10         |
| T2-4 | Domaine mock **`reporting`** manquant (15 domaines présents)                       | ouvert        |   S    |  P2   | DT-2         |
| T2-5 | `contracts/component.contract.md` + `route.contract.md` (couche UI)                | ouvert        |   M    |  P2   | H-4-UI       |
| T2-6 | Contrats archétype **machine-readable** (JSON schema) consommés par l’oracle G-V-R | ouvert        |   L    |  P2   | GVR-3        |
| T2-7 | Étendre `pair.schema.json` : oracle structuré horodaté `{build,lint,test,…}`       | ouvert        |   M    |  P1   | H-5          |
| T2-8 | Pattern Nx **`action-request`** + job pattern-nx (crud déjà CI)                    | ouvert        |   L    |  P1   | J-9a · GVR-6 |

## T3 — Audit du modèle de données & gestion d’état

**Attendu Big Tech :** invariants domaine testés ; états UI univoques ; erreurs
typées ; pas de state divergeant du wire.

| Id   | Tâche                                                                                          | État          | Effort | Crit. | Alias       |
| ---- | ---------------------------------------------------------------------------------------------- | ------------- | :----: | :---: | ----------- |
| T3-1 | Narrowing des `catch` archétype d’erreur (app stricte > SEOS)                                  | ouvert        |   M    |  P1   | OUVERT-2    |
| T3-2 | Confirmer format **réel** `CurrentUser.paths` vs `pathsGuard` (login staging)                  | bloqué-humain |   S    |  P0   | OPS-7 · I-7 |
| T3-3 | Couvrir VO/entity/validators restants (esp. settings-security orphelins → T12)                 | partiel       |   M    |  P1   | C-4         |
| T3-4 | Risque `provideDevPermissions()` : preuve exclusion **prod** (feature flags / isDevMode audit) | partiel       |   S    |  P1   | DT-6        |
| T3-5 | Invariants filtre/période (ex. `InvalidPeriodError`) : matrix tests croisée modules RO + WA    | partiel       |   M    |  P2   | domaine     |

---

# Famille 2 — Sécurité, gouvernance & conformité

## T4 — Audit de sécurité applicative (AppSec SAST / DAST)

**Attendu Big Tech :** SAST bloquant ; audit deps ; surface HTTP CSP/HSTS ; DAST
/ scan dynamic sur staging ; pas de secrets en dépôt.

| Id   | Tâche                                                                    | État    | Effort | Crit. | Alias        |
| ---- | ------------------------------------------------------------------------ | ------- | :----: | :---: | ------------ |
| T4-1 | `nginx -t` + vérif CSP réelle en image Docker                            | ouvert  |   S    |  P1   | OPS-8        |
| T4-2 | Pipeline Dependabot : absorber PR sécu, maintenir `bun audit --high` = 0 | partiel |   S    |  P1   | CI-4         |
| T4-3 | Introduire **SAST** complementary (CodeQL / Semgrep / gitleaks) en CI    | ouvert  |   M    |  P1   | Big Tech gap |
| T4-4 | **DAST** minimal staging (OWASP ZAP baseline ou équivalent) post-I-8     | différé |   M    |  P2   | Big Tech gap |
| T4-5 | Secret scanning pre-push + CI (gitleaks/trufflehog)                      | ouvert  |   S    |  P1   | Big Tech gap |
| T4-6 | Revue configs `frame-src` Grafana (fail-closed documenté — runbook ops)  | ouvert  |   S    |  P2   | CSP          |

## T5 — Audit d’identité & contrôle d’accès (IAM / RBAC·ABAC)

**Attendu Big Tech :** tout endpoint/page garde ; matrice de permissions testée
; pas de `VIEW` fantôme ; e2e authN/authZ.

| Id   | Tâche                                                                 | État          | Effort | Crit. | Alias            |
| ---- | --------------------------------------------------------------------- | ------------- | :----: | :---: | ---------------- |
| T5-1 | e2e authN : login · token sur requête · 401 → logout                  | bloqué-humain |   L    |  P0   | I-8 · C-8 · P-12 |
| T5-2 | Matrix tests `pathsGuard` × formats `paths` réels (après T3-2)        | ouvert        |   M    |  P0   | I-7              |
| T5-3 | Tests e2e / intégration **refus** route hors path (RBAC)              | ouvert        |   M    |  P1   | IAM              |
| T5-4 | Document / ADR matrice permission legacy ↔ monorepo (vocabulaire fin) | partiel       |   M    |  P2   | I-7 doc          |

## T6 — Audit chaîne d’approvisionnement & licences tierces

**Attendu Big Tech :** SBOM ; inventaire licences permissives ; pin tools ;
sign/attest optionnel.

| Id   | Tâche                                                                  | État          | Effort | Crit. | Alias          |
| ---- | ---------------------------------------------------------------------- | ------------- | :----: | :---: | -------------- |
| T6-1 | Revue juridique `licences-tierces.md` + `LICENSE` + regime SEOS/corpus | décision      |   M    |  P1   | OPS-6          |
| T6-2 | Job CI inventaire licences (automatiser license-checker)               | ouvert        |   S    |  P2   | P1-N2 residual |
| T6-3 | Générer **SBOM** cyclonedx/spdx en CI artifact                         | ouvert        |   M    |  P2   | Big Tech gap   |
| T6-4 | Claim + activer Nx Cloud : claim [cloud.nx.app](https://cloud.nx.app), secret CI `NX_CLOUD_ACCESS_TOKEN`, `nxCloudId` déjà en `nx.json` | en cours (humain) |   S    |  P1   | OPS-3          |

## T7 — Audit confidentialité & protection des données

**Attendu Big Tech :** inventaire PII ; rétention ; minimisation corpus / logs ;
DPIA si requis.

| Id   | Tâche                                                                                                      | État     | Effort | Crit. | Alias            |
| ---- | ---------------------------------------------------------------------------------------------------------- | -------- | :----: | :---: | ---------------- |
| T7-1 | Cadrage réglementaire données perso (identité, localisation, contacts)                                     | décision |   M    |  P1   | CORPUS-6 · P1-N6 |
| T7-2 | Politique : le corpus JSONL **ne doit jamais** emporter PII (hash/path only — ADR-0019) : contrôle machine | ouvert   |   M    |  P1   | ADR-0019         |
| T7-3 | Politique logs (LoggerPort) : pas de PII en clair ; scrub intercepteurs                                    | ouvert   |   M    |  P1   | T9 croisé        |
| T7-4 | Durabilité / rétention archive corpus de recherche                                                         | décision |   M    |  P2   | CORPUS-5         |
| T7-5 | ADR mono-langue vs multi-locale (i18n données affichées)                                                   | décision |   S    |  P2   | K-11             |

---

# Famille 3 — Performance, observabilité & SRE

## T8 — Audit budget performance client (bundle & CWV)

**Attendu Big Tech :** budgets bloquants ; régression delta ; Lighthouse/CWV en
lab ; code-split.

| Id   | Tâche                                                                           | État     | Effort | Crit. | Alias        |
| ---- | ------------------------------------------------------------------------------- | -------- | :----: | :---: | ------------ |
| T8-1 | CI fail sur **delta** `bundle-metrics.json` (pas seulement seuil absolu)        | partiel  |   S    |  P1   | P-7          |
| T8-2 | Composition bundle publiée + réutilisable (source-map-explorer en artefact CI)  | partiel  |   M    |  P1   | P-5          |
| T8-3 | Découper chunk commun (CDK, OL, date-fns…) marge ≥ 150 kB                       | ouvert   |   L    |  P1   | P-6          |
| T8-4 | Nightly composition : passer de `continue-on-error` à bloquant si signal stable | décision |   S    |  P2   | CI-3         |
| T8-5 | Lighthouse / Core Web Vitals (LCP CLS INP) lab en nightly                       | ouvert   |   M    |  P2   | Big Tech gap |
| T8-6 | Budgets lazy chunks (ExcelJS / OL déjà lazy — documenter plafonds séparés)      | partiel  |   S    |  P2   | ADR-0016     |

## T9 — Audit d’observabilité & télémétrie

**Attendu Big Tech :** traces / erreurs / métriques ; SLO ; alerting ;
correlation-id.

| Id   | Tâche                                                                 | État     | Effort | Crit. | Alias |
| ---- | --------------------------------------------------------------------- | -------- | :----: | :---: | ----- |
| T9-1 | Choisir + câbler collecteur (Sentry / OTel) + DSN + CSP `connect-src` | décision |   M    |  P1   | P-3   |
| T9-2 | Brancher `GlobalErrorHandler` + `LoggerPort` sur le collecteur        | partiel  |   S    |  P1   | P-2   |
| T9-3 | Correlation-id HTTP (auth/error interceptors) ↔ telemetrie            | ouvert   |   M    |  P1   | P-4   |
| T9-4 | Docs d’usage LoggerPort (niveaux, redaction PII)                      | partiel  |   S    |  P2   | P-1   |
| T9-5 | SLO front basiques (error rate, auth fail rate) + alerte              | différé  |   M    |  P2   | SRE   |

## T10 — Audit de résilience & modes dégradés

**Attendu Big Tech :** timeouts, retry borné, circuit breaker, modes
offline/degraded UI, chaos de dépendances optionnel.

| Id    | Tâche                                                                   | État    | Effort | Crit. | Alias        |
| ----- | ----------------------------------------------------------------------- | ------- | :----: | :---: | ------------ |
| T10-1 | Politique HTTP : timeout explicite par API_URL + retry idempotent GET   | ouvert  |   M    |  P1   | Big Tech gap |
| T10-2 | Mode dégradé UI quand API 0/5xx (empty states documentés + tests)       | ouvert  |   M    |  P1   | Big Tech gap |
| T10-3 | Circuit / backoff pour boucles facade `resource` (éviter storm)         | ouvert  |   M    |  P2   | Big Tech gap |
| T10-4 | Smoke « back offline » : auth + pages clés restent safe (pas de crash)  | ouvert  |   M    |  P1   | croise T12   |
| T10-5 | Documenter fail-closed CSP sans Grafana frame (déjà partiel) en runbook | partiel |   S    |  P2   | CSP          |

---

# Famille 4 — Qualité de code & rigueur d’ingénierie

## T11 — Audit santé du code & analyse statique (zero tech debt)

**Attendu Big Tech :** lint/type bloquants ; complex/weight gates ; dead code ;
copie interdite ; convention machine.

| Id    | Tâche                                                                                   | État    | Effort | Crit. | Alias           |
| ----- | --------------------------------------------------------------------------------------- | ------- | :----: | :---: | --------------- |
| T11-1 | knip `dead-code` : **bloquant** (`continue-on-error` retiré ; contrat `knip-contrat.md`) | fait    |   M    |  P1   | C-9 · carto #13 |
| T11-2 | Aligner `check:i18n` local (encore `--warn-only`) sur CI bloquante                      | partiel |   S    |  P2   | CI-2            |
| T11-3 | Purger clés i18n orphelines (~K-5) après revue dynamique                                | ouvert  |   M    |  P2   | K-5             |
| T11-4 | Union littérale clés i18n (tsc)                                                         | ouvert  |   M    |  P2   | K-6             |
| T11-5 | Réparer référence `tools/eslint-rules/**` (créer rules ou retirer inputs)               | ouvert  |   S    |  P2   | DT-3            |
| T11-6 | Plafond poids fichiers : surveiller allowlist (pas d’extension silencieuse)             | partiel |   S    |  P2   | F-6             |
| T11-7 | `check:convention-profile` + pattern-nx : garder 100 % à chaque entité nouvelle         | partiel |   S    |  P1   | J · crud        |

## T12 — Audit matrice de tests & sévérité de l’oracle

**Attendu Big Tech :** pyramide unit → integration → e2e ; oracle multi-niveaux
(structurel / comportemental / fonctionnel) ; couverture non-régression ; gate
emission.

| Id     | Tâche                                                                                     | État          | Effort | Crit. | Alias             |
| ------ | ----------------------------------------------------------------------------------------- | ------------- | :----: | :---: | ----------------- |
| T12-1  | Target `test` + suites **dashboard / monitoring / reporting / interactive-map** (0 specs) | ouvert        |   L    |  P0   | C-2               |
| T12-2  | Câbler specs orphelines **settings-security** (domain/app/ui) dans `project.json`         | ouvert        |   S    |  P0   | C-5a              |
| T12-3  | Généraliser tests kernel `shared/` (carto ~173 fichiers sans test direct)                 | partiel       |   XL   |  P0   | C-3               |
| T12-4  | ADR seuils couverture par couche                                                          | ouvert        |   S    |  P1   | C-1               |
| T12-5  | Vitest coverage + artefact + gate PR (mappers d’abord)                                    | ouvert        |   M    |  P2   | C-5 C-6           |
| T12-6  | Installer **Playwright** (ADR-0008) + 1 smoke login                                       | ouvert        |   L    |  P0   | C-7               |
| T12-7  | e2e réel staging (auth + path garde + page métier)                                        | bloqué-humain |   L    |  P0   | I-8 · P-11/12     |
| T12-8  | a11y : stabiliser axe util + specs WA + RO-view ; fail serious/critical                   | partiel       |   M    |  P1   | M-9 · A11Y-\*     |
| T12-9  | Revue WCAG AA `shared-ui`                                                                 | ouvert        |   L    |  P2   | K-9               |
| T12-10 | Rejouer **toutes** paires corpus oracles durcis (H-1/H-2) + réémettre                     | partiel       |   L    |  P1   | H-6               |
| T12-11 | Durcir mapping oracle ↔ fichier nx (éviter :test vert sans toucher le `.ts` de la paire)  | ouvert        |   M    |  P1   | CORPUS-8          |
| T12-12 | Prouver `corpus-full` + legacy checkout verts en continuous sur forge                     | partiel       |   S    |  P1   | B-5               |
| T12-13 | Phase **09** : cadre + scénarios équivalence + outillage                                  | ouvert        |   XL   |  P0   | PH9-\* · ADR-0013 |
| T12-14 | Génération lit `angular-22.profile.json` (J-7)                                            | ouvert        |   M    |  P1   | J-7               |
| T12-15 | `check-semantics.mjs` porté Nx + CI                                                       | ouvert        |   L    |  P1   | J-9b              |
| T12-16 | Générateur chaînes depuis pattern JSON seul                                               | ouvert        |   L    |  P1   | GVR-1             |
| T12-17 | Specs unit restantes `core` + `shared-ui` composants                                      | partiel       |   L    |  P1   | L-CORE · L-UI     |

## T13 — Audit fraîcheur documentaire & déductions architecturales (ADR)

**Attendu Big Tech :** ADR pour chaque arbitrage structurant ; docs générées =
CI ; zéro doc périmée sur `main`.

| Id    | Tâche                                                                               | État          | Effort | Crit. | Alias            |
| ----- | ----------------------------------------------------------------------------------- | ------------- | :----: | :---: | ---------------- |
| T13-1 | Resync cartographie / STATUS / LLM après push corpus (générateurs)                  | partiel       |   S    |  P2   | DT-4             |
| T13-2 | Clôturer ou corriger **Phase 06** 🔧 feuille-de-route (largement fait en pratique)  | partiel       |   S    |  P2   | ROAD-1           |
| T13-3 | Cadrage IA local documenté (skills, MCP Nx, Web Codegen Scorer)                     | ouvert        |   M    |  P2   | OUVERT-1 · GVR-5 |
| T13-4 | Finaliser commit des 10 JSONL corpus + coverage générée                             | partiel       |   M    |  P1   | CORPUS-1         |
| T13-5 | Meta 12/12 **ou** règle écrite « hors scorecard IR » pour modules crud              | ouvert        |   L    |  P1   | CORPUS-2         |
| T13-6 | Si stratégie ML : nouvel ADR + schéma contenu (N-2/N-3) — **interdit d’improviser** | différé       |   XL   |  P2   | ADR-0019         |
| T13-7 | Revue humaine ton des ~320 traductions auto                                         | bloqué-humain |   M    |  P1   | OPS-5            |
| T13-8 | Documenter `corpus:all` / `emit-all` dans guides                                    | partiel       |   S    |  P2   | GVR-8            |
| T13-9 | ADR-0015 option : `oracle.mode` dans JSONL                                          | différé       |   S    |  P2   | ADR-0015         |

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
| ------ | ------------------------------------------------------------------- | ------- | :---: |
| ROAD-3 | Stacks multi (React, RN, Kotlin, Swift, PHP, Spring, Rust, Grafana) | différé |  P2   |
| ROAD-2 | Phase 09 (cf. T12-13)                                               | ouvert  |  P0   |

---

# Séquencement Big Tech (Shift-Left)

```
Immédiat   OPS-1 push/PR
           T12-2 orphelines settings-security
           T3-2 / OPS-7 paths (staging) quand accès

Semaine 1  T12-1 tests RO-view (comportemental)
           T12-8 a11y CI
           T2-5 contracts UI · T2-7 pair oracle schema
           T11-1 knip x86 → bloquant

Semaine 2  T2-1 OpenAPI (porteur) · T12-6 Playwright scaffold
           T12-12 corpus-full forge
           T12-10 re-emit corpus

Semaine 3  T9-1…T9-3 télémétrie
           T8-1…T8-3 bundle
           T10-1…T10-2 résilience HTTP
           T4-3 SAST / T4-5 secrets

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
| H-4                              | pattern family-dupe ✅ vs **T2-5** contracts UI ☐            |
| Chantier L                       | scope ✅ vs tests shared = **T12-3**                         |
| CODEOWNERS « fait »              | zoné ✅ ≠ **OPS-4** second regard                            |
| « 2,2 % tests »                  | Périmé ; trou = RO-view + e2e + couverture fine              |
| Corpus `verified` = comportement | **T12-11** encore vrai risque                                |

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
| [`etat-du-socle.md`](./etat-du-socle.md) | 2 points ouverts historiques + renvoi               |
| [`STATUS.md`](../../STATUS.md)           | Chiffres générés                                    |
| [`LLM_CONTEXT.md`](../../LLM_CONTEXT.md) | Directives agents                                   |
| Audits 08-02→08-04                       | Historique ; **ce document prime** si date conflict |

---

_Clôture d’un item = commande/PR, jamais déclaration seule. Si un « fait »
regresse à la mesure, le reclasser ici avec date._

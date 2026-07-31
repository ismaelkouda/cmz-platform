# SEOS — Registre des hypothèses (monorepo)

- **Créé :** 2026-07-30
- **Complète :** `SEOS-Assumptions-Register.md` du dépôt legacy (1 082 lignes)
- **Rôle :** journal des décisions d'ingénierie **spécifiques à la cible Nx**,
  avec implication corpus / Méthode 2.

Format d'entrée :

| Champ                  | Description                              |
| ---------------------- | ---------------------------------------- |
| **ID**                 | `A-YYYY-MM-DD-NN`                        |
| **Décision**           | Énoncé testable                          |
| **Contexte**           | Pourquoi maintenant                      |
| **Implication corpus** | Impact sur les paires legacy → Nx        |
| **Statut**             | `proposed` \| `accepted` \| `superseded` |

---

## A-2026-07-30-01 — `processing` = module de référence `workflow-action`

- **Décision :** le pattern `workflow-action` se formalise et se valide d'abord
  sur `processing`, avant réplication sur `requests`, `finalization`,
  `report-states`.
- **Contexte :** 19 entités (36 %) partagent files d'attente + transitions ;
  aucun schéma JSON n'existait encore
  ([analyse Phase 03](../architecture/analyse-du-projet-source.md)).
- **Implication corpus :** toutes les paires `workflow-action` portent
  `reference_module: "processing"` jusqu'à validation d'un second module
  indépendant (discipline Rule 0 du charter SEOS).
- **Statut :** **accepted**

---

## A-2026-07-30-02 — Corpus hybride file-level + `chain_id`

- **Décision :** une entrée corpus = **un fichier** (legacy path → nx path) +
  tag `chain_id` pour grouper les slices verticales.
- **Contexte :** file-level seul perd la sémantique de bout-en-bout ;
  chain-level seul empêche l'apprentissage fin (mapping d'un archétype isolé).
- **Implication corpus :** schéma
  [`pair.schema.json`](../architecture/corpus/pair.schema.json), outil
  `tools/corpus/emit-pairs.mjs`.
- **Statut :** **accepted**

---

## A-2026-07-30-03 — Pas de fusion prématurée des entités liste par volet

- **Décision :** `QueuesEntity`, `TasksEntity`, `AllEntity` →
  `{Volet}ProcessingEntity` distinctes (props + mapper + DTO séparés), même si
  la forme est identique aujourd'hui.
- **Contexte :** fusion en `ProcessingListItemEntity` détruit la paire annotée
  `(QueuesEntity → …)` requise par la Méthode 2.
- **Implication corpus :** interdit les paires génériques multi-volet ; logique
  item **inline** par mapper volet, pas de util partagé inter-volet.
- **Statut :** **accepted**

---

## A-2026-07-30-04 — Nommage `{Volet}{Module}{Role}` en monorepo

- **Décision :** qualifier par module (`QueuesProcessingUseCase`, pas
  `QueuesUseCase`) pour les modules `processing`, `requests`, `finalization`.
- **Contexte :** barrels `@cmz/*-application` coexistent dans le composition
  root.
- **Implication corpus :** le mapping legacy → nx inclut la transformation de
  nom (`queues.use-case.ts` → `queues-processing.use-case.ts`).
- **Statut :** **accepted**

---

## A-2026-07-30-05 — CQRS ceremony legacy ≠ cible monorepo (listes)

- **Décision :** pour les volets liste `workflow-action`, la cible Nx est
  `facade → use-case → repository (port)` sans `query-bus` / `handler`.
- **Contexte :** modules livrés (`administrative-infrastructure`, `processing`)
  valident cette simplification ; le legacy processing garde bus/handler pour
  historique.
- **Implication corpus :** paires **structurelles** (pas ligne-à-ligne) :
  `queries-bus/{volet}/{volet}.bus.ts` → _absent_ — documenté `status: "n/a"`
  avec `notes` expliquant l'écart architectural accepté.
- **Statut :** **accepted** — _à revalider si un second module workflow exige le
  bus._

---

## A-2026-07-30-06 — Duplication item mappers par volet (pas de util partagé)

- **Décision :** chaque volet liste possède son mapper item avec logique wire
  **inline** (`Queues/Tasks/AllProcessingItemMapper`). Pas de helper data
  partagé inter-volet.
- **Contexte :** Q1 — balance DRY vs pureté corpus ; A-03 impose des paires
  nommées par volet.
- **Implication corpus :** paires annotées = artefacts **nommés par volet**
  uniquement ; aucune entrée pour `*-props.mapper.util.ts`.
- **Statut :** **accepted**

---

## A-2026-07-30-07 — Lifecycle pattern `workflow-action` v0

- **Décision :** (1) valider v0 sur `processing` dans ce monorepo → (2)
  promouvoir sur `requests` **sans modifier le schéma** → (3) sync vers
  `legacy/seos/patterns/workflow-action.pattern.json` quand Rule 0 satisfaite
  (second module indépendant validé).
- **Contexte :** Q2 — emplacement des `.pattern.json` ; cmz-platform = cible de
  validation ([ADR-0009](../adr/0009-reconstruction-pilotee-par-patterns.md)).
- **Implication corpus :** `reference_module: processing` jusqu'à step 3 ;
  paires `requests.*` portent le même pattern versionné.
- **Statut :** **accepted**

---

## A-2026-07-30-08 — Oracle à deux niveaux (décision ingénieur Meta)

- **Décision :** séparer **oracle module** (corpus) et **oracle intégration
  app** (composition root).
    - **Tier 1 — corpus (PR, bloquant paire `verified`) :** cibles Nx scoped au
      module — `@cmz/{module}-domain|data|application|ui:build|test` + eslint
      boundaries sur `libs/{module}/**`. Rapide, déterministe, localise les
      régressions.
    - **Tier 2 — intégration (PR touchant `apps/` ou providers, ou nightly) :**
      `backoffice-angular:build` + `ngc --strictTemplates`. Valide le
      composition root sans bloquer l'émission corpus d'un nœud domain/data
      isolé.
    - **Règle :** une paire corpus **n'attache jamais**
      `backoffice-angular:build` comme oracle unique ; les nœuds `app/` (ex.
      `processing.providers.ts`) utilisent Tier 1 agrégé
      (`@cmz/processing-*:build`) + vérification fichier présent.
- **Contexte :** Q3 — `backoffice-angular:build` est coûteux et mélange les
  fautes ; Meta/Google séparent _module correctness_ vs _app integration_.
- **Implication corpus :** `emit-pairs --verify` n'exécute que Tier 1 ; CI
  nightly ou job séparé pour Tier 2.
- **Statut :** **accepted**

---

## A-2026-07-30-09 — Seuils double barre (émission vs clôture)

- **Décision :**
    - **Émission intermédiaire** (dataset Méthode 2 partiel) : ≥ **80 %** des
      nœuds applicables en `verified` par `chain_id`.
    - **Clôture tranche** (ex. tranche A listes) : **100 %** des nœuds
      applicables en `verified`.
- **Contexte :** Q4 — itérer sans bloquer l'entraînement, mais ne pas marquer
  une tranche « faite » avant complétude.
- **Implication corpus :** rapport `emit-pairs` affiche `corpus-ready (80 %)` et
  `tranche-closed (100 %)` distinctement.
- **Statut :** **accepted**

---

## A-2026-07-30-10 — Promotion `requests` (Rule 0 tranche A)

- **Décision :** le module `requests` est reconstruit avec le **même schéma**
  `workflow-action.pattern.json` v0 que `processing`, sans modification des
  nœuds IR `list_volet`. Écarts legacy documentés localement (`status` vs
  `state`, endpoints préfixés `requests/`, presenters operators i18n).
- **Contexte :** step 2 du lifecycle A-2026-07-30-07 ; 77 paires corpus à 100 %
  verified/applicable sur tranche A.
- **Statut :** **accepted**

---

## A-2026-07-30-11 — Sync pattern legacy + CI corpus Tier 1

- **Décision :**
    - **Sync :** `bun run corpus:sync-pattern` pousse
      `workflow-action.pattern.json` vers legacy `seos/patterns/` (format
      `core_files` + section `nx_sync`).
    - **CI Tier 1 :** job `corpus` exécute `emit-pairs --verify --oracle-only`
      (`CORPUS_ORACLE_ONLY=1`) — oracle module nx sans checkout legacy.
    - **Exit code :** `--verify` échoue (exit 1) si une chaîne n'est pas
      tranche-closed (100 % verified, 0 pending/blocked).
- **Contexte :** step 3 lifecycle pattern + garde-fou PR (A-2026-07-30-08).
- **Statut :** **accepted**

---

## A-2026-07-30-12 — Corpus tranche A ≠ audit référence `processing`

- **Décision :** la clôture corpus (`100 % verified` sur `list_volet` + shell)
  **ne vaut pas** audit de référence terminé. L'audit ligne-à-ligne legacy → Nx
  reste **bloquant** avant d'étendre `details`/`tasks_actions` à `requests` ou
  de revendiquer parité fonctionnelle listes.
- **Contexte :** Rule 0 et sync pattern legacy portent sur **tranche A IR** ;
  l'utilisateur a rappelé que l'audit `processing` n'est pas clos.
- **Implication :** tracker
  [`processing-reference-audit.md`](../architecture/processing-reference-audit.md)
  ; CI corpus `--tranche A` ; chaîne `processing.details` en pending jusqu'à
  audit tranche A signé.
- **Statut :** **accepted**

---

## A-2026-07-30-13 — Audit structurel volet `queues` signé

- **Décision :** le volet **queues** de `processing` passe l'audit structurel
  tranche A (DTO wire, mappers item/filtre, VO filtre, API, use-case, presenter
  VM). Périmètre exclu : UI composants legacy, i18n runtime, permissions
  réelles.
- **Contexte :** première tranche de l'audit référence (A-2026-07-30-12) ;
  correction P0 : `source.trim()` dans `queuesProcessingFilterVo`.
- **Implication :** rapport
  [`processing-queues-audit.md`](../architecture/audits/processing-queues-audit.md)
  ; prochaine étape audit = volet `tasks`.
- **Statut :** **accepted**

---

## A-2026-07-30-14 — Audit structurel volet `tasks` signé

- **Décision :** le volet **tasks** de `processing` passe l'audit structurel
  tranche A (même grille que queues ; endpoint `taken`, action `treat`).
  Périmètre exclu : UI, i18n, permissions, tranche C `tasks/actions`.
- **Contexte :** suite audit référence (A-2026-07-30-13) ; VO filtre partagé
  unifie le trim `uniqId`/`source` (legacy `TasksFilterVo` ne trimmait pas).
- **Implication :** rapport
  [`processing-tasks-audit.md`](../architecture/audits/processing-tasks-audit.md)
  ; prochaine étape audit = volet `all`.
- **Statut :** **accepted**

---

## A-2026-07-30-15 — Audit structurel volet `all` signé

- **Décision :** le volet **all** de `processing` passe l'audit structurel
  tranche A (filtre liste + **`state` wire `terminated`** end-to-end).
- **Contexte :** suite audits queues/tasks ; legacy `processing/all` porte
  `state` en UI/DTO mais **ne l'émet pas** en HTTP (VO/entity/mapper
  incomplets). Nx corrige ce câblage.
- **Implication :** rapport
  [`processing-all-audit.md`](../architecture/audits/processing-all-audit.md).
- **Statut :** **accepted**

---

## A-2026-07-30-16 — Relecture structurelle tranche A listes (3/3) clos

- **Décision :** la **relecture métier structurelle** des 3 volets listes
  (`queues`, `tasks`, `all`) est **signée**. Distinct de l'audit référence
  global (i18n, UI, permissions, tranches B/C).
- **Contexte :** clôture séquence audit validée par l'utilisateur ; chaque volet
  a un rapport dédié sous `docs/architecture/audits/`.
- **Implication :** autorise le démarrage **tranche B `processing.details`** (22
  nœuds corpus pending) ; **pas** l'extension details/actions à `requests`.
- **Statut :** **accepted**

---

## A-2026-07-31-01 — Clôture module `requests` (IR + corpus)

- **Décision :** le module `requests` est **clôturé** au sens SEOS : oracle Tier
  1 vert, corpus 157 paires (119 verified + 38 n/a), 8 chaînes tranche-closed,
  audit Meta 12/12 signé
  (`docs/architecture/audits/requests-meta-verification.md`).
- **Contexte :** step 2 lifecycle A-07 complété pour `requests` ; pattern sync
  legacy (A-11) ; enrichissement corpus export/permissions/qualification.
- **Implication :** **autorise** le démarrage du prochain module
  `workflow-action` (`finalization`, tranche A listes). Shell UI legacy
  (`ManagementDialog`) reste hors périmètre IR — non bloquant.
- **Statut :** **accepted**

---

## A-2026-07-31-02 — Clôture module `finalization` (IR + corpus)

- **Décision :** le module `finalization` est **clôturé** au sens SEOS : oracle
  Tier 1 vert, corpus 126 paires (90 verified + 36 n/a), 6 chaînes
  tranche-closed, audit Meta 12/12 signé
  (`docs/architecture/audits/finalization-meta-verification.md`).
- **Contexte :** réplication `workflow-action` depuis `requests` ; contrats
  distincts (take/finalize, filtre `state: terminated`, RBAC `finalize`).
- **Implication :** famille `workflow-action` **complète IR** (`processing`,
  `requests`, `finalization`). P2 restants : parité UX shell legacy
  (`ManagementDialog`) sur `processing`
  ([A-12](../architecture/processing-reference-audit.md)).
- **Note :** **supersédé partiellement par
  [A-2026-07-31-04](#a-2026-07-31-04--clôture-module-report-states-ir--corpus)**
  — la famille est désormais **4/4** avec `report-states`.
- **Statut :** **accepted**

---

## A-2026-07-31-03 — Clôture module `processing` (IR + corpus)

- **Décision :** le module `processing` est **clôturé** au sens SEOS : oracle
  Tier 1 vert, corpus 156 paires (117 verified + 39 n/a), 7 chaînes
  tranche-closed, audit Meta 12/12 signé
  (`docs/architecture/audits/processing-meta-verification.md`).
- **Contexte :** module de référence `workflow-action` v0 ; tranches B/C
  (details, tasks/actions, export Excel) livrées après clôture tranche A listes.
- **Implication :** les quatre modules famille `workflow-action` sont clôturés
  IR ; `processing` reste référence pattern jusqu'à validation d'un second
  archétype. P2 UX (ManagementDialog, sweet-alert tasks/actions) hors périmètre
  clôture.
- **Statut :** **accepted**

---

## A-2026-07-31-04 — Clôture module `report-states` (IR + corpus)

- **Décision :** le module `report-states` est **clôturé** au sens SEOS : oracle
  Tier 1 vert, corpus 187 paires (138 verified + 49 n/a), 8 chaînes
  tranche-closed, audit Meta 12/12 signé
  (`docs/architecture/audits/report-states-meta-verification.md`).
- **Contexte :** 4ᵉ et dernier membre famille `workflow-action` ; 5 volets état
  (approve/evaluate/close/reject/download) + details take/approve/reject +
  export Excel ×4.
- **Implication :** famille `workflow-action` **complète IR** (4/4). P2 restants
  : centre d'export Shapefile volet `download`, parité UX shell legacy.
- **Statut :** **accepted**

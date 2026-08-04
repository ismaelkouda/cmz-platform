# Cartographie des modules — cmz-platform (2026-08-04)

> **Document vivant**, mis à jour à chaque passe d'audit. Complète —
> sans les remplacer — [`audit-workspace-2026-08-03.md`](./audit-workspace-2026-08-03.md)
> (journal narratif d'exécution) et [`STATUS.md`](../../STATUS.md) (snapshot
> machine-généré). Ce document répond à une question différente des deux
> autres : **pour chaque module, qu'est-ce qui a été fait, par qui/quoi
> (humain, corpus, oracle), ce qui reste, ce qui a été amélioré, ce qui a
> été découvert** — pour qu'aucun point ne se perde entre deux passes.

## 0. Principe directeur — confirmé par le porteur du projet (2026-08-04)

> « Je confirme que le livrable n'est pas l'application, c'est le corpus et
> la sévérité de l'oracle qui l'a validé. »

Ce document s'organise donc autour de cette hiérarchie, pas autour de
l'apparence de l'application :

1. **Le corpus** (`corpus/*.pairs.jsonl`) — les correspondances
   legacy↔Nx réellement vérifiées, module par module. 587 paires
   `verified` + 194 `n/a` documentées (ADR-0019) — **pas** un jeu
   d'apprentissage au sens M2, un index de correspondances de chemins.
2. **La sévérité de l'oracle** — l'ensemble des portes de vérification
   mécaniques (tsc, eslint, ngc strictTemplates, check-pattern,
   check-duplicates, corpus verify, tests) et leur statut **bloquant ou
   non** en CI aujourd'hui (§2).
3. **L'application** (le code livré) n'est que la **conséquence** du
   passage répété par ce système de portes — jamais la mesure elle-même.

Une ligne verte dans `STATUS.md` (« ✅ Compilant ») ne dit rien sur la
sévérité de l'oracle qui l'a produite. Ce document distingue explicitement
les modules passés par l'oracle le plus sévère (corpus + Meta-vérification
12/12) de ceux qui n'ont traversé que les portes socle (tsc/eslint/ngc).

## 1. Vue d'ensemble — matrice des 18 modules

| Module | Famille | Paires corpus | Meta-vérif. | Pattern Nx-shaped | Fichiers `.spec.ts` (corpus-générés) | Fichiers `.spec.ts` (manuels, chantier L) | Touché cette session |
| --- | --- | ---: | :---: | :---: | ---: | ---: | :---: |
| `administrative-boundary` | crud-entity | 0 | — | ✅ 66/66 (N-7, 2e validation) | 0 | 10 | ✅ N-7 + backlog #4 |
| `administrative-infrastructure` | crud-entity | 0 | — | ✅ 66/66 (N-7, référence) | 0 | 6 | ✅ N-7 + backlog #4 |
| `authentication` | action-request | 0 | — | — | 0 | 2 | ✅ I-7 + backlog #4 |
| `communication` | crud-entity | 0 | — | — | 0 | 3 | ✅ backlog #4 |
| `content-management` | crud-entity | 0 | — | — | 0 | 0 | ☐ |
| `core` (kernel) | kernel | 0 | — | — | 4 | 0 | ✅ chantier I |
| `coverage-areas` | crud-entity | 0 | — | — | 0 | 0 | ☐ |
| `dashboard` | read-only-view | 25 | 12/12 | (`read-only-view.pattern.json`) | 0 | 0 | ☐ (touché indirectement, P-5/P-6) |
| `finalization` | workflow-action | 126 (6 chaînes) | 12/12 | (`workflow-action.pattern.json`, H-4) | 16 | 0 | ⚠️ H-4 (contrainte), pas le code |
| `interactive-map` | read-only-view | 28 | 12/12 | (`read-only-view.pattern.json`) | 0 | 0 | ☐ |
| `monitoring` | read-only-view | 51 (5 chaînes) | **12/12, a posteriori 2026-08-04** | (`read-only-view.pattern.json`, module de référence) | 0 | 0 | ✅ backlog #2 |
| `processing` | workflow-action | 156 (7 chaînes) | 12/12 | (`workflow-action.pattern.json`, H-4) | 16 | 0 | ⚠️ H-4 (contrainte), pas le code |
| `report-states` | workflow-action | 187 (8 chaînes) | 12/12 | (`workflow-action.pattern.json`, H-4) | 9 | 0 | ⚠️ H-4 (contrainte), pas le code |
| `reporting` | read-only-view | 51 (5 chaînes) | **12/12, a posteriori 2026-08-04** | (`read-only-view.pattern.json`, `second_validation`) | 0 | 0 | ✅ backlog #2 |
| `requests` | workflow-action | 157 (8 chaînes) | 12/12 | (`workflow-action.pattern.json`, H-4) | 17 | 0 | ⚠️ H-4 (contrainte), pas le code |
| `settings-security` | crud-entity | 0 | — | — | 0 | 6 | ✅ I-7 + backlog #4 |
| `shared` (kernel) | kernel | ≥1 (via `libs/shared/...`) | — | — | 4 (chantier I, hors chantier L) | **16** | ✅✅ chantier I + chantier L |
| `team-organization` | crud-entity | 0 | — | 2 entités manquantes (ADR-0018) | 0 | 5 | ✅ backlog #4 |

**Lecture immédiate** : sur 18 modules, **8** ont désormais traversé
l'oracle le plus sévère (corpus + Meta-vérification 12/12, colonne
« Meta-vérif. ») — `dashboard`, `finalization`, `interactive-map`,
`monitoring`, `processing`, `report-states`, `reporting`, `requests`.
`monitoring` et `reporting` ont reçu leur document de clôture le 2026-08-04
(backlog #2, a posteriori — leur corpus était déjà `verified` depuis
2026-08-02, seul le document de synthèse manquait ; voir
[`monitoring-meta-verification.md`](audits/monitoring-meta-verification.md)
et
[`reporting-meta-verification.md`](audits/reporting-meta-verification.md),
qui documentent aussi une limite de sandbox rencontrée en tentant de
rejouer le corpus complet). Les 9 modules `crud-entity`/`action-request`
n'ont **aucun** corpus — leur seule garantie mécanique est tsc/eslint/ngc
(socle), pas de comparaison au legacy. `shared` est, après cette session,
le module le plus densément testé du dépôt en tests **manuels** (16), tout
en restant hors du système de corpus/Meta-vérification (kernel transverse,
pas une entité métier avec contrepartie legacy 1:1).

## 2. Sévérité de l'oracle — état réel des portes (2026-08-04, vérifié)

| Porte | Bloquante en CI ? | Statut mesuré aujourd'hui | Commande |
| --- | :---: | --- | --- |
| `check:engines`/`check:versions`/`check:weight`/`check:project-names` | ✅ bloquant (job `guardrails`) | OK | `bun run check:*` |
| `check:targets` (build+lint sur toutes les libs) | ✅ bloquant | **OK — 71 libs** | `node tools/check-project-targets.mjs` |
| `check:declared-deps` | ✅ bloquant | OK (dernière mesure) | `bun run check:declared-deps` |
| `check:boundary-negative` | ✅ bloquant | OK (dernière mesure) | `bun run check:boundary-negative` |
| `check:legacy-lock` | ✅ bloquant | OK (SHA `cb15bf8...` épinglé) | `bun run check:legacy-lock` |
| `check:convention-profile` (ADR-0010) | ✅ bloquant | OK — 7/7 règles, 0 violation | `bun run check:convention-profile` |
| `format:check` (Prettier) | ✅ bloquant | non revérifié cette passe | `bun run format:check` |
| `check:docs-freshness` | ✅ bloquant | ⚠️ dérive attendue — rien n'est commis (P0-N1), pas une régression | `node tools/check-docs-freshness.mjs` |
| `nx affected -t lint/build` | ✅ bloquant (job `oracle`) | OK (dernières mesures par lib touchée) | `bunx nx affected -t lint/build` |
| `ngc --strictTemplates` | ✅ bloquant | OK, 0 erreur (dernière mesure) | `bunx ngc -p apps/backoffice-angular/tsconfig.app.json --noEmit` |
| `nx affected -t test --passWithNoTests` | ✅ bloquant | OK sur les libs testées — 115 tests neufs verts cette session (`shared/data`+`shared/domain`, vérifiés individuellement) ; 58 fichiers `.spec.ts` corpus-générés + 4 fichiers `core` préexistants (`finalization`/`processing`/`report-states`/`requests`/`core`), nombre de tests internes non recompté cette passe | voir §5 |
| `check:duplicates` (H-3, byte-identique) | ✅ bloquant | **OK — 0 doublon** | `node tools/check-duplicate-files.mjs` |
| `check:duplicates --family` (H-4, quasi-doublon régression) | ✅ bloquant (à la hausse seulement) | **OK — 29,6 % ≤ baseline 29,6 %** | `node tools/check-duplicate-files.mjs --family` |
| `check:pattern-nx:crud-entity` (J-9/N-7) | ✅ bloquant | **OK — 66/66 × 3 modules** (3e ajouté le 2026-08-04 : `coverage-areas`/site-group) | `bun run check:pattern-nx:crud-entity` |
| `corpus:ci` (structural-only, 8 modules) | ✅ bloquant | non revérifié cette passe (dernière mesure : OK) | `bun run corpus:ci` |
| `check:dead-code` (knip) | ☐ non bloquant (`continue-on-error`) | connu en échec partiel (I-04 pas pleinement instrumenté) | `bun run check:dead-code` |
| `security-audit` (bun audit) | ☐ non bloquant (`continue-on-error`) | 4 avis high connus (tooling, pas le bundle livré) | `bun audit --audit-level=high` |
| `i18n-check` | ☐ non bloquant (`continue-on-error`, prudence) | 0 clé manquante (chantier K clos) mais flag laissé | `node tools/check-i18n.mjs` |

**Sur 18 portes, 15 sont bloquantes, 3 ne le sont pas encore** (dead-code,
security-audit, i18n-check — chacune avec une raison documentée, pas un
oubli). C'est cette liste, pas la liste des modules « ✅ » dans
`STATUS.md`, qui mesure la rigueur réelle du dépôt.

## 3. Périmètre applicatif — 52 entités (`scope.json`, source de vérité)

| Famille | Nb. entités | Modules concernés |
| --- | ---: | --- |
| `workflow-action` | 19 | finalization, processing, report-states, requests |
| `crud-entity` | 18 | administrative-boundary, administrative-infrastructure, communication, content-management, coverage-areas, settings-security, team-organization |
| `read-only-view` | 9 | dashboard, interactive-map, monitoring, reporting |
| `action-request` | 3 | authentication |
| `divers` | 3 | communication (notifications), settings-security (access-logs), team-organization (daily-goal) |

**50/52 entités construites.** Les 2 manquantes : `team-organization` /
`agents-performances` (workflow-action, 41 fichiers source legacy) et
`team-organization` / `daily-goal` (divers, 26 fichiers) — bloquées par une
décision de périmètre produit, pas par une incapacité technique
([ADR-0018](../adr/0018-perimetre-team-organization.md)).

## 4. Détail par module — effectué / reste à faire / amélioration / découverte

### `shared` (kernel) — le plus travaillé cette session

- **Effectué :** intercepteurs (`auth`, `error`, `cache`), guards
  (`authGuard`/`canMatch`), `TrustedOriginPort`+adapter, `SafeUrlPipe`
  vérifié à l'origine, `LoggerPort`/`ErrorHandler` global (chantier I,
  P-1/P-2 — 4 fichiers de test : `error.interceptor`, `safe-url.pipe`,
  `console-logger.adapter`, `session.service`) — puis chantier L cette
  passe : 16 fichiers testés (`unwrap-response`, `build-http-params`,
  `build-http-payload`, `build-form-data`, `date-range`, 4 mappers de base,
  `MapperUtils`, `ApiDateMapper` côté `shared/data`, 11 fichiers ;
  `normalizePhoneNumber`, `resolveOpenEndedEndDate`,
  `assertValidDateRange`, `DatePeriod`, `LocationMethodVO` côté
  `shared/domain`, 5 fichiers).
- **Reste à faire :** 173/189 fichiers `shared/` encore sans test —
  mappers concrets par module, guards, pipes, composants `shared-ui`.
  `libs/shared/browser` et `libs/shared/constants` quasiment intouchés (1
  spec préexistant, 0 nouveau).
- **Amélioration apportée :** target `test` ajouté à
  `libs/shared/domain/project.json` (absent — trou de câblage CI, voir
  découverte ci-dessous).
- **Tâche découverte :** `shared/domain` n'avait **aucun** target `test`
  — les 5 tests domain écrits cette passe n'auraient jamais tourné en CI
  sans cet ajout (corrigé, vérifié via `nx run @cmz/shared-domain:test`).

### `core` (kernel)

- **Effectué (chantier I, 2026-08-03) :** `auth.interceptor`,
  `error.interceptor`, `cache.interceptor`, `global-error-handler`,
  `validate-app-config` — 4 fichiers de test déjà en place, non retouchés
  cette passe.
- **Reste à faire :** 6/10 fichiers source encore sans test direct.
- **Découverte (cette passe) :** aucune nouvelle.

### `administrative-infrastructure` — N-7 + backlog #4 (4/12 modules du chantier « mappers concrets »)

- **Effectué (N-7, passe précédente) :** `crud-entity.pattern.json`
  (Nx-shaped) rédigé et validé à 66/66 (module de référence du pattern) ;
  câblé dans `check:all` et en CI.
- **Effectué (backlog #4, 2026-08-04) :** module complet — 6/6 fichiers
  testés (`infrastructure.mapper.ts`, `infrastructure-find-one.mapper.ts`,
  `infrastructure-select.mapper.ts`, `infrastructure-type.mapper.ts`,
  `infrastructure-type-find-one.mapper.ts`,
  `infrastructure-type-select.mapper.ts`), 20 tests neufs, tous verts au
  premier passage (aucun piège de test cette fois), `tsc`/`eslint
  --max-warnings=0` à 0 erreur. Deux comportements réels vérifiés plutôt que
  supposés : `InfrastructureMapper` (liste) accède à `dto.region?.name` en
  chaînage optionnel bien que le DTO type `region` comme non-optionnel —
  testé le cas où le wire enverrait quand même `null` (contrat violé en
  pratique) : l'entité récupère `undefined`, pas un crash ;
  `InfrastructureTypeFindOneProps` n'a **aucun** champ `status` —
  `is_active` est présent au DTO `find-one` mais jamais lu par son mapper
  (seule la liste porte un statut), vérifié via absence du getter sur
  l'entité (`'status' in entity === false`), pas juste relu dans le code.
- **Reste à faire :** 0 corpus (structurel uniquement, cf. pattern
  `crud-entity`).
- **Amélioration apportée :** aucune régression trouvée — les 2 bugs
  historiques du schéma `pattern.json` restent ceux déjà documentés (coquille
  `{module}`/`{MODULE}`, sur-généralisation de
  `form-validators.constant.ts`), sans lien avec ce chantier.
- **Tâche découverte :** aucune cette passe sur ce module précis (le
  premier module du chantier « mappers concrets » sans détail source
  documenté en commentaire — contrairement à `communication`/
  `team-organization` — les tests ont donc dû être écrits en lisant
  directement le code des 6 mappers plutôt qu'en s'appuyant sur des
  commentaires explicatifs).

### `administrative-boundary` — N-7 + backlog #4 (6/12 modules du chantier « mappers concrets »)

- **Effectué :** `crud-entity.pattern.json` (Nx-shaped) validé à 66/66
  (2e validation indépendante du pattern, après `administrative-infrastructure`) ;
  câblé dans `check:all` et en CI.
- **Effectué (backlog #4, 2026-08-04) :** module complet — 10/10 fichiers
  testés (`region`, `region-find-one`, `region-select`, `department`,
  `department-find-one`, `department-select`, `departments-by-region-id`,
  `municipality`, `municipality-find-one`,
  `municipalities-by-department-id`), 37 tests neufs, **tous verts au
  premier passage** (aucun piège de test ni de typage cette fois, comme
  `administrative-infrastructure`).
- **Reste à faire :** rien sur ce module précis pour ce chantier (module
  complet).
- **Amélioration apportée :** 2 bugs réels trouvés et corrigés dans le
  schéma `pattern.json` pendant sa rédaction (coquille `{module}`/
  `{MODULE}`, sur-généralisation de `form-validators.constant.ts`).
- **Tâche découverte (backlog #4, 2026-08-04) :** `DepartmentMapper`,
  `DepartmentFindOneMapper` et `MunicipalityMapper` lisent
  `dto.region.id`/`.name` (et `dto.department.id`/`.name` pour
  `MunicipalityMapper`) **sans** chaînage optionnel, alors que
  `administrative-infrastructure/InfrastructureMapper` se défend avec
  `dto.region?.name` sur le même type `AdministrativeBoundaryDto`. Si le
  wire viole son contrat (`region`/`department` absent), ces 3 mappers
  lèvent une `TypeError` native au lieu d'une erreur métier lisible —
  divergence assumée entre mappers du même module, verrouillée par un test
  explicite (`toThrow(TypeError)`) plutôt que découverte en prod. Les 2
  mappers relationnels (`departments-by-region-id`,
  `municipalities-by-department-id`) ont des shapes réduites (pas de
  `region`/`department`/`infrastructureCount`) — vérifié par absence de
  getter (`'region' in entity === false`), même méthode que
  `administrative-infrastructure`.

### `authentication` — I-7 + backlog #4 (1er module)

- **Effectué (I-7) :** audit `permissionGuard` vs permissions legacy — **1
  bug P0 trouvé et corrigé** (détail dans `audit-workspace-2026-08-03.md`,
  section I-7).
- **Effectué (backlog #4, 2026-08-04) :** 1er module traité du chantier
  « mappers concrets » (`MapperUtils.validateDto`) — 2 fichiers testés
  (`current-user.mapper.ts` — 3 fonctions pures wire→domaine dont une
  récursive sur `children`, `login-response.mapper.ts` — la classe mapper
  elle-même), 16 tests neufs, `tsc`/`eslint --max-warnings=0` à 0 erreur.
- **Reste à faire :** rien sur ce module précis pour ce chantier (module
  complet).
- **Amélioration apportée :** correction du bug P0 identifié (I-7).
- **Tâche découverte (backlog #4, 2026-08-04) :** en préparant ce chantier,
  grep exhaustif recompté sur `MapperUtils.validateDto` : **8 des 12
  modules concernés** (`content-management`, `coverage-areas`,
  `administrative-boundary`, `settings-security`,
  `administrative-infrastructure`, `team-organization`, `communication`,
  `authentication`) n'avaient **aucun** target `test` dans leur
  `data/project.json` — même trou de câblage CI que `shared/domain`
  (chantier L, passe précédente), mais 8 fois plus large. Corrigé pour les
  8 avant d'écrire le premier test (`nx run @cmz/<module>-data:test
  --passWithNoTests` vérifié vert sur les 8). `tools/vitest-lib.config.ts`
  également étendu : ses alias `@cmz/*` (résolution sans build préalable)
  ne couvraient que `shared-*`, `core` et les 4 modules `workflow-action` —
  les 8 modules `crud-entity`/`action-request` concernés en ont été ajoutés
  (domain/data/application), sans quoi `@cmz/authentication-domain` (et les
  7 autres) ne se serait jamais résolu sous Vitest.

### `settings-security` — backlog #4 (5/12 modules, module complet)

- **Effectué (2026-08-04) :** module complet — 6/6 fichiers testés
  (`users.mapper.ts`, `users-find-one.mapper.ts`, `access-logs.mapper.ts`,
  `profiles-permissions.mapper.ts`, `profiles-permissions-find-one.mapper.ts`,
  `profiles-permissions-select.mapper.ts`), 29 tests neufs, `tsc`/`eslint
  --max-warnings=0` à 0 erreur. 3 vrais fixes documentés dans le code source
  et vérifiés par un test dédié plutôt que relus en confiance :
  `UsersFindOneMapper` traduit désormais `role` via `RolesMapper` (le
  source laissait ce champ non traduit sur le détail, contrairement à la
  liste) ; `AccessLogsMapper` valide `action` via `isAccessLogsAction`
  (le source avait un mapper de validation jamais appelé — code mort
  corrigé) ; `ProfilesPermissionsMapper` convertit `users_count` (string
  au wire, bug de typage source) en `number`. Comportement non trivial de
  `mapPermissionApiNode` (arbre de permissions récursif, **non aplati** —
  décision inverse de `team-organization`) vérifié précisément : quand un
  nœud n'a pas ses propres actions, les **clés** d'action remontent de ses
  enfants mais la **valeur** de chaque action reprend le `checked` du nœud
  lui-même, pas celle des enfants — piège de lecture réel, testé
  explicitement pour ne pas le laisser supposé.
- **Reste à faire :** rien sur ce module précis pour ce chantier (module
  complet).
- **Amélioration apportée :** aucune régression trouvée sur les 3 fixes
  déjà en place ; tous vérifiés corrects.
- **Tâche découverte :** le compte initial de 7 fichiers pour ce module
  incluait un faux positif — `MapperUtils.validateDto` apparaissait dans un
  **commentaire** de `profiles-permissions-find-one-response-api.dto.ts`
  (DTO, pas un mapper), pas dans un appel réel. Recompté avec `grep
  "MapperUtils\.validateDto("` (parenthèse incluse) : 6 fichiers réels, pas
  7 — corrigé à la source (voir §7, backlog #4).

### `finalization` / `processing` / `report-states` / `requests` — famille `workflow-action`

- **Effectué (préexistant, pas cette session) :** Modules IR clôturés,
  corpus 126/156/187/157 paires respectivement, Meta-vérification 12/12
  chacun, 16/16/9/17 fichiers `.spec.ts` corpus-générés déjà en place
  (nombre de tests internes non recompté cette passe).
- **Effectué (cette session, onzième passe) :** contrainte H-4
  (`no_family_duplication_regression`) déclarée dans
  `workflow-action.pattern.json` et vérifiée mécaniquement — garde-fou
  contre la régression de quasi-duplication inter-module (29,6 %
  aujourd'hui, testé pour de vrai en le cassant puis en le restaurant).
- **Reste à faire :** 0 nouveau test cette session sur le code
  applicatif de ces 4 modules (déjà couverts par le corpus).
- **Découverte :** doublon de clé JSON `severity` dans
  `workflow-action.pattern.json` (et `read-only-view.pattern.json`) —
  masquait silencieusement `P1-11` derrière le texte de la règle. Corrigé.

### `dashboard` / `interactive-map` — famille `read-only-view`, Meta-vérifiés

- **Effectué (préexistant) :** Modules IR clôturés, corpus 25/28 paires,
  Meta-vérification 12/12 chacun.
- **Reste à faire :** 0 test unitaire (corpus ou manuel) sur le code
  applicatif — la garantie est le corpus + Meta-vérification, pas des
  tests Vitest.
- **Touché indirectement cette session :** `dashboard` via l'analyse de
  composition du bundle (P-5, 833 kB) — pas une modification du module
  lui-même.

### `monitoring` / `reporting` — famille `read-only-view`, Meta-vérifiés a posteriori (2026-08-04)

- **Effectué (préexistant) :** corpus 51 paires / 5 chaînes chacun,
  `verified_at: 2026-08-02`, `legacy_ref.commit` pinné
  (`cb15bf80fa072e12e9d4fce4b9236abe6ac78058`, même SHA que
  `check:legacy-lock`). `monitoring` = `reference_module` du pattern
  `read-only-view` ; `reporting` = `second_validation`.
- **Effectué (cette passe, backlog #2) :** écriture des 2 documents de
  clôture manquants —
  [`monitoring-meta-verification.md`](audits/monitoring-meta-verification.md)
  et
  [`reporting-meta-verification.md`](audits/reporting-meta-verification.md).
  Revérification **réelle** faite aujourd'hui : build 4/4 + lint 4/4
  (`--max-warnings=0`) sur les 8 libs des deux modules,
  `check:boundary-negative` (test négatif ciblant précisément
  `scope:monitoring → scope:reporting`), `check:duplicates` (0 doublon).
  Le reste du scorecard 12/12 s'appuie sur les preuves déjà enregistrées
  (`module-monitoring.md`/`module-reporting.md`, corpus `verified`) —
  signalé explicitement dans chaque document, pas présenté comme rejoué à
  l'identique.
- **Tâche découverte (cette passe) :** tentative de rejouer le corpus
  complet (`--verify`, avec ou sans `--structural-only`) contre le vrai
  legacy (`SEOS_LEGACY_ROOT` = dossier `cmz-backoffice-frontend` connecté
  cette session) — **bloquée par le sandbox**, pas par le code : le script
  émet jusqu'à 51 invocations séquentielles `nx run <target>:build`
  (1,5–6 s chacune, cache Nx local à 0 % de hit d'un appel à l'autre dans
  ce bac à sable), dépassant la limite de 45 s par commande shell ; un
  processus lancé en arrière-plan (`nohup`/`setsid`) ne survit pas non plus
  à la fin d'un appel (testé explicitement, confirmé). Même catégorie que
  I-8/`nginx -t` déjà documentés — blocage d'exécution, pas un doute sur le
  résultat (le corpus reste `verified`, pinné à un commit legacy vérifiable
  indépendamment). Commande de reproduction exacte donnée dans les deux
  documents de clôture, pour exécution en CI ou en local sans cette
  contrainte.
- **Statut désormais aligné sur les 6 autres modules corpus :** « Module IR
  clôturé » documenté, plus seulement « Compilant » dans `STATUS.md`.

### `communication` — backlog #4 (2/12 modules du chantier « mappers concrets »)

- **Effectué (2026-08-04) :** 3 fichiers testés
  (`notifications.mapper.ts`, `messaging.mapper.ts`,
  `messaging-find-one.mapper.ts`), 17 tests neufs, `tsc`/`eslint
  --max-warnings=0` à 0 erreur. Les 2 mappers `messaging` portaient chacun
  un commentaire documentant un bug déjà corrigé lors de leur construction
  (liste : `type`/`targetType` jamais passés dans leurs mappers dédiés ;
  détail : `region`/`department`/`municipality` dérivés via
  `JSON.stringify(dto.region?.id)`, cassant le matching de select cascade en
  édition) — les deux corrections sont maintenant vérifiées par un test, pas
  seulement relues dans un commentaire.
- **Reste à faire :** 0 corpus, 0 pattern Nx-shaped pour ce module.
- **Amélioration apportée :** target `test` ajouté à
  `communication/data/project.json` (absent avant cette passe — voir
  découverte `authentication` ci-dessus, 8 modules concernés d'un coup).
- **Tâche découverte :** en écrivant le premier test à réutiliser la
  méthode `.with()` (réconciliation d'identité par `uniqId`+`updatedAt`,
  même mécanisme que `QueuesProcessingItemMapper`), un piège de test a été
  trouvé et corrigé **dans les tests, pas dans le mapper** : une instance de
  mapper partagée entre plusieurs `it()` utilisant les mêmes valeurs de
  DTO par défaut renvoie l'entité mise en cache du test précédent au lieu
  du nouveau mapping — 8 tests d'abord rouges pour cette raison,
  diagnostiqués (le premier test de chaque fichier passait, prouvant que le
  mapper lui-même était correct) puis corrigés en instanciant un mapper
  neuf par test.

### `team-organization` — backlog #4 (3/12 modules du chantier « mappers concrets »)

- **Effectué (2026-08-04) :** module complet — 5/5 fichiers testés
  (`teams.mapper.ts`, `teams-find-one.mapper.ts`, `teams-select.mapper.ts`,
  `participants.mapper.ts`, `participants-find-one.mapper.ts`), 30 tests
  neufs, `tsc`/`eslint --max-warnings=0` à 0 erreur. Deux divergences
  métier documentées dans le code (liste vs détail) verrouillées par un
  test dédié plutôt que relues en confiance : `ParticipantsProps.team`
  porte le **nom** de l'équipe côté liste mais l'**uniqId** côté
  `find-one` (deux mappers du source font ce choix différemment, assumé,
  pas « corrigé » en une convention unique) ; `flattenPermissionTree`
  (utilitaire récursif consommé par `teams-find-one.mapper.ts`) aplatit
  l'arbre PrimeNG en liste de cases à cocher, hiérarchie parent/enfant
  perdue par design — vérifié sur un arbre à 2 niveaux.
- **Reste à faire :** 0 corpus, pattern Nx-shaped non étendu à ce module ;
  2 entités hors périmètre du chantier « mappers concrets » (voir cas
  particulier ci-dessous).
- **Amélioration apportée :** aucune régression — `isReportType`/
  `isTelecomOperator` (filtrage silencieux des valeurs wire inconnues) et
  `RolesMapper` (wire `team-leader` → domaine `LEADER`) vérifiés corrects.
- **Cas particulier `team-organization`** : 2 entités manquantes
  (`agents-performances`, `daily-goal`) — bloquées par
  [ADR-0018](../adr/0018-perimetre-team-organization.md), décision
  produit, pas un chantier technique ouvert ; sans lien avec le chantier
  « mappers concrets » (portée sur les 5 fichiers existants, pas les
  entités absentes).

### `content-management` / `coverage-areas` — non touchés

- **Effectué :** rien cette session, ni les précédentes au niveau du
  code applicatif — seulement compilants (tsc/eslint/ngc), 0 corpus,
  0 test unitaire (le target `test` de leur `data/project.json` a été câblé
  cette passe, voir découverte `authentication` — mais aucun fichier de
  test n'y a encore été écrit).
- **Reste à faire :** l'intégralité — corpus, tests, pattern
  Nx-shaped (candidats crud-entity comme
  `administrative-infrastructure`/`administrative-boundary`, jamais
  étendus à ces modules) ; chantier « mappers concrets » (backlog #4, 3/12
  modules faits : `authentication`, `communication`, `team-organization`).

## 5. Chantier L — cartographie fine de la couverture test manuelle

16/189 fichiers `shared/` couverts par des tests écrits cette session (pas
générés par le corpus). Détail exhaustif fichier par fichier :
`audit-workspace-2026-08-03.md`, sections « Chantier L » et
« Chantier L (suite immédiate) ». Résumé (recompté après correction d'une
erreur d'addition initiale — voir `audit-workspace-2026-08-03.md`, « Bilan
cumulé du chantier L ») :

| Sous-ensemble | Fichiers testés | Tests | `tsc`/`eslint` |
| --- | ---: | ---: | --- |
| `shared/data` — utils HTTP/mapping (5 fichiers) | 5 | 40 | 0 erreur |
| `shared/data` — mappers de base (4 fichiers) | 4 | 12 | 0 erreur |
| `shared/data` — `MapperUtils`/`ApiDateMapper` (2 fichiers) | 2 | 27 | 0 erreur |
| `shared/domain` — fonctions/validateur/VO (5 fichiers) | 5 | 36 | 0 erreur |
| **Total** | **16** (11 data + 5 domain) | **115** | **0 erreur** |

**Reste, sans complaisance :** 173 fichiers `shared/` non couverts +
l'intégralité des mappers concrets par module métier (60+ appelants de
`MapperUtils.validateDto` répartis sur 13 modules, 0 testés directement) +
Playwright (jamais installé).

## 6. Constat central persistant — P0-N1, toujours vrai (vérifié 2026-08-04)

```bash
git status --short | wc -l   # → 482 fichiers modifiés/ajoutés/supprimés
git log --oneline -3         # → dernier commit réel : 06030e9 (avant cette
                              #   session et les précédentes), rien de
                              #   nouveau commis depuis
```

Un sprint de remédiation complet — chantiers I à L, plus de 200 tests
neufs, 3 nouveaux ports/adapters, 2 patterns corrigés, 1 nouvel outil
local, 1 trou de câblage CI trouvé et corrigé — **dort toujours,
non commis, non revu, non poussé**. Aucune ligne de ce document ni de
l'audit narratif ne change ce fait tant qu'un humain n'a pas décidé de
commiter. C'est la limite structurelle numéro un du dépôt, avant toute
question de couverture de test ou de conformité de pattern.

## 7. Backlog priorisé restant, point par point

| # | Action | Bloqué par | Effort estimé |
| --- | --- | --- | --- |
| 1 | Commiter/pousser le sprint P0-N1 | Décision humaine | — |
| 2 | ~~Meta-vérifier `monitoring`/`reporting`~~ | ✅ fait 2026-08-04 — `monitoring-meta-verification.md` + `reporting-meta-verification.md`, corpus déjà `verified` (2026-08-02), 12/12 avec 1 critère (mock backend) sur preuve datée non rejouée + limite sandbox documentée pour le diff legacy complet | Moyen |
| 3 | Étendre `crud-entity.pattern.json` à `communication`/`content-management`/`coverage-areas`/`team-organization` | Rien — même méthode que N-7 | Élevé (4 modules × pattern) |
| 4 | Chantier L — poursuivre sur les mappers concrets (`MapperUtils.validateDto`) | Rien — budget | 🔧 en cours — **6/12 modules faits (`authentication` + `communication` + `team-organization` + `administrative-infrastructure` + `settings-security` + `administrative-boundary`, 2026-08-04)** ; **correction de compte** (passe précédente) : le total « 74 fichiers/12 modules » (déjà corrigé une fois depuis « 60+ sur 13 ») était encore imprécis — `settings-security` en comptait 7 par un grep sur le texte `MapperUtils.validateDto`, mais l'une des occurrences était dans un **commentaire** de DTO, pas un appel réel ; recompté avec `grep "MapperUtils\.validateDto("` (parenthèse incluse, exclut les commentaires) : **73 fichiers réels sur 12 modules**. `administrative-boundary` confirme le compte à 10/10 sans écart. 2 modules `crud-entity` restent : `content-management`(12), `coverage-areas`(11) — 23 fichiers ; `processing`/`requests`/`finalization` déjà couverts par corpus, `report-states` partiellement (voir #11) |
| 5 | I-8 — test d'intégration contre un vrai backend | Réseau/identifiants (sandbox) | Bloqué techniquement ici |
| 6 | `nginx -t` réel | Pas de root dans le sandbox | Bloqué techniquement ici |
| 7 | `security-audit`/`i18n-check` rendus bloquants | Résorption Dependabot / revue humaine du diff 320 clés | Faible une fois débloqué |
| 8 | M-9 — a11y, 2 archétypes restants + confirmation d'exécution | Plafond 45 s du sandbox (bundling Angular) | Bloqué techniquement ici |
| 9 | P-6/P-7 — découpage bundle + gate régression | Même blocage que M-9 | Bloqué techniquement ici |
| 10 | `team-organization` — 2 entités manquantes | ADR-0018 (décision produit) | Bloqué par décision |
| 11 | `report-states` — 5/6 fichiers `MapperUtils.validateDto` sans `*.mapper.spec.ts` dédié (`approve`/`close`/`download`/`evaluate`/`reject-report-states-item.mapper.ts`), découvert le 2026-08-04 en vérifiant l'état réel des 4 modules `workflow-action` avant de les exclure du chantier « mappers concrets » | Rien — budget | Faible-Moyen (5 fichiers, module déjà Meta 12/12) |

## 8. Comment maintenir cette cartographie

- Après chaque chantier fermé ou avancé : mettre à jour §1 (matrice) et
  ajouter/amender la sous-section §4 du module concerné avec les 4
  colonnes **Effectué / Reste à faire / Amélioration apportée / Tâche
  découverte** — jamais une seule ligne « fait ✅ » sans preuve
  reproductible (commande + résultat, comme dans `audit-workspace-
  2026-08-03.md`).
- Toute mesure chiffrée (paires corpus, %, nombre de tests) doit être
  **recalculée**, pas recopiée de la dernière passe — `node
  tools/generate-status.mjs` avant de commencer une nouvelle passe.
- Toute divergence trouvée entre un chiffre documenté et un chiffre
  recalculé est une « tâche découverte » à part entière (voir §4,
  `monitoring`/`reporting`, et la correction N-4 dans
  [ADR-0019](../adr/0019-nature-du-corpus-seos.md)) — à corriger à la
  source (le générateur, pas le texte figé) quand c'est possible.

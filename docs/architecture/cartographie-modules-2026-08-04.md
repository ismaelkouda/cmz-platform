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
| `administrative-boundary` | crud-entity | 0 | — | ✅ `region`/`department`/`municipality` 66/66 (100.0%, N-7 2e validation, `department` déjà conforme découvert 2026-08-04, `municipality` clos 2026-08-04 sur demande explicite) | 0 | 10 | ✅ N-7 + backlog #4 + #3 |
| `administrative-infrastructure` | crud-entity | 0 | — | ✅ `infrastructure`/`infrastructure-type` 66/66 (100.0%, N-7 référence, `infrastructure-type` déjà conforme découvert 2026-08-04) | 0 | 6 | ✅ N-7 + backlog #4 |
| `authentication` | action-request | 0 | — | — | 0 | 2 | ✅ I-7 + backlog #4 |
| `communication` | crud-entity | 0 | — | ✅ `messaging` 66/66 (100.0%, backlog #3, 2026-08-04, 5e validation — chaîne `-select` construite sur demande explicite) | 0 | 3 | ✅ backlog #4 + #3 |
| `content-management` | crud-entity | 0 | — | ✅ 6/6 entités 66/66 (100.0% — `home`, `slide`, `news`, `legal-notice`, `privacy-policy`, `terms-use`, backlog #3, 2026-08-04, 6e validation — chaînes `-select` construites sur demande explicite) | 0 | 12 | ✅ backlog #4 + #3 |
| `core` (kernel) | kernel | 0 | — | — | 4 | 0 | ✅ chantier I |
| `coverage-areas` | crud-entity | 0 | — | ✅ `site-group` 66/66 (N-7, 3e validation) ; `mobile-network` 66/66 (100.0%, backlog #3, 2026-08-04 — chaîne `-select` construite sur demande explicite) | 0 | 11 | ✅ backlog #4 + #3 |
| `dashboard` | read-only-view | 25 | 12/12 | (`read-only-view.pattern.json`) | 0 | 0 | ☐ (touché indirectement, P-5/P-6) |
| `finalization` | workflow-action | 126 (6 chaînes) | 12/12 | (`workflow-action.pattern.json`, H-4) | 16 | 0 | ⚠️ H-4 (contrainte), pas le code |
| `interactive-map` | read-only-view | 28 | 12/12 | (`read-only-view.pattern.json`) | 0 | 0 | ☐ |
| `monitoring` | read-only-view | 51 (5 chaînes) | **12/12, a posteriori 2026-08-04** | (`read-only-view.pattern.json`, module de référence) | 0 | 0 | ✅ backlog #2 |
| `processing` | workflow-action | 156 (7 chaînes) | 12/12 | (`workflow-action.pattern.json`, H-4) | 16 | 0 | ⚠️ H-4 (contrainte), pas le code |
| `report-states` | workflow-action | 187 (8 chaînes) | 12/12 | (`workflow-action.pattern.json`, H-4) | 9 | 6 | ✅ backlog #11 |
| `reporting` | read-only-view | 51 (5 chaînes) | **12/12, a posteriori 2026-08-04** | (`read-only-view.pattern.json`, `second_validation`) | 0 | 0 | ✅ backlog #2 |
| `requests` | workflow-action | 157 (8 chaînes) | 12/12 | (`workflow-action.pattern.json`, H-4) | 17 | 0 | ⚠️ H-4 (contrainte), pas le code |
| `settings-security` | crud-entity | 0 | — | ✅ `profiles-permissions`/`users` 66/66 (100.0%, backlog #3, 2026-08-04, 7e validation — première mesure fichier par fichier du module) | 0 | 6 | ✅ I-7 + backlog #4 + #3 |
| `shared` (kernel) | kernel | ≥1 (via `libs/shared/...`) | — | — | 4 (chantier I, hors chantier L) | **16** | ✅✅ chantier I + chantier L |
| `team-organization` | crud-entity + workflow-action | 0 | — | ✅ `teams` 66/66 (N-7, 4e validation) ; `participants` 66/66 (100.0%, backlog #3, 2026-08-04 — chaîne `-select` construite sur demande explicite) ; `agents-performances` et `daily-goal` construites le 2026-08-05 (ADR-0018 rouvert, pattern `workflow-action` pour les deux — périmètre `team-organization` désormais complet, 4/4 entités legacy) | 0 | 5 | ✅ backlog #4 + #3 + ADR-0018 |

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
| `security-audit` (bun audit) | ✅ bloquant depuis le 2026-08-04 (backlog #7) | OK — 0 vulnérabilité high après correctif `overrides` | `bun audit --audit-level=high` |
| `i18n-check` | ✅ bloquant depuis le 2026-08-04 (backlog #7) | OK — 0/313 clé manquante | `node tools/check-i18n.mjs` |

**Sur 18 portes, 17 sont bloquantes, 1 ne l'est pas encore** (`check:dead-code`
— échec partiel connu, I-04 pas pleinement instrumenté ; `security-audit`
et `i18n-check` sont passées bloquantes le 2026-08-04, voir §7 item #7).
C'est cette liste, pas la liste des modules « ✅ » dans `STATUS.md`, qui
mesure la rigueur réelle du dépôt.

## 3. Périmètre applicatif — 52 entités (`scope.json`, source de vérité)

| Famille | Nb. entités | Modules concernés |
| --- | ---: | --- |
| `workflow-action` | 21 | finalization, processing, report-states, requests, team-organization (agents-performances, daily-goal) |
| `crud-entity` | 18 | administrative-boundary, administrative-infrastructure, communication, content-management, coverage-areas, settings-security, team-organization |
| `read-only-view` | 9 | dashboard, interactive-map, monitoring, reporting |
| `action-request` | 3 | authentication |
| `divers` | 1 | communication (notifications), settings-security (access-logs) |

**52/52 entités construites (2026-08-05).** Les 2 dernières manquantes,
`team-organization` / `agents-performances` (41 fichiers source legacy)
et `team-organization` / `daily-goal` (26 fichiers), ont été construites
le 2026-08-05 — ADR-0018 rouvert sur besoin métier explicite, pattern
`workflow-action` appliqué aux deux (le classement legacy `divers` de
`daily-goal` par `check-pattern.js`, 26 %/26 %, s'est révélé être une
heuristique automatique insensible à sa quasi-identité structurelle avec
`agents-performances` — même DTO, même filtre period-only, même
`readAll` seul ; voir [ADR-0018](../adr/0018-perimetre-team-organization.md)
pour le détail des deux révisions).

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

### `report-states` — backlog #11 (2026-08-04, module complet pour les mappers manuels)

- **Effectué (2026-08-04) :** 6/6 fichiers `MapperUtils.validateDto`
  testés manuellement (`approve`/`close`/`evaluate`/
  `reject-report-states-item.mapper.ts`, `download-report-states-item.
  mapper.ts`, `report-states-details.mapper.ts`), 44 tests neufs, tous
  verts au premier passage — en plus de la couverture corpus déjà en
  place (16/16 `.spec.ts` corpus-générés, Meta 12/12, non touchés).
- **Reste à faire :** rien sur ce module précis pour ce backlog.
- **Amélioration apportée :** aucune régression — 3 comportements réels
  verrouillés par test qui n'étaient documentés nulle part avant :
  `STATUS_MAP`/`QUALIFICATION_STATE_MAP` de `report-states-details.
  mapper.ts` retombent silencieusement sur une valeur par défaut
  (`PENDING`/`null`) plutôt que de lever une erreur sur une valeur wire
  inconnue — divergence assumée avec `ReportTypeMapper`/
  `TelecomOperatorMapper`/`ReportSourceMapper` (les mappers partagés du
  même fichier, qui eux lèvent `ApiError.invalidResponse`) ; même
  divergence trouvée sur `DownloadReportStatesStatusMapper`/
  `-TypeMapper` (lookup `Record`, `undefined` silencieux).
- **Tâche découverte (2026-08-04) :** `report-states-details.mapper.ts`
  était marqué `"status":"verified"` dans le corpus
  (`corpus/report-states.pairs.jsonl`) avec un oracle
  `["@cmz/report-states-data:test"]` — donnant l'impression d'une
  couverture comportementale réelle. En pratique, le seul fichier de
  spec du dossier (`report-states-details-mappers.spec.ts`) ne teste que
  4 fonctions *request-side* (approve/filter/reject/take, qui mappent le
  domaine VERS le wire), jamais la classe `ReportStatesDetailsMapper`
  elle-même (qui mappe le wire VERS le domaine, 9 dépendances DI). Le
  target `test` du projet passait donc déjà avant tout ajout — l'oracle
  « test » du corpus était vrai au niveau projet sans jamais exercer ce
  fichier précis. Même classe de risque que celle qui a motivé tout le
  chantier « mappers concrets » (backlog #4), mais découverte ici sur un
  module classé « corpus-couvert », pas « manuel » — signal qu'un statut
  `verified` avec oracle `test` devrait, à terme, être vérifié fichier
  par fichier (couverture de lignes/fonctions), pas seulement au niveau
  du run de la commande.

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
- **Reste à faire :** 0 corpus ; pattern Nx-shaped partiellement étendu à
  ce module le 2026-08-04 (backlog #3, voir sous-section ci-dessous).
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

#### `communication/messaging` — backlog #3 (extension `crud-entity.pattern.json`, 2026-08-04, clos à 100% en 2 passes — voir addendum en fin de section)

- **Mesure de départ :** `check-pattern-nx.mjs libs/communication
  messaging` → 54/66 (81.8%), 12 fichiers manquants.
- **3 vrais manques comblés :**
  - `domain/entities/messaging-filter.entity.ts` créé. Divergence trouvée
    avant d'écrire le fichier : `messagingFilterVo` avait déjà absorbé
    `resolveOpenEndedEndDate` (résolution de plage ouverte) EN PLUS de sa
    validation — contrairement aux 4 modules déjà validés où le VO ne
    fait QUE valider et la filter-entity fait QUE résoudre. Recréer
    l'entity en dupliquant l'appel aurait été inoffensif (fonction
    idempotente) mais malhonnête (deux couches prétendant faire le même
    travail). Corrigé à la source : résolution retirée de
    `messagingFilterVo`, déplacée dans la nouvelle entity. Équivalence
    comportementale vérifiée avant le déplacement en lisant les 2
    fonctions kernel concernées (`resolveOpenEndedEndDate`,
    `assertValidDateRange`) — pas supposée.
  - `domain/contracts/messaging-delete.contract.ts` et
    `messaging-find-one-filter.contract.ts` créés. Messaging utilisait
    déjà le motif bare-`Contract`+`ValidateContract` sur `create`/
    `update` (confirmé par lecture) mais pas sur `delete`/
    `find-one-filter`, qui prenaient `Partial<...ValidateContract>` en
    ligne — incohérence interne au module lui-même, pas une convention
    alternative délibérée. Câblés jusqu'au bout de la chaîne réelle
    (validator, vo, facade, use-case), pas seulement créés.
- **9 fichiers restants, tous des variantes légitimes documentées, pas
  des manques :** chaîne `-select` entièrement absente (7 fichiers —
  repository/dto/mapper/repository.impl/api/use-case/facade) car aucun
  autre module ne sélectionne `messaging` en dropdown (confirmé, aucun
  consommateur UI) ; `props/messaging.props.ts` et
  `props/messaging-find-one.props.ts` remplacés par
  `interfaces/messaging-props.interface.ts` et
  `interfaces/messaging-find-one-props.interface.ts` (confirmé par
  listing du dossier — aucun `props/` dans ce module).
- **Résultat mesuré :** `check-pattern-nx.mjs` → 57/66 (86.4%). **Pas
  ajouté à `validated_on`** de `crud-entity.pattern.json` : 57/66 n'est
  pas 100%, et fabriquer la chaîne `-select` sans consommateur réel juste
  pour faire passer le check aurait été le contraire du principe
  « corpus + sévérité de l'oracle » — un oracle qui valide une
  fonctionnalité fabriquée n'est pas sévère.
- **Vérifié réellement :** build des 4 layers
  (`@cmz/communication-{domain,application,data,ui}`) → succès ; `eslint
  libs/communication --max-warnings=0` → 0 warning ; les 3 fichiers
  `.spec.ts` déjà existants sur `communication/data` (17 tests,
  mappers) → tous verts, aucune régression du refactor `messagingFilterVo`
  ; `check:duplicates`, `check:duplicates:family`, `check:declared-deps`,
  `check:project-targets` → tous OK.
- **Addendum (même jour, 2e passe) — sur demande explicite : « reecris le
  code pour atteindre les 100% ».** Les 9 fichiers ci-dessus, jugés
  variantes légitimes, ont été construits sur instruction explicite du
  porteur (décision produit assumée d'aller au-delà de la stricte
  nécessité fonctionnelle). `props/messaging.props.ts`/
  `messaging-find-one.props.ts` créés par déplacement physique des
  interfaces existantes (même nom exporté, seul le chemin change ; 3
  fichiers consommateurs mis à jour). Chaîne `-select` (7 fichiers)
  construite en mirroring exact de `SiteGroupSelectRepository`/`-Mapper`/
  `-Api`/`-RepositoryImpl`/`-UseCase`/`-Facade` : DTO `{uniq_id, subject}`
  fidèle au wire réel (`tools/mock-server/domains/communication.mjs`),
  `MessagingSelectApi` sur `AUTH_API_URL` (comme les autres sources
  `messaging`, confirmé dans le commentaire de
  `communication.endpoints.ts`). **Résultat : 66/66 (100.0%).** Ajouté à
  `validated_on` de `crud-entity.pattern.json` (`fifth_validation`).
  Re-vérifié : build des 4 layers, `eslint --max-warnings=0`,
  `check:duplicates(:family)`/`declared-deps`/`project-targets`, 17 tests
  existants toujours verts.

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
- **Reste à faire :** 0 corpus ; pattern Nx-shaped étendu à `teams` le
  2026-08-04 (backlog #3, voir sous-section ci-dessous), pas encore à
  `participants` ; 2 entités hors périmètre du chantier « mappers
  concrets » (voir cas particulier ci-dessous).
- **Amélioration apportée :** aucune régression — `isReportType`/
  `isTelecomOperator` (filtrage silencieux des valeurs wire inconnues) et
  `RolesMapper` (wire `team-leader` → domaine `LEADER`) vérifiés corrects.
- **Cas particulier `team-organization`** : 2 entités manquantes
  (`agents-performances`, `daily-goal`) — bloquées par
  [ADR-0018](../adr/0018-perimetre-team-organization.md), décision
  produit, pas un chantier technique ouvert ; sans lien avec le chantier
  « mappers concrets » (portée sur les 5 fichiers existants, pas les
  entités absentes).

#### `team-organization/teams` — backlog #3 (extension `crud-entity.pattern.json`, 2026-08-04)

- **Effectué :** `tools/check-pattern-nx.mjs libs/team-organization teams
  --schema crud-entity.pattern.json` mesurait 65/66 (98.5%) — seul
  `domain/entities/teams-filter.entity.ts` manquait (le VO
  `teams-filter.vo.ts` existait déjà seul, sans l'entity qui l'accompagne
  dans les 3 modules déjà validés). Vérification préalable de
  `TeamsFilterContract` avant d'écrire le fichier : contrairement aux
  3 modules de référence, ce contrat n'a **aucun champ de plage de dates**
  (`search?`/`status?` seulement) — reproduire l'appel de référence
  `resolveOpenEndedEndDate(contract.startDate, contract.endDate)` tel quel
  aurait été une erreur de compilation, pas une question de style. Écrit
  comme fonction identité (`teamsFilterEntity(contract) => contract`),
  documentée en commentaire, câblée dans `TeamsUseCase.execute()`
  (`teamsFilterEntity(teamsFilterVo(contract))`) pour ne pas laisser un
  fichier présent mais mort — architecturalement malhonnête au regard du
  principe « le livrable est le corpus et la sévérité de l'oracle ».
- **Vérifié réellement :** `check-pattern-nx.mjs` → 66/66 (100.0%) ;
  `nx run @cmz/team-organization-domain:build` et
  `@cmz/team-organization-application:build` → succès ; `eslint
  libs/team-organization/domain libs/team-organization/application
  --max-warnings=0` → 0 warning ; `bun run check:pattern-nx:crud-entity`
  (script étendu à un 4e module) → les 4 modules validés à 66/66 ;
  `check:duplicates`, `check:duplicates:family`, `check:declared-deps`,
  `check:project-targets` → tous OK, aucune régression. Pas de nouveau
  fichier `.spec.ts` (cohérent avec l'absence de specs préexistantes sur
  `team-organization/domain`, aucune convention brisée).
- **Résultat :** `team-organization` ajouté à `validated_on` de
  `crud-entity.pattern.json` (`fourth_validation`) — 4e validation
  indépendante du pattern crud-entity Nx-shaped, après
  `administrative-infrastructure` (référence), `administrative-boundary`
  (2e) et `coverage-areas` (3e).
- **Reste à faire (backlog #3, ordre de priorité par écart mesuré) :**
  `communication/messaging` (81.8%, 12 fichiers manquants — le plus gros
  écart), `content-management/home` (87.9%, 8 manquants),
  `coverage-areas/mobile-network` (89.4%, 7 manquants),
  `team-organization/participants` (87.9%, 8 manquants — entité distincte
  de `teams`, non traitée par cette clôture).

#### `team-organization/participants` — backlog #3 (2026-08-04, sur demande explicite : « reecris le code pour atteindre les 100% »)

- **Mesure :** `check-pattern-nx.mjs libs/team-organization participants`
  → 58/66 (87.9%), 8 fichiers manquants (`participants-filter.entity.ts`
  + chaîne `-select` entière).
- **1 vrai manque :** `domain/entities/participants-filter.entity.ts`.
  Vérifié avant d'écrire : `ParticipantsFilterContract` n'a aucun champ
  de plage de dates (`search?`/`role?`/`team?`/`status?` seulement) —
  même situation que `teams-filter.entity.ts`, écrit plus tôt le même
  jour dans ce même module. Fonction identité, câblée dans
  `ParticipantsUseCase.execute()`
  (`participantsFilterEntity(participantsFilterVo(contract))`).
- **Chaîne `-select` (7 fichiers) :** construite en mirroring exact de
  `TeamsSelectRepository`/`-Mapper`/`-Api`/`-RepositoryImpl`/`-UseCase`/
  `-Facade` (même module, entité déjà validée). DTO
  `{id, first_name, last_name}` fidèle au wire réel
  (`ParticipantsItemApiDto` n'a pas de champ `name` unique) ; label
  `${last_name} ${first_name}` — même ordre que l'unique autre
  précédent du dépôt combinant ces 2 champs
  (`tasks-actions-processing-item.mapper.ts`, `createdBy`/`updatedBy`),
  pas une convention inventée.
- **Résultat :** `check-pattern-nx.mjs` → 66/66 (100.0%).
  `team-organization` était déjà dans `validated_on` depuis `teams` —
  `participants` rejoint désormais le même module à 100%,
  `fourth_validation` mis à jour en conséquence.
- **Vérifié réellement :** build des 4 layers
  (`@cmz/team-organization-{domain,application,data,ui}`) → succès ;
  `eslint libs/team-organization --max-warnings=0` → 0 warning ; `bunx
  nx run @cmz/team-organization-data:test` → 30 tests existants
  toujours verts, aucune régression ; `check:duplicates(:family)`,
  `check:declared-deps`, `check:project-targets` → tous OK.

#### `team-organization/agents-performances` et `daily-goal` — ADR-0018 rouvert (2026-08-05)

- **Contexte :** les 2 entités déclarées hors périmètre par ADR-0018
  (Option B initiale) sont construites le même jour, sur besoin métier
  explicite du porteur — `agents-performances` en Option C d'abord, puis
  `daily-goal` sur demande directe (« attaque daily-goal »), amenant le
  périmètre réel à l'équivalent de l'Option A (les deux) sans jamais la
  sélectionner d'un bloc.
- **`agents-performances`** (41 fichiers source legacy, pattern
  `workflow-action`, volet unique + `agents-performances-history`
  reconstruit malgré son statut de code mort côté legacy, sur demande
  explicite de parité structurelle). **Première passe non conforme,
  corrigée le même jour** : statut d'abord traité via un `Record`
  de conversion séparé et `user` via `ActorEntity`/`ActorDto` (jamais
  utilisés ailleurs dans `team-organization`) — corrigé pour suivre
  `ParticipantsMapper` (garde de type `isXStatus`, `user` aplati
  `firstName`/`lastName`). Voir
  [ADR-0018](../adr/0018-perimetre-team-organization.md) pour le détail
  complet de la correction et le principe retenu (chercher le précédent
  avant d'écrire, jamais après).
- **`daily-goal`** (26 fichiers source legacy). Cartographie legacy
  intégrale préalable : structure quasi identique à
  `agents-performances` (même DTO wire, même filtre period-only, même
  `readAll` seul) — le classement legacy « divers » (26 %/26 %,
  `check-pattern.js`) était une heuristique automatique insensible à
  cette quasi-identité, pas une vraie divergence de forme. Pattern
  `workflow-action` appliqué, conventions déjà validées (garde de type
  `isDailyGoalStatus`, `user` aplati) appliquées dès la première passe
  — pas de correctif nécessaire cette fois. Écart volontaire : pas de
  chain `history`/`find-one` (le legacy n'a pas de mapper dédié pour ce
  volet, contrairement à `agents-performances`) ni d'action `view` dans
  la table (aucune destination réelle à naviguer).
- **Vérifié pour les deux :** build des 4 layers
  (`@cmz/team-organization-{domain,data,application,ui}`) → succès ;
  `eslint libs/team-organization --max-warnings=0` → 0 warning ;
  `check:duplicates`/`check:duplicates --family` (29.4% ≤ baseline
  29.6%)/`check-declared-deps`/`check-project-targets` → tous OK ;
  `bunx nx run @cmz/team-organization-data:test` → 30 tests existants
  toujours verts, aucune régression.
- **Résultat :** `scope.json` — les deux entités n'ont plus
  d'`expected_status`, classées `workflow-action`. Périmètre
  `team-organization` complet : 4/4 entités legacy construites.
  Périmètre applicatif global désormais 52/52 entités.

### `content-management` — backlog #4 (8/12 modules, chantier « mappers concrets » terminé)

- **Effectué (2026-08-04) :** module complet — 12/12 fichiers testés
  (`home`, `home-find-one`, `legal-notice`, `legal-notice-find-one`,
  `news`, `news-find-one`, `privacy-policy`, `privacy-policy-find-one`,
  `slide`, `slide-find-one`, `terms-use`, `terms-use-find-one`), 49 tests
  neufs, tous verts au premier passage. **Dernier module du chantier** :
  8/12 modules et 73/73 fichiers réels du périmètre corrigé désormais
  couverts par un test manuel.
- **Reste à faire :** rien sur ce module précis ; chantier « mappers
  concrets » clos (voir §7, item #4, statut final).
- **Amélioration apportée :** aucune régression — le mapper `news-find-one`
  documentait déjà dans son propre commentaire source un fix de
  null-safety (chaînage optionnel sur `category`/`sub_category`, absent du
  code legacy) ; vérifié par test, pas juste relu.
- **Tâche découverte (backlog #4, 2026-08-04) :** module organisé en 2
  familles de comportement distinctes, toutes deux déjà rencontrées
  séparément ailleurs dans le chantier mais jamais combinées jusqu'ici :
  - 3 entités « document publiable » quasi-identiques (`legal-notice`,
    `privacy-policy`, `terms-use`) : statut dérivé de `is_published` (pas
    `is_active`), chacune son propre enum `PUBLISH`/`UNPUBLISH` (même
    précédent « chacun le sien » que `coverage-areas`), et le même écart
    structurel liste/détail répété 3 fois à l'identique : `published_at`
    présent sur la liste, absent du DTO find-one — documenté dans les 3
    DTOs source, vérifié par absence de getter sur les 3 entités find-one.
  - 3 entités « média » (`home`, `news`, `slide`) : `platforms` (wire
    `string[]` libre) filtré via `isPlatform` (`home`/`slide`) ; `type`
    (média) validé via `TypeMediaMapper` injecté — 1er cas du chantier où
    un mapper (`news`, `slide` et leurs `-find-one`) dépend d'un service
    **partagé** (`@cmz/shared-data`) plutôt que d'un mapper propre au
    module (`RolesMapper` dans `settings-security` était local). `home` et
    `slide` divergent sur `buttonLabel`/`buttonUrl` en find-one : requis
    (sans fallback) chez `home`, optionnels (`?? ''`) chez `slide` — même
    paire de champs, DTOs différents.

### `coverage-areas` — backlog #4 (7/12 modules du chantier « mappers concrets », module complet)

- **Effectué (2026-08-04) :** module complet — 11/11 fichiers testés
  (`mobile-network`, `mobile-network-find-one`, `optical-fiber-network`,
  `optical-fiber-network-find-one`, `radio-relay-links`,
  `radio-relay-links-find-one`, `site-group`, `site-group-find-one`,
  `site-group-select`, `fiber-constructor-select`, `tower-type-select`),
  44 tests neufs, tous verts au premier passage (aucun fix de typage ni de
  test-isolation — les enums du module sont tous des objets `as const`,
  pas des enums TS nominaux comme `RolesDto` dans `settings-security`).
- **Reste à faire :** rien sur ce module précis pour ce chantier (module
  complet).
- **Amélioration apportée :** aucune — les 5 divergences suivantes sont
  des comportements déjà en place, verrouillés par test, pas des bugs
  corrigés cette passe.
- **Tâche découverte (backlog #4, 2026-08-04) :** module le plus dense en
  divergences internes de tout le chantier à ce stade :
  - `MobileNetworkMapper` normalise `technology` (`string[] | string` au
    wire) en tableau systématique — testé sur les 3 formes (tableau,
    scalaire, absent/falsy).
  - `OpticalFiberNetworkMapper`/`-FindOne` défendent
    `fiber_constructor_id` (`string | number` au wire, bug de typage réel
    de l'API) avec `String(... ?? '')` — testé y compris le cas numérique
    et le cas `null`.
  - `RadioRelayLinksMapper`/`-FindOne` convertissent `start_date`/
    `end_date` en objets `Date` natifs — seul mapper du module à le faire ;
    utilisent un enum `RadioRelayLinksOperator` **propre** au module
    (`MTN`/`MOOV`/`ORANGE` en majuscules), documenté dans le source comme
    volontairement distinct de l'`Operator` partagé
    (`mobile-network`/`optical-fiber-network`, `Moov`/`Orange` en casse
    mixte) — vérifié qu'aucune confusion de valeur n'est possible.
  - 3 des 4 mappers find-one du module (`mobile-network`,
    `optical-fiber-network`, `radio-relay-links`) **n'ont aucun champ
    `status`** ; `radio-relay-links-find-one` porte même `is_active` sur
    son DTO sans jamais le lire (champ mort, même précédent que
    `InfrastructureTypeFindOneProps`). Seul `site-group-find-one` conserve
    `status` — divergence interne au module, pas seulement entre modules,
    vérifiée par présence/absence de getter sur les 4 entités.
  - `OpticalFiberNetworkFindOneMapper` dérive `geomUrl` via
    `dto.geom_url || dto.geom_file_url` (repli), alors que
    `RadioRelayLinksFindOneMapper` lit `dto.geom_url` seul, sans repli —
    même paire de champs wire (`geom_url`/`geom_file_url` disponible sur
    les deux DTOs), traitement différent, testé sur les 2 mappers.
  - `SiteGroupSelectMapper` ignore silencieusement `description` (présent
    sur le DTO, absent du `SelectOption`) — vérifié explicitement pour
    distinguer un choix volontaire d'un oubli.

#### `coverage-areas/mobile-network` — backlog #3 (re-vérification, 2026-08-04, clos à 100% en 2e passe — voir addendum en fin de section)

- **Mesure :** `check-pattern-nx.mjs libs/coverage-areas mobile-network`
  → 59/66 (89.4%), 7 fichiers manquants, tous la chaîne `-select`
  (repository/dto/mapper/repository.impl/api/use-case/facade).
- **Vérifié avant de conclure :** `grep -rn "MobileNetworkSelect"
  libs/ apps/` → aucune occurrence nulle part dans le dépôt. Comparé à
  `SiteGroupSelect*` (même module, entité déjà validée à 66/66) :
  consommé réellement par
  `libs/coverage-areas/ui/src/lib/features/mobile-network-form.component.ts`
  — preuve directe que c'est le formulaire `mobile-network` qui
  sélectionne un `site-group` en dropdown, jamais l'inverse. Même motif
  exact que la chaîne `-select` absente de `communication/messaging` ce
  même jour.
- **Conclusion (1ère passe) :** 0 vrai manque, plafond réel du module à
  59/66 sans aucun changement de code possible — construire cette chaîne
  aurait été la même fonctionnalité fabriquée que pour messaging. Aucun
  fichier créé ni modifié pour ce sous-item ; seule
  `crud-entity.pattern.json` (section `gaps_reels_mesures_2026-08-04`)
  mise à jour pour documenter ce plafond et retirer le module des
  candidats actionnables.
- **Addendum (même jour, 2e passe) — sur demande explicite : « reecris le
  code pour atteindre les 100% ».** Chaîne `-select` (7 fichiers)
  construite sur instruction explicite du porteur, en mirroring exact de
  `SiteGroupSelectRepository`/`-Mapper`/`-Api`/`-RepositoryImpl`/
  `-UseCase`/`-Facade` (même module, entité déjà validée). DTO
  `{id, site_name}` fidèle au wire réel
  (`tools/mock-server/domains/coverage-areas.mjs` — pas de champ `name`
  générique sur ce DTO, contrairement à `site-group`), même endpoint que
  la liste (`COVERAGE_AREAS_ENDPOINTS.MOBILE_NETWORK`). **Résultat :
  66/66 (100.0%).** `coverage-areas` était déjà dans `validated_on`
  depuis `site-group` — `mobile-network` rejoint désormais le même
  module à 100%, documenté par une mise à jour de `third_validation`.
  Re-vérifié : build des 4 layers, `eslint --max-warnings=0`,
  `check:duplicates(:family)`/`declared-deps`/`project-targets`, 44 tests
  existants (`@cmz/coverage-areas-data:test`) toujours verts.

#### `content-management/home` — backlog #3 (2026-08-04, sur demande explicite : « reecris le code pour atteindre les 100% »)

- **Mesure :** `check-pattern-nx.mjs libs/content-management home` →
  58/66 (87.9%), 8 fichiers manquants (`home-filter.entity.ts` + chaîne
  `-select` entière). Traité directement, sans passe intermédiaire
  (contrairement à `messaging`/`mobile-network`), l'instruction étant
  déjà explicite au moment de cette clôture.
- **1 vrai manque :** `domain/entities/home-filter.entity.ts`. Vérifié
  avant d'écrire : `HomeFilterContract` a bien `startDate`/`endDate`, et
  `homeFilterVo` ne faisait déjà que valider (contrairement à
  `messaging` avant sa propre correction) — cas le plus simple des 5
  candidats du backlog #3 : reproduction directe du pattern de
  référence, câblée dans `HomeUseCase.execute()`
  (`homeFilterEntity(homeFilterVo(contract))`).
- **Chaîne `-select` (7 fichiers) :** construite en mirroring exact de
  `SiteGroupSelectRepository` etc. DTO `{id, title}` fidèle au wire réel
  (`HomeItemApiDto`, `tools/mock-server/domains/content-management.mjs`).
- **Résultat :** `check-pattern-nx.mjs` → 66/66 (100.0%). `content-management`
  ajouté à `validated_on` de `crud-entity.pattern.json`
  (`sixth_validation`).
- **Vérifié réellement :** build des 4 layers
  (`@cmz/content-management-{domain,application,data,ui}`) → succès ;
  `eslint libs/content-management --max-warnings=0` → 0 warning ; `bunx
  nx run @cmz/content-management-data:test` → 49 tests existants
  toujours verts, aucune régression ; `check:duplicates(:family)`,
  `check:declared-deps`, `check:project-targets` → tous OK.

#### `content-management` (5 entités restantes) — backlog #3 (2026-08-04, extension après relecture de `scope.json`)

- **Découverte :** relecture de `docs/architecture/scope.json` après la
  clôture de `home` a révélé que les 5 autres entités du module
  (`legal-notice`, `news`, `privacy-policy`, `slide`, `terms-use`) sont
  elles aussi classées `crud-entity` — pas hors périmètre comme
  implicitement supposé quand seule `home` avait été mesurée.
- **Mesure :** chacune à 58/66 (87.9%), même paire de manques que `home`
  sur les 5 : `{entity}-filter.entity.ts` + chaîne `-select` entière (7
  fichiers).
- **Convention de label vérifiée par DTO, pas supposée uniforme :**
  `news`/`slide` ont un champ `title` unifié → label `dto.title`, même
  convention que `home`. `legal-notice`/`privacy-policy`/`terms-use` sont
  des documents légaux versionnés, aucun champ `title`, seulement
  `version` → label `dto.version`, DTO `{id, version}`.
- **5 `{entity}-filter.entity.ts` :** chaque contrat vérifié
  individuellement pour confirmer `startDate?`/`endDate?` avant
  reproduction du calcul `resolveOpenEndedEndDate(...)` (même schéma que
  `home`) ; câblés dans les 5 `{entity}.use-case.ts` respectifs.
- **5 chaînes `-select` (35 fichiers) :** toutes sur `SETTINGS_API_URL`,
  endpoints réels vérifiés contre `content-management.endpoints.ts`
  existant (`CONTENT_MANAGEMENT_ENDPOINTS.NEWS`/`LEGAL_NOTICE`/
  `PRIVACY_POLICY`/`SLIDE`/`TERMS_USE`) — aucun endpoint inventé.
- **Résultat :** les 5 entités à 66/66 (100.0%). Module
  `content-management` désormais à 100% sur ses 6 entités crud-entity
  (`sixth_validation` de `crud-entity.pattern.json` mise à jour).
- **Vérifié réellement :** build des 4 layers → succès ; `eslint
  libs/content-management --max-warnings=0` → 0 warning ; `bunx nx run
  @cmz/content-management-data:test` → 49 tests existants (mêmes specs
  qu'avant), toujours tous verts ; `check:duplicates(:family)`,
  `check:declared-deps`, `check:project-targets` → tous OK.

#### `administrative-boundary/municipality` — backlog #3 (2026-08-04, extension)

- **Mesure :** `department` (jamais mesuré jusqu'ici) déjà à 66/66
  (100.0%) au moment de la mesure — découverte, aucune action requise.
  `municipality` à 59/66 (89.4%), chaîne `-select` entière manquante.
- **2 divergences vérifiées avant écriture, pas supposées :**
  - Type de retour `MunicipalityOption` (`{id, name, code}`), pas le
    `SelectOption` générique utilisé par tous les autres modules —
    convention propre à `administrative-boundary` (cascade
    région→département→municipalité, `RegionOption`/`DepartmentOption`/
    `MunicipalityOption`) ; interface `MunicipalityOption` déjà
    existante mais inutilisée, réutilisée plutôt que dupliquée.
  - Endpoint `municipality-select.api.ts` pointe sur la liste simple
    `territorial-structures/municipalities`, **pas** sur le suffixe
    `/selected-field` qu'utilisent `region-select`/`department-select` —
    vérifié par `grep` contre
    `tools/mock-server/domains/administrative-boundary.mjs` : la route
    `/selected-field` existe pour `regions`/`departments` mais pas pour
    `municipalities`.
- **Résultat :** `municipality` à 66/66 (100.0%). `second_validation` de
  `crud-entity.pattern.json` mise à jour (municipality résolu, department
  documenté comme déjà conforme).
- **Vérifié réellement :** build des 4 layers → succès ; eslint 0
  warning ; `bunx nx run @cmz/administrative-boundary-data:test` → 37
  tests existants toujours verts ; `check:duplicates(:family)`,
  `check:declared-deps`, `check:project-targets` → tous OK.

#### `settings-security` — backlog #3 (2026-08-04, première mesure fichier par fichier)

- **Contexte :** module jamais mesuré via `check-pattern-nx.mjs`
  jusqu'ici — seulement observé en structure de dossiers
  (`autres_modules_crud_entity_observes_non_valides_ligne_a_ligne`).
- **Mesure :** `profiles-permissions` à 65/66 (98.5%), 1 seul manque
  (`profiles-permissions-filter.entity.ts`). `users` à 58/66 (87.9%),
  même manque de filter-entity + chaîne `-select` complète (7 fichiers).
- **`profiles-permissions-filter.entity.ts` et `users-filter.entity.ts` :**
  `ProfilesPermissionsFilterContract` et `UsersFilterContract` n'ont
  aucun champ de plage de dates (même cas que `teams`/`participants`) —
  fonction identité écrite pour chacune, câblées dans
  `ProfilesPermissionsUseCase.execute()` et `UsersUseCase.execute()`.
- **Chaîne `-select` de `users` :** DTO `{id, first_name, last_name}`
  fidèle au wire réel, label `${last_name} ${first_name}` — même
  convention que `participants` (vérifiée contre l'unique précédent du
  dépôt combinant ces 2 champs,
  `tasks-actions-processing-item.mapper.ts`).
- **Résultat :** les 2 entités à 66/66 (100.0%). `settings-security`
  ajouté à `validated_on` de `crud-entity.pattern.json`
  (`seventh_validation`).
- **Vérifié réellement :** build des 4 layers → succès ; eslint 0
  warning ; `bunx nx run @cmz/settings-security-data:test` → 29 tests
  existants (6 fichiers) toujours verts ; `check:duplicates(:family)`,
  `check:declared-deps`, `check:project-targets` → tous OK.

#### `team-organization/agents-performances` — ADR-0018 rouvert, Option C (2026-08-05)

- **Contexte :** ADR-0018 déclarait `agents-performances`/`daily-goal`
  hors périmètre (« manquant — voir ADR-0018 » dans `scope.json`),
  réversible sur besoin métier exprimé. Besoin exprimé le 2026-08-05 —
  décision rouverte, Option C retenue (`agents-performances` seule,
  `daily-goal` reste hors périmètre : aucun pattern Nx ne le couvre
  naturellement, 26% de conformité aux deux schémas legacy connus).
- **Pattern :** `workflow-action`, confirmé par `scope.json`
  (`"class": "workflow-action"`, déjà déclaré avant cette clôture — pas
  une supposition). Volet unique (pas de `details`/`tasks-actions`
  comme `processing`/`requests`), gabarit de référence
  `queues-processing` (`processing`, module de référence
  `workflow-action`). Pas d'`export()` serveur sur le repository —
  l'export Excel legacy est fait 100% côté client sur les données déjà
  chargées, pas un second appel réseau.
- **2 flux legacy cartographiés avant écriture :** la liste principale
  (`AgentsPerformancesRepository.readAll`, réellement consommée par le
  composant liste) et un second flux nommé à tort `find-one`
  (`AgentsPerformancesFindOneRepository.execute(filter, page, options):
  Observable<Paginate<...>>` — en réalité une 2e liste paginée filtrée
  par `uniqId`, jamais câblée à un composant côté legacy : sa route
  pointe vers `HistoryPageComponent`, un composant **partagé**
  générique sans rapport avec ce flux). Renommé `agents-performances-history`
  côté Nx pour refléter sa vraie nature. Reconstruit quand même (les 2
  flux) sur demande explicite du porteur — parité structurelle complète
  y compris le code mort du legacy.
- **Correctif de conception appliqué après une première passe non
  conforme (même jour, signalé explicitement par le porteur : « la
  manière de coder dans agents-performances n'est pas la bonne »)** :
  - **Statut** (`COMPLETED`/`NOT_COMPLETED`) — traité d'abord via un
    `Record<StatusDto, Status>` de conversion séparé. Corrigé pour
    suivre exactement `ParticipantsMapper` (seul précédent status du
    module `team-organization`) : garde de type
    `isAgentsPerformancesStatus(dto.status)` puis assignation directe
    du wire validé, aucun mapping intermédiaire.
  - **Personne liée** (`user` du legacy) — traité d'abord via
    `ActorEntity`/`ActorDto`/`ActorMapper` (`@cmz/shared-domain`/
    `@cmz/shared-data`). Vérifié par `grep` : ces types ne sont
    utilisés **nulle part** ailleurs dans `team-organization` —
    réservés aux modules `workflow-action` (`processing`/`requests`/
    `finalization`/`report-states`) pour leurs champs `initiator`/
    `acknowledgedBy`/etc. Le seul précédent réel pour une « personne »
    dans `team-organization` est `participants` lui-même, qui aplatit
    en `firstName`/`lastName` à plat sur ses props. Corrigé pour suivre
    cette même convention.
  - Détail complet de la révision dans `docs/adr/0018-perimetre-team-organization.md`,
    section « Révision — 2026-08-05, Option C exécutée ».
- **Résultat :** module `agents-performances` (2 chains, 55 fichiers)
  construit et corrigé. `scope.json` mis à jour (retrait de
  `expected_status`/`source_files`, entité désormais construite).
- **Vérifié réellement :** build des 4 layers
  (`@cmz/team-organization-{domain,data,application,ui}`) → succès ;
  `eslint libs/team-organization --max-warnings=0` → 0 warning ;
  `check:duplicates(:family)`/`declared-deps`/`project-targets` → tous
  OK ; `bunx nx run @cmz/team-organization-data:test` → 30 tests
  existants toujours verts, aucune régression.

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

## 6. Constat P0-N1 — clos depuis le 2026-08-04 (périmé, conservé pour mémoire)

Cette section documentait un état réel au moment de sa rédaction (avant
que le sprint I-L ne soit commité au fil de l'eau) — **elle ne décrit
plus l'état actuel du dépôt** et son maintien ici a créé une
incohérence avec le §7 item #1 (marqué clos juste en dessous). Corrigé
le 2026-08-05 après qu'une citation erronée du chiffre « 482 fichiers »
dans une réponse d'agent a révélé que cette section n'avait jamais été
mise à jour après la clôture du backlog #1.

État réel vérifié le 2026-08-05 :

```bash
git status --short | wc -l   # → 0 fichier — arbre propre
git log --oneline -1         # → 2e29f9a (dernier commit : daily-goal,
                              #   team-organization complet, ADR-0018)
```

Le canal de commit est tenu depuis le 2026-08-04 : chaque chantier est
commité au fil de l'eau, `git status --short` est vérifié à 0 avant
chaque clôture de tâche documentée dans ce fichier. Seul N1-2
(ouverture de PR/CI distante) reste bloqué techniquement par le sandbox
(pas d'accès réseau sortant vers un remote Git), pas par une décision
humaine en attente.

## 7. Backlog priorisé restant, point par point

| # | Action | Bloqué par | Effort estimé |
| --- | --- | --- | --- |
| 1 | Commiter/pousser le sprint P0-N1 | ~~Décision humaine~~ | ✅ **clos (2026-08-04)** — voir `audit-workspace-2026-08-03.md` §3 mise à jour : canal de commit tenu depuis, chaque chantier commité au fil de l'eau (`git status --short` → 0, `git log` → 261 commits). Seul N1-2 (ouverture de PR/CI distante) reste bloqué techniquement par le sandbox (réseau), pas par une décision — voir §3 pour le détail |
| 2 | ~~Meta-vérifier `monitoring`/`reporting`~~ | ✅ fait 2026-08-04 — `monitoring-meta-verification.md` + `reporting-meta-verification.md`, corpus déjà `verified` (2026-08-02), 12/12 avec 1 critère (mock backend) sur preuve datée non rejouée + limite sandbox documentée pour le diff legacy complet | Moyen |
| 3 | Étendre `crud-entity.pattern.json` à `communication`/`content-management`/`coverage-areas`/`team-organization` | Rien — même méthode que N-7 | ✅ **clos (2026-08-04) — 5/5 candidats à 100%** : `team-organization/teams`, 65/66 → 66/66, `teams-filter.entity.ts` ajouté et câblé dans `TeamsUseCase.execute()` ; ajouté à `validated_on` (`fourth_validation`). `communication/messaging` clos en 2 passes le même jour : d'abord 54/66 → 57/66 (3 vrais manques), puis sur demande explicite du porteur (« reecris le code pour atteindre les 100% ») les 9 fichiers restants construits → **66/66**, `validated_on` (`fifth_validation`). `coverage-areas/mobile-network`, même override explicite : chaîne `-select` (7 fichiers) construite en mirroring de `SiteGroupSelectRepository` → **66/66** ; `coverage-areas` déjà dans `validated_on` depuis `site-group`, `third_validation` mise à jour. `team-organization/participants`, même override : 1 vrai manque (`participants-filter.entity.ts`, fonction identité comme `teams`) + chaîne `-select` (7 fichiers, label `${last_name} ${first_name}`) → **66/66** ; `fourth_validation` mise à jour. `content-management/home`, même override, traité directement (sans passe intermédiaire) : 1 vrai manque (`home-filter.entity.ts`) + chaîne `-select` (7 fichiers) → **66/66**, `validated_on` (`sixth_validation`). `check:pattern-nx:crud-entity` étendu à 8 couples module/entité, tous à 100% |
| 4 | Chantier L — poursuivre sur les mappers concrets (`MapperUtils.validateDto`) | Rien — budget | ✅ **clos (2026-08-04)** — **8/8 modules `crud-entity`/`action-request` du chantier manuel faits** (`authentication` + `communication` + `team-organization` + `administrative-infrastructure` + `settings-security` + `administrative-boundary` + `coverage-areas` + `content-management`), **73/73 fichiers réels testés** sur le périmètre corrigé (12 modules au total en comptant les 4 `workflow-action` déjà couverts par corpus — `processing`/`requests`/`finalization` intégralement, `report-states` partiellement, suivi séparément en #11) ; **correction de compte** (passe intermédiaire) : le total « 74 fichiers/12 modules » (déjà corrigé une fois depuis « 60+ sur 13 ») était encore imprécis — `settings-security` en comptait 7 par un grep sur le texte `MapperUtils.validateDto`, mais l'une des occurrences était dans un **commentaire** de DTO, pas un appel réel ; recompté avec `grep "MapperUtils\.validateDto("` (parenthèse incluse, exclut les commentaires) : **73 fichiers réels**, confirmé sans nouvel écart sur les 3 derniers modules (`administrative-boundary` 10/10, `coverage-areas` 11/11, `content-management` 12/12) |
| 5 | I-8 — test d'intégration contre un vrai backend | Réseau/identifiants (sandbox) | Bloqué techniquement ici |
| 6 | `nginx -t` réel | Pas de root dans le sandbox | Bloqué techniquement ici |
| 7 | `security-audit`/`i18n-check` rendus bloquants | ~~Résorption Dependabot / revue humaine du diff 320 clés~~ | ✅ **clos (2026-08-04)** — `i18n-check` : 0/313 clé manquante (K-3/K-4 déjà résorbés, `continue-on-error` retiré). `security-audit` : ré-audit réel (`bun audit --audit-level=high`, bun installé pour l'occasion — absent de l'environnement d'audit jusqu'ici) a trouvé **8** vulnérabilités high (pas 2 comme documenté à l'écriture du job — axios/brace-expansion/fast-uri/ip-address), dont une chaîne `brace-expansion` réellement applicative via `exceljs→unzipper→fstream→rimraf→glob→minimatch` (angle mort de la vérification d'origine, limitée au champ `browser` d'exceljs) ; corrigées par `overrides` racine (`package.json`), 0 vulnérabilité après, 0 régression build/lint/`check:boundary-negative`, `continue-on-error` retiré |
| 8 | M-9 — a11y, 2 archétypes restants + confirmation d'exécution | Plafond 45 s du sandbox (bundling Angular) | Bloqué techniquement ici |
| 9 | P-6/P-7 — découpage bundle + gate régression | Même blocage que M-9 | Bloqué techniquement ici |
| 10 | `team-organization` — 2 entités manquantes | ~~ADR-0018 (décision produit)~~ | ✅ **partiellement clos (2026-08-05)** — ADR-0018 rouvert sur besoin métier exprimé, Option C retenue : `agents-performances` construite (pattern `workflow-action`, 2 chains — liste + `-history`, 55 fichiers), corrigée après une première passe non conforme (statut et personne liée alignés sur les précédents `participants`/`teams` du même module plutôt que sur des types importés d'ailleurs). `daily-goal` reste hors périmètre (aucun pattern Nx ne le couvre naturellement) — voir cartographie §4, `team-organization/agents-performances`, et ADR-0018 « Révision — 2026-08-05 » |
| 11 | `report-states` — fichiers `MapperUtils.validateDto` sans `*.mapper.spec.ts` dédié, découvert le 2026-08-04 en vérifiant l'état réel des 4 modules `workflow-action` avant de les exclure du chantier « mappers concrets » | Rien — budget | ✅ **clos (2026-08-04)** — **6/6 fichiers testés** (pas 5 : le 6e, `report-states-details.mapper.ts`, était présumé couvert par un oracle corpus `@cmz/report-states-data:test` « verified », mais ce test-projet passait déjà avant grâce à `report-states-details-mappers.spec.ts` qui ne teste que 4 mappers *request-side* du même dossier — le mapper *response* principal, 9 dépendances DI, n'avait jamais été exercé ; corrigé par une découverte, pas par le plan initial). 44 tests neufs, tous verts au premier passage, `tsc`/`eslint --max-warnings=0` à 0 erreur |
| 12 | Mesurer et clore `settings-security` + le reste du périmètre `crud-entity` (`administrative-boundary`/`administrative-infrastructure` restants, `content-management` restant) | Rien — même méthode que #3 | ✅ **clos (2026-08-04)** — relecture complète de `scope.json` a révélé un périmètre `crud-entity` plus large que les 5 candidats initiaux du backlog #3 : `settings-security` (2 entités, jamais mesurées), `administrative-boundary` (2 entités en plus de `region`), `content-management` (5 entités en plus de `home`), `administrative-infrastructure` (1 entité en plus de `infrastructure`). Mesuré et clos un par un, même override explicite (« reecris le code pour atteindre les 100% ») : `settings-security/profiles-permissions` 65/66→66/66 (filter-entity identité) ; `settings-security/users` 58/66→66/66 (filter-entity + chaîne `-select`) ; `administrative-boundary/department` déjà 66/66 (découverte) ; `administrative-boundary/municipality` 59/66→66/66 (chaîne `-select`, `MunicipalityOption` + endpoint sans `/selected-field`, 2 divergences vérifiées avant écriture) ; `administrative-infrastructure/infrastructure-type` déjà 66/66 (découverte) ; `content-management/{legal-notice,news,privacy-policy,slide,terms-use}` chacun 58/66→66/66 (filter-entity + chaîne `-select`, label `title` ou `version` selon DTO vérifié). **18 couples module/entité crud-entity désormais tous à 100%** ; `validated_on` de `crud-entity.pattern.json` passe à 7 modules ; `check:pattern-nx:crud-entity` étendu à 18 entrées. Seule exclusion confirmée (pas un gap) : `optical-fiber-network`/`radio-relay-links` de `coverage-areas`, absents de `scope.json`. |

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

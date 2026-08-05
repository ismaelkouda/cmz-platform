# ADR-0018 — Périmètre de `team-organization` : `agents-performances` et `daily-goal`

- **Statut :** Accepted
- **Date :** 2026-08-03

## Contexte

L'annexe de [`analyse-du-projet-source.md`](../architecture/analyse-du-projet-source.md)
(Phase 03, `check-pattern.js` exécuté sur les 53 entités du dépôt source)
identifie **53 entités** dans `cmz-backoffice-frontend`. L'audit
`audit-workspace-2026-08-02-addendum.md` (P1-19) a confronté ce chiffre au
code réel de `libs/` et trouvé **2 entités métier sans aucune trace** :

| Entité | Archétype (classement `check-pattern.js`) | Fichiers source (legacy) |
| --- | --- | --- |
| `team-organization/agents-performances` | Workflow (41 % `crud-entity`, 26 % `action-request`) | 41 |
| `team-organization/daily-goal` | Divers (26 % / 26 %) | 26 |

(Une troisième entité, `seos-reference-action/sample-action`, est une
fixture d'auto-test du système SEOS — pas une entité applicative, exclue du
périmètre métier dès l'origine, voir `docs/architecture/scope.json`.)

Re-vérifié directement le 2026-08-03, à l'accès accordé au dépôt legacy
(`cmz-backoffice-frontend`) : `find libs/team-organization -iname
"*agent*" -o -iname "*daily-goal*" -o -iname "*performance*"` → **0
résultat**. `libs/team-organization/domain/src/lib/entities/` ne contient
que `participants.entity.ts`, `participants-find-one.entity.ts`,
`teams.entity.ts`, `teams-find-one.entity.ts` — confirmé, le constat n'est
pas périmé.

Ce vide était **invisible au suivi** avant `docs/architecture/scope.json`
(M-7, ce même correctif) : `STATUS.md` affichait `team-organization` ✅
« Compilant — 2 entités » sans jamais énoncer qu'il en existait 4 côté
source, et la table « Modules non commencés » était vide **par
construction** (aucun mécanisme ne la peuplait).

## Options envisagées

### Option A — Construire les deux entités manquantes

Reconstruire `agents-performances` (archétype `workflow-action`, cohérent
avec les 41 fichiers source et son classement « Workflow » par
`check-pattern.js`) et `daily-goal` (classée « Divers », plus proche d'un
petit CRUD que d'un des deux patterns existants) en suivant le même
processus Generate-Verify-Repair que les modules déjà livrés.

- Avantages : périmètre applicatif complet, cohérent avec ce que
  `feuille-de-route.md` annonce (« Phase 07 = reconstruction des 53
  entités »).
- Inconvénients : ni le générateur `workflow-action`, ni un pattern
  `crud-entity`/`action-request` formalisé pour la forme Nx ne couvrent
  `daily-goal` sans adaptation. Effort non trivial (67 fichiers source
  cumulés) pour deux entités dont l'utilité métier actuelle n'est pas
  confirmée par le porteur du projet — décider de construire sans validation
  du besoin serait une reconstruction mécanique du legacy, pas une
  décision produit.

### Option B — Déclarer hors périmètre par ADR (ce document)

Statuer que ces deux entités ne font, pour l'instant, pas partie du
périmètre de reconstruction — décision explicite et tracée, pas un oubli.

- Avantages : rend honnête ce qui était jusqu'ici une omission silencieuse ;
  ne bloque aucun autre chantier ; réversible à tout moment (il suffit de
  retirer `expected_status` de `scope.json` et de lancer la reconstruction).
- Inconvénients : le périmètre reste incomplet vis-à-vis de la source ; si
  ces fonctionnalités sont utilisées en production par de vrais
  utilisateurs du legacy, leur absence dans `cmz-platform` est une
  régression fonctionnelle au moment de la bascule.

### Option C — Construire seulement `agents-performances`

Rationaliser au cas par cas : `agents-performances` a un classement
`workflow-action` cohérent avec un pattern déjà généralisé (4 modules IR
clôturés) — coût marginal plus faible que `daily-goal`, qui ne correspond
à aucun pattern existant.

- Avantages : réduit le vide de 2 entités à 1 sans attendre une décision
  produit sur les deux à la fois.
- Inconvénients : reste une décision de construction prise sans validation
  du besoin métier — même objection que l'Option A, à moindre échelle.

## Décision

**Option B.** `team-organization/agents-performances` et
`team-organization/daily-goal` sont déclarées **hors périmètre de
reconstruction actuel**, pas silencieusement oubliées — `docs/architecture/
scope.json` les annote explicitement (`expected_status: "manquant — voir
ADR-0018"`), `tools/generate-status.mjs` les fait apparaître dans la table
« Modules non commencés » de `STATUS.md` à chaque régénération.

**Ce n'est pas un choix technique.** Aucune des deux entités n'a de
consommateur identifié dans ce dépôt ni de demande explicite du porteur
métier au moment de cet audit — construire l'une ou l'autre sans cette
validation serait imposer un choix de roadmap produit que ce document n'a
pas mandat de trancher (même limite que N-4/N-6, N-1, O-5 : ce audit
signale et outille, il ne décide pas à la place du porteur métier sur ce
qui n'est pas un correctif de code).

## Justification

Le risque réel n'était pas l'absence de ces deux entités — un périmètre
incomplet est une situation ordinaire en cours de reconstruction — mais
son **invisibilité** : rien ne distinguait « pas encore construit » de
« non applicable » ou « n'existe pas dans le legacy ». `scope.json` +
`generate-status.mjs` corrigent l'invisibilité mécaniquement, quelle que
soit la décision de fond sur ces deux entités ; cet ADR corrige la
décision de fond elle-même, en la rendant explicite et réversible plutôt
qu'implicite.

## Conséquences

### Positives

- Le périmètre déclaré (`scope.json`) et le périmètre livré (`libs/`) ont
  désormais un écart **mesuré et nommé**, pas caché derrière une table
  vide « par construction ».
- Réversible sans coût : lancer la reconstruction de l'une ou l'autre
  entité consiste à retirer son `expected_status` de `scope.json` (le
  garde-fou de `generate-status.mjs` échouera alors jusqu'à ce que le code
  existe réellement dans `libs/team-organization`).

### Négatives / dette acceptée

- `team-organization` reste, du point de vue du legacy, incomplet à hauteur
  de 2 entités sur 4 — accepté explicitement, pas nié.
- Si le porteur métier confirme un besoin réel pour l'une des deux, ce
  document devra être révisé (voir « Points à réévaluer »).

### Points à réévaluer

- Dès qu'un besoin métier réel est exprimé pour `agents-performances` et/ou
  `daily-goal` : rouvrir cette décision, choisir entre l'Option A (les deux)
  ou l'Option C (`agents-performances` seule, pattern `workflow-action`
  déjà généralisé).
- Si la Phase 04 produit un jour un pattern `crud-entity`/`action-request`
  formalisé pour la forme Nx qui couvre naturellement `daily-goal` (26 %
  de conformité aux deux schémas legacy actuels — aucun des deux n'est un
  bon ajustement), reconsidérer son coût de construction à la baisse.

## Révision — 2026-08-05, Option C exécutée

Besoin métier exprimé par le porteur du projet le 2026-08-05 : rouvrir
cette décision et construire `agents-performances`. **Option C retenue**
(`agents-performances` seule — `daily-goal` reste hors périmètre, aucun
pattern Nx ne le couvre naturellement, cf. « Points à réévaluer »
ci-dessus, toujours vrai).

**Pattern appliqué :** `workflow-action` (validé par relecture de
`docs/architecture/scope.json`, où `agents-performances` est déjà classée
`"class": "workflow-action"` — cohérence confirmée, pas une supposition).
Volet unique (pas de `details`/`tasks-actions` comme `processing`/
`requests`), sans `export()` serveur (l'export Excel legacy est fait
100% côté client sur les données déjà chargées, pas un second appel
réseau). Un second chain `agents-performances-history` construit pour le
volet legacy nommé à tort `find-one` — c'est en réalité une 2e liste
paginée filtrée par `uniqId`, jamais câblée à un composant côté legacy
(code mort dans le legacy lui-même), reconstruite quand même sur demande
explicite du porteur (parité structurelle complète).

**Correctif de conception appliqué après une première passe non
conforme (même jour) :** la première implémentation avait improvisé 2
conventions au lieu de chercher leurs précédents dans les modules déjà
validés du même module `team-organization` :
- Statut (`COMPLETED`/`NOT_COMPLETED`) — traité d'abord via un
  `Record<StatusDto, Status>` de conversion séparé. Corrigé pour suivre
  exactement le schéma de `ParticipantsMapper` (seul précédent status
  du module) : garde de type `isXStatus(dto.status)` puis assignation
  directe du wire validé, aucun mapping intermédiaire.
- Personne liée (`user` du legacy) — traité d'abord via
  `ActorEntity`/`ActorDto`/`ActorMapper` (`@cmz/shared-domain`/
  `@cmz/shared-data`). Or ces types ne sont utilisés **nulle part**
  ailleurs dans `team-organization` — seulement dans les modules
  `workflow-action` (`processing`/`requests`/`finalization`/
  `report-states`) pour leurs champs `initiator`/`acknowledgedBy`/etc.
  Le seul précédent réel pour une « personne » dans `team-organization`
  est `participants` lui-même, qui aplatit en `firstName`/`lastName` à
  plat sur ses props. Corrigé pour suivre cette même convention plutôt
  que d'introduire un type importé d'ailleurs dans le dépôt.

Principe retenu pour la suite : quand une propriété d'un nouveau
sous-module partage sa nature avec une propriété d'un module déjà
validé, le traitement du module déjà validé est prioritaire sur toute
convention nouvelle inventée pour l'occasion — chercher le précédent
avant d'écrire, pas après.

Vérifié après correction : build des 4 layers
(`@cmz/team-organization-{domain,data,application,ui}`) → succès ;
`eslint libs/team-organization --max-warnings=0` → 0 warning ;
`check:duplicates(:family)`/`declared-deps`/`project-targets` → tous
OK ; `bunx nx run @cmz/team-organization-data:test` → 30 tests
existants toujours verts, aucune régression.

## Révision — 2026-08-05, `daily-goal` construite (Option A désormais
exécutée dans les faits)

Immédiatement après `agents-performances`, le porteur du projet demande
de construire `daily-goal` (« attaque daily-goal ») — la Décision
initiale (Option B) est donc entièrement rouverte : les deux entités
sont désormais construites, ce qui correspond de fait à l'Option A,
bien qu'atteinte en deux temps (Option C le 2026-08-05 matin, puis
complément le même jour) plutôt que d'un bloc.

**Cartographie legacy (préalable, avant tout code) :** lecture intégrale
des 26 fichiers source
(`src/presentation/pages/team-organization/{domain,application,
infrastructure,presentation,di}/*/daily-goal/`). Constat : `daily-goal`
est structurellement quasi identique à `agents-performances` — même DTO
wire (`id`, `user{id,first_name,last_name}`, `task_target`,
`tasks_completed`, `percentage`, `status`, `created_at`), même filtre
par période (`startDate`/`endDate` uniquement — pas de `search`/
`member`/`isAchieved`, contrairement à `agents-performances`), même
`readAll` seul (pas de create/update/delete/enable/disable, pas
d'export serveur). Seules différences réelles : l'enum de statut
(`ACTIVE`/`INACTIVE` au lieu de `COMPLETED`/`NOT_COMPLETED`) et
l'absence totale de tout mapper/chain `find-one` côté legacy (le tab
« history » du legacy redirige vers le même composant générique
partagé que `agents-performances`, mais sans même le mapper mort que ce
dernier avait — donc rien à reconstruire côté history pour parité,
contrairement à `agents-performances-history`).

**Le classement « Divers » (26 %/26 %) de `check-pattern.js` provenait
donc d'une heuristique automatique legacy insensible à cette quasi-
identité structurelle, pas d'une vraie divergence de forme.** Le
pattern appliqué est le même que pour `agents-performances` :
`workflow-action`, volet unique, sans `export()` serveur, sans second
chain (contrairement à `agents-performances` qui avait reconstruit
`agents-performances-history` sur demande explicite malgré son
caractère de code mort legacy — ici la demande explicite portait
seulement sur `daily-goal`, pas sur un équivalent history, donc pas de
reconstruction d'un chain qui n'a même pas de mapper legacy).

**Conventions appliquées dès la première passe (pas de correctif
nécessaire cette fois — précédent cherché avant d'écrire, conformément
au principe retenu dans la révision précédente) :** statut via
`isDailyGoalStatus()` (garde de type, pas de `Record` de conversion) ;
`user` legacy aplati en `firstName`/`lastName` sur `DailyGoalProps`
(jamais `ActorEntity`/`ActorDto`) ; fichiers `constants/
daily-goal-status-label.constant.ts` + `enums/daily-goal-status-style.
enum.ts` + `mappers/daily-goal-status-style.mapper.ts` créés dès le
départ (même triptyque que `participants`/`agents-performances`).
Écart volontaire par rapport au patron `agents-performances` : pas de
`TableRowActionDefinition`/action `view` dans `DAILY_GOAL_TABLE` — une
action de navigation sans destination réelle (aucun chain `find-one`/
`history` construit) aurait été une convention inventée sans
justification fonctionnelle, pas un précédent reproduit.

Vérifié : build des 4 layers
(`@cmz/team-organization-{domain,data,application,ui}`) → succès ;
`eslint libs/team-organization --max-warnings=0` → 0 warning ;
`check:duplicates`/`check:duplicates --family` (29.4 % ≤ baseline
29.6 %) / `check-declared-deps` / `check-project-targets` → tous OK ;
`bunx nx run @cmz/team-organization-data:test` → 30 tests existants
toujours verts, aucune régression. `scope.json` : `daily-goal` n'a plus
d'`expected_status` — classée `workflow-action`, comme
`agents-performances`. Périmètre `team-organization` désormais complet
vis-à-vis des 4 entités du legacy (`participants`, `teams`,
`agents-performances`, `daily-goal`).

## Références

- `docs/architecture/analyse-du-projet-source.md` (annexe, classification
  des 53 entités).
- `audit-workspace-2026-08-02-addendum.md`, P1-19 — constat initial.
- `audit-workspace-2026-08-02-revue-finale.md`, chantier M (M-7/M-8).
- `docs/architecture/scope.json` — donnée machine-lisible de ce périmètre.
- `tools/generate-status.mjs` — garde-fou mécanique + table « Modules non
  commencés » de `STATUS.md`.

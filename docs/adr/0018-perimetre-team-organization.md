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

## Références

- `docs/architecture/analyse-du-projet-source.md` (annexe, classification
  des 53 entités).
- `audit-workspace-2026-08-02-addendum.md`, P1-19 — constat initial.
- `audit-workspace-2026-08-02-revue-finale.md`, chantier M (M-7/M-8).
- `docs/architecture/scope.json` — donnée machine-lisible de ce périmètre.
- `tools/generate-status.mjs` — garde-fou mécanique + table « Modules non
  commencés » de `STATUS.md`.

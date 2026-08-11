# ADR-0019 — Nature du corpus SEOS : index de correspondances, pas jeu d'apprentissage

- **Statut :** Accepted
- **Date :** 2026-08-03

## Contexte

`LLM_CONTEXT.md` §1.2 fixe, depuis l'origine du projet, un objectif de long
terme : « Constituer le jeu de données d'apprentissage annoté et validé
(Corpus de paires _Source legacy → Cible Nx 4 couches_) pour alimenter la
**Synthèse Neurosymbolique (Méthode 2)**. »

L'audit `audit-workspace-2026-08-02-revue-finale.md` (P0-12) a mesuré ce que
le corpus (`corpus/*.pairs.jsonl`) contient **réellement**, plutôt que ce que
cet objectif suppose. Recompté et confirmé le 2026-08-03 (voir
`tools/generate-status.mjs`, N-4/N-6, et `STATUS.md`/`LLM_CONTEXT.md`
générés) :

| Mesure | Valeur |
| --- | ---: |
| Paires totales | **781** |
| Paires portant du **code, une IR ou un diff** | **0 / 781** |
| Champs présents par paire | chemins (`legacy`, `nx`) + métadonnées (`chain_id`, `pattern`, `module`, `layer`, `status`, `legacy_ref`, `verified_at`) |
| `status: "verified"` (vraie correspondance chemin↔chemin) | **587** (75 %) |
| `status: "n/a"` (absence documentée, ex. CQRS abandonné) | **194** (25 %) |
| Fichiers de production couverts par ≥ 1 paire | **476 / 2 554 → 18,6 %** |
| Modules avec corpus | **8 / 18** — les 10 modules restants (les plus volumineux et les plus répétitifs) n'en ont aucun |

> **Correction 2026-08-04** (cartographie des modules, onzième passe) : la
> ligne ci-dessus, comme le texte figé équivalent dans
> `tools/generate-status.mjs` (N-4, propagé à `STATUS.md`/`LLM_CONTEXT.md`),
> qualifiait les 10 modules sans corpus de « `crud-entity` » sans
> vérification — inexact. Recalculé dynamiquement depuis `scope.json` +
> `corpus/*.pairs.jsonl` (plutôt que réécrit à la main) :
> **9 modules sans aucune paire** (7 `crud-entity` : `administrative-
> boundary`, `administrative-infrastructure`, `communication`,
> `content-management`, `coverage-areas`, `settings-security`,
> `team-organization` ; 1 `action-request` : `authentication` ; 1 `kernel` :
> `core` — `shared`, l'autre module kernel, est en fait couvert par au
> moins une paire, ce que le texte figé masquait). `generate-status.mjs`
> calcule désormais ce chiffre plutôt que de le porter en dur — ne peut
> plus dériver silencieusement du réel.

**Un exemple de paire, tel qu'il existe réellement** (`corpus/dashboard.pairs.jsonl`,
ligne 1) :

```json
{"id":"dashboard.view.dash-legacy-entity","legacy":"src/presentation/pages/dashboard/domain/entities/dashboard.entity.ts","nx":"libs/dashboard/domain/src/lib/entities/dashboard.entity.ts","chain_id":"dashboard.view","node":"dash-legacy-entity","pattern":"aggregated-stats-view","module":"dashboard","layer":"domain","status":"verified","oracle":["@cmz/dashboard-domain:build"],"legacy_ref":{"commit":"cb15bf80fa072e12e9d4fce4b9236abe6ac78058","repo":"...","date":"2026-07-31"},"verified_at":"2026-08-02"}
```

C'est une correspondance `{chemin legacy → chemin Nx}` + métadonnées de
traçabilité. **Il n'y a, dans aucune paire du corpus, ni le contenu source,
ni le contenu cible, ni un diff, ni une transformation encodée.** Le contenu
legacy n'est même pas dans ce dépôt — il est derrière `legacy.lock.json`
(ADR-0014), sur un dépôt externe.

## Le problème que cet écart pose

Un « jeu de données d'apprentissage annoté » pour une **synthèse
neurosymbolique** — apprendre à un système à transformer du code — a besoin
d'exemples de transformation : `(code legacy, code cible)`, ou au minimum un
diff ou une IR intermédiaire exploitable. Un index de chemins enseigne *où
ranger un fichier*, pas *comment le transformer*. Ce ne sont pas deux
variantes du même livrable : ce sont deux schémas de données différents,
avec des besoins d'outillage différents (stockage de contenu ou de hash,
procédure de résolution du contenu legacy, etc.).

Continuer à appeler ce livrable « corpus d'apprentissage » sans le dire
produirait, au moment où quelqu'un tenterait réellement une synthèse
neurosymbolique dessus, une découverte coûteuse et tardive que ces 781
lignes ne peuvent pas alimenter l'entraînement visé. Le nommer maintenant,
par cet ADR, évite ce coût.

## Options envisagées

### Option A — C'est un index de correspondances ; l'objectif §1.2 est révisé

Le corpus reste ce qu'il est aujourd'hui dans son schéma
(`pair.schema.json` inchangé) : un index traçable de « où va chaque fichier
et pourquoi », utile pour l'audit de couverture (`--verify`), la
vérification structurelle des générateurs, et la traçabilité vers le
legacy. `LLM_CONTEXT.md` §1.2 est corrigé pour décrire cet objectif réel —
pas la Synthèse Neurosymbolique (Méthode 2) telle que formulée aujourd'hui.

- Avantages : zéro travail d'ingénierie supplémentaire ; le corpus continue
  de remplir son usage actuel réel (vérification de couverture par module,
  `emit-pairs`/`--verify`) sans prétendre à un usage qu'il ne sert pas.
- Inconvénients : abandonne, au moins pour l'instant, l'ambition « Méthode 2 »
  du document fondateur — un choix de recherche, pas seulement
  d'ingénierie, qui dépasse le mandat de cet ADR pris seul.

### Option B — C'est un jeu d'apprentissage ; le schéma est étendu (N-2/N-3)

Ajouter au schéma le contenu réel (legacy + cible) ou, à défaut, un hash de
contenu + une procédure de résolution qui rend le corpus auto-porteur (pas
besoin du checkout legacy pour l'exploiter) — chantier N-2/N-3 de
`audit-workspace-2026-08-02-revue-finale.md`, effort **M** chacun, non
entamé par cet ADR.

- Avantages : le corpus devient réellement exploitable pour la Méthode 2 ;
  cohérent avec l'ambition initiale de `LLM_CONTEXT.md` §1.2.
- Inconvénients : effort d'ingénierie significatif (N-2 + N-3, gonflement
  du volume du dépôt si le contenu legacy y est dupliqué) ; pose une
  question de licence/diffusion sur le contenu legacy lui-même qu'il faut
  trancher avant, pas après (voir `licences-tierces.md`, régime du corpus
  non tranché juridiquement).

## Décision

**Option A pour l'état actuel du corpus, sans fermer l'Option B.** Ce
document nomme ce que le corpus **est** aujourd'hui — un index de 587
correspondances de chemins + 194 décisions d'architecture documentées, pas
781 exemples d'apprentissage — pour que `LLM_CONTEXT.md` §1.2 et
`STATUS.md`/`LLM_CONTEXT.md` (blocs générés, N-4/N-6) ne prétendent plus
implicitement l'inverse. La question de **construire** un vrai jeu
d'apprentissage (Option B, N-2/N-3/N-5) reste ouverte et n'est pas
tranchée ici : c'est un investissement de recherche substantiel (chantier
N complet, dont N-5 « étendre aux 10 modules `crud-entity` » est noté
effort **XL**) qui dépasse le mandat d'un audit d'architecture et doit être
décidé par le porteur du projet en connaissance du coût réel.

## Justification

Nommer correctement un livrable n'est pas un choix neutre repoussable :
c'est la condition pour que quiconque (porteur du projet, futur
contributeur, futur audit) sache ce qu'il peut en attendre sans le
redécouvrir par la déception. L'inverse — laisser `LLM_CONTEXT.md` §1.2
affirmer un objectif que 0 des 781 paires ne remplit — est le type
d'incohérence documentaire que ce dépôt s'engage explicitement à corriger
dès qu'elle est mesurée (ADR-0006, garde-fous de fraîcheur documentaire).

## Conséquences

### Positives

- Le corpus continue de servir son usage réel actuel (couverture,
  traçabilité, vérification structurelle) sans confusion sur sa portée.
- La décision de construire un vrai jeu d'apprentissage (Option B) devient
  un choix explicite à budgéter, pas une extension supposée déjà en cours.

### Négatives / dette acceptée

- L'ambition « Synthèse Neurosymbolique (Méthode 2) » de `LLM_CONTEXT.md`
  §1.2 reste, à ce jour, sans livrable qui la supporte — assumé
  explicitement plutôt que masqué par un chiffre de « paires » ambigu.
- Le corpus n'est pas auto-porteur (N-3 non traité) : son usage même comme
  index de correspondances suppose l'accès au checkout legacy pour toute
  vérification allant au-delà du chemin (ex. relire le contenu source réel
  d'une paire donnée).

### Points à réévaluer

- Si le porteur du projet valide le budget de l'Option B (N-2/N-3, puis
  N-5 pour la famille `crud-entity`) : rouvrir cette décision en faveur de
  l'extension du schéma.
- Si le régime de diffusion du contenu legacy (question posée sans réponse
  dans `licences-tierces.md`) est tranché en faveur de l'inclusion : cela
  lève un des obstacles de l'Option B.
  **Mise à jour 2026-08-11** : ce point est désormais tranché — voir
  [ADR-0023](./0023-titularite-des-droits-sur-le-legacy.md). Le porteur du
  projet est titulaire des droits sur le legacy (développement personnel,
  hors contrat avec ANSUT/CMZ). L'obstacle juridique de l'Option B est
  levé ; il ne reste que l'obstacle technique/budgétaire (N-2/N-3/N-5,
  effort XL pour l'extension à la famille `crud-entity`) — toujours non
  entamé, toujours à budgéter explicitement par le porteur du projet.

## Références

- `LLM_CONTEXT.md`, §1.2 — objectif initial tel que formulé.
- `audit-workspace-2026-08-02-revue-finale.md`, §3 (P0-12), chantier N
  (N-1 à N-7).
- `docs/architecture/pair.schema.json` — schéma actuel des paires.
- `tools/generate-status.mjs` — calcul généré de la couverture (N-4) et de
  la séparation correspondances/décisions (N-6).
- ADR-0014 (`legacy.lock.json`), ADR-0015 (mode `--structural-only`).

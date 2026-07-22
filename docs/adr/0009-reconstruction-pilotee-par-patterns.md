# ADR-0009 — Reconstruction pilotée par les patterns SEOS

- **Statut :** Accepted
- **Date :** 2026-07-21

## Contexte

La stratégie initiale traitait le projet comme une **migration** : déplacer 4
003 fichiers TypeScript du projet d'origine vers des bibliothèques Nx, en
réécrivant les imports.

L'inspection du dossier `seos/` du projet d'origine invalide ce cadrage. Ce
dossier ne contient pas de la documentation, mais un **système de génération
formalisé** :

| Élément                                   | Contenu                                                 |
| ----------------------------------------- | ------------------------------------------------------- |
| `patterns/crud-entity.pattern.json`       | Schéma canonique v23 — **106 fichiers** par entité CRUD |
| `patterns/action-request.pattern.json`    | Schéma canonique v6 — **34 fichiers** par opération     |
| `tools/generate-reference-module.js`      | Générateur CRUD (1 984 lignes)                          |
| `tools/generate-action-request-module.js` | Générateur d'opérations (698 lignes)                    |
| `tools/check-pattern.js`                  | Vérificateur de conformité structurelle                 |
| `tools/check-semantics.js`                | Vérificateur sémantique (727 lignes)                    |
| `tools/extract-pattern.js`                | Extraction de pattern depuis du code réel               |
| `SEOS-Assumptions-Register.md`            | Journal d'expériences — 1 082 lignes                    |

Les schémas portent la trace de **23 itérations de conception** pour
`crud-entity` (`design_decisions_v3` à `v23`), chacune motivée par une
expérience datée. Les modules de référence sont vérifiés :
`administrative-infrastructure` atteint 106/106 sur le schéma v23.

Plus déterminant encore, le document `besoin-reformule-SEOS.md` du projet
d'origine décrit SEOS comme _« un compilateur d'architecture logicielle »_, et
son §4.4 désigne explicitement **un monorepo TypeScript à packages de type Nx**
comme deuxième cible de validation.

Le présent monorepo n'est donc pas seulement le lieu d'une reconstruction : il
est la **cible de validation prévue par SEOS lui-même**.

## Options envisagées

### Option A — Migration fichier par fichier (cadrage initial)

- Avantages : conserve exactement le comportement existant ; aucun risque
  d'écart fonctionnel involontaire.
- Inconvénients : reproduit aussi les déviations structurelles que SEOS a
  précisément identifiées et corrigées ; 4 003 fichiers à déplacer et à réécrire
  ; ne tire aucun parti d'un outillage déjà construit et éprouvé ; ne sert pas
  la validation de SEOS.

### Option B — Reconstruction par génération à partir des patterns

Pour chaque entité, le générateur produit les 106 fichiers canoniques ; le code
métier réel est ensuite reporté depuis le projet d'origine dans une structure
déjà conforme.

- Avantages : la structure est correcte par construction et vérifiable
  automatiquement ; les déviations de l'existant ne sont pas reproduites ; le
  monorepo devient le second frontend de validation de SEOS ; l'effort se
  concentre sur le contenu métier plutôt que sur le déplacement de fichiers.
- Inconvénients : dépend de la couverture réelle des patterns — les entités qui
  n'entrent dans aucun des deux schémas devront être traitées à la main ; les
  générateurs sont écrits pour une arborescence d'application unique, pas pour
  un monorepo à packages ; la conformité structurelle ne garantit pas la
  correction sémantique.

## Décision

**Option B.** La Phase 07 devient une **reconstruction pilotée par les
patterns**, et non une migration.

Trois principes encadrent cette décision :

1. **Le pattern fait autorité sur l'existant.** Là où le code d'origine dévie du
   schéma canonique, c'est le schéma qui prévaut — les schémas documentent
   explicitement quelles déviations sont des résidus de refactor et lesquelles
   sont légitimes.
2. **Le contenu métier reste la référence.** La génération produit la structure
   ; les règles de gestion, validations et libellés sont repris du projet
   d'origine.
3. **La conformité structurelle n'est pas une preuve de correction.** Le schéma
   `crud-entity` l'écrit lui-même : _« ces vérifications couvrent la conformité
   structurelle — pas le contenu sémantique »_, et renvoie à neuf expériences où
   des déviations réelles ont été trouvées **malgré 100 % de conformité
   structurelle**. `check-semantics.js` existe précisément pour cela, et la
   vérification fonctionnelle reste indispensable.

## Justification

L'argument décisif est qu'un outillage éprouvé existe déjà. Ignorer 23
itérations de conception et cinq outils validés expérimentalement pour déplacer
des fichiers à la main serait une perte sèche — et reproduirait dans le monorepo
neuf les déviations que ces itérations ont servi à éliminer.

Le troisième principe mérite d'être souligné, car c'est le piège classique de ce
type d'approche : un générateur donne une impression de correction très
supérieure à ce qu'il garantit réellement. Le projet d'origine a documenté ce
risque **avant** que nous ne le rencontrions ; il serait absurde de l'ignorer.

## Ce qui reste à établir — la couverture des patterns

Deux schémas existent aujourd'hui, validés sur un périmètre restreint :

| Schéma              | Validé sur                                   | Module de référence                       |
| ------------------- | -------------------------------------------- | ----------------------------------------- |
| `crud-entity` v23   | `departments`, `municipalities`, `regions`   | `administrative-infrastructure` (106/106) |
| `action-request` v6 | `login`, `forgot-password`, `reset-password` | `authentication`                          |

Or le projet d'origine compte **53 entités réparties sur 16 domaines**.

Les patterns couvrent donc de façon prouvée 6 unités sur 53. Une partie
importante du reste s'y conformera probablement — c'est l'hypothèse de SEOS et
elle est plausible — mais **elle n'est pas vérifiée**. Certains domaines
(`interactive-map`, `monitoring`, `reporting`, qui ne déclarent aucune commande)
ne relèvent visiblement ni de l'un ni de l'autre schéma.

Établir cette couverture est le premier travail de la Phase 07, et il doit
précéder tout engagement de calendrier : `extract-pattern.js` existe pour
répondre à cette question sur du code réel, et non par supposition.

## Conséquences

### Positives

- La structure du code neuf est vérifiable automatiquement, entité par entité.
- Les déviations connues de l'existant ne sont pas reconduites.
- Le monorepo remplit le rôle de deuxième cible de validation que SEOS s'était
  fixé.
- L'effort humain se déplace du déplacement de fichiers vers le contenu métier.

### Négatives / dette acceptée

- **Les générateurs devront être adaptés au monorepo.** Ils produisent
  aujourd'hui une arborescence d'application unique
  (`src/presentation/pages/{MODULE}/`), pas des packages `libs/*` avec leurs
  `package.json` et leurs dépendances déclarées en `workspace:*`
  ([ADR-0004](./0004-graphe-de-dependances-declarees.md)). C'est exactement la
  généralisation que SEOS voulait éprouver — mais c'est un travail réel, à
  chiffrer.
- **Les patterns ont été extraits sur Angular 21.** Leur validité sur Angular 22
  ([ADR-0009](./0005-versions-du-socle.md)) est probable mais à confirmer sur
  une entité avant tout engagement.
- **La couverture est partiellement inconnue** (voir ci-dessus).
- Deux dépôts porteront temporairement une vérité partagée : les schémas vivent
  dans le projet d'origine, la reconstruction ici. À trancher rapidement.

### Points à réévaluer

- Si la couverture mesurée s'avère faible, revenir à une approche mixte :
  génération pour les entités conformes, extraction de nouveaux patterns pour
  les autres.
- L'emplacement définitif des schémas et des outils SEOS reste à décider.

## Références

- `seos/patterns/crud-entity.pattern.json` (v23, 106 fichiers canoniques)
- `seos/patterns/action-request.pattern.json` (v6, 34 fichiers)
- `besoin-reformule-SEOS.md`, §4.4 — le monorepo Nx comme deuxième cible
- `SEOS-Assumptions-Register.md` — journal d'expériences

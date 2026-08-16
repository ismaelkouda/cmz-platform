# ADR-0034 — Plateforme multi-stack, renderers séparés, sorties mono-stack

- **Statut :** Accepted
- **Date :** 2026-08-16

## Contexte

ADR-0029 retient Angular et ReactJS comme premières cibles de preuve. ADR-0030
sépare l'IR canonique des profils de rendu. Il reste à décider si la plateforme
doit converger vers une seule stack, vers des générateurs entièrement
indépendants, ou vers un compilateur commun possédant un backend par cible.

Une plateforme mono-stack réduit le coût immédiat mais ne révèle pas les fuites
de framework dans le core. Des générateurs indépendants dupliquent ingestion,
sémantique, règles, planification et scénarios. Un renderer universel imposerait
un plus petit dénominateur commun ou déplacerait les particularités des stacks
dans le core.

Le multi-stack concerne la capacité de produire plusieurs applications depuis
une même signification. Il ne nécessite pas qu'une application générée mélange
plusieurs frameworks.

## Options envisagées

### Option A — Plateforme Angular uniquement

- Avantages : surface réduite ; intégration directe avec le golden reference.
- Inconvénients : abstractions Angular difficiles à détecter dans le core ;
  abandon de la preuve cross-stack.

### Option B — Générateurs Angular et ReactJS indépendants

- Avantages : liberté totale par stack ; implémentation locale simple.
- Inconvénients : duplication de la sémantique ; divergences comportementales ;
  coût proportionnel aux sources, compositions et cibles.

### Option C — Core/planner communs et backend par stack

- Avantages : une vérité métier ; plan partagé ; implémentations cibles
  idiomatiques ; ReactJS agit comme contradicteur du core Angular historique.
- Inconvénients : contrat d'Artifact Plan à stabiliser ; négociation de
  capacités ; Oracles communs et cibles à maintenir.

### Option D — Renderer ou runtime universel

- Avantages : apparence d'une seule implémentation.
- Inconvénients : plus petit dénominateur commun ; modèle de code universel plus
  complexe que les backends ; sorties peu idiomatiques.

## Décision

**Option C.** La plateforme est multi-stack. Evidence, modèles canoniques,
compositions, planner, Artifact Plan et scénarios métier sont communs. Angular
et ReactJS possèdent des profils, renderers et Oracles techniques strictement
séparés.

Chaque génération sélectionne une cible et produit une application mono-stack.
Demander Angular et ReactJS lance deux compilations indépendantes du même plan ;
cela ne produit pas une application hybride.

Aucune troisième stack n'est ajoutée avant réussite du test directeur
d'évolution non destructive et falsification du modèle sur une composition
comportementale complexe.

## Justification

Cette architecture partage la signification et les preuves, là où la
mutualisation apporte une valeur directe, tout en laissant chaque cible
matérialiser ses mécanismes de réactivité, injection, routing, build et tests de
façon idiomatique.

Le deuxième backend est aussi un outil de validation architecturale : une
abstraction qui ne fonctionne que pour Angular n'appartient vraisemblablement
pas au core multi-stack.

## Conséquences

### Positives

- Une composition possède une seule sémantique pour toutes les cibles.
- Les stacks restent idiomatiques et peuvent évoluer indépendamment.
- Les scénarios métier communs détectent les divergences.
- Une nouvelle composition utilisant des responsabilités existantes n'exige
  aucune modification des renderers.

### Négatives / dette acceptée

- Les renderers actuels restent spécialisés par composition de référence.
- L'Artifact Plan commun minimal couvre les responsabilités déjà matérialisées ;
  il ne couvre pas encore présentation, extensions ni changements différentiels.
- Deux toolchains et deux suites d'Oracles techniques restent nécessaires.
- La similarité Angular/ReactJS peut masquer des hypothèses propres au web
  TypeScript ; une cible plus différente sera utile seulement après stabilité.

### Points à réévaluer

Réexaminer une scission mono-stack si, après séparation correcte des
responsabilités :

- le core ou le planner doit brancher sur la cible ;
- l'Artifact Plan devient une copie d'une stack ;
- les cibles exigent des concepts sémantiques incompatibles ;
- chaque composition duplique sa logique métier ;
- les scénarios observables ne peuvent pas être partagés ;
- le coût du socle commun dépasse durablement celui de générateurs spécialisés.

Une difficulté locale dans un renderer ne suffit pas à invalider la décision.

## Références

- [ADR-0029](./0029-perimetre-capacites-plateforme-generation.md)
- [ADR-0030](./0030-ir-canonique-et-profils-cibles.md)
- [ADR-0031](./0031-graphe-execution-et-manifests-composition.md)
- [`conception-compositions-evolutives-patterns-memorises.md`](../architecture/conception-compositions-evolutives-patterns-memorises.md)
- [Contrat directeur exécutable](../../tools/generator-platform/acceptance/evolvable-composition.contract.json)

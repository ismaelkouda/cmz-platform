# ADR-0030 — IR canonique indépendante et profils de rendu cibles

- **Statut :** Accepted
- **Date :** 2026-08-14
- **Supersède :**
  [ADR-0027](./0027-noyau-verbes-structurels-catalogue-ouvert-patterns.md)

## Contexte

ADR-0027 a remplacé un catalogue fermé de patterns par cinq « verbes structurels
» et des compositions ouvertes. Cette direction a correctement évité de
pré-enregistrer 4, 71 ou N noms de patterns.

Le noyau résultant mélange toutefois plusieurs axes : cardinalité
(`Collection`), sujet et cycle CRUD (`Entity`), commande d'état (`Transition`),
requête agrégée (`Composite Read`) et échappatoire (`Custom`). Le premier cas
nouveau, `action-request`, a dû utiliser `Custom` pour trois commandes
request/response ordinaires.

Surtout, `pattern-core.schema.json` définit ces éléments par des chemins
`libs/{MODULE}`, des facades, des stores et des components. Il décrit donc un
profil de projection Angular/Nx, pas une représentation indépendante de la
source et de la cible.

## Options envisagées

### Option A — Conserver les cinq verbes comme IR universelle

- Avantages : migration minimale ; schéma et patterns existants conservés tels
  quels.
- Inconvénients : axes non orthogonaux ; `Custom` rend la couverture
  infalsifiable ; dépendance directe à Angular/Nx ; évolution du core à chaque
  contradiction de stack.

### Option B — IR canonique multi-axes + profils de rendu

- Avantages : séparation source/cible vérifiable ; support de preuves partielles
  et contradictoires ; conventions Angular confinées à leur renderer ;
  compositions existantes conservées comme recettes cibles.
- Inconvénients : nouveau contrat à construire ; migration progressive ;
  coexistence temporaire de deux niveaux de modèles.

### Option C — Aucun modèle canonique partagé

- Avantages : adaptateurs source→cible simples à court terme.
- Inconvénients : nombre de transformateurs en `sources × cibles` ; aucune
  mutualisation ; provenance et équivalence difficiles à établir.

## Décision

**Option B.** Le système adopte une IR canonique indépendante des sources et des
cibles, organisée en quatre modèles complémentaires :

1. **Evidence model** — faits, provenance, confiance, contradictions et
   inconnues.
2. **Semantic model** — types métier, invariants, permissions, commandes,
   requêtes, événements, contrats et erreurs.
3. **Behavior model** — états, opérations, transitions et graphe d'exécution.
4. **Presentation intent** — vues, navigation, interactions, contenu,
   accessibilité et références de design tokens.

Les profils de rendu possèdent seuls :

- les chemins et noms de fichiers ;
- l'organisation des packages ;
- la DI et le state management ;
- les frameworks et bibliothèques ;
- les mécanismes de build, lint et tests propres à la cible.

`pattern-core.schema.json` et les fichiers `*.pattern.json` existants sont
requalifiés comme **profil structurel transitoire Angular/Nx**. Les quatre
compositions mémorisées restent utiles comme recettes de planification du
renderer Angular ; elles ne constituent plus l'IR canonique de la plateforme.

Le futur core doit respecter les invariants suivants :

- zéro chemin ou suffixe de fichier ;
- zéro import ou nom de framework ;
- zéro branche conditionnelle sur une source ou cible nommée ;
- identifiants stables et version de schéma ;
- provenance par fait, pas seulement par document ;
- inconnues et contradictions représentées explicitement.

Une extension hors modèle n'est pas comptée comme couverture native. Elle doit
être namespacée, versionnée, posséder un schéma, un owner, une justification et
un critère de promotion ou de suppression.

## Justification

La plateforme ne peut éviter `sources × cibles` que si les adaptateurs source et
les renderers cible se rencontrent sur un contrat qui ne connaît aucun des deux
côtés. Les structures Nx sont utiles, mais appartiennent au plan de rendu.

Un modèle multi-axes évite de rechercher une taxonomie universelle de noms. Il
permet aussi de fusionner Figma, OpenAPI, legacy, tests et spécification humaine
sans prétendre que chaque source contient toute la sémantique.

## Conséquences

### Positives

- Les limites du core deviennent testables statiquement.
- Un renderer ne dépend plus de la nature de la source.
- Un adaptateur ne connaît plus les conventions de la cible.
- Les patterns SEOS existants sont conservés sans sur-vendre leur portée.
- La provenance et les ambiguïtés deviennent des données du système.

### Négatives / dette acceptée

- L'IR canonique n'est pas encore implémentée.
- Le schéma historique conserve temporairement son nom de fichier pour éviter de
  casser les outils existants.
- Les générateurs et adaptateurs actuels restent couplés à Angular/Nx jusqu'au
  premier vertical slice.

### Points à réévaluer

- Refuser le modèle si deux sources équivalentes ne peuvent produire une IR
  sémantiquement comparable sans fuite de cible.
- Refuser le core partagé si Angular et React exigent des concepts mutuellement
  exclusifs dans l'IR plutôt que dans leurs profils.
- Promouvoir une extension seulement après au moins deux cas réels distincts.

## Références

- [ADR-0027](./0027-noyau-verbes-structurels-catalogue-ouvert-patterns.md) —
  décision supersédée, dont le catalogue ouvert et les compositions sont
  conservés au niveau des profils cibles.
- [ADR-0029](./0029-perimetre-capacites-plateforme-generation.md) — périmètre et
  matrice de preuve.
- [ADR-0031](./0031-graphe-execution-et-manifests-composition.md) — modèle
  comportemental et manifests.

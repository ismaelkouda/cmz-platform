# ADR-0040 — Produire les rôles de code depuis `artifact-plan`

- **Statut :** Accepted
- **Date :** 2026-09-03

## Contexte

ADR-0039 introduit un registre rôle → archétype et livre une première tranche
réelle : un `page-realization-contract` produit le rôle `screen`, consommé par
le work order d'une page Angular.

Cette source convient aux responsabilités d'orchestration applicative : écran,
navigation, accès, état de page et catalogue de textes. Elle ne décrit pas les
responsabilités de code portées par les compositions générées : modèle domaine,
validation, mapping, client distant, binding runtime ou API publique.

Ces responsabilités existent déjà dans `artifact-plan`. Les recopier dans
`application-design` mélangerait intention produit et structure de code. Les
laisser définitivement hors du registre rendrait le modèle rôle/archétype
incapable de gouverner les renderers qui produisent l'essentiel des fichiers.

La décision doit précéder tout ajout d'un rôle de code. Déclarer d'abord
`mapping` ou `remote-query`, puis chercher après coup sa source, créerait une
abstraction sans preuve.

## Options envisagées

### Option A — Deux familles de producteurs, un registre commun

`application-design` reste la source des rôles d'orchestration et
`artifact-plan` devient la source des rôles de code. Chaque famille projette des
nœuds de rôle fermés vers le même protocole de sélection.

- Avantages : aucune duplication de faits ; séparation des IR conservée ; un
  même mécanisme gouverne LLM et renderers déterministes.
- Inconvénients : le registre connaît plusieurs familles de producteurs ; le
  schéma des nœuds doit être discriminé et versionné.

### Option B — Fusionner orchestration applicative et plan de code

Une IR jointe porterait pages, navigation, opérations, couches et fichiers.

- Avantages : une seule racine documentaire.
- Inconvénients : refonte d'ADR-0030 ; fuite de préoccupations cibles dans la
  conception produit ; changements de renderer susceptibles d'invalider une
  application pourtant inchangée.

### Option C — Limiter le registre aux rôles d'interface

`artifact-plan` resterait directement consommé par les renderers, sans passer
par le protocole rôle/archétype.

- Avantages : aucun travail supplémentaire.
- Inconvénients : deux mécanismes de choix de forme ; absence de gate uniforme ;
  impossible de prouver qu'un LLM et un renderer appliquent la même décision.

## Décision

**Option A.** Le registre accepte plusieurs familles de producteurs, mais chaque
rôle possède un producteur et un consommateur uniques, nommés et vérifiés contre
une implémentation réelle.

### 1. Les IR restent séparées

`application-design` demeure l'IR d'orchestration produit. `artifact-plan`
demeure l'IR structurelle des compositions de code. Aucun champ de l'une n'est
recopié dans l'autre pour satisfaire le registre.

Un nœud de rôle est une **projection déterministe** d'une de ces IR, jamais une
troisième source de vérité. Il porte l'identité et le hash exacts de sa source,
un discriminant de rôle et un payload fermé contenant seulement les faits
nécessaires au choix d'archétype.

### 2. Le producteur fait partie du contrat

Le registre conserve `producer` et `consumer`. La gate vérifie leurs valeurs
contre le code réellement branché ; une chaîne libre déclarative ne suffit pas.

La première famille reste :

```text
page-realization-contract → screen → page-realization-work-order
```

La seconde famille pourra ajouter, rôle par rôle :

```text
artifact-plan → <rôle-de-code> → <renderer-ou-work-order-réel>
```

Le mot « pourra » est normatif : cet ADR autorise la famille, il ne prouve aucun
rôle de code particulier.

### 3. Une livraison verticale reste atomique

Un rôle de code n'entre dans le registre que si la même modification livre :

1. le nœud canonique déjà présent dans `artifact-plan` ou son ajout typé ;
2. sa projection vers un `role-node` fermé et hashé ;
3. un consommateur réel dans un renderer ou un work order ;
4. les contrats d'archétype de chaque cible supportée ;
5. les tests adverses, la preuve de rendu et la couverture de gate.

Une entrée sans consommateur, une projection qui réinterprète du texte libre ou
un archétype choisi par le LLM échoue fermée.

### 4. Le protocole évolue par compatibilité explicite

L'ajout du premier rôle issu d'`artifact-plan` sera un changement mineur du
protocole si les lecteurs `1.0.0` continuent de traiter `screen` sans
modification. Le schéma devra discriminer chaque payload par `role` et `source`,
et les producteurs/consommateurs devront accepter explicitement la nouvelle
version.

Renommer un rôle, changer la signification d'un payload ou fusionner les deux IR
est incompatible : version majeure, migrateur et nouvel ADR selon ADR-0039.

## Conséquences

### Positives

- Les rôles de code pourront être gouvernés sans polluer la conception produit.
- La sélection de forme reste déterministe et indépendante du fournisseur LLM.
- Les renderers Angular, ReactJS et futurs renderers natifs peuvent partager le
  rôle tout en gardant des archétypes propres à leur stack.
- La gate dispose d'une origine et d'une destination vérifiables pour chaque
  rôle.

### Négatives / dette acceptée

- `ROLE_PIPELINES` devra évoluer avec chaque tranche verticale ; ce doublage est
  volontaire car il empêche le registre de s'auto-déclarer valide.
- Aucun rôle de code n'est livré par cette décision seule.
- La deuxième cible applicative reste nécessaire pour confirmer que les rôles
  d'orchestration choisis ne sont pas spécifiques à Angular.

## Références

- [ADR-0029](./0029-perimetre-capacites-plateforme-generation.md) — promotion
  des capacités par preuve.
- [ADR-0030](./0030-ir-canonique-et-profils-cibles.md) — séparation des IR et
  profils cibles.
- [ADR-0031](./0031-graphe-execution-et-manifests-composition.md) — plan
  d'artefacts et reproductibilité.
- [ADR-0039](./0039-frontiere-contractuelle-conception-realisation-llm.md) —
  frontière contractuelle de conception et de réalisation.
- [`archetype-role-model.md`](../architecture/archetype-role-model.md) —
  protocole et ordre d'extension.

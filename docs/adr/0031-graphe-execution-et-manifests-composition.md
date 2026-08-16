# ADR-0031 — Graphe d'exécution typé et manifests de composition persistés

- **Statut :** Accepted
- **Date :** 2026-08-14
- **Supersède :**
  [ADR-0028](./0028-execution-topology-compositions-memorisees.md)

## Contexte

ADR-0028 a correctement séparé la nature d'une opération de sa topologie
d'exécution et requalifié les patterns nommés comme compositions mémorisées.

Son implémentation réduit cependant `execution_topology` à une chaîne ouverte
comme `atomic`, `sequential`, `async_callback` ou `streaming`. Une telle valeur
ne décrit ni l'ordre réel, ni les branches, préconditions, retries, timeouts,
annulations, compensations ou garanties de livraison.

L'ADR permet également qu'une future composition inline soit temporairement
vérifiée manuellement. Cette exception affaiblirait précisément la traçabilité
et la reproductibilité recherchées par la boucle Generate–Verify–Repair.

## Options envisagées

### Option A — Conserver une topologie sous forme de chaîne ouverte

- Avantages : format minimal ; ajout d'une valeur sans migration de schéma.
- Inconvénients : sémantique non vérifiable ; variantes synonymes ; incapacité à
  reconstruire ou tester un workflow réel.

### Option B — Graphe typé + manifest obligatoire pour chaque génération

- Avantages : ordre et politiques exécutables ; validation machine ;
  reproductibilité ; provenance et hashes ; compositions ad hoc autorisées sans
  perdre la gouvernance.
- Inconvénients : modèle plus riche ; migration des topologies existantes ; coût
  initial supérieur à une étiquette.

### Option C — Laisser chaque renderer modéliser seul l'exécution

- Avantages : aucune abstraction comportementale partagée.
- Inconvénients : divergence sémantique entre cibles ; impossible de vérifier
  qu'Angular et React implémentent le même workflow.

## Décision

**Option B.** Le comportement exécutable est représenté dans l'IR par un graphe
typé et versionné.

Le minimum du graphe comprend :

- **nodes** : opérations référencées par identifiant stable ;
- **edges** : `next`, `success`, `failure`, `condition`, `compensate` ;
- **delivery** : request/response, async job, callback, subscription ou stream ;
- **policies** : timeout, retry, backoff, concurrence, idempotence et annulation
  ;
- **state constraints** : préconditions, postconditions et transitions ;
- **error semantics** : erreurs attendues, terminales et réparables.

Les types natifs restent bornés et validés. Une extension est possible via un
identifiant namespacé et versionné accompagné de son schéma ; « ouvert » ne
signifie pas « chaîne arbitraire ».

Les patterns mémorisés restent des templates réutilisables. Toute génération, y
compris depuis une composition écrite inline, produit avant rendu un **manifest
de composition** persistant contenant :

- versions de l'IR, du planner et du renderer ;
- références et hashes des sources ;
- décisions humaines et inconnues résolues ;
- graphe d'exécution normalisé ;
- plan d'artefacts cible ;
- hashes des sorties et résultats des oracles.

Une composition peut être créée ad hoc sans devenir un pattern nommé. Elle ne
peut jamais contourner la validation ou rester anonyme après génération.

Les chaînes `execution_topology` existantes restent un format de compatibilité
du profil Angular/Nx jusqu'à leur migration ; elles ne sont plus le contrat
canonique de la plateforme.

## Justification

L'équivalence multi-stack porte d'abord sur le comportement. Un label
`sequential` est insuffisant pour démontrer que deux cibles exécutent les mêmes
étapes et les mêmes chemins d'erreur.

Le manifest sépare la liberté de composer de l'obligation de prouver. Il permet
les cas ponctuels sans forcer la création d'un pattern réutilisable, tout en
conservant auditabilité et déterminisme.

## Conséquences

### Positives

- Les workflows deviennent comparables entre cibles.
- Les politiques d'exécution sont validables et testables.
- Les compositions ad hoc ne créent plus de trou dans l'Oracle.
- Chaque artefact peut être relié à une source, une décision et une version de
  renderer.

### Négatives / dette acceptée

- Aucun schéma de graphe ni manifest exécutable n'existe encore.
- `workflow-action.pattern.json` devra être migré sans perdre ses sous-graphes
  et chaînes historiques.
- Le stockage et la politique de rétention des manifests restent à définir lors
  du premier vertical slice.

### Points à réévaluer

- Simplifier le modèle si le vertical slice `action-request` puis
  `workflow-action` montre que certains champs ne sont jamais consommés par un
  renderer ou un oracle.
- Étendre les types natifs seulement après un cas réel non représentable.
- Interdire la promotion d'un renderer si ses décisions comportementales ne
  peuvent pas être reliées au graphe canonique.

## Références

- [ADR-0028](./0028-execution-topology-compositions-memorisees.md) — décision
  supersédée ; séparation des axes et compositions mémorisées conservées.
- [ADR-0029](./0029-perimetre-capacites-plateforme-generation.md) — périmètre de
  preuve.
- [ADR-0030](./0030-ir-canonique-et-profils-cibles.md) — place du behavior model
  dans l'IR.

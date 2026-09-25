# ADR-0067 — Lier le plan d’exécution à la réalisation de page

- **Statut :** Accepted
- **Date :** 2026-09-25
- **Décideurs :** équipe plateforme CMZ

## Contexte

Le work order de réalisation sait déjà borner les fichiers inscriptibles, le
contrat de page, l’archétype et une éventuelle preuve de présentation. C5f a en
parallèle produit un `page-execution-plan` exécutable pour deux queries et une
commande.

Ces deux chaînes restaient toutefois séparées. Un LLM pouvait recevoir le
contrat de page sans recevoir les états runtime, les mappings d’entrée et de
sortie, les invalidations et les capacités exactes compilées depuis
`list-query` et `action-request`. Une page pouvait donc compiler tout en
inventant un raccord incompatible avec la composition prouvée.

Copier seulement le JSON du plan dans le work order ne suffit pas : un plan
modifié manuellement ou une primitive ayant dérivé conserverait une apparence
valide. La réalisation doit pouvoir établir que le plan est la sortie
déterministe des contrats exacts encore présents dans le workspace.

## Options envisagées

### Option A — Laisser le LLM rapprocher contrat et primitives

- Avantages : aucun mécanisme supplémentaire.
- Inconvénients : résolution heuristique, erreurs tardives, preuve de
  composition non transmise à la page visible.

### Option B — Joindre le plan sans le rejouer

- Avantages : contexte runtime disponible immédiatement.
- Inconvénients : un JSON cohérent avec son schéma peut néanmoins contredire le
  contrat ou les primitives qui prétendent l’avoir produit.

### Option C — Recompiler puis lier le plan adressé par contenu

- Avantages : autorité unique, détection des dérives de bytes et de sémantique,
  reproduction exacte lors de la vérification.
- Inconvénients : la préparation relit les primitives et augmente la taille du
  work order ; les anciens work orders doivent être régénérés.

## Décision

L’option C est retenue.

`prepare:page-realization --execution-plan <path>` accepte un plan optionnel.
Avant de le lier, la plateforme :

1. valide son schéma fermé et ses chemins relatifs normalisés ;
2. exige le chemin, le SHA-256, la page, le design et la version exacts du
   contrat publié dans l’app ;
3. relit chaque primitive référencée sans suivre de lien symbolique ;
4. vérifie son SHA-256, son type, sa version, son identité et ses opérations ;
5. recompile le plan depuis le contrat et ces primitives ;
6. exige une égalité structurelle exacte entre le plan fourni et le plan
   recompilé.

Le work order passe en version `3.0.0`. Son identité couvre le chemin, le hash
et le contenu complet du plan validé. `verify:page-realization` rejoue la même
résolution avant les oracles ; une dérive du plan, du contrat ou d’une
primitive échoue fermée.

L’absence de plan reste permise pour les pages non composées et apparaît par
`page_execution: null`. Dans ce cas, le work order interdit de revendiquer une
intégration aux primitives runtime générées.

## Ordre d’autorité

```text
contrats backend et sécurité
  > plan d’exécution recompilé
    > contrat de page et archétype
      > preuve de présentation
        > suggestion du LLM
```

La preuve de présentation ne peut pas modifier les états, entrées, sorties,
invalidations ou capacités du plan d’exécution.

## Conséquences

### Positives

- La future page C5 recevra les deux queries, la commande, leurs états
  indépendants et l’invalidation ciblée sans résolution heuristique.
- Une modification de whitespace d’une primitive est détectée : l’identité
  porte bien sur l’artefact revu, pas seulement sur un JSON équivalent.
- Le mécanisme reste target-neutral et n’ajoute ni runtime ni dépendance.
- La vérification d’un résultat Angular ne peut pas utiliser un plan devenu
  obsolète depuis sa préparation.

### Négatives / dette acceptée

- Le plan complet est dupliqué dans un état de travail éphémère pour rendre le
  contexte du réalisateur autonome et vérifiable.
- La v1 exige au moins une query et une commande, conformément au profil de
  composition déjà accepté ; les pages mono-primitives restent sans liaison ou
  utilisent leur propre parcours existant.
- Ce lot ne produit pas encore le composant Angular visible et ne choisit aucun
  design à la place de l’utilisateur.

### Points à réévaluer

- Externaliser un bundle de contexte si la taille des plans devient
  significative, sans perdre l’adressage par contenu.
- Étendre le profil aux pages mono-primitives seulement à partir d’un cas réel,
  sans affaiblir les invariants actuels.
- Ajouter un schéma public du work order si celui-ci devient un artefact
  durable échangé entre services plutôt qu’un état local éphémère.

## Références

- [ADR-0039 — Frontière contractuelle entre conception et réalisation par LLM](./0039-frontiere-contractuelle-conception-realisation-llm.md)
- [ADR-0058 — Le plan de page référence les primitives v2 sans les recopier](./0058-page-execution-plan-reference-les-primitives-v2.md)
- [ADR-0065 — Composer C5 sur les trois contrats utilisateurs observés](./0065-composition-c5-utilisateurs-sur-contrats-observes.md)
- [ADR-0066 — Lier une preuve de présentation bornée à la réalisation LLM](./0066-preuve-presentation-bornee-pour-realisation-llm.md)

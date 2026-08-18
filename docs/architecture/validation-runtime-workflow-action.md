# Validation runtime de la tranche `workflow-action`

## Verdict

PLAT-4 est satisfait localement sur un cas réel borné : le même Behavior Model
génère un exécuteur Angular et un exécuteur ReactJS qui préservent les états,
permissions, branches de qualification et l'ordre causal de l'export asynchrone.
Les sorties TypeScript compilent en mode strict, leurs manifests sont persistés
et les mutations ciblées sont rejetées sur les deux runtimes.

La promotion formelle reste conditionnée à une CI verte. Cette preuve n'est pas
un générateur public de tout workflow : la commande auteur accepte uniquement la
composition `take` + qualification approve/reject + export. Elle ne valide pas
une intégration avec le backend ou Excel réels.

## Cas métier sélectionné

La preuve compose deux sous-graphes existants du module `requests` :

- `requests-details` : prise en charge d'une demande puis qualification par
  approbation ou rejet ;
- `requests-list-export` : récupération différée des lignes filtrées puis
  écriture du fichier.

Le terme `callback asynchrone` désigne ici le port applicatif `fetchRows`, une
fonction retournant une promesse et fournie à l'orchestrateur d'export. Il ne
désigne pas un webhook ni un retour différé du serveur. `callbackType`, utilisé
dans le formulaire d'approbation, reste un choix métier distinct.

## Frontière Evidence / Behavior

```text
code réel requests + workflow-details     définition JSON indépendante
                  \                         /
                   -> Evidence Models séparés
                   -> même Behavior Model canonique
    -> renderer Angular / renderer ReactJS
    -> compilation stricte + manifests
    -> Oracle commun + mutations
```

Le Behavior Model ne contient ni chemin de dépôt, ni extension `.ts`, ni nom de
framework. Les renderers ne chargent jamais l'adaptateur source. Les hashes de
provenance restent dans l'Evidence Model, afin qu'un changement documentaire de
la source n'altère pas artificiellement le hash de génération si le sens
canonique ne change pas.

La définition versionnée
[`requests-workflow.definition.json`](../../tools/generator-platform/sources/requests-workflow.definition.json)
et l'adaptateur du code réel produisent une égalité profonde du Behavior Model.
Leurs Evidence Models restent différents, ce qui préserve une provenance
honnête. Une définition renommée `case-review` est aussi générée dans les tests
sans nom `requests` ni champ `uniqId` dans les sorties.

Ici, « indépendante » signifie **chemin d'ingestion, format et provenance
indépendants**. La définition JSON a été rédigée à partir du comportement déjà
connu de `requests` ; elle n'est pas une confirmation métier obtenue auprès
d'une seconde autorité. Elle prouve la convergence technique multi-source, pas
une hausse de confiance épistémique sur les règles.

## Invariants exécutés

### Prise en charge

- permission `take` obligatoire ;
- état initial `pending` obligatoire ;
- appel externe terminé avant notification et rafraîchissements ;
- ordre de rafraîchissement `queues`, puis `tasks` ;
- état résultant `in-progress` ;
- fin de l'indicateur d'activité même en cas d'échec.

### Qualification

- approbation autorisée uniquement en `in-progress`, avec permission `qualify`
  et qualification encore `pending` ;
- rejet autorisé en `in-progress` avec permission `reject`, même si la
  qualification est déjà `completed` — asymétrie volontaire prouvée par les
  tests du domaine source ;
- `callbackType` obligatoire pour une approbation de type `callback` ;
- commentaire et champs d'édition obligatoires pour `edit` ou `callback` ;
- motif et commentaire obligatoires pour un rejet ;
- branche acceptée vers `approved`, branche rejetée vers `rejected` ;
- rafraîchissement `tasks`, puis `all` après succès.

### Export asynchrone

- permission, présence de données et absence d'opération concurrente requises ;
- attente du callback de récupération avant la branche lignes vides/non vides ;
- aucune écriture si le backend renvoie une liste vide ;
- attente effective de l'écriture de fichier avant le succès ;
- notification d'erreur et libération de l'état occupé en cas d'échec.

## Falsification

La suite de mutations altère volontairement :

- la permission de prise en charge ;
- la garde d'état de prise en charge ;
- la permission propre au rejet ;
- l'obligation de `callbackType` ;
- l'attente de l'écriture du fichier.

Chaque mutation est appliquée séparément au code généré Angular puis ReactJS et
doit faire échouer l'Oracle. La commande exécutable fait foi pour le décompte et
le résultat :

```bash
bun run check:generator-platform
```

Le même gate comporte deux preuves natives séparées : Angular reconstruit le
service avec `TestBed` et rejoue l'Oracle complet ; ReactJS monte le hook généré
avec React Testing Library, vérifie les mises à jour d'état sous `act`, le refus
d'une permission et l'attente effective de l'écriture d'export. Les fichiers
sont respectivement sous `stack-tests/angular` et `stack-tests/reactjs`.

## Limites

Cette tranche ne couvre pas :

- un serveur, un téléchargement Excel ou une authentification réels ;
- les composants visuels, l'accessibilité et la navigation ;
- annulation, timeout, retry, concurrence multi-utilisateur ou idempotence ;
- tous les états du domaine `workflow-details` ;
- les listes paginées complètes et le CRUD des sous-actions ;
- les compositions autres que `take`, qualification approve/reject et export ;
- la preuve sur un second domaine réel présentant des règles différentes.

## Avis Principal Engineer

Le résultat falsifie utilement l'hypothèse selon laquelle l'IR `action-request`
suffirait : un workflow exige bien un graphe distinct avec états, gardes,
branches et causalité asynchrone. Il faut garder cette séparation et refuser de
fusionner le Behavior Model dans le Semantic Model des commandes one-shot.

Le contrat auteur borné et la convergence d'une seconde source sont maintenant
acquis. La prochaine décision ne doit toujours pas être l'ajout d'une troisième
stack. Il faut obtenir une première CI verte, puis éprouver ce contrat sur un
second domaine réel. Si ce domaine exige de nouveaux verbes ou une nouvelle
topologie, l'extension doit être explicite et accompagnée de mutants ; elle ne
doit pas passer par un échappatoire `Custom`.

**Suite (2026-08-18, PLAT-4bis)** : cette recommandation est exécutée. Le
moteur a été généralisé (compilateur, IR, codegen, Oracle) pour dériver son
vocabulaire de la définition elle-même par forme structurelle
(`entry`/`decision`/`export`), pas par comparaison à des ids littéraux. La
preuve retenue est `content-moderation-workflow`
(`claim`/`moderate`/`remove`/`export`, vocabulaire disjoint de
`requests-workflow`), sans échappatoire `Custom` — voir
`generation-platform-capability-matrix.md` §4 et `taches-restantes.md`, entrée
PLAT-4bis, pour le détail complet et la référence CI.

# Modèle opératoire des agents

**Statut :** Normatif

**Audience :** agents, reviewers et propriétaire du produit

**Autorité supérieure :** `AGENTS.md` et `PROJECT_AUTHORITY.md`

## 1. Objectif

Ce modèle permet à un agent qui ne connaît rien au workspace de contribuer sans
réinterpréter le produit, endommager un travail existant ou déclarer une preuve
qu'il n'a pas produite. Il reste applicable à un agent compétent, faible,
inattentif ou trop confiant.

Il ne cherche pas à rendre un agent autonome sur tout. Il réduit son autorité,
rend ses décisions visibles et place des gates indépendantes autour de ses
actions.

## 2. Sources et ordre de lecture

Tout agent lit d'abord, intégralement :

1. `AGENTS.md` ;
2. `PROJECT_AUTHORITY.md` ;
3. ce document ;
4. `conventions/agents/operating-model.json` ;
5. le `SKILL.md` du rôle actif ;
6. les sources particulières indiquées par la tâche.

Ensuite seulement, il lit les ADR, contrats, guides de stack et tests
pertinents. Il ne charge pas tous les audits historiques « au cas où » : ce
volume dilue l'autorité actuelle et augmente le risque de réintroduire une
décision supersédée.

## 3. Un rôle actif, une autorité bornée

Un agent a exactement un rôle actif. Une skill technique ne constitue pas un
rôle. Un changement de rôle nécessite une demande explicite du propriétaire ou
du steward ; l'agent ne s'auto-promeut pas.

| Rôle              | Mission principale                              | Écriture par défaut | Peut changer le cap ? |
| ----------------- | ----------------------------------------------- | ------------------- | --------------------- |
| `steward`         | continuité, priorisation, gouvernance et preuve | oui, bornée         | proposition seulement |
| `step-executor`   | étape validée et mesurable                      | oui, allowlist      | non                   |
| `task-specialist` | diagnostic, revue, recherche ou petit correctif | non                 | non                   |
| `orchestrator`    | aider le propriétaire à piloter les rôles       | non                 | non                   |

### 3.1 Steward

Le steward maintient la compréhension globale du dépôt et travaille avec le
propriétaire. Il vérifie l'état vivant de GitHub, confronte les propositions à
la vision, choisit un prochain jalon et contrôle les handoffs.

Il peut modifier les documents d'autorité uniquement pour encoder une décision
explicitement validée ou corriger un écart factuel démontré. Il ne transforme
pas son avis en décision produit. Il ne conserve pas indéfiniment un `/goal` «
améliorer le projet » : chaque objectif porte sur un jalon fini et vérifiable.

### 3.2 Step executor

Le step executor réalise un work order accepté. Son contrat contient au minimum
: identifiant, résultat, source, base Git, périmètre, invariants, preuves et
condition de fin.

Il ne modifie pas la roadmap, l'autorité produit ou l'architecture transverse
pour faciliter sa réalisation. Si le work order est contradictoire ou
insuffisant, il revient au steward ou au propriétaire avec les faits manquants.

### 3.3 Task specialist

Le spécialiste choisit un mode explicite :

- `diagnose` : trouver et expliquer, sans corriger ;
- `review` : examiner un diff ou une PR, sans écrire ;
- `research` : produire une recommandation sourcée, sans implémenter ;
- `fix` : corriger un problème précis après autorisation de mutation.

Le mode par défaut est en lecture seule. Une demande « vérifie » n'autorise pas
un correctif. Une demande « corrige » autorise seulement le correctif borné et
sa preuve de non-régression.

### 3.4 Orchestrator

L'orchestrator parle au propriétaire en français simple. Il transforme une
intention en fiche de contrôle : rôle, commande, prompt, permissions, preuve et
condition d'arrêt. Il peut inspecter l'état en lecture seule pour recommander le
bon routage.

Il ne code pas, ne pousse pas et ne fusionne pas par défaut. Il ne lance pas
plusieurs agents sur les mêmes fichiers. Si le propriétaire décide de réaliser
le travail dans le même chat, un changement explicite vers le rôle adapté est
nécessaire.

## 4. Cycle obligatoire

```text
intention
→ qualification du rôle
→ contexte et état vivant
→ contrat de tâche
→ plan si nécessaire
→ exécution autorisée
→ preuves
→ revue
→ handoff
→ clôture vérifiée
```

### Gate A — contexte

Avant toute écriture, vérifier :

- branche et SHA de base ;
- état du worktree et changements appartenant à l'utilisateur ;
- PR, issue et CI lorsqu'elles sont dans le périmètre ;
- versions réellement installées ;
- autorité actuelle et précédents applicables.

Un statut distant est vérifié au moment de l'affirmation. Une note historique ne
remplace jamais `gh`, Git ou le fournisseur CI.

### Gate B — contrat

Le contrat de tâche contient :

| Champ      | Question                                                    |
| ---------- | ----------------------------------------------------------- |
| résultat   | qu'est-ce qui sera vrai à la fin ?                          |
| autorité   | qui ou quel artefact demande ce résultat ?                  |
| périmètre  | quels fichiers, systèmes et données peuvent changer ?       |
| invariants | qu'est-ce qui ne doit pas régresser ?                       |
| inconnues  | quelles informations manquent ou restent supposées ?        |
| preuves    | quels tests ou observations peuvent réfuter le changement ? |
| arrêt      | quand faut-il arrêter et demander une décision ?            |

Une tâche triviale peut exprimer ce contrat en quelques lignes. Une tâche
transverse, risquée, destructive ou ambiguë passe par `/plan` et attend la
validation avant mutation.

### Gate C — exécution

- utiliser la plus petite surface cohérente ;
- appliquer une solution officielle compatible avec les versions présentes ;
- ne pas installer de dépendance sans qualification ;
- ne pas réécrire un test pour adopter le comportement accidentel du code ;
- ne pas ouvrir le périmètre pour contourner une erreur ;
- ne pas toucher aux fichiers non attribués ;
- conserver un rollback réaliste pour une mutation importante.

Après deux occurrences identiques d'un échec sans nouvelle information, une
troisième tentative exige une nouvelle hypothèse vérifiable. Changer seulement
le timeout, relancer la CI ou forcer une commande n'est pas une hypothèse.

### Gate D — preuve

Les preuves dépendent du claim, pas du nombre de commandes exécutées. Suivre la
matrice de `PROJECT_AUTHORITY.md`, puis ajouter les contrôles spécifiques à la
tâche.

Une preuve recevable indique : commande ou protocole, environnement, résultat,
claim couvert et limite. Un contrôle non lancé est déclaré avec sa raison.

### Gate E — revue et GitHub

Avant push, examiner le diff complet contre la base. Après push, vérifier
séparément :

1. commit attendu présent ;
2. branche distante à jour ;
3. PR ciblée et fusionnable ;
4. reviewer avec droit d'écriture demandé ;
5. approbation encore valide après le dernier push ;
6. toutes les gates terminées et vertes ;
7. fusion effectuée ;
8. CI de `main` terminée et verte.

Le dernier pousseur n'approuve pas. Un agent ne contourne pas cette séparation
en changeant artificiellement d'identité ou de branche.

## 5. Protection contre les agents peu fiables

Les signaux suivants invalident un handoff tant qu'ils ne sont pas corrigés :

- « tout est bon » sans SHA, diff ni résultats de tests ;
- modification commencée avant identification du rôle et du périmètre ;
- utilisation d'une ancienne conversation comme seule source ;
- ajout d'une dépendance ou d'une abstraction sans alternative native étudiée ;
- suppression d'un test, d'une image validée ou d'un document pour obtenir du
  vert sans décision explicite ;
- relance d'une CI rouge sans diagnostic du job exact ;
- confusion entre mock et backend, capture et comportement, compilation et
  fonctionnalité ;
- extension opportuniste à des fichiers ou domaines non demandés ;
- absence de limites, risques ou contrôles non exécutés dans le rapport ;
- tentative de fusion avant revue indépendante et gates complètes.

Face à l'un de ces signaux, l'orchestrator ou le steward ramène le travail à la
dernière gate prouvée. Il ne demande pas simplement à l'agent d'« être plus
rigoureux » ; il exige l'artefact manquant.

## 6. Slash commands et skills

Les commandes slash gèrent la session ; les skills définissent une méthode.

| Commande           | Usage dans ce dépôt                                     |
| ------------------ | ------------------------------------------------------- |
| `/status`          | confirmer workspace, session et contexte                |
| `/plan`            | analyser avant une tâche risquée ou transverse          |
| `/goal <objectif>` | poursuivre un jalon mesurable sur plusieurs itérations  |
| `/review`          | relire les changements locaux ou comparer une branche   |
| `/side <question>` | question parallèle sans détourner le travail principal  |
| `/compact`         | même objectif, conversation trop longue                 |
| `/fork`            | nouvelle direction qui doit réellement hériter du passé |

Ne pas utiliser `/goal` pour une question, une revue courte ou une édition
triviale. Ne pas utiliser `/fork` pour onboarder un steward : un chat propre et
les autorités versionnées évitent d'hériter des erreurs historiques.

Une invocation combine au plus une skill de rôle et les skills techniques
nécessaires, par exemple :

```text
$cmz-step-executor $angular-developer
```

La skill technique n'autorise aucune action externe et ne remplace pas les
contrats du dépôt.

Le contrat JSON est la surface machine des permissions. La prose explique
comment l'appliquer. Le garde CI vérifie la forme, les invariants critiques et
le câblage documentaire ; conformément à ADR-0043 et ADR-0095, il ne prétend pas
prouver le comportement réel d'un modèle.

## 7. Handoff standard

Tout travail mutateur se termine avec cette fiche :

```text
Rôle :
Objectif et source :
Branche / base SHA / head SHA :
Périmètre autorisé :
Changements réalisés :
Éléments volontairement inchangés :
Décisions et hypothèses :
Preuves exécutées :
Preuves non exécutées :
Risques et limites :
État commit / push / review / fusion / CI main :
Prochaine action et responsable :
```

Pour un diagnostic ou une revue, remplacer les changements par : constats,
preuves, sévérité, confiance et recommandation. Un constat de review cite un
fichier et une ligne ou une observation reproductible.

## 8. Concurrence et ownership

- un fichier n'a qu'un agent écrivain à la fois ;
- chaque agent utilise une branche ou un worktree identifiable ;
- le steward tient la carte des branches actives avant de lancer un autre
  executor ;
- deux recherches en lecture seule peuvent être parallèles ;
- deux implémentations concurrentes de la même solution nécessitent une demande
  explicite de comparaison ;
- une dépendance entre tâches est résolue avant de démarrer la tâche aval ;
- le propriétaire décide entre deux recommandations incompatibles.

## 9. Clôture

Une tâche est terminée seulement lorsque le résultat est comparé au contrat et à
ses preuves. La limite de contexte, la fin d'un quota, un commit ou une PR
ouverte ne sont pas des critères de terminaison.

Si le résultat reste partiel, le handoff nomme exactement le dernier état
prouvé, le blocage et l'entrée nécessaire. Le prochain agent reprend depuis cet
état, pas depuis une affirmation générale de réussite.

# Créer une fonctionnalité `workflow-action`

Ce guide s'adresse à une personne qui connaît son objectif métier, mais pas
l'architecture du générateur.

## 1. Vérifier que le besoin correspond

Une `action-request` décrit une action ponctuelle : envoyer une demande et
recevoir un résultat. Un `workflow-action` convient lorsque l'objet traverse
plusieurs états et que les actions possibles dépendent de son état et des droits
de la personne.

Le contrat actuellement supporté est volontairement borné :

```text
élément en attente
    -> un agent autorisé le prend
    -> il passe en cours de traitement
    -> l'agent l'approuve ou le rejette
    -> les listes concernées sont rafraîchies
    -> un export filtré peut récupérer puis écrire les lignes
```

Il ne faut pas utiliser cette commande pour un workflow arbitraire comportant
d'autres opérations, une parallélisation, une compensation ou une machine à
états différente. La commande doit alors refuser la définition.

## 2. Répondre aux questions métier

| Question                                             | Exemple                                                        |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| Quel objet évolue ?                                  | une demande                                                    |
| Quels sont ses états utiles ?                        | en attente, en cours, approuvée, rejetée                       |
| Qui peut effectuer chaque action ?                   | agent ayant le droit correspondant                             |
| Depuis quel état l'action est-elle possible ?        | prendre seulement depuis « en attente »                        |
| Quelles décisions créent des branches ?              | approuver ou rejeter                                           |
| Quelles informations sont obligatoires par branche ? | motif du rejet, type de callback pour une approbation callback |
| Que doit-il se passer après le succès ?              | notifier et rafraîchir les bonnes listes                       |
| Quelle opération doit réellement être attendue ?     | récupération puis écriture de l'export                         |

Une règle inconnue doit rester inconnue. On ne choisit pas un comportement parce
qu'il est plus facile à générer.

## 3. Remplir la définition

Copier
[`requests-workflow.definition.json`](../../tools/generator-platform/sources/requests-workflow.definition.json),
puis modifier l'identité de la fonctionnalité et uniquement les états, droits et
transitions réellement confirmés.

Les blocs principaux sont :

- `feature` : nom et objectif métier ;
- `state` : états de l'objet et de sa qualification ;
- `permissions` : droits requis ;
- `operations` : transitions, branches, règles et ordre causal des étapes.

La version actuelle accepte exactement la composition `take`, `qualify` et
`export`. Ce choix évite un champ `Custom` qui masquerait les comportements non
modélisés. Toute nouvelle composition nécessite d'abord une extension du schéma,
du renderer et de l'Oracle.

Le Behavior Model produit utilise `itemId`, un identifiant canonique neutre. Le
raccord produit peut le traduire vers un nom wire existant comme `uniq_id`.

## 4. Lancer la génération

Depuis la racine du dépôt :

```bash
bun run generate:workflow-action \
  --definition tools/generator-platform/sources/requests-workflow.definition.json \
  --out /tmp/generated-requests-workflow \
  --target all
```

Valeurs possibles de `--target` :

- `angular` pour Angular ;
- `reactjs` pour ReactJS ;
- `all` pour les deux.

Sans option de régénération, le dossier `--out` doit être nouveau. Une sortie
existante exige d'abord `--dry-run`, puis `--apply <change_set_id>` après revue
du Change Set.

## 5. Comprendre le résultat

```text
evidence-model.json                  provenance de la définition
behavior-model.json                  graphe métier canonique
artifact-plan.json                   responsabilités logiques communes
generation-control-manifest.json     ownership des modèles et du plan racine
angular/                             package Angular généré
  generation-manifest.json          hashes, ownership et politiques Angular
  src/after-success.extension.ts     code humain appelé après une exécution réussie
reactjs/                             package ReactJS généré
  generation-manifest.json          hashes, ownership et politiques ReactJS
  src/after-success.extension.ts     code humain appelé après une exécution réussie
```

Avant d'écrire le résultat, la commande :

1. valide le schéma de la définition ;
2. refuse les opérations, règles ou ordres d'étapes non supportés ;
3. sépare la provenance du Behavior Model ;
4. produit l'Artifact Plan commun ;
5. génère les cibles depuis le même graphe et ce même plan ;
6. compile les deux arbres TypeScript en mode strict ;
7. calcule les manifests reproductibles et leur ownership.

Ajouter `--dry-run` produit le même Change Set read-only que pour
`action-request`. Une sortie existante est vérifiée contre ses hashes avant de
proposer `replace` ou `delete`; le fichier humain `after-success.extension.ts`
est marqué `preserve` avec le même hash avant/après. Aucune proposition n'est
appliquée.

Après revue, `--apply <change_set_id>` applique exactement ce Change Set sur la
sortie existante ; un identifiant périmé est refusé. Comme pour
`action-request`, la commande refuse le drift et les fichiers sans owner,
valide une arborescence candidate, conserve les extensions Angular et ReactJS,
puis publie sous verrou avec rollback et journal de reprise synchronisé. La vue
continue atomique pour des lecteurs externes et la qualification par coupure
réelle sur chaque système de fichiers ne sont pas encore revendiquées.

Chaque cible possède son implémentation du slot. Elle reçoit l'opération `take`,
`qualify` ou `export` et le résultat final du moteur. Elle s'exécute après les
permissions, règles, appels et transitions canoniques, mais avant l'annonce du
succès par le service Angular ou le hook ReactJS. Son erreur est propagée. Pour
l'export, les issues `no-data` et `failed` ne déclenchent pas ce slot ; seule
l'issue `exported` est un succès. Aucun timeout spécifique n'est encore fourni.
Le contrat typé voisin reste généré, tandis que l'implémentation du slot
appartient à l'équipe.

## 6. Ce qu'il reste à intégrer

Le code généré fournit le moteur de décision et le raccord cible. L'équipe doit
encore fournir :

- les véritables appels backend et la traduction `itemId` vers le contrat wire ;
- l'identité de l'utilisateur et les permissions réelles ;
- l'interface, les messages et la navigation ;
- le port d'écriture Excel ;
- les tests navigateur, la sécurité, l'accessibilité et l'observabilité.

Angular et ReactJS sont les noms des cibles. Les deux sorties sont écrites en
TypeScript ; `angular-nx` et `react-typescript` ne sont que des identifiants de
profils techniques internes.

## Processus résumé pour un non-initié

```text
Je décris l'objectif et les états de l'objet
    -> je précise qui peut faire quoi et dans quel état
    -> je décris les deux décisions et leurs informations obligatoires
    -> je précise ce qui doit être attendu avant d'annoncer le succès
    -> la commande vérifie que ce parcours appartient au contrat supporté
    -> elle produit le même graphe pour Angular et ReactJS
    -> elle compile les deux sorties et calcule leurs manifests
    -> l'équipe raccorde les systèmes réels
    -> les tests produit valident le résultat de bout en bout
```

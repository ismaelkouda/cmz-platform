# Créer une fonctionnalité `action-request`

Ce guide s'adresse à une personne qui connaît son besoin métier mais pas
l'architecture interne du générateur.

## 1. Vérifier que le besoin correspond

Une `action-request` convient quand la fonctionnalité suit ce parcours :

```text
remplir quelques informations
    -> envoyer une demande
    -> recevoir un succès ou une erreur
```

Exemples : connexion, demande de support, mot de passe oublié, confirmation
d'une invitation ou déclenchement d'un export.

Cette composition de référence ne couvre pas une liste modifiable, plusieurs
écrans enchaînés, une file de traitement ou un workflow avec plusieurs états. Ce
ne sont pas des « familles finales » du noyau : un autre besoin peut être décrit
par une autre composition typée.

## 2. Répondre aux questions métier

Avant de générer, écrire les réponses suivantes :

| Question                           | Exemple demande de support          |
| ---------------------------------- | ----------------------------------- |
| Quel est le résultat recherché ?   | transmettre une demande au support  |
| Que saisit la personne ?           | email, sujet et message             |
| Quelles règles sont obligatoires ? | champs requis et email bien formé   |
| Qui peut lancer l'action ?         | une personne connectée              |
| Quel appel backend existe ?        | `POST support/requests` avec Bearer |
| Que renvoie-t-il ?                 | identifiant de demande et message   |
| Quel effet local suit le succès ?  | aucun changement de session         |

Une information inconnue doit rester inconnue. Ne pas inventer une URL, un champ
ou une règle pour faire fonctionner la génération.

## 3. Remplir le fichier de définition

Copier l'exemple
[`support-request.definition.json`](../../tools/generator-platform/sources/support-request.definition.json),
puis adapter uniquement les informations métier confirmées.

Le fichier contient cinq blocs utiles :

- `feature` : nom et objectif de la fonctionnalité ;
- `input` : informations envoyées ;
- `output` : informations reçues ;
- `access` et `http` : accès public, connecté ou autorisé par permissions,
  méthode et chemin backend ;
- `effects` : conséquence observable de l'action.

Les noms `Angular` et `ReactJS` n'apparaissent pas dans ce fichier. La même
définition sert aux deux cibles. Le code ReactJS produit est écrit en
TypeScript, comme le code Angular ; TypeScript est ici le langage, pas le nom de
la cible.

### À quoi sert `opaque_types` ?

Chaque champ d'`input` ou d'`output` a un `type`. La plupart du temps, ce type
est une primitive simple : `{ "kind": "primitive", "name": "string" }` pour du
texte, `"number"` pour un nombre, etc. Une primitive ne peut décrire qu'**une
seule valeur simple**, pas un objet avec plusieurs informations à l'intérieur.

`opaque_types` sert quand un champ doit contenir un **objet composé**, dont on
ne détaille pas le contenu interne dans cette fiche (le générateur le traite
comme une « boîte noire » nommée, à raccorder plus tard côté produit). On lui
donne un nom en tête de fichier, puis on le réutilise dans `input`/`output` avec
`"kind": "model"` au lieu de `"kind": "primitive"`.

**Exemple concret** — une connexion qui renvoie un utilisateur et un jeton,
plutôt qu'un simple texte :

```json
"opaque_types": [
  { "id": "current-user", "description": "Profil renvoyé après connexion." },
  { "id": "authentication-token", "description": "Jeton d'autorisation." }
],
"operations": [
  {
    "output": {
      "fields": [
        {
          "name": "user",
          "type": { "kind": "model", "name": "current-user", "nullable": false },
          "required": true
        },
        {
          "name": "token",
          "type": { "kind": "model", "name": "authentication-token", "nullable": false },
          "required": true
        }
      ]
    }
  }
]
```

**Dans la plupart des formulaires simples (contact, demande de démo,
newsletter), aucun `opaque_type` n'est nécessaire** : si chaque champ envoyé ou
reçu est un texte, un nombre, un email ou une date, `opaque_types` reste un
tableau vide `[]`. Voir
[`sign-in.definition.json`](../../tools/generator-platform/sources/sign-in.definition.json)
pour l'exemple complet, et son
[`.annotated.md`](../../tools/generator-platform/sources/sign-in.definition.annotated.md)
pour le détail ligne par ligne.

Le vocabulaire d'effets accepté reste volontairement borné. Si la fonctionnalité
nécessite un nouvel effet local que le schéma ne connaît pas, la commande doit
échouer : il faut étendre explicitement le modèle et son Oracle, pas contourner
le contrat avec un champ libre.

## 4. Lancer la génération

Depuis la racine du dépôt :

```bash
bun run generate:action-request \
  --definition tools/generator-platform/sources/support-request.definition.json \
  --out /tmp/generated-support \
  --target all
```

Valeurs possibles de `--target` :

- `angular` pour Angular ;
- `reactjs` pour ReactJS ;
- `all` pour les deux.

Sans option de régénération, le dossier indiqué par `--out` doit être nouveau.
Une sortie existante exige d'abord `--dry-run`, puis l'option explicite
`--apply <change_set_id>` après revue du Change Set.

## 5. Comprendre le résultat

Le dossier produit contient :

```text
evidence-model.json                  faits déclarés et inconnues conservées
semantic-model.json                  sens canonique de la fonctionnalité
artifact-plan.json                   responsabilités logiques communes
generation-control-manifest.json     ownership des modèles et du plan racine
angular/                             package Angular généré
  generation-manifest.json          hashes, ownership et politiques Angular
  src/after-success.extension.ts     code humain appelé après un succès
reactjs/                             package ReactJS généré
  generation-manifest.json          hashes, ownership et politiques ReactJS
  src/after-success.extension.ts     code humain appelé après un succès
```

Avant toute écriture, la commande :

1. valide le fichier de définition ;
2. construit les preuves et le modèle canonique ;
3. refuse les contradictions évidentes ;
4. produit l'Artifact Plan commun ;
5. génère les cibles demandées depuis ce plan ;
6. compile chaque arbre TypeScript en mode strict ;
7. calcule les manifests reproductibles et leur ownership.

Si une étape échoue, aucun dossier de sortie existant n'est remplacé.

### Prévisualiser sans écrire

```bash
bun run generate:action-request -- \
  --definition tools/generator-platform/sources/support-request.definition.json \
  --out /tmp/generated-support \
  --target all \
  --dry-run
```

La commande retourne un Change Set JSON contenant `create`, `replace`,
`preserve`, `delete` et `unchanged`. Si un fichier `generator-owned` ne
correspond plus au hash de son manifest, elle refuse le plan. Pour
`after-success.extension.ts`, elle lit au contraire le contenu humain courant et
exige le même hash avant et après. Le dry-run ne répare, ne crée et ne supprime
rien.

### Appliquer une évolution validée

Après revue du Change Set, relever sa propriété `change_set_id`, puis remplacer
`--dry-run` par `--apply <change_set_id>` :

```bash
bun run generate:action-request -- \
  --definition tools/generator-platform/sources/support-request.definition.json \
  --out /tmp/generated-support \
  --target all \
  --apply changes:<sha256-retourne-par-le-dry-run>
```

L'identifiant lie l'application au plan effectivement revu : toute évolution de
la définition ou de la sortie le rend périmé et l'écriture est refusée. La
commande refuse aussi toute dérive ou fichier sans propriétaire, prépare une
copie candidate, conserve les deux extensions humaines, compile Angular et
ReactJS, puis publie sous verrou exclusif. Un journal synchronisé permet de
restaurer l'ancienne sortie ou de vérifier la nouvelle à la prochaine tentative
de publication après une interruption. La sortie doit rester inactive pendant la
commande et ne peut être remise aux consommateurs qu'après son succès. La v1
accepte uniquement APFS/macOS et ext4/Linux locaux ; tout autre stockage est
refusé avant écriture.

### Ajouter un traitement après succès

Chaque cible contient son propre `src/after-success.extension.ts`. L'équipe peut
modifier ce fichier pour une navigation, une mesure d'audience ou une
intégration propre au produit. Le fichier voisin `extension-contract.ts` décrit
les opérations et résultats autorisés ; il reste contrôlé par le générateur.

Le slot s'exécute après l'appel backend et, lorsqu'elle existe, après la
persistance de session, mais avant que la commande annonce son succès. Une
erreur de l'extension est propagée comme une erreur de commande. Aucun timeout
spécifique au slot n'est encore fourni.

Ne pas déplacer ce code dans `action-request-commands.ts` ou un autre fichier
`generator-owned` : le dry-run le considérerait comme une dérive.

### Raccorder une opération autorisée

Pour une opération `authorized`, `access.permissions` doit contenir une liste
non vide et sans doublon. Toutes les permissions déclarées sont requises. Le
package Angular expose `PERMISSION_PORT` à fournir par l'application hôte ; la
factory ReactJS `createActionRequestHooks` exige un objet `PermissionPort`.
L'implémentation du port doit consulter l'utilisateur courant au moment de
l'exécution.

Si une permission manque, le code généré renvoie `PermissionDeniedError` avec le
code stable `permission_denied` avant tout appel HTTP/fetch. L'absence de
fournisseur Angular fait échouer l'injection au lieu d'autoriser implicitement.
Ce raccordement améliore le comportement de l'interface, mais le backend doit
toujours refaire l'autorisation : une garde frontend peut être contournée par un
client externe.

## 6. Ce qu'il reste à faire dans le produit

La génération fournit le contrat, les modèles, les validations, le client HTTP
et la commande ou le hook. Une équipe doit encore raccorder :

- le véritable serveur et son contrat d'erreurs ;
- le formulaire et les messages visibles ;
- l'adaptateur qui ajoute réellement le jeton d'authentification Bearer ;
- la source réelle des permissions de l'utilisateur courant lorsque l'accès est
  `authorized` ;
- l'implémentation produit du slot après succès, par exemple la navigation ;
- les tests dans le navigateur ;
- la sécurité, l'accessibilité et l'observabilité.

Une fonctionnalité n'est donc pas livrée parce que le dossier a été généré. Elle
est livrée lorsque le code généré est intégré et que le comportement réel avec
le backend est vérifié.

## Processus résumé pour un non-initié

```text
Je décris ce que la personne veut obtenir
    -> je fournis les entrées, règles, accès, appel et résultat connus
    -> la commande vérifie que ma description est cohérente
    -> elle produit le même sens métier pour Angular et ReactJS
    -> elle génère et compile le code de chaque cible
    -> l'équipe raccorde l'écran, le backend et la sécurité réels
    -> les tests produit confirment que la fonctionnalité atteint l'objectif
```

Le point essentiel est simple : **on décrit d'abord le résultat métier, puis on
choisit Angular ou ReactJS**. On ne réécrit pas le besoin pour chaque
technologie.

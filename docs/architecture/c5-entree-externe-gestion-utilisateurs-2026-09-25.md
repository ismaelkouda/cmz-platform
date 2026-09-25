# C5 — Entrée externe « Gestion des utilisateurs »

- **Date de réception :** 2026-09-25
- **Origine :** description libre fournie par un utilisateur ne manipulant ni
  schéma ni code du générateur
- **Statut :** entrée figée, baseline SEOS verte et parité runtime C5d livrée
- **But :** éprouver le parcours `list-query` + `action-request` + composition
  de page sur un cas produit réel
- **Décision utilisateur du 2026-09-25 :** option A, reproduction du contrat
  SEOS réellement observé plutôt que maintien de la variante simplifiée

## Entrée reçue

### Intention

- Nom : `Gestion des utilisateurs`.
- Objectif : afficher la liste des utilisateurs et créer un utilisateur.
- Route souhaitée : `/users`.
- Population autorisée : non renseignée.

### Liste

- Résultat attendu : liste des utilisateurs.
- Appel déclaré : `GET users/all`.
- Paramètres déclarés : `lastName`, `firstName`, `email`, `isActive`.
- Réponse de succès déclarée :

```json
{
    "error": false,
    "message": "SUCCES",
    "data": {
        "count": "number",
        "current_page": "number",
        "last_page": "number",
        "per_page": "number",
        "total": "number",
        "data": {
            "id": "string",
            "last_name": "string",
            "first_name": "string",
            "email": "string",
            "is_active": "boolean",
            "updated_at": "string"
        }
    }
}
```

### Création

- Appel déclaré : `POST users/store`.
- Corps déclaré :

```json
{
    "last_name": "string",
    "first_name": "string",
    "email": "string"
}
```

- Réponse de succès déclarée :

```json
{
    "error": false,
    "message": "SUCCES",
    "data": "string"
}
```

- Erreur métier connue : l'adresse email existe déjà.

### Présentation et comportements

- Champs visibles : nom, prénom, email.
- Validation : les trois champs sont requis.
- Après succès : quitter le formulaire, rafraîchir la liste des utilisateurs et
  afficher un toast de succès.
- Après erreur : rester sur le formulaire et afficher un toast d'erreur.

## Faits utilisables sans interprétation

1. La page compose une query et une commande indépendantes.
2. La commande réussie doit invalider exactement la query de liste.
3. La fermeture du formulaire dépend d'un succès distant, pas du clic sur le
   bouton.
4. Une erreur de création conserve le formulaire utilisable.
5. Les noms wire connus sont distincts des libellés visibles français.

## Inconnues conservées

Ces points ne seront pas inventés par l'implémentation :

1. niveau d'accès et permissions nécessaires aux deux opérations ;
2. forme exacte de collection sous `data.data` : objet unique ou tableau ;
3. transport exact des filtres et pagination (`query`, noms wire, valeurs par
   défaut, tri) ;
4. sens de `count` par rapport à `total` ;
5. format et nullabilité de `updated_at` ;
6. sens de la chaîne renvoyée par `POST users/store` ;
7. statut HTTP, code stable et enveloppe de l'erreur « email existe déjà » ;
8. forme de présentation du formulaire (page, dialogue, panneau ou inline) ;
9. destination exacte de « quitter le formulaire » ;
10. politique du toast (contenu, durée, déduplication et accessibilité) ;
11. comportement lorsque le rafraîchissement de liste échoue après un POST
    pourtant validé par le serveur.

## Première conséquence de capacité

Le cas exige une invalidation positive `create-user -> users-list`. Le plan C4
utilisé jusqu'ici déclare `action.invalidation.none@1` et ne prouve que
l'absence d'invalidation cachée. C5 ne pourra donc pas prétendre reproduire ce
besoin tant qu'un contrat d'invalidation ciblée, fail-closed et couvert par un
oracle externe n'aura pas été introduit ou qu'une décision produit explicite
n'aura pas réduit le périmètre.

## Comparaison postérieure avec le corpus

Cette comparaison a été effectuée seulement après avoir figé l'entrée ci-dessus.
Elle ne complète pas automatiquement le besoin : les divergences restent des
questions produit ou de contrat.

| Sujet        | Entrée externe                               | Corpus observé                                                                      | Conclusion                                                     |
| ------------ | -------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Route        | `/users`                                     | `/settings-security/users`, puis enfants `list` et `form`                           | divergence de navigation                                       |
| Liste        | `GET users/all`                              | `GET settings-and-security/users?page=…`                                            | divergence d'endpoint                                          |
| Filtres      | `lastName`, `firstName`, `email`, `isActive` | `search`, `profile`, `role`, `is_active`                                            | divergence fonctionnelle et wire                               |
| Collection   | `data.data` décrit comme objet               | `data.data` typé tableau paginé                                                     | ambiguïté externe confirmée                                    |
| Item         | six champs déclarés                          | dix champs, dont téléphone, profil, rôle, statut et dates                           | projection externe plus petite, possible mais à décider        |
| Création     | nom, prénom, email                           | nom, prénom, email, téléphone et `profile_id`, tous requis                          | contradiction bloquante                                        |
| Réponse POST | enveloppe avec `data: string`                | `MessageResponseDto` sans propriété `data`                                          | divergence de contrat                                          |
| Accès        | non renseigné                                | garde de route et permission `create`                                               | autorisation à expliciter                                      |
| Succès       | fermer, recharger, toast                     | comportement historique équivalent via succès distant, notification puis `reload()` | intention confirmée                                            |
| Erreur       | rester, toast                                | le formulaire ne navigue qu'après succès ; erreur routée vers le registre central   | intention globalement confirmée, erreur email non caractérisée |

### Faits historiques utiles mais non adoptés implicitement

- Le backend historique utilise une URL de base `SETTINGS_API_URL` et le chemin
  `settings-and-security/users`.
- La pagination transporte `page` séparément et renvoie une collection Laravel
  complète (`current_page`, `data[]`, liens, bornes et total).
- Le filtre historique fusionne nom, prénom et email dans un champ `search` au
  lieu de trois paramètres distincts.
- La création historique exige aussi `phone` et `profile_id`.
- La notification de succès et le rechargement sont déclenchés uniquement après
  une réponse distante réussie.

Ces observations servent à poser les bonnes questions. Elles ne donnent pas au
générateur le droit de remplacer l'intention externe sans validation.

## Périmètre retenu après clarification

La preuve C5 doit donc conserver les faits SEOS suivants :

- route protégée de gestion des utilisateurs ;
- liste paginée avec ses filtres réels ;
- permission distincte pour créer ;
- formulaire de création avec prénom, nom, email, téléphone et profil ;
- query supplémentaire fournissant les profils sélectionnables ;
- création distante, notification de succès et invalidation ciblée de la liste
  uniquement après succès ;
- conservation du formulaire et notification après erreur.

Cette décision transforme la tranche minimale en une composition de deux queries
(`users-list`, `profiles-select`) et une commande (`create-user`).

## Baseline exécutable avant génération

Le spec
[`users-management-c5-baseline.spec.ts`](../../apps/backoffice-angular/src/app/regressions/users-management-c5-baseline.spec.ts)
traverse les vraies couches domain, data et application de SEOS. Seul le réseau
est remplacé par `HttpTestingController`. Il verrouille trois observations :

1. la liste appelle le GET paginé avec les quatre filtres wire réels, active le
   bypass du cache demandé et restitue les données ainsi que les métadonnées de
   page mappées ;
2. une création réussie envoie exactement le payload snake_case, notifie le
   succès puis relance la liste avec ses paramètres courants ;
3. une création en échec ne produit ni succès ni nouveau GET et conserve la
   liste déjà chargée.

Commande de preuve ciblée :

```bash
NX_DAEMON=false bunx nx test backoffice-angular \
  --include=apps/backoffice-angular/src/app/regressions/users-management-c5-baseline.spec.ts
```

Résultat local du 2026-09-25 : **3 tests sur 3 verts**.

Cette baseline est un oracle du comportement historique utile, pas la future
implémentation et pas une autorisation à importer ses classes dans le code
généré.

## Limites observées et non masquées

- L'erreur « email déjà existant » n'a toujours ni code stable ni enveloppe
  backend observée. La baseline prouve seulement le chemin d'échec générique ;
  elle n'invente pas un mapping métier.
- Le maintien visuel du formulaire et sa fermeture après succès relèvent encore
  d'un oracle de composant/page. La baseline de façade ne prétend pas les
  couvrir.
- Le `profiles-select` requis par le formulaire n'est pas encore dans cette
  première baseline. Il doit rejoindre l'oracle de composition complet.
- `list-query` v2 compile et exécute désormais cette page et ses query
  parameters sur Angular et React. C5e ajoute l'invalidation locale nommée au
  contrat et au runtime Angular ; la composition des trois primitives métier
  réelles reste à faire.
- La façade historique accepte techniquement deux créations déclenchées presque
  simultanément ; le bouton UI réduit ce risque sans constituer une garantie de
  couche application. La sortie générique conservera sa garde stricte de double
  soumission au lieu de reproduire ce défaut.

## Incréments C5

Étendre les contrats existants, sans nouveau générateur ni runtime, dans cet
ordre :

1. rendre et exécuter la pagination et les query parameters sur Angular puis
   React, avec un oracle indépendant pour chaque cible ;
2. invalidation positive nommée `create-user -> users-list`, uniquement après
   succès distant ;
3. composition réelle `users-list + profiles-select + create-user` ;
4. composant/page Angular ordinaire couvrant permission, formulaire, fermeture,
   conservation après erreur et accessibilité ;
5. oracle externe comparant le résultat générique à la baseline ci-dessus.

Chaque extension reste fail-closed et doit être justifiée par ce cas exact. Les
paramètres, formes ou politiques voisines ne sont pas ouverts par anticipation.

## C5b — contrat et compilation backend-neutres

Le contrat versionné `users-list` représente maintenant les cinq paramètres
query réels (`page`, `search`, `profile`, `role`, `is_active`) et la page reçue.
Le modèle d'exécution `1.2.0` conserve les noms wire mais expose quatre rôles
canoniques : `currentPage`, `lastPage`, `pageSize` et `totalItems`.

Cette page n'est pas érigée en forme universelle. Une `list-query` peut recevoir
un tableau direct, une page ou, dans un futur cas prouvé, un objet portant une
collection ou une autre projection. Le modèle d'exécution distingue aujourd'hui
explicitement `list` et `page`; il refuse les autres objets plutôt que de les
interpréter arbitrairement.

Cette séparation est volontairement indépendante de Laravel. Un test remplace
la forme SEOS par des noms de type Spring Data (`content`, `number`,
`totalPages`, `size`, `totalElements`) et obtient le même résultat canonique.
Une API .NET, Django ou propriétaire peut donc choisir ses propres noms sans
branche spécifique dans le compilateur.

Ce lot reste contractuel : Angular et React rejettent explicitement la page tant
que leurs oracles runtime respectifs ne prouvent pas la sérialisation des query
parameters, le décodage des métadonnées et le cycle de chargement. Voir
[ADR-0061](../adr/0061-list-query-page-et-parametres-restent-backend-neutres.md).

## C5c — runtime Angular de page

La sortie Angular exécute maintenant `users-list` depuis le même modèle C5b.
Elle génère une interface `ListUsersPage`, une source `HttpClient` et une façade
`ResourceFacade`; aucun runtime paginé parallèle n'a été ajouté.

Les cinq paramètres sont validés avant le réseau puis sérialisés avec
`HttpParams`. `page` est obligatoire et entier ; les quatre filtres facultatifs
sont omis lorsqu'ils sont absents. Une chaîne vide sous contrainte, un rôle hors
pattern ou un faux booléen produit un `InvalidPayloadError` sans requête HTTP.

Le décodeur mappe les champs wire vers `items`, `currentPage`, `lastPage`,
`pageSize` et `totalItems`. Il accepte les métadonnées supplémentaires de la
page Laravel parce que le contrat déclare une projection, mais conserve le rejet
strict des champs inconnus sur chaque item utilisateur.

L'oracle Angular externe couvre 9 scénarios et traverse le vrai host de test :
intercepteurs d'authentification, d'erreur et de cache, encodage URL, page vide,
erreurs d'entrée et de payload, conservation au reload et annulation
`latest-wins`. La suite Angular contient 59 tests verts après ajout. À la fin de
C5c, React refusait encore explicitement la page ; C5d ci-dessous apporte son
oracle dédié et ouvre cette parité.

Voir
[ADR-0062](../adr/0062-list-query-page-angular-reutilise-resource-facade.md).

## C5d — runtime React de page

La sortie React exécute maintenant `users-list` depuis le même modèle C5b et le
même décodeur de page qu'Angular. Elle conserve le port hôte existant : le code
généré ne possède ni authentification, ni cache, ni client réseau parallèle.

Les paramètres obligatoires ou facultatifs sont validés avant le port, encodés
avec leurs noms wire et assemblés dans un ordre déterministe. Le hook expose la
page canonique et ses items, préserve la dernière page pendant reload ou erreur,
réutilise le dernier input et annule la requête supplantée.

L'oracle React Testing Library couvre 9 scénarios indépendants : URL/politique
host, mapping, vide, quatre entrées invalides, payload invalide, reload en échec
avec conservation et `latest-wins`. La suite React passe à 53 tests, tandis que
la suite Angular reste à 59 tests.

Voir
[ADR-0063](../adr/0063-list-query-page-react-reutilise-le-port-hote.md).

## C5e — invalidation locale nommée après succès

Le contrat de page accepte maintenant `invalidates_load_ids` sur une action
backend. La cible est un `load` exact de la page, pas un nom de façade ni un
endpoint deviné. Le planner refuse les trois incohérences dangereuses : une
politique `caller-declared` sans cible, une cible inconnue et des cibles sous
une politique `none`.

Le renderer Angular garde la coordination dans `PageComposition`. La façade de
commande n'est plus exposée directement : un wrapper conserve son API publique
et déclenche `reload()` sur la seule query déclarée après succès de l'Observable.
L'oracle externe observe un GET forcé après succès, aucun GET après erreur,
aucun reload d'une query voisine et aucune invalidation anticipée en cas de
double submit. La suite Angular passe à 61 tests.

La proposition d'invalider une query qui existe dans le projet mais pas dans la
page courante est conservée comme option non décidée. Elle ne peut pas être
assimilée à un simple `reload()` : il faut définir l'identité projet de la
query, la péremption du cache lorsqu'aucune instance n'est montée et le
comportement à la navigation. Aucun bus global n'est introduit dans C5e.

Voir
[ADR-0064](../adr/0064-invalidation-locale-nommee-apres-succes-distant.md).

### Suite de C5 après C5e

1. composer `users-list + profiles-select + create-user` ;
2. produire la page Angular ordinaire avec permission, formulaire, fermeture,
   conservation après erreur et accessibilité ;
3. comparer le résultat générique à la baseline SEOS.

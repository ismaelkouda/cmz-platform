# C5 — Entrée externe « Gestion des utilisateurs »

- **Date de réception :** 2026-09-25
- **Origine :** description libre fournie par un utilisateur ne manipulant ni
  schéma ni code du générateur
- **Statut :** page C5 réalisée et prouvée dans le vrai navigateur ; revue des
  rendus, corrections visuelles traçables et baseline pixel encore ouvertes
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

Cette séparation est volontairement indépendante de Laravel. Un test remplace la
forme SEOS par des noms de type Spring Data (`content`, `number`, `totalPages`,
`size`, `totalElements`) et obtient le même résultat canonique. Une API .NET,
Django ou propriétaire peut donc choisir ses propres noms sans branche
spécifique dans le compilateur.

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

Voir [ADR-0063](../adr/0063-list-query-page-react-reutilise-le-port-hote.md).

## C5e — invalidation locale nommée après succès

Le contrat de page accepte maintenant `invalidates_load_ids` sur une action
backend. La cible est un `load` exact de la page, pas un nom de façade ni un
endpoint deviné. Le planner refuse les trois incohérences dangereuses : une
politique `caller-declared` sans cible, une cible inconnue et des cibles sous
une politique `none`.

Le renderer Angular garde la coordination dans `PageComposition`. La façade de
commande n'est plus exposée directement : un wrapper conserve son API publique
et déclenche `reload()` sur la seule query déclarée après succès de
l'Observable. L'oracle externe observe un GET forcé après succès, aucun GET
après erreur, aucun reload d'une query voisine et aucune invalidation anticipée
en cas de double submit. La suite Angular passe à 61 tests.

La proposition d'invalider une query qui existe dans le projet mais pas dans la
page courante est conservée comme option non décidée. Elle ne peut pas être
assimilée à un simple `reload()` : il faut définir l'identité projet de la
query, la péremption du cache lorsqu'aucune instance n'est montée et le
comportement à la navigation. Aucun bus global n'est introduit dans C5e.

Voir [ADR-0064](../adr/0064-invalidation-locale-nommee-apres-succes-distant.md).

### Suite de C5 après C5e

1. ~~composer `users-list + profiles-select + create-user`~~ — livré par C5f ;
2. produire la page Angular ordinaire avec permission, formulaire, fermeture,
   conservation après erreur et accessibilité ;
3. comparer le résultat générique à la baseline SEOS.

## C5f — composition réelle des trois primitives utilisateurs

La composition Angular matérialise désormais les trois primitives exactes du cas
retenu : la page `users-list`, le tableau `profiles-select` et la commande
authentifiée `create-user`. Les contrats sont fondés sur les sources et DTO
historiques observés, mais la sortie générée n’importe aucune classe SEOS.

La réponse réelle de création `{ error, message }` est représentée par une forme
contractuelle `status-object`. Elle n’est pas maquillée en enveloppe `data` :
schéma, validateur et test négatif ferment cette distinction. Le renderer de
commande accepte dans la composition seulement le profil borné nécessaire ici :
Bearer du host, cinq strings requis, email validé, `status-object` et
invalidation caller-declared.

Un oracle Angular séparé conserve l’oracle générique précédent et ajoute six
scénarios C5 : chargement des deux queries, payload POST/auth exacts, succès
avec seul reload de `users-list`, erreur métier sans invalidation, validation
avant réseau, double submit et destruction du scope. La suite Angular contient
maintenant **67 tests verts**.

Ce lot ne revendique pas encore la page visible. Permission `create`,
ouverture/fermeture du formulaire, notifications et accessibilité restent le
prochain incrément. Voir
[ADR-0065](../adr/0065-composition-c5-utilisateurs-sur-contrats-observes.md).

## C5g-0/1 — frontière LLM et preuve de présentation

La réalisation visuelle reste confiée à un LLM, mais ni une conversation ni un
document Figma ne deviennent une source d'autorité métier. Le contrat backend,
les comportements, l'accès, la composition et l'archétype restent décidés en
amont. La source visuelle ne gouverne que la présentation.

Le schéma fermé `presentation-evidence` accepte une source générique et figée :
design structuré, capture, wireframe, interface rendue, design system, mapping
de composants, annotation ou brief. Le fournisseur n'est pas encodé dans le
contrat. Chaque ressource locale est bornée, typée, hashée et marquée comme
contenu non fiable.

`prepare:page-realization` peut maintenant attacher un manifeste approuvé au
work order `2.0.0`. L'identité du work order couvre le manifeste et ses sources.
`verify:page-realization` les relit et refuse page étrangère, état inconnu,
source non approuvée, chemin symbolique, type invalide ou dérive de taille/hash.
Sans preuve, le work order porte explicitement `presentation_evidence: null` et
interdit toute revendication de fidélité à une référence externe.

Ce lot ne fabrique aucune maquette C5 : aucun choix esthétique n'est inventé. La
prochaine preuve exige une vraie référence fournie ou approuvée, puis une
réalisation Angular bornée de `/settings-security/users`. Voir
[ADR-0066](../adr/0066-preuve-presentation-bornee-pour-realisation-llm.md).

### Suite de C5 après C5g-0/1

1. lier le `page-execution-plan` C5 recompilé au work order de réalisation ;
2. produire ou sélectionner une référence visuelle C5 réelle et ses états
   desktop/mobile ;
3. la figer dans un manifeste `presentation-evidence` approuvé ;
4. réaliser les cinq fichiers Angular autorisés avec le work order ;
5. prouver permission `create`, ouverture/fermeture, succès/erreur,
   notifications, clavier et lecteur d'écran ;
6. ajouter la comparaison visuelle déterministe, puis comparer le comportement
   générique à la baseline SEOS.

## C5g-2 — liaison déterministe du plan d’exécution

Un audit avant génération de l’UI a trouvé une rupture d’autorité : le work
order `2.0.0` transportait le contrat et le visuel, mais pas le
`page-execution-plan` déjà prouvé par C5f. Un réalisateur aurait donc pu
inventer les états runtime, mappings, outputs ou invalidations tout en livrant
un composant compilable.

Le work order `3.0.0` peut désormais recevoir `--execution-plan`. Le plan est
accepté seulement si le contrat publié et toutes les primitives référencées sont
des fichiers réels du workspace, correspondent à leurs SHA-256 et recompilent
exactement le même plan. La vérification répète ce replay avant les oracles.
Plan falsifié, primitive modifiée, opération absente, chemin étranger ou lien
symbolique échouent fermés.

Sans plan, `page_execution: null` reste compatible mais interdit de revendiquer
un raccord aux runtimes générés. Ce lot n’invente toujours aucune maquette et ne
crée pas encore le composant visible. La prochaine étape C5 est de publier les
artefacts C5 dans une app de preuve, attacher une référence visuelle approuvée,
puis seulement réaliser les cinq fichiers Angular. Voir
[ADR-0067](../adr/0067-lier-plan-execution-a-realisation-page.md).

## C5g-3 — publication dans une application de preuve réelle

La preuve C5 ne vit plus seulement dans `/tmp`. Une conception approuvée et
backend-neutre est publiée sous `designs/users-management-proof...`, puis le
shell standard `apps/users-management-proof` contient le vrai contrat de la page
`/settings-security/users`. Les trois modèles d'exécution, le
`page-execution-plan` et la composition Angular sont versionnés et recompilés
octet par octet par un test dédié.

Cette publication a détecté une contradiction auparavant invisible : le design
pointait l'enveloppe paginée alors que `list-query` consomme sa collection
d'items. `data_binding.source_path` rend maintenant la projection explicite
(`["data"]` ici). Le validateur suit uniquement des références de modèles
déclarées et le planner exige le même `items_field` que la primitive. Il
n'existe donc aucune heuristique Laravel, Spring, .NET ou Django.

Le shell, ses trois nœuds générés et leur composition passent compilation
Angular stricte, build production, lint et tests. Le composant de page reste le
placeholder standard : ce lot ne revendique encore ni présentation, ni
permission fine `create`, ni comportement de formulaire. Voir
[ADR-0068](../adr/0068-publier-c5-dans-une-application-de-preuve.md).

### Suite de C5 après C5g-3

1. produire ou sélectionner une vraie référence visuelle desktop/mobile et la
   faire approuver ;
2. publier son manifeste `presentation-evidence` ;
3. préparer le work order avec le plan et la preuve visuelle, puis réaliser
   uniquement les cinq fichiers autorisés ;
4. raccorder le port de permission hôte et prouver succès/erreur,
   fermeture/conservation, notifications, clavier et lecteur d'écran ;
5. ajouter l'oracle visuel déterministe et la comparaison finale à la baseline
   SEOS.

## C5g-4 — autorisation fine de l’action de création

La page reste accessible avec `access.mode: authenticated` : un opérateur sans
droit de création doit encore pouvoir consulter la liste. L’action `create-user`
porte séparément la permission approuvée `users.create` et le comportement
`disable`, tous deux traçables au brief C5.

Le planner compile cette décision dans chaque nœud de commande et exige la
capability `action.authorization.permissions-all@1`. La composition Angular
demande au host un signal par permission, expose `authorized` à la future UI et
revérifie les signaux lors de chaque souscription. En cas de refus, elle produit
une erreur `permission_denied` avant la façade : zéro POST, zéro invalidation et
état de commande inchangé. L’absence du provider ne devient jamais une
autorisation implicite.

La garde frontend ne remplace pas le backend, seule autorité de sécurité. Aucun
moteur RBAC, store, bus, transport ou dépendance n’est ajouté, et le contrat
Bearer observé n’est pas présenté comme une preuve d’autorisation. Voir
[ADR-0069](../adr/0069-autorisation-fine-action-dans-composition-page.md).

### Suite de C5 après C5g-4

1. obtenir une référence visuelle desktop/mobile approuvée ;
2. publier le manifeste `presentation-evidence` correspondant ;
3. préparer le work order lié au plan et à cette preuve ;
4. réaliser les cinq fichiers Angular autorisés et raccorder le vrai provider de
   permission du host ;
5. prouver formulaire, notifications, clavier, lecteur d’écran et visuel.

## C5g-5 — proposition de référence visuelle soumise à revue

Quatre captures figées proposent maintenant les états `ready` et `create-failed`
aux viewports desktop 1440 × 1024 et mobile 390 × 844. Elles emploient
uniquement des données synthétiques, suivent les tokens existants du host et
n'ajoutent ni bibliothèque UI ni design system parallèle.

Le choix proposé conserve la liste derrière un panneau de création desktop et
utilise une vue de création plein écran sur mobile. L'erreur garde le formulaire
ouvert, reste attachée au champ concerné et reçoit un feedback global. Ces
images expriment seulement la présentation ; permissions, payloads,
invalidations, fermeture et annonces accessibles restent gouvernés et prouvés
par les contrats et oracles.

La proposition est documentée dans
[`reference-proposal.md`](../../examples/users-management-proof/presentation/reference-proposal.md).
Elle n'est volontairement pas publiée comme `presentation-evidence` : seule une
revue humaine peut la faire passer de `proposed` à `approved`. Un brouillon
Figma mutable ayant servi à l'exploration est exclu de la preuve.

### Suite de C5 après C5g-5

1. faire approuver et fusionner ensemble le dossier et ses quatre images ;
2. relire leurs octets depuis Git et publier le manifeste
   `presentation-evidence` approuvé ;
3. préparer le work order lié au plan d'exécution et à cette preuve ;
4. réaliser les cinq fichiers Angular autorisés et raccorder le provider hôte ;
5. prouver formulaire, permission, notifications, clavier, lecteur d'écran et
   comparaison visuelle déterministe.

## C5g-6 — preuve approuvée et work order entièrement lié

La PR #114 a été approuvée par Soumaila sur son commit de tête exact, puis
fusionnée avec une CI post-fusion verte. Les tailles et SHA-256 des quatre PNG
ont été relus directement depuis le commit de fusion, pas depuis une copie de
travail. Le manifeste fermé
`designs/users-management-proof.presentation-evidence.json` les publie donc avec
l'autorité `presentation-only`, les états et viewports approuvés, et la marque
obligatoire `untrusted-content`.

La preuve de publication C5 prépare désormais le work order avec ses deux
entrées adressées par contenu : le `page-execution-plan` C5 et ce manifeste de
présentation. Elle vérifie aussi les quatre mappings état/viewport attendus.
Toute dérive d'octets, de page, d'état, de média ou de chemin échoue dans le
résolveur existant avant la réalisation.

Ce lot n'écrit aucun fichier de page Angular. Cette séparation empêche de noyer
la revue de la nouvelle autorité visuelle dans une implémentation UI et conserve
les cinq fichiers autorisés pour le prochain work order vérifié.

### Suite de C5 après C5g-6

1. faire approuver et fusionner le manifeste et sa preuve de liaison ;
2. régénérer le work order depuis les octets fusionnés ;
3. réaliser uniquement les cinq fichiers Angular autorisés et raccorder le
   provider hôte ;
4. prouver formulaire, permission, notifications, focus, clavier et lecteur
   d'écran ;
5. ajouter la comparaison visuelle déterministe et la comparaison finale à la
   baseline SEOS.

## C5g-7 — réalisation Angular approuvée et fusionnée

La PR #116 a été approuvée par Soumaila sur son commit de tête exact, fusionnée
dans `main`, puis validée par la CI post-fusion sur le commit de merge exact. Le
work order entièrement lié a produit les cinq fichiers Angular autorisés : page,
template, styles, tests et preuve de réalisation.

La page exécute les deux queries et la commande réelles. Elle couvre filtres,
pagination, états partiels, permission `users.create`, formulaire à cinq champs,
fermeture sur succès, conservation sur erreur, annonces accessibles, Échap,
piège de focus et retour du focus. Les tests de composant prouvent ces
comportements, mais ne constituaient pas encore une navigation de l'application
complète.

## C5g-8a — harnais navigateur déterministe avant baseline

L'audit post-réalisation a refusé une comparaison pixel immédiate : les quatre
références approuvées sont des `wireframe`, pas des captures issues d'un moteur
de navigateur. Les utiliser comme snapshots exacts aurait transformé une
intention visuelle en oracle technique artificiel.

Le lot introduit donc d'abord une preuve Playwright hermétique :

- le shell généré expose un point d'entrée hôte générique et fail-closed ; il
  lit un contexte d'accès fermé injecté avant le bootstrap et refuse toute forme
  absente ou mal formée ;
- le harnais injecte séparément la configuration runtime publique nécessaire,
  sans secret ni droit ;
- seuls les deux GET et le POST C5 sont servis avec des données synthétiques ;
  tout autre appel API est bloqué ;
- locale, fuseau, thème, densité, animations, service workers, navigateur et
  viewports sont fixés ;
- quatre scénarios exécutent le vrai build Angular et prouvent données,
  responsive, permission, formulaire et conservation après conflit email ;
- la CI réutilise le job E2E existant, s'active seulement lorsque sa fermeture
  de dépendances est affectée et publie les PNG comme artefacts temporaires.

Les quatre scénarios passent avec Chrome local et avec le Chromium Playwright
verrouillé utilisé en CI. Ces images restent des **candidats**, pas une baseline
auto-approuvée. Deux exécutions CI indépendantes donnent des mobiles identiques
octet par octet et seulement 6 puis 5 pixels desktop différents sur 1 474 560,
avec un delta maximal d'un niveau de couleur. C5g-8b devra donc calibrer un
budget absolu minimal sur plusieurs runs du même commit ; le hash du PNG et une
tolérance proportionnelle arbitraire ne sont pas des oracles acceptables.

La première inspection réelle a relevé des écarts à traiter séparément : rôles
backend non libellés, pagination desktop comprimée, toast superposé au panneau,
hiérarchie d'erreur différente, nouvelle soumission désactivée jusqu'à la
modification de l'email, titre mobile renvoyé sur deux lignes, actions mobiles
réordonnées et densité mobile différente. Aucun des cinq fichiers réalisés n'est
modifié hors de son work order dans C5g-8a. Voir
[ADR-0070](../adr/0070-harnais-navigateur-avant-baseline-visuelle.md).

### Suite de C5 après C5g-8a

1. faire produire les candidats par la CI de la PR et les relire humainement ;
2. décider écart par écart ce qui relève d'une correction ou d'une divergence
   acceptable du wireframe ;
3. préparer un nouveau work order pour les seules corrections de page retenues ;
4. figer ensuite les sorties Chromium approuvées comme snapshots bloquants ;
5. terminer par la comparaison comportementale avec la baseline SEOS, sans
   réintroduire le corpus dans le runtime produit.

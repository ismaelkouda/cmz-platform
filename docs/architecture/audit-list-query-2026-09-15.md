# Audit Staff de `list-query` — 2026-09-15

## Statut et décision

- **Référence auditée :** `origin/main` à
  `7331455bdd486bc01eb1d31e6ac5f5d256486b67`.
- **Périmètre :** définition auteur, compilation IR, renderers Angular/React,
  publication, intégration HTTP SEOS, preuves, sécurité, versionnement et
  responsabilités architecturales.
- **Décision :** `list-query` reste `experimental` et doit être considéré
  **interdit en production** tant que les critères de sortie de cet audit ne
  sont pas satisfaits.
- **Nature du composant actuel :** générateur de client GET sans paramètre pour
  une liste plate de primitives, et non abstraction générale de requête de
  liste.

Le socle de génération est robuste : validation fermée, IR canonique, plans
d'artefacts, sorties déterministes, type-check multi-cible et publication
transactionnelle. Le contrat fonctionnel et son raccordement runtime ne le sont
pas encore. La maturité du registre ne doit donc pas être confondue avec une
autorisation d'adoption.

## Méthode et niveaux de preuve

Les constats utilisent quatre niveaux distincts :

1. **observé** — lecture directe d'une source ou d'un contrat ;
2. **reproduit** — mutant ou exécution contrôlée ayant produit le défaut ;
3. **dérivé** — conséquence nécessaire de deux contrats lus, sans scénario
   bout-en-bout dédié ;
4. **conditionnel** — impact dépendant d'une configuration ou d'un futur usage.

Les probes runtime ont matérialisé les sorties générées dans un dossier
temporaire, sans écrire dans le dépôt. Le client Angular a été exécuté avec les
vrais `authInterceptor`, `errorInterceptor` et `cacheInterceptor` du
backoffice. Le client React a été transpilé et appelé derrière son vrai
`FetchPort`. Le workspace est resté propre après les vérifications.

## 1. Traçabilité définition → besoin

| Frontière | Preuve présente | Verdict |
| --- | --- | --- |
| Définition → JSON Schema | oui | structure fermée |
| Définition → evidence/semantic IR | oui | compilation déterministe |
| IR → artifact plan | oui | responsabilités bornées et hashées |
| Artifact plan → fichiers/manifests | oui | type-check et hashes |
| Fichiers → runtime `list-query` | non | aucun oracle propre |
| Runtime → backend faisant autorité | non | définition déclarative seulement |
| Runtime → besoin métier actif | non | unique POC retiré |
| Query → `application-design` → page | non | aucune liaison exécutable |

Les dry-runs Angular et `angular-layered` produisent des change sets
déterministes et content-addressed. Cette propriété prouve que les fichiers
proviennent exactement de l'IR et du profil observés. Elle ne prouve pas que
l'IR représente le backend ni que le résultat satisfait une page.

`compileListQueryDefinition` inscrit explicitement
`unknown.backend-contract-authority`. C'est honnête mais non bloquant. La
fixture dite « payload réel » est copiée dans le test : elle ne peut détecter
une dérive du backend que si un humain la met d'abord à jour.

Il n'existe par ailleurs aucune référence de la définition témoin conservée
pour `list-query` dans les contrats persistés `backend-contract`, les
`application-designs` ou `page-realization`. La chaîne de preuve s'arrête donc
au client généré.

## 2. Couverture quantitative du corpus GET SEOS

Un inventaire AST des appels `HttpClient.get` actifs sous
`libs/*/data/src/lib/sources` donne :

| Mesure | Nombre |
| --- | ---: |
| appels GET | 111 |
| fichiers sources concernés | 97 |
| `SETTINGS_API_URL` | 60 |
| `REPORT_API_URL` | 36 |
| `AUTH_API_URL` | 15 |
| appels avec paramètres HTTP | 57 |
| appels avec chemin dynamique | 53 |
| appels manipulant une page | 43 |
| enveloppes paginées | 56 |
| enveloppes simples | 54 |
| autre forme | 1 |
| listes simples identifiées | 26 |
| cas dans le périmètre structurel actuel | 20 |

Le périmètre actuel couvre donc au maximum 20/111 GET, soit 18 %, ou environ
20/82 des lectures clairement listées/paginées, soit 24 %. Ces vingt cas sont
principalement des listes de sélection sans input. Toutes les 111 opérations
actives posent cependant `BYPASS_CACHE`, capacité absente du générateur.

La couverture structurelle ne signifie pas fidélité architecturale. Par
exemple `site-group-select` transforme le DTO wire
`{ id, name, description }` vers le read model partagé
`{ label, value }`. `list-query` publierait le DTO directement comme
`domain-model`, sans mapper ni validation.

## 3. Exécution Angular avec le host réel

Une définition publique a été générée, puis son client exécuté avec une session
active et les trois interceptors du backoffice. Résultat observé :

```json
{
  "generatedPublicFlag": true,
  "hostSkipAuthFlag": false,
  "hostBypassCacheFlag": false,
  "authorization": "Bearer <session-token>",
  "backendCallsForTwoIdenticalQueries": 1
}
```

### Auth publique — release blocker confirmé

Le renderer crée un nouveau `HttpContextToken` nommé `PUBLIC_REQUEST`. Le host
ne lit que l'instance `SKIP_AUTH` exportée par `@cmz/core`. Deux tokens Angular
portant une description proche ne sont pas interchangeables. La requête
publique a donc reçu le Bearer de session.

L'impact confidentialité devient effectif si la base URL cible une origine
externe et que la requête est autorisée par le navigateur/serveur. Même sur une
origine interne, le comportement viole la minimisation des credentials et le
contrat déclaré.

### Cache — release blocker fonctionnel confirmé

Le premier appel a rempli `HttpCacheStore`; le second a été servi sans accès au
backend. Le client ne sait exprimer ni `forceRefresh`, ni `BYPASS_CACHE`, ni
invalidation, TTL ou stratégie. Une lecture après mutation peut donc rester
obsolète.

### Types et erreurs

Un payload contenant `id: "WRONG_RUNTIME_TYPE"` et `title: null` a été retourné
sans erreur malgré les types générés `number` et `string`.

Une erreur HTTP 500 a correctement traversé `errorInterceptor` et produit un
`ServerResponseError`. Cette partie du host est réutilisable.

Une erreur applicative d'enveloppe est différente : les classes générées
`ResponseEnvelopeError` et `ResponseEnvelopeIntegrityError` étendent `Error`,
pas le `DomainError` du host. `ResourceFacade` convertit nécessairement ces
erreurs en `UnknownError`; le message applicatif est perdu. Ce constat est
dérivé des deux contrats et doit devenir un test d'intégration explicite.

### Câblage

Aucun `provideListQuery(...)`, provider de base URL ou raccordement automatique
au composition root n'existe. `create-module` produit les libs `domain` et
`data`, mais pas une capacité directement consommable par une application.

## 4. Exécution React

Le client React réel a été transpilé et exécuté.

Points conformes :

- méthode et URL nominales correctes ;
- mode d'authentification transmis au `FetchPort` ;
- erreurs `error: true` et enveloppe sans `data` détectées.

Défauts reproduits :

- payload de types faux accepté ;
- erreur HTTP 503 réduite à `Error("HTTP 503")`, corps serveur perdu ;
- panne réseau propagée comme `TypeError` brute ;
- absence d'`AbortSignal`, de cache, retry et état de query ;
- `Content-Type: application/json` ajouté à un GET sans body, susceptible de
  déclencher un preflight CORS inutile.

La parité inter-cibles est rompue : React conserve `api_key`, `session` ou
`other` comme métadonnées de transport, tandis qu'Angular les réduit tous à
`PUBLIC_REQUEST=false` et laisse le host appliquer son Bearer.

## 5. Mutants négatifs

| Mutant | Schéma | Compilation/rendu | Type-check | Mode d'échec |
| --- | --- | --- | --- | --- |
| `nullable: true` rendu en non-nullable | accepte | passe | passe | silencieux |
| path `{id` non fermé | accepte | passe | passe | silencieux |
| double slash dans le path | accepte | passe | passe | silencieux |
| même `item.id`, formes différentes | accepte | passe | passe | silencieux |
| `home-block-info` + `home_block_info` | accepte | passe | passe | fusion d'interfaces silencieuse |
| `authentication: api_key` Angular | accepte | passe | passe | sémantique perdue |
| payload runtime invalide | sans objet | sans objet | sans objet | accepté |
| champ contenant `-` | accepte | passe | échoue | refus tardif |
| opération contenant `.` | accepte | passe | échoue | refus tardif |
| opération `constructor` | accepte | passe | échoue | refus tardif |
| IDs d'opérations normalisés identiques | accepte | passe | échoue | refus tardif |

La fusion d'interfaces est plus grave qu'un simple échec de compilation :
TypeScript fusionne légalement deux interfaces produites sous le même nom. Le
contrat final exige alors artificiellement les champs des deux types et reste
vert.

La suite dédiée contient cinq tests et ne tue aucun de ces mutants. La
couverture V8 mesurée affiche pourtant 100 % des lignes et 75 % des branches de
`list-query-authoring.mjs`. Ce résultat confirme que la couverture de lignes
n'est pas un oracle de correction.

## 6. Threat model

| Menace | Gravité | Preuve | Traitement exigé |
| --- | --- | --- | --- |
| Bearer sur requête publique/externe | haute | reproduite | politique de requête partagée, test host réel |
| `api_key`/`session`/`other` remplacé par Bearer | haute | reproduite | transport typé et fail-closed |
| donnée obsolète après mutation | haute | reproduite | cache policy + bypass/invalidation |
| cache réutilisé après changement de principal | moyenne/haute | conditionnelle | clé/scoping session-tenant ou purge garantie |
| payload malformé traité comme valide | haute | reproduite | décodeur runtime à la frontière data |
| perte d'erreur applicative Angular | moyenne | dérivée | taxonomie d'erreurs portable + mapping host |
| placeholder/path mal formé | moyenne | reproduite | grammaire et correspondance exacte |
| input futur non encodé | haute à l'activation | conditionnelle | sérialiseur unique et tests adversariaux |
| preflight CORS React inutile | moyenne | reproduite | aucun content-type sans body |
| réponse volumineuse sans borne/annulation React | moyenne | observée | abort, pagination et limites déclarées |

`HttpCacheStore` indexe uniquement par `urlWithParams`, sans identité de
principal ou tenant. Le reload au logout limite le risque actuel, mais ne couvre
pas tout remplacement de session ni une future application multi-tenant.

## 7. Versionnement et migration

ADR-0039 interdit une rupture silencieuse d'un contrat `1.0.0`.

- Corriger le rendu de `nullable` est une bugfix de renderer, mais élargit les
  types TypeScript et doit être annoncée/vérifiée sur les consommateurs.
- Ajouter les mutants est rétrocompatible.
- Refuser des IDs et paths auparavant acceptés resserre le contrat public.
- Introduire inputs, auth/cache, DTO/domain et une couche application est une
  évolution majeure.
- Changer les couches du registre et du cycle `create/retire` est également
  incompatible.

Décision recommandée :

1. geler la v1 et interdire sa promotion ;
2. faire refuser les compositions `experimental` par `create-module` sauf
   consentement explicite `--allow-experimental` ;
3. conserver la fixture v1 comme preuve de migration ;
4. introduire `list-query` schema `2.0.0` ;
5. livrer un migrateur déterministe v1 → v2 avec fixtures avant/après et test
   d'idempotence ;
6. faire bloquer le migrateur sur les décisions non déductibles plutôt que
   d'inventer cache, mapping métier ou authentification ;
7. rendre le registre conscient de la version du contrat et de sa
   dépréciation.

Aucun module actif, manifeste ou instance `list-query` persistée n'a été trouvé.
La seule preuve est le POC retiré : c'est la fenêtre la moins coûteuse pour une
v2 propre.

## 8. Responsabilités architecturales cibles

### Contrat canonique

Le contrat de query décrit : input typé, résultat list/page, access policy,
authentication, cache policy, stratégie de concurrence et taxonomie d'erreurs.
Il ne contient aucune primitive Angular, React ou SEOS.

### Domain

- `QueryPort<Input, Result>` target-neutral ;
- read model métier uniquement s'il est prouvé ;
- permissions et contraintes ;
- aucune dépendance HTTP/framework.

### Data

- DTO wire séparé ;
- validation/décodage runtime ;
- sérialisation path/query/header avec encodage ;
- mapping DTO → read model ;
- implémentation du `QueryPort`.

### Application

Contrôleur de query explicite :

- états `idle`, `loading`, `success`, `empty`, `error`, `reloading` ;
- `load(input)` et `reload()` ;
- politique sur l'ancienne valeur ;
- concurrence `latest-wins`, parallèle ou dédupliquée ;
- annulation et retry déclarés ;
- cache/refresh observables.

Angular peut rendre ce contrat avec `rxResource`/`httpResource`; React avec une
abstraction équivalente portant `AbortSignal`. Le choix reste dans le profil de
cible, pas dans l'IR.

### Runtime du host

Un unique port de politique de requête traduit
`access + authentication + cache` vers `HttpContext` Angular ou `Fetch init`
React. Aucun module généré ne crée un marqueur privé que le host ignore.

### Présentation

Table, filtres, pagination visuelle et accessibilité sont séparés. Une query
est une capacité de lecture, pas une page ou un composant UI.

## Critères de sortie non négociables

`list-query` ne peut devenir `proven` que si :

1. tous les mutants de cet audit sont tués par des tests committés ;
2. une query publique ne transporte jamais le Bearer du host ;
3. Angular et React réalisent la même sémantique auth/cache/erreur ;
4. le payload est décodé à l'exécution avant d'entrer dans le domaine ;
5. les erreurs métier restent identifiables jusqu'à l'UI ;
6. path/query sont typés, encodés et vérifiés exactement ;
7. DTO wire et read model sont séparés ;
8. le runtime expose états, reload et annulation ;
9. deux cas métier actifs et distincts passent les oracles natifs ;
10. une page est réalisée bout en bout via l'application builder ;
11. aucune branche ou vocabulaire propre à SEOS n'entre dans le moteur ;
12. la migration v1 → v2 et le cycle create/retire sont prouvés.

Ordre de preuves recommandé :

1. `site-group-select`, cas actif simple, pour valider le runtime host et le
   mapping vers `SelectOption` ;
2. `tasks-actions-processing-type`, pour exiger path paramétré et modèle
   imbriqué ;
3. `all-requests`, seulement après introduction justifiée de la pagination et
   des filtres.

## Vérifications exécutées

```text
list-query + composition registry : 11/11 tests
cycle create/retire list-query    : 1/1 test
check:composition-registry        : vert
check:generator-platform core     : 295 tests verts
stack Angular natif               : 22 tests verts
stack React natif                 : 22 tests verts
workspace après audit             : propre
```

Ces résultats ne lèvent aucun blocker : les suites natives ne contiennent pas
encore de runtime `list-query`, et les gates actuelles restent vertes en
présence des défauts reproduits ci-dessus.

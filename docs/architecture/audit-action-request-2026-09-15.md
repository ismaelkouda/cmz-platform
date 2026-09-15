# Audit Staff de `action-request` — 2026-09-15

## Statut et décision

- **Référence auditée :** `origin/main` à
  `7331455bdd486bc01eb1d31e6ac5f5d256486b67`.
- **Périmètre :** définition auteur, compilation IR, renderers Angular/React,
  validation, permissions, transport, effets post-succès, corpus SEOS,
  intégration host, sécurité, versionnement et responsabilités.
- **Décision :** l'infrastructure de génération et de publication est solide,
  mais `action-request` n'est **pas autorisable en production** dans son état
  actuel.
- **Décision de registre :** le mot `proven` prouve aujourd'hui la
  reproductibilité du générateur et quelques comportements isolés, pas une
  intégration produit sûre. Il doit être remplacé par des dimensions de
  maturité distinctes ou, à défaut, rétrogradé jusqu'à correction des release
  blockers de cet audit.
- **Nature du composant actuel :** générateur de commandes à corps JSON sur
  chemin fixe, avec validation facultative, permission frontend et extension
  humaine post-succès ; ce n'est pas encore une abstraction générale de
  mutation HTTP ni une commande distribuée fiable.

Cet audit ne remet pas en cause les acquis : IR target-neutral, sorties
déterministes, séparation en trois packages, type-check multi-cible,
publication transactionnelle, garde de permissions et vrais oracles Angular et
React. Il sépare ces qualités de construction des garanties de production qui
manquent encore.

## Méthode et niveaux de preuve

Les constats utilisent quatre niveaux :

1. **observé** — lecture directe d'une source ou d'un contrat ;
2. **reproduit** — mutant ou exécution contrôlée ayant produit le défaut ;
3. **dérivé** — conséquence nécessaire de contrats lus ;
4. **conditionnel** — impact dépendant d'une configuration ou d'un futur usage.

Les probes ont compilé et exécuté les sorties réellement générées. Le probe
Angular host a relié le vrai client public généré au vrai `authInterceptor` du
backoffice. Un autre probe a injecté une extension post-succès défaillante dans
les deux sorties et exécuté deux tentatives. Les fichiers temporaires ont été
retirés ; le workspace était propre après les probes.

## 1. Traçabilité définition → besoin

| Frontière | Preuve présente | Verdict |
| --- | --- | --- |
| Définition → JSON Schema | oui | structure fermée |
| Définition → evidence/semantic IR | oui | compilation déterministe |
| IR → artifact plan → manifests | oui | ownership et hashes vérifiés |
| Artifacts → runtime isolé | oui | Angular et React exécutés |
| Runtime → host réel | non committée | probe auth négatif |
| Définition → backend faisant autorité | non | déclaration dupliquée |
| Runtime → cas produit actif | partiel | authentification seulement |
| Action → `application-design` → page | non | chaînes indépendantes |

`compileActionRequestDefinition` conserve explicitement deux inconnues non
bloquantes : autorité du contrat backend et contrat d'erreurs. Cela rend la
provenance honnête, mais permet malgré tout génération, promotion et création
de module.

La chaîne ADR-0039 exige que `backend-contract` soit l'autorité. Or une
définition `action-request` redéclare méthode, chemin, authentification, corps et
sortie sans `operation_ref` vers ce contrat. Deux vérités peuvent donc diverger
tout en restant valides séparément.

La preuve `application-conception-proof` référence bien un
`backend-contract`, mais sa page ne consomme aucun artefact `action-request` :
le composant émet seulement `noteSubmitted`. Elle prouve le contrat de page,
pas la réalisation de la commande. Aucun module `action-request` généré actif
n'est raccordé au composition root du produit.

## 2. Couverture quantitative du corpus de mutations SEOS

Un inventaire AST des appels actifs `HttpClient.post/put/patch/delete` sous
`libs/*/data/src/lib/sources` donne :

| Mesure | Nombre |
| --- | ---: |
| mutations HTTP | 110 |
| fichiers sources concernés | 29 |
| `POST` | 55 |
| `PUT` | 34 |
| `DELETE` | 21 |
| `PATCH` | 0 |
| chemins avec valeur dynamique | 85 |
| corps `FormData` | 10 |
| `PUT` avec corps vide `{}` | 34 |
| `DELETE` sans corps | 21 |
| réponses `MessageResponseDto` | 94 |
| réponses `SimpleResponseDto<void>` | 13 |
| réponses d'authentification | 3 |
| appels publics marqués `SKIP_AUTH` | 3 |

Les 55 `POST` utilisent 42 payloads préparés, 10 `FormData` et 3 DTO
d'authentification directs. Le renderer généré ne sait émettre qu'un corps JSON
égal à l'input. Il ne représente ni media type, ni absence de corps, ni
projection/exclusion de champs, ni paramètre path/query/header.

Seuls 20/110 appels, soit 18 %, ont superficiellement la forme supportée
`POST + chemin fixe + corps non multipart` :

- 16 créations retournent `MessageResponseDto` (`{ error, message }` sans
  `data`), enveloppe non représentée correctement ;
- une création retourne `SimpleResponseDto<void>`, alors que la définition
  exige au moins un champ de sortie et que `simple` rejette `data: null` ou
  absent ;
- trois opérations d'authentification correspondent à l'enveloppe simple, mais
  sont bloquées par l'intégration auth publique du host.

La couverture fonctionnelle sûre est donc nulle à ce stade. Le corpus indique
les capacités à prioriser ; son vocabulaire ne doit pas entrer dans le moteur.

## 3. Contrat auteur, validation et mutants

### Validation facultative et incomplète

Les fonctions `validate*Input` sont générées à côté des commandes, mais aucun
client, commande ou hook ne les appelle. Leur utilisation dépend entièrement du
consommateur.

Un input runtime `{ email: 17, subject: null, message: false }` a été envoyé au
transport par Angular et React. La réponse runtime
`{ request_id: 99, message: null }` a été acceptée et retournée telle quelle par
les deux cibles.

Le validateur lui-même n'a signalé que le format de l'email. Une chaîne requise
absente, `null` ou d'un autre type n'est pas refusée : la règle générée vérifie
uniquement le cas où la valeur est déjà une chaîne vide. Les sorties ne sont
jamais décodées.

### Mutants négatifs

| Mutant conforme au schéma | Résultat | Mode d'échec |
| --- | --- | --- |
| input/output `nullable: true` | rendu non nullable | silencieux |
| placeholder path non substitué | URL littérale `{request_id}` | silencieux |
| accolade path non fermée | acceptée et émise | silencieux |
| double slash | accepté et émis | silencieux |
| `equals` vers le champ lui-même | condition toujours fausse | silencieux |
| effet dupliqué | accepté | silencieux |
| permission composée d'espaces | acceptée et exécutée | silencieux |
| méthode `GET` | compilation tardive en échec | contrat mensonger |
| méthode `DELETE` | compilation tardive en échec | contrat mensonger |
| email sur un entier | type-check tardif en échec | contrat mensonger |
| email optionnel | type-check tardif en échec | contrat mensonger |
| opération contenant `.` | type-check tardif en échec | rejet tardif |
| champ contenant `-` | type-check tardif en échec | rejet tardif |
| IDs normalisés identiques | fonctions dupliquées | rejet tardif |
| opaque/output de même ID | type TypeScript dupliqué | rejet tardif |
| `establish_session` avec mauvais types | imports absents | rejet tardif |

Le schéma annonce cinq méthodes HTTP, mais Angular appelle toujours
`http.<method>(url, input, options)`. Cette signature n'est valide ici que pour
les verbes avec body ; `GET` et `DELETE` échouent après compilation de l'IR.
Les placeholders ne sont jamais liés à des champs ni encodés.

## 4. Runtime Angular et intégration host

### Accès public — release blocker reproduit

Le renderer crée son propre `PUBLIC_REQUEST`. Le host ne lit que l'instance
`SKIP_AUTH` de `@cmz/core`. Avec une session active, le probe a observé :

```json
{
  "generatedPublicFlag": true,
  "hostSkipAuthFlag": false,
  "authorization": "Bearer session-secret"
}
```

Un login, reset ou forgot-password public reçoit donc un Bearer existant. Le
défaut viole la minimisation des credentials et peut exposer le jeton si la
base URL est mal configurée vers une autre origine.

Les modes `bearer`, `session`, `api_key` et `other` sont tous projetés vers la
même valeur `PUBLIC_REQUEST=false`. Le host applique alors son Bearer, quelle
que soit la sémantique déclarée.

### Erreurs et parité applicative

Les échecs HTTP Angular traversant le vrai `errorInterceptor` peuvent être
normalisés en `DomainError`. Les erreurs d'enveloppe et de permission sont en
revanche créées après le transport et étendent seulement `Error`. Elles ne
portent pas le `messageKey` attendu par `ErrorHandlerRegistry` et
`UiFeedbackService`.

La couche application Angular expose uniquement un `Observable` froid, sans
état de commande. La couche React expose `idle/pending/success/error`. La même
IR n'offre donc pas le même contrat observable aux deux applications. Une
seconde souscription Angular réexécute la mutation HTTP.

Le port dit domaine importe RxJS sur Angular et retourne `Observable`, tandis
que son équivalent React retourne `Promise`. La frontière est propre vis-à-vis
du framework UI, mais le contrat de commande n'est pas réellement portable.

## 5. Runtime React et concurrence

Les preuves existantes sont utiles : vrai React/ReactDOM sous jsdom, transitions
nominales, permissions, session, enveloppe et extension post-succès. Les
limites observées restent :

- réponse runtime non décodée ;
- erreur HTTP réduite à `Error("HTTP N")`, corps et taxonomie perdus ;
- absence d'`AbortSignal`, timeout et stratégie de concurrence ;
- chaque `execute` concurrent ou répété envoie une nouvelle mutation ;
- état final déterminé par la dernière promesse qui termine, pas par une
  politique déclarée ;
- aucune idempotency key ;
- le `FetchPort` reçoit un mode d'authentification, mais sa réalisation sûre est
  entièrement déléguée au host.

Le renderer React en couches est aujourd'hui branché au pipeline et au CLI,
alors que son en-tête de fichier affirme encore l'inverse. Le guide affirme
également que le vocabulaire d'effets est fermé, alors que le schéma accepte
tout ID, et cite la primitive `number`, absente du schéma. Ces dérives
documentaires doivent être traitées comme des défauts de contrat.

## 6. Effets, succès partiel et threat model

### Succès distant suivi d'un échec local — release blocker reproduit

`afterSuccess` s'exécute après le succès backend et après l'éventuelle
persistance de session, mais avant le succès visible. Une extension peut donc
échouer alors que la mutation distante est irréversible.

Le probe a exécuté deux tentatives avec une extension qui échoue :

```json
{
  "angularRemoteCalls": 2,
  "reactRemoteCalls": 2,
  "reactStates": ["pending", "error", "pending", "error"]
}
```

Les deux cibles signalent une erreur indistinguable d'un échec avant commit.
L'utilisateur peut réessayer et dupliquer l'effet distant. Ni idempotency key,
ni compensation, ni état `remote_succeeded_local_effect_failed` n'existe.

Les effets autres que `establish_session` sont conservés dans l'IR mais n'ont
aucune sémantique exécutable. Deux fichiers humains `after-success` indépendants
peuvent aussi diverger entre Angular et React sans invalider l'IR.

### Menaces

| Menace | Gravité | Preuve | Traitement exigé |
| --- | --- | --- | --- |
| Bearer sur endpoint public/externe | haute | reproduite | request policy host partagée |
| `api_key`/`session`/`other` remplacé par Bearer | haute | observée | auth typée, fail-closed |
| succès distant rejoué après échec local | critique | reproduite | idempotence + état de commit partiel |
| double clic/souscription/concurrence | haute | observée | politique par commande |
| payload invalide envoyé | haute | reproduite | validation obligatoire runtime |
| réponse malformée acceptée | haute | reproduite | décodeur DTO runtime |
| secrets non classifiés (`password`, token) | haute | observée | metadata sensible + redaction |
| Bearer envoyé à une base URL arbitraire | haute | conditionnelle | allowlist d'origine/service |
| CSRF avec futur mode session/cookie | haute | conditionnelle | politique CSRF explicite |
| paramètres path non encodés | haute | à l'activation | sérialiseur unique |
| erreur serveur perdue côté React | moyenne/haute | observée | taxonomie portable |
| permission frontend prise pour frontière de sécurité | haute | conditionnelle | autorisation backend obligatoire |
| liste obsolète après mutation | haute | dérivée | invalidation query déclarative |
| extension humaine bloquée sans timeout | moyenne/haute | observée | timeout/cancellation et policy |

La garde de permissions frontend est correcte pour l'UX et empêche l'appel
local. Elle ne constitue jamais une autorité de sécurité ; seul le backend peut
autoriser la mutation.

## 7. Versionnement et migration

La v1 a des fixtures, manifests et définitions versionnées ; une rupture
silencieuse est interdite par ADR-0039 même si aucune instance de production
persistée n'a été trouvée.

- Corriger `nullable` est une bugfix de renderer qui élargit les types.
- Ajouter des invariants précoces est rétrocompatible pour les définitions
  conformes à l'intention, mais rejette des entrées précédemment acceptées.
- Retirer `GET`/`DELETE` du schéma v1 ou les réaliser correctement change le
  contrat public.
- Introduire paramètres, media types, DTO/mappers, erreurs, idempotence,
  invalidation et un contrôleur de commande portable est une évolution majeure.
- Remplacer la déclaration HTTP par une référence au `backend-contract` est
  nécessaire et incompatible.

Décision recommandée :

1. geler la v1 et empêcher son adoption production ;
2. conserver toutes les définitions v1 et la fixture canonique comme entrées de
   migration ;
3. introduire `action-request` 2.0 lié à un `backend-contract` ;
4. migrer automatiquement les seuls faits déductibles ;
5. bloquer sur media type, mapping, erreurs, idempotence, concurrence,
   invalidation et effets locaux non prouvés ;
6. livrer fixtures avant/après, idempotence du migrateur et période de lecture
   v1 explicite ;
7. rendre le registre conscient de la version et de plusieurs dimensions de
   maturité.

## 8. Responsabilités architecturales cibles

### Contrat canonique de commande

Il relie l'intention d'action à une `operation_ref` du `backend-contract` et
décrit uniquement les décisions non transportées par celui-ci : validation
métier, access policy, concurrence, idempotence, état de commit, effets locaux,
invalidation et sensibilité des données.

### Domain

- command input et résultat métier distincts du wire ;
- `CommandPort<Input, Result>` sans Angular, React ou RxJS ;
- erreurs et permissions target-neutral ;
- invariants métier, sans sérialisation HTTP.

### Data

- DTO request/response séparés ;
- validation/décodage runtime ;
- mapping domaine ↔ DTO ;
- sérialisation path/query/header/body et media type ;
- implémentation du port avec taxonomie d'erreurs portable.

### Application

Contrôleur explicite avec états au minimum `idle`, `invalid`, `pending`,
`succeeded`, `failed_before_commit` et `committed_local_effect_failed`. Il
applique validation, double-submit policy, idempotency key, annulation,
éventuelle compensation et effets locaux déterministes.

L'invalidation de queries doit référencer leurs IDs canoniques. Elle ne doit pas
être cachée dans une extension humaine propre à une cible.

### Runtime du host

Un unique port de politique traduit service, origine, authentification, CSRF et
headers vers `HttpContext` Angular ou `Fetch init` React. Les providers du
module, la base URL et les ports sont raccordés par une fonction de composition
testable avec les vrais interceptors.

### Présentation

Formulaire, messages, focus, accessibilité et navigation consomment le même
état de commande portable. Le composant ne décide ni du transport ni du statut
réel du commit distant.

## Critères de sortie non négociables

`action-request` ne peut être considéré production-ready que si :

1. tous les mutants de cet audit sont tués avant rendu ou par un oracle dédié ;
2. une action publique ne transporte jamais le Bearer du host ;
3. chaque mode auth est réalisé exactement ou rejeté fail-closed ;
4. méthodes, path/query/header/body et media types sont fidèles au contrat ;
5. inputs et outputs sont validés/décodés à l'exécution ;
6. DTO wire et modèles métier sont séparés et mappés ;
7. erreurs transport, enveloppe, permission et validation gardent leur type
   jusqu'à l'UI ;
8. Angular et React exposent la même machine d'état de commande ;
9. double-submit, concurrence, cancellation et retry sont déclarés ;
10. idempotence et succès distant/échec local ont un contrat vérifié ;
11. une action peut invalider/recharger des queries par ID canonique ;
12. le raccordement au vrai host utilise les interceptors/providers réels ;
13. quatre cas actifs distincts passent : auth publique, création JSON,
    mutation à path paramétré sans body et multipart ;
14. `backend-contract` → `application-design` → composition → page est prouvé
    bout en bout ;
15. aucune branche ou vocabulaire SEOS n'entre dans le moteur ;
16. migration v1 → v2 et cycle create/retire sont prouvés.

## Vérifications exécutées

```text
suites action-request ciblées       : 51/51 tests verts
probe host Angular réel             : 1/1 vert, défaut auth reproduit
mutants supplémentaires             : défauts silencieux/tardifs reproduits
probe payload runtime invalide      : accepté sur Angular et React
probe succès distant/échec local    : double envoi reproduit sur les 2 cibles
inventaire AST corpus mutations     : 110 appels / 29 fichiers
workspace après probes temporaires  : propre
```

Les 51 tests verts restent de vraies preuves positives. Ils ne couvrent ni le
host réel, ni les mutants supplémentaires, ni la fidélité au corpus, ni la
sémantique distribuée post-commit ; ils ne lèvent donc pas les blockers.

# ADR-0054 — `action-request` v2 compile un modèle d'exécution à commit explicite

- **Statut :** Accepted
- **Date :** 2026-09-24

## Contexte

ADR-0053 fixe la frontière auteur de `action-request` v2, mais ne fournit pas
encore une sémantique unique aux futures cibles Angular et React. Si chaque
renderer résout lui-même le contrat backend, l'authentification, les mappings,
la validation et l'ordre des effets, deux implémentations valides en apparence
peuvent diverger sur les points qui ont motivé l'audit Staff.

Le risque le plus grave est le succès distant suivi d'un échec local. Présenter
ce cas comme un simple échec rend la commande rejouable alors que le serveur a
déjà accepté la mutation.

## Décision

Une compilation pure transforme la définition v2 et les octets exacts de son
`backend-contract` en un `action-request-execution-model` interne et indépendant
des frameworks. Le compilateur calcule lui-même le SHA-256 des octets reçus et
refuse une référence qui ne correspond pas au document réellement compilé.

Chaque action compilée sépare :

- le port métier d'entrée et de résultat ;
- le payload wire sortant et son mapping depuis les champs métier ;
- le transport résolu depuis le backend ;
- le DTO wire entrant, son décodage strict et le mapping du résultat ;
- l'accès et l'authentification (`omit` pour le public, schémas du host sinon) ;
- l'idempotence, la concurrence, le retry et l'invalidation déclarés ;
- le contrôleur, les erreurs HTTP, d'enveloppe, de transport et post-succès.

La réussite de la requête distante est la frontière de commit. Quand un effet
host suit cette réussite, le contrôleur passe par `applying-post-success`. Un
échec local produit `committed-with-local-error`. Depuis cet état, seule la
commande `retry-post-success` peut reprendre l'effet local ; rejouer la requête
distante est explicitement interdit.

Les contraintes du champ backend sont conservées dans le port et le modèle de
requête. Les champs métier, les noms wire et les champs du résultat restent des
identités distinctes même lorsqu'ils portent initialement le même nom.

La commande de migration compile le résultat avant son écriture. Le compilateur
n'est donc pas un outil isolé et une migration ne peut publier une v2 hors de
son périmètre exécutable actuel.

## Revue de simplification obligatoire

La surface de production `action-request` v2 atteint **1 777 lignes** : cœur et
migrateur 697, compilateur 630, CLI 183 et schéma 267. Elle dépasse le seuil
SIMPL de 1 000 lignes et impose cette revue.

La croissance de **636 lignes** est acceptée parce qu'elle matérialise une
frontière de sécurité unique consommable par les deux futurs hosts et comprend
son validateur hostile. Le lot conserve trois modules exécutables et un seul
schéma. Il n'ajoute ni deuxième CLI, ni renderer, ni runtime propriétaire, ni
journal, ni lock, ni cache, ni format persistant du modèle compilé.

Une extraction commune avec `list-query` n'est pas faite maintenant : leurs
machines d'états, ports et politiques diffèrent, et une factorisation anticipée
masquerait ces différences. Les helpers réellement identiques devront être
extraits seulement lorsqu'un premier host `action-request` aura prouvé leur
forme commune.

## Conséquences

### Positives

- Angular et React recevront la même sémantique résolue.
- Une action publique ne peut pas hériter silencieusement d'un Bearer du host.
- Les entrées sont validables avant HTTP et les réponses sont décodables avant
  domaine.
- Un échec post-succès ne transforme plus une mutation déjà commise en commande
  distante rejouable.
- La provenance et les mappings restent déterministes et auditables.

### Limites

- Aucun code Angular ou React v2 n'est encore généré ou exécuté.
- Les paramètres, multipart, réponses sans body et modèles imbriqués restent
  refusés par la frontière v2.
- `caller-declared` ne résout pas encore les queries à invalider ; ce lien
  appartient au futur `page-execution-plan`.
- Le cas `forgot-password` ne possède aucun effet post-succès. La transition
  `committed-with-local-error` est couverte au niveau du modèle ; un oracle host
  réel reste requis avant de revendiquer son exécution.
- La capacité reste `experimental`.

## Prochain incrément

Rendre et exécuter le cas actif `forgot-password` dans le host Angular réel :
validation avant HTTP, absence de Bearer, payload exact, enveloppe et DTO
stricts, états du contrôleur et erreurs typées. Les formes voisines restent
fermées jusqu'à un cas actif qui les exige.

## Références

- [ADR-0053](./0053-action-request-v2-reference-backend-et-decisions-execution.md)
- [ADR-0048](./0048-list-query-v2-modele-execution-neutre.md)
- [Audit `action-request`](../architecture/audit-action-request-2026-09-15.md)
- [Audit de composition N×N](../architecture/audit-page-composition-2026-09-15.md)
- [Audit de maintenabilité](../architecture/audit-maintenable-automatisation-2026-09-16.md)

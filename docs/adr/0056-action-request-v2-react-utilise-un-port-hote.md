# ADR-0056 — `action-request` v2 React utilise un port hôte explicite

- **Statut :** Accepted
- **Date :** 2026-09-24

## Contexte

ADR-0055 prouve le cas `forgot-password` dans le host Angular réel. Une cible
React doit conserver le même modèle, les mêmes frontières wire et les mêmes
politiques sans copier les mécanismes Angular. Le dépôt ne contient toutefois
aucune application React hôte réelle dont les conventions de transport,
configuration et authentification pourraient être observées honnêtement.

Une mutation pose aussi une contrainte différente d'une lecture : interrompre un
appel côté navigateur au démontage ne garantit pas que le serveur ne l'a pas
déjà commis. Présenter cette interruption comme une annulation métier créerait
la même ambiguïté que la frontière de commit corrigée par ADR-0054.

## Décision

Le renderer React produit les mêmes six responsabilités que la cible Angular :
modèles, validation, décodeur, client, contrôleur et API publique. Les deux
cibles partagent le modèle compilé, le plan d'artefacts, les modèles TypeScript,
les règles de validation et le décodeur. Leur cycle d'exécution reste propre à
chaque framework.

Le client React reçoit son URL de base et un `ActionRequestFetchPort` du host.
Ce port reçoit explicitement service, URL, méthode, media types, politique
d'authentification et payload. Le code généré ne lit aucune variable globale,
n'appelle pas `fetch`, ne crée aucun Bearer et transmet `authentication: omit`
pour l'action publique.

Le client valide avant le port, refuse tout statut différent du succès exact
déclaré, ne décode pas le corps d'une réponse HTTP en échec et applique le même
décodeur strict qu'Angular. Les erreurs de payload, d'enveloppe, HTTP et métier
restent distinguables.

Le contrôleur est un hook construit depuis les primitives React fournies par le
host. Il expose les états compilés, efface résultat et erreur à chaque nouvelle
tentative et applique `reject-while-pending` avec une référence synchrone, pas
avec un état React potentiellement retardé.

Au démontage, le hook cesse de publier des états mais ne transmet aucun signal
d'annulation. La promesse de soumission continue et retourne le résultat ou
l'erreur au caller. Cette décision évite de prétendre qu'une mutation distante a
été annulée alors que son commit serveur est inconnu.

## Extraction partagée

L'arrivée du second renderer justifie maintenant un module target-neutral pour
les formes réellement communes : contrôle fail-closed du modèle, modèles,
validation et décodage. Les clients et contrôleurs restent séparés. Aucune
abstraction de transport ou de lifecycle commune à Angular et React n'est
introduite.

Le module de validation React porte localement `InvalidPayloadError`; le
décodeur porte `ServerResponseError`; le client et le hook possèdent leurs
erreurs HTTP et concurrence. La sortie React ne dépend donc pas des packages
Angular/Nx du workspace.

## Oracle exécutable

Le harnais matérialise la sortie puis la compile avec le profil React. Un vrai
hook React est exécuté avec Testing Library. Les tests couvrent :

- payload, URL, méthode, headers et politique `omit` transmis au port ;
- validation avant transport, y compris champs inconnus et espaces ;
- enveloppe et DTO stricts ;
- erreurs HTTP, statut 2xx hors contrat et erreur métier distincts ;
- remise à zéro du résultat, succès et erreur ;
- double soumission sans second appel ;
- démontage sans mise à jour React ni fausse annulation distante.

La suite React comporte 44 tests verts. Après extraction partagée, les 45 tests
Angular restent verts.

## Revue de simplification obligatoire

La surface directe `action-request` v2 atteint **2 792 lignes de production**,
soit **+356 nettes** depuis ADR-0055. Le détail du delta est : renderer React
+268, module partagé +285, calcul de cible +57, plan d'artefacts +3 et renderer
Angular −257 grâce à l'extraction. La capacité comprend désormais huit modules
exécutables et un schéma auteur.

Cette croissance est acceptée parce que :

- aucun schéma, CLI, journal, verrou, cache ou runtime propriétaire n'est ajouté
  ;
- l'extraction retire réellement de la duplication et n'englobe ni transport ni
  lifecycle ;
- React dépend d'un port hôte petit et explicite au lieu d'inventer une
  application hôte ;
- les deux cibles partagent la même empreinte de modèle et le même plan ;
- les formes non couvertes par `forgot-password` restent refusées ;
- la non-annulation d'une mutation est visible dans le contrat et testée.

## Conséquences

### Positives

- Angular et React exécutent les mêmes règles métier et wire.
- Le host React garde la propriété du transport et de l'authentification.
- Le code généré reste testable et débogable sans runtime caché.
- Le cycle de mutation ne promet aucune annulation distante impossible à
  garantir.

### Limites

- Aucun host React réel n'existe dans le dépôt ; seule l'intégration par port et
  le hook React réel sont prouvés.
- Seule la forme publique `forgot-password` est acceptée.
- Idempotence, retry, invalidation et effet local post-succès restent fermés.
- La sortie n'est pas encore publiée durablement.
- La capacité reste `experimental` et ne permet pas encore le plan N×N.

## Prochain incrément

Publier durablement les deux sorties `action-request` v2 avec la commande et le
moteur transactionnel existants. Aucun nouveau publisher ou journal ne doit être
créé.

## Références

- [ADR-0054](./0054-action-request-v2-modele-execution-commit-safe.md)
- [ADR-0055](./0055-action-request-v2-angular-reutilise-le-host.md)
- [ADR-0051](./0051-list-query-v2-react-utilise-un-port-hote-explicite.md)
- [Audit Staff `action-request`](../architecture/audit-action-request-2026-09-15.md)
- [Audit de maintenabilité](../architecture/audit-maintenable-automatisation-2026-09-16.md)

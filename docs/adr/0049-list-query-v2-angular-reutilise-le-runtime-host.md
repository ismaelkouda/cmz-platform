# ADR-0049 — `list-query` v2 Angular réutilise le runtime du host

- **Statut :** Accepted
- **Date :** 2026-09-23

## Contexte

ADR-0048 produit un modèle d'exécution neutre, mais aucune preuve ne montrait
qu'un client généré pouvait respecter les contrats réels du workspace. Les
échecs les plus dangereux sont invisibles à la compilation : créer des
`HttpContextToken` privés que les intercepteurs du host ne lisent pas, envoyer
le Bearer sur une query publique, accepter un payload mal formé, ignorer le
cache au rechargement ou perdre la dernière valeur après une erreur.

Le cas actif `site-group-select` fournit un premier oracle réel, simple et déjà
présent dans le backoffice. Son contrat est toutefois observé dans le client ;
il ne constitue pas une vérification en direct du backend.

## Options envisagées

### Option A — Runtime généré autonome

- Avantage : comportement entièrement possédé par le générateur.
- Inconvénients : double authentification, cache et boucle d'erreur ; nouveaux
  tokens privés ; code produit plus opaque et plus coûteux à diagnostiquer.

### Option B — Adaptateur fin vers le runtime Angular existant

- Avantages : intercepteurs, `ResourceFacade`, `rxResource` et tokens déjà
  utilisés par l'application ; sortie Angular standard ; moins de mécanismes.
- Inconvénient : le host doit fournir un binding explicite par service.

### Option C — Continuer avec des mocks de renderer

- Avantage : coût immédiat faible.
- Inconvénient : ne détecte aucune divergence entre le code généré et les vrais
  intercepteurs Angular.

## Décision

Le renderer Angular génère un DTO wire, un read model distinct, un décodeur, une
source HTTP et une façade `ResourceFacade`. Il réutilise exclusivement les
tokens et intercepteurs publics du host via un adaptateur unique
`createListQueryRequestContext` ; il ne crée aucun runtime HTTP propriétaire.

Le corps HTTP est reçu comme `unknown`. Le décodeur vérifie l'enveloppe, les
champs et leurs types avant le mapping, transforme un échec déclaré par
l'enveloppe en `ServerResponseError` et un payload invalide en
`InvalidPayloadError`. La façade expose les six états compilés, annule la
requête supplantée grâce à `rxResource`, contourne le cache au reload et garde
la dernière valeur résolue si ce reload échoue.

La première version du renderer accepte exactement une query sans paramètre,
`GET`, les primitives `string` et `integer`, un Bearer host au maximum et la
politique d'exécution prouvée par l'oracle. Toute autre capacité échoue fermé.

## Justification

Un test natif Angular instancie le code généré avec les vrais intercepteurs
d'authentification, d'erreur et de cache du workspace. Il couvre le cas actif
`site-group-select`, une query publique, le mapping wire → read, les payloads
invalides, les erreurs applicatives, le reload, la conservation de valeur et
l'annulation latest-wins. Cette preuve détecte des classes de panne que les
tests textuels ou les mocks locaux ne peuvent pas voir.

Le contrat source est content-addressed sur les fichiers observés. Son chemin
est validé dans le workspace avant toute lecture. Toute dérive de l'API, du DTO,
des endpoints ou de l'intercepteur d'authentification invalide la génération au
lieu de laisser l'oracle devenir silencieusement obsolète.

## Revue de simplification obligatoire

La surface de production v2 cumulée atteint **1 840 lignes** : validateur et
migrateur 467, compilateur 379, CLI 177, schéma 210, renderer Angular 445,
calcul de cible 117, adaptateur host 30 et erreur de payload 15. Elle représente
sept modules exécutables et un schéma, au-dessus des deux seuils SIMPL-7.

Cette croissance est acceptée après revue parce que :

- aucun état persistant, journal, CLI, DSL ou runtime propriétaire n'est ajouté
  ;
- les cinq fichiers Angular sont des sorties éphémères compilées et testées, pas
  une seconde implémentation versionnée de `site-group-select` ;
- l'adaptateur host centralise deux tokens existants en 30 lignes ;
- le calcul de cible centralise validation, provenance, compilation et rendu
  afin que les tests et le futur point de publication ne divergent pas ;
- le renderer refuse les branches non prouvées au lieu d'anticiper les types,
  paramètres, retry ou modèles imbriqués ;
- l'erreur de payload rejoint la boucle de `DomainError` existante plutôt que
  d'introduire un second système d'erreurs.

Le prochain incrément doit d'abord chercher à réutiliser cette surface. Un
second renderer ou une nouvelle abstraction commune exige son propre cas réel et
une nouvelle mesure.

## Conséquences

### Positives

- Le code généré parle exactement aux intercepteurs du backoffice.
- Une query publique ne reçoit pas le jeton de session.
- DTO wire et modèle lu ne peuvent plus être confondus.
- Les erreurs restent typées et observables par la boucle UI existante.
- Le cache, le reload, les données obsolètes et l'annulation ont une preuve
  runtime native.

### Négatives / dette acceptée

- Seul Angular possède ce renderer ; la parité React n'est pas livrée.
- Seules les primitives `string` et `integer` sont admises.
- Les paramètres et modèles imbriqués restent refusés.
- Le contrat actif est client-observé, pas vérifié contre un backend vivant.
- Le renderer produit une bibliothèque testable, pas encore une page ni une
  publication durable dans une application générée.

### Points à réévaluer

- Ouvrir les paramètres et modèles imbriqués seulement avec le cas réel
  `tasks-actions-processing-type` et ses tests.
- Décider la parité React après stabilisation du deuxième cas, sans extraire un
  framework commun avant d'avoir deux implémentations prouvées.
- Revoir le statut `experimental` après génération, publication et usage d'une
  page composée complète.

## Références

- [ADR-0047](./0047-list-query-v2-reference-backend-et-migration-explicite.md)
- [ADR-0048](./0048-list-query-v2-modele-execution-neutre.md)
- [Audit de maintenabilité](../architecture/audit-maintenable-automatisation-2026-09-16.md)
- [Audit Staff `list-query`](../architecture/audit-list-query-2026-09-15.md)

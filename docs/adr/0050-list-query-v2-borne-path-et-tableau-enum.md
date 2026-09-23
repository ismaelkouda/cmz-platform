# ADR-0050 — `list-query` v2 borne le path et le tableau enum par un cas réel

- **Statut :** Accepted
- **Date :** 2026-09-23

## Contexte

ADR-0049 a livré le premier oracle Angular actif sur `site-group-select`, mais
le compilateur et le renderer refusaient encore tout paramètre backend et tout
champ wire non primitif. Ouvrir ces capacités sans second cas métier aurait
créé une généralité non prouvée.

Le cas actif `tasks-actions-processing-type` fournit les faits manquants :

- `GET /processing-actions/{id}/report-types` sur `REPORT_API_URL` ;
- `reportUniqId` est transformé en paramètre de path `id` ;
- la réponse contient `code`, `name` et `operators` ;
- `operators` est un tableau de codes fermés `mtn | orange | moov` ;
- le mapping lu est `code → value`, `name → label`, `operators → operators` ;
- l'authentification, le cache, les erreurs et le cycle de query restent ceux
  du host Angular.

Ce contrat est observé dans le client existant et content-addressed. Il ne
constitue pas une observation live du backend.

## Décision

La définition auteur v2 accepte un `input` optionnel dont chaque champ référence
explicitement un paramètre backend. Pour ce premier incrément, le schéma
n'autorise que `parameter_ref.in = path`.

Le modèle d'exécution interne passe en `1.1.0` et représente séparément :

- le champ d'entrée métier `reportUniqId` ;
- le binding transport `reportUniqId → path:id` ;
- le type et la contrainte issus du contrat backend ;
- le tableau wire et sa liste de valeurs autorisées.

Le compilateur et le renderer acceptent exactement la forme prouvée :

- un seul paramètre de path ;
- chaîne obligatoire avec `min_length: 1` ;
- encodage par `encodeURIComponent` comme un segment unique ;
- un tableau obligatoire, non nullable, à un seul niveau, composé de chaînes ;
- une liste non vide de valeurs autorisées, vérifiée pour chaque item.

Les paramètres query/header, paramètres optionnels, plusieurs paramètres,
placeholder répété, tableaux ouverts, tableaux récursifs et tableaux d'objets
restent refusés. La validation du `backend-contract` interprète
`allowed_values` sur un tableau primitif comme la liste autorisée pour chacun
de ses items.

Le code Angular généré continue de réutiliser `ResourceFacade`,
`createListQueryRequestContext`, `REPORT_API_URL` et les intercepteurs réels. Il
n'introduit ni client HTTP, ni cache, ni état, ni système d'erreurs parallèle.

## Preuve

L'oracle natif Angular compile le code généré et l'exécute avec `TestBed`, le
vrai `HttpClientTestingController` et les intercepteurs auth/erreur/cache du
backoffice. Il vérifie :

1. l'encodage d'un identifiant contenant `/`, espace et caractère accentué ;
2. le Bearer et les tokens de contexte du host ;
3. le mapping des trois champs, dont `operators` ;
4. le rejet d'un opérateur hors enum avant le read model ;
5. le rejet d'un identifiant vide avant tout appel HTTP ;
6. le reload sur le même input avec bypass cache ;
7. l'annulation de la requête précédente quand l'identifiant change.

Cet oracle a détecté pendant l'implémentation une faute réelle : la première
version vérifiait la liste autorisée contre le tableau entier. La vérification a
été déplacée sur chaque item avant validation du lot.

## Revue de simplification obligatoire

Sur le même périmètre que l'ADR-0049, la surface v2 cumulée passe de **1 840 à
2 231 lignes de production** : +47 dans le validateur/migrateur, +154 dans le
compilateur, +31 dans le schéma existant, +155 dans le renderer et +4 dans les
bindings de cible. Le validateur `backend-contract` existant reçoit en plus
**9 lignes nettes** pour les enums de tableaux. Les 20 lignes de préparation de
stack-test appartiennent au harnais de test, pas au runtime produit.

Cette croissance est acceptée après revue parce que :

- aucun nouveau schéma, CLI, runtime, journal ou module de production n'est
  créé ;
- l'entrée, le binding et le décodage réutilisent les structures déjà en place ;
- la génération reste cinq fichiers Angular ordinaires et éphémères ;
- toutes les branches ajoutées correspondent au cas actif et ont un mutant ou
  un oracle runtime ;
- les formes voisines non prouvées échouent explicitement au lieu de devenir
  des options génériques.

La prochaine étape ne doit pas ajouter d'autre capacité Angular : elle doit
décider et prouver la parité React sur les deux cas stabilisés, ou documenter
explicitement pourquoi cette cible n'est pas retenue.

## Conséquences

### Positives

- Le deuxième cas métier actif passe par le même pipeline v2 que le premier.
- Un identifiant ne peut pas injecter un segment de chemin supplémentaire.
- Un payload contenant un opérateur inconnu n'entre pas dans le read model.
- Les différences entre nom métier et nom transport restent visibles dans le
  contrat au lieu d'être codées implicitement dans un renderer.

### Limites assumées

- Le renderer Angular ne couvre toujours qu'une query par définition.
- Les objets imbriqués et la pagination restent hors périmètre.
- La parité React, la publication durable et la page composée N×N ne sont pas
  encore livrées.
- `list-query` v2 reste `experimental`.

## Références

- [ADR-0047](./0047-list-query-v2-reference-backend-et-migration-explicite.md)
- [ADR-0048](./0048-list-query-v2-modele-execution-neutre.md)
- [ADR-0049](./0049-list-query-v2-angular-reutilise-le-runtime-host.md)
- [Audit Staff `list-query`](../architecture/audit-list-query-2026-09-15.md)
- [Audit de maintenabilité](../architecture/audit-maintenable-automatisation-2026-09-16.md)

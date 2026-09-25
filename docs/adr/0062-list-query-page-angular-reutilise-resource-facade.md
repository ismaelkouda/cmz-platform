# ADR-0062 — La page `list-query` Angular réutilise `ResourceFacade`

- **Statut :** Accepted
- **Date :** 2026-09-25

## Contexte

ADR-0061 a rendu la pagination et les paramètres query représentables dans le
modèle d'exécution neutre, tout en les laissant fermés dans les renderers faute
d'oracle runtime. Le cas C5 « Gestion des utilisateurs » fournit désormais la
preuve Angular nécessaire : cinq paramètres query typés et une page imbriquée
dans l'enveloppe `{ error, message, data }`.

Deux raccourcis auraient accru la dette : créer une façade paginée parallèle au
runtime existant, ou réutiliser la forme Laravel complète comme modèle domaine.
Le premier dupliquerait état, cache, erreurs et annulation. Le second couplerait
la sortie à un backend alors que le compilateur mappe déjà les champs wire vers
des rôles canoniques.

## Décision

Le renderer Angular accepte la variante `page` et les paramètres query
uniquement par une capacité cible explicite. Le renderer React ne reçoit pas
cette capacité et continue d'échouer fermé jusqu'à son propre oracle.

La source Angular :

- réutilise `HttpClient`, les intercepteurs du host et
  `createListQueryRequestContext` ;
- valide chaque valeur avant l'appel HTTP ;
- sérialise `string`, `integer` et `boolean` avec `HttpParams` ;
- omet une valeur facultative absente, mais rejette une valeur présente qui ne
  respecte pas son type ou ses contraintes ;
- conserve les noms wire déclarés, sans vocabulaire Laravel, Spring, .NET ou
  Django dans le renderer.

Le décodeur produit un type `${Query}Page` contenant `items`, `currentPage`,
`lastPage`, `pageSize` et `totalItems`. Les champs supplémentaires de l'objet
page sont tolérés : le contrat C5 déclare volontairement une projection des
métadonnées réellement consommées. Cette tolérance ne s'étend pas aux items :
leur politique `unknown_fields: reject` reste appliquée champ par champ.

La façade paginée reste une spécialisation générée de `ResourceFacade`. Elle
expose `page` et `items`, calcule `empty` depuis `items`, conserve la dernière
page résolue pendant un reload ou une erreur et garde les politiques existantes
`latest-wins`, annulation à la destruction et bypass du cache au refresh.

Les primitives de paramètres d'entrée sont distinguées des primitives wire
décodables. Autoriser un booléen dans la query n'ouvre donc pas implicitement
les champs booléens de réponse, qui restent hors de la capacité prouvée.

## Preuve

L'oracle externe `list-query-v2-page.spec.ts` instancie la sortie générée avec
le vrai `TestBed`, `HttpClientTesting`, les intercepteurs d'authentification,
d'erreur et de cache du host. Il vérifie :

1. URL encodée, noms wire, booléen `false`, omission des optionnels, auth et
   cache ;
2. décodage de la page et mapping des items ;
3. page vide et métadonnées conservées ;
4. rejet des inputs invalides avant tout HTTP ;
5. chemin wire exact d'une métadonnée invalide ;
6. conservation pendant reload et bypass du cache ;
7. annulation de la requête supplantée.

Les tests de renderer couvrent aussi les sorties déterministes et des mutants de
page canonique ou de paramètres dupliqués. La suite React prouve toujours le
refus explicite de C5.

## Conséquences

- C5 peut exécuter `users-list` sur Angular sans nouveau runtime ni nouveau
  transport.
- Un changement de framework backend reste un changement de contrat et de
  mapping, pas une branche dans le renderer.
- La projection de page est lisible par un développeur Angular ordinaire : une
  interface, une source HTTP et une façade.
- La prochaine tranche de parité est le renderer et l'oracle React ; elle reste
  indépendante de l'invalidation positive.

## Revue de simplification

Le lot ajoute zéro dépendance, zéro cache, zéro orchestrateur, zéro journal,
zéro publisher et zéro runtime partagé. Il étend trois fonctions de rendu et le
préparateur de tests existants. La preuve native est extérieure au code généré.

## Limites

- Seule la page à quatre métadonnées entières d'ADR-0061 est ouverte.
- Cursor pagination, page nullable, tri, paramètres répétés, objets et tableaux
  de query restent refusés.
- Les invariants comme l'index de page zéro ou un ne sont pas inventés par le
  renderer ; seules les contraintes déclarées sur l'entrée sont appliquées.
- React reste fermé pour `page` et query parameters.
- L'invalidation `create-user -> users-list`, la composition C5 complète et l'UI
  accessible restent à livrer.

## Références

- [ADR-0049](./0049-list-query-v2-angular-reutilise-le-runtime-host.md)
- [ADR-0061](./0061-list-query-page-et-parametres-restent-backend-neutres.md)
- [C5 — entrée externe « Gestion des utilisateurs »](../architecture/c5-entree-externe-gestion-utilisateurs-2026-09-25.md)
- [Audit de maintenabilité](../architecture/audit-maintenable-automatisation-2026-09-16.md)

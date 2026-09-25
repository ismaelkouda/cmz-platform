# ADR-0063 — La page `list-query` React réutilise le port hôte

- **Statut :** Accepted
- **Date :** 2026-09-25

## Contexte

ADR-0061 a défini une page backend-neutre et ADR-0062 a prouvé son exécution
Angular. React exécutait déjà les listes directes et les paramètres de chemin,
mais refusait encore la page C5 et ses cinq paramètres query. Ouvrir cette
capacité sans oracle aurait créé une parité déclarative mais non démontrée.

Le host React n'est pas matérialisé comme application dans ce dépôt. Le runtime
généré doit donc continuer à déléguer transport, authentification et cache au
`ListQueryFetchPort` existant, sans introduire un client HTTP concurrent.

## Décision

Le renderer React accepte la variante `page` et les paramètres query par les
mêmes capacités explicites que le renderer Angular. Il conserve cependant son
cycle de vie propre : client asynchrone, `AbortController` et hook React.

Le client généré :

- valide chaque paramètre avant d'appeler le port hôte ;
- omet les optionnels absents et conserve les noms wire déclarés ;
- encode noms et valeurs avec `encodeURIComponent` dans un ordre déterministe ;
- transmet au host le service, la politique auth/cache, le signal d'annulation
  et le marqueur de refresh ;
- décode la même page canonique qu'Angular depuis le décodeur partagé.

Le hook expose `page`, `items`, `state`, `error`, `load` et `reload`. Il
conserve la dernière page résolue pendant un reload ou une erreur, calcule
`empty` depuis `page.items`, réutilise le dernier input au reload et ignore
toute réponse supplantée ou reçue après démontage.

La génération des validations de paramètres est partagée entre les deux
renderers. Leur sérialisation et leurs cycles de vie restent séparés :
`HttpParams`/`ResourceFacade` pour Angular, URL/Hook pour React.

## Preuve

L'oracle natif `stack-tests/reactjs/list-query-v2-page.spec.ts` exécute le code
généré avec React 19 et React Testing Library. Ses neuf scénarios couvrent :

1. encodage déterministe, noms wire et booléen `false` ;
2. délégation exacte de l'authentification et du cache au host ;
3. décodage et mapping de la page, y compris ses champs supplémentaires ;
4. omission des filtres absents et page vide ;
5. quatre entrées invalides rejetées avant le port ;
6. chemin wire exact d'une métadonnée invalide ;
7. reload avec paramètres identiques, bypass et données conservées ;
8. erreur de reload conservant la dernière page ;
9. annulation et ignorance de la réponse supplantée.

Le test de renderer vérifie également la sortie compilée et déterministe. Les
suites natives passent avec 53 tests React et 59 tests Angular.

## Conséquences

- `users-list` est exécutable depuis un même modèle neutre sur Angular et React.
- Laravel, Spring Boot, .NET, Django ou un backend propriétaire restent des
  variations de contrat et de mapping, pas des branches du renderer.
- Le port React demeure lisible et substituable par un host ordinaire.
- C5 peut maintenant passer à l'invalidation positive nommée, puis à la
  composition complète.

## Revue de simplification

Le lot ajoute zéro dépendance, zéro transport, zéro cache, zéro orchestrateur,
zéro journal et zéro publisher. Il réutilise le client, le hook, le décodeur, le
modèle, le plan d'artefacts et le préparateur de tests existants. Le seul
partage nouveau est la génération des lignes de validation déjà identiques entre
les deux cibles.

## Limites

- Seule la page canonique à quatre métadonnées entières d'ADR-0061 est ouverte.
- Cursor pagination, page nullable, paramètres répétés, objets et tableaux de
  query restent refusés.
- Le port hôte reste responsable de l'authentification, du cache et du vrai
  transport réseau ; le code généré ne les simule pas.
- L'invalidation `create-user -> users-list`, la composition C5 complète et l'UI
  accessible restent à livrer.

## Références

- [ADR-0051](./0051-list-query-v2-react-utilise-un-port-hote-explicite.md)
- [ADR-0061](./0061-list-query-page-et-parametres-restent-backend-neutres.md)
- [ADR-0062](./0062-list-query-page-angular-reutilise-resource-facade.md)
- [C5 — entrée externe « Gestion des utilisateurs »](../architecture/c5-entree-externe-gestion-utilisateurs-2026-09-25.md)
- [Audit de maintenabilité](../architecture/audit-maintenable-automatisation-2026-09-16.md)

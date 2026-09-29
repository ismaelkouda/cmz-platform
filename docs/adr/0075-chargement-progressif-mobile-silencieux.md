# ADR-0075 — Chargement progressif mobile silencieux

- **Statut :** accepté
- **Date :** 2026-09-29

## Contexte

La preuve C5 présente les utilisateurs sous forme de cartes en fenêtre compacte,
mais conserve la navigation paginée conçue pour le tableau : `Précédent`, deux
numéros de page et `Suivant`. Ce contrôle occupe de la place, interrompt la
lecture verticale et remplace les éléments visibles à chaque changement de
page.

Les systèmes de feed de Meta réduisent cette rupture en demandant le lot suivant
avant que la personne atteigne la frontière visible, puis en l'ajoutant au lot
déjà rendu. L'absence habituelle de spinner n'implique pas l'absence d'état de
chargement : elle résulte d'un déclenchement anticipé, d'un verrou de
concurrence et, à leur échelle, d'un stock ou cache d'éléments prêts à rendre.

Le backend C5 reste une pagination numérotée canonique (`currentPage`,
`lastPage`, `pageSize`, `totalItems`). La décision de présentation ne doit
dépendre ni de Laravel, Spring Boot, .NET ou Django, ni d'un format réseau brut.

## Options envisagées

### Option A — Conserver la pagination partout

- avantage : comportement simple et borné ;
- limites : interaction peu naturelle pour une pile de cartes mobile et perte
  de continuité à chaque page.

### Option B — Retirer seulement les contrôles mobiles

- avantage apparent : interface plus légère ;
- limite bloquante : les pages suivantes deviennent inaccessibles puisque le
  `list-query` courant remplace sa page au lieu d'accumuler les éléments.

### Option C — Projection progressive propre au compact

- avantage : lecture continue en mobile, contrat paginé inchangé et pagination
  explicite conservée sur les fenêtres adaptées au tableau ;
- coût : accumulation, déduplication, concurrence, erreurs et invalidation
  doivent recevoir des états et des oracles propres.

## Décision proposée

**Option C.** En fenêtre `compact`, la page projette les pages successives du
`list-query` dans une collection cumulative. Un élément sentinelle observé par
`IntersectionObserver` déclenche la page suivante avant d'atteindre la fin. Les
nouveaux éléments sont ajoutés silencieusement ; le fonctionnement nominal ne
rend ni spinner, ni skeleton, ni texte de chargement visible.

Sur `medium` et `expanded`, le tableau et sa pagination explicite restent
inchangés. Cette décision est une variante de présentation responsive, pas une
mutation du contrat métier ni une obligation universelle pour toute
`list-query`.

## Contrat compact

1. le premier lot reste la page `1` ;
2. la sentinelle précharge à environ une à deux hauteurs de viewport de la
   frontière ;
3. une seule demande de page suivante peut être active ;
4. chaque réponse est ajoutée dans l'ordre des pages et dédupliquée par
   l'identité canonique `uniqId` ;
5. `hasNext` dérive uniquement des métadonnées normalisées ;
6. lorsque `currentPage === lastPage`, la sentinelle devient inactive et la
   liste se termine naturellement, sans faux chargement ;
7. recherche, application ou retrait de filtre et création réussie invalident
   l'accumulation et repartent de la page `1` ;
8. une réponse appartenant à une ancienne recherche ne peut pas être ajoutée à
   la nouvelle collection ;
9. un redimensionnement ne déclenche pas de GET à lui seul ;
10. le focus et la position des éléments existants ne sont pas déplacés par un
    ajout.

## Chargement, erreur et accessibilité

L'état `loading-next` existe dans le contrôleur même s'il n'a pas de
représentation visuelle nominale. La région de résultats expose `aria-busy`
pendant l'ajout et un statut non visuel, poli, annonce les nouveaux résultats
aux technologies d'assistance.

Si la demande échoue, les cartes déjà chargées restent disponibles. La
sentinelle arrête les répétitions automatiques et une action visible
`Réessayer` apparaît à la frontière. Aucun retry infini ou temporisé n'est
permis. La reprise redemande exactement la page échouée.

Le rôle ARIA `feed` n'est pas adopté : les utilisateurs sont des enregistrements
administratifs, pas des articles éditoriaux, et ce rôle imposerait un contrat de
navigation spécifique sans bénéfice démontré. Les cartes restent dans une
liste sémantique avec une région nommée.

## Invalidation après création

La composition générée recharge aujourd'hui le dernier paramètre du
`list-query`. Dans une projection cumulative, recharger uniquement la dernière
page ne prouve pas la présence du nouvel utilisateur ni la cohérence de l'ordre.
Après succès de création, la page doit donc remettre l'accumulation à zéro et
demander la page `1`. La requête supersédée éventuelle reste soumise à la
politique `latest-wins` existante.

## Performance

Aucune virtualisation n'est ajoutée à C5 avant mesure. Les cartes ont une
hauteur variable et l'optimisation ajouterait recyclage DOM, restauration de
focus et gestion de hauteur sans besoin chiffré. Les métriques à observer sont
le nombre de cartes accumulées, la mémoire, le temps de rendu et les longues
tâches. Une limite ou une virtualisation fera l'objet d'une décision séparée si
ces mesures le justifient.

## Non-décisions

- aucune pagination par curseur imposée au backend ;
- aucune modification générique de `list-query` dans ce lot ;
- aucune bibliothèque d'infinite scroll ;
- aucun changement de pagination medium/expanded ;
- aucun loader visible en fonctionnement nominal ;
- aucune promesse de liste réellement infinie quand `lastPage` est atteinte ;
- aucune extraction partagée avant un second cas réel.

## Preuves exigées avant réalisation

1. oracles Playwright écrits avant le runtime et échouant uniquement sur la
   pagination compacte historique ;
2. absence des contrôles `Précédent`, `Suivant` et numéros en compact ;
3. présence inchangée de ces contrôles en medium et expanded ;
4. préchargement anticipé, séquentiel et sans loader visible ;
5. accumulation ordonnée et dédupliquée ;
6. aucun double GET lorsque la sentinelle reste intersectée ;
7. arrêt exact sur `lastPage` ;
8. conservation des cartes et retry manuel après erreur ;
9. reset page `1` après recherche, filtre et création ;
10. resize sans GET, focus stable et annonces accessibles ;
11. work order recalculé depuis le `main` portant les oracles ;
12. revue humaine d'une preuve navigateur mobile avant fusion.

## Références

- [Meta Engineering — reconstruction de Facebook.com](https://engineering.fb.com/2020/05/08/web/facebook-redesign/)
- [Meta Engineering — classement client et cache du News Feed](https://engineering.fb.com/2016/10/20/networking-traffic/client-side-ranking-to-more-efficiently-show-people-stories-in-feed/)
- [Relay — connections et pagination](https://relay.dev/docs/v17.0.0/tutorial/connections-pagination/)
- [React Native — FlatList](https://reactnative.dev/docs/flatlist)
- [WAI-ARIA APG — Feed Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/feed/)
- [Angular CDK — scrolling](https://material.angular.dev/cdk/scrolling/overview)

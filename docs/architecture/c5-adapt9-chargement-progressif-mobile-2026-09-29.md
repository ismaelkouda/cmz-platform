# C5 / ADAPT-9 — Chargement progressif mobile silencieux

**Date :** 2026-09-29
**Statut :** décision produit approuvée le 2026-09-29 ; revue technique et
fusion encore requises ; runtime non modifié
**Décision :** [ADR-0075](../adr/0075-chargement-progressif-mobile-silencieux.md)

## 1. Résultat attendu

La liste mobile ne présente plus `Précédent`, `Suivant` ni numéros de page. La
lecture continue verticalement : lorsque la personne approche de la dernière
carte déjà chargée, le lot suivant est demandé assez tôt pour être ajouté sans
spinner visible dans le cas nominal.

Cette apparente continuité ne doit masquer ni l'état machine ni les limites du
backend. La page connaît toujours le lot actif, le prochain lot, la dernière
page, une demande en cours et une erreur éventuelle. Elle ne prétend jamais que
la collection finie est infinie.

## 2. État actuel mesuré

Le `ListUsersFacade` expose une seule `ListUsersPage` et `items` reflète
uniquement cette page. `goToPage` appelle `loadUsers(page)` et le template rend
la même collection dans le tableau et les cartes. La navigation paginée est
commune aux trois fenêtres.

Conséquences :

- masquer les boutons seuls couperait l'accès aux autres pages ;
- charger la page `2` remplace aujourd'hui la page `1` ;
- l'invalidation après création recharge le dernier paramètre connu ;
- la présentation doit accumuler les pages sans modifier les DTO réseau ni le
  mapper canonique.

## 3. Modèle d'état borné à la page

La réalisation devra introduire un état de présentation compact équivalent à :

```text
loadedPages       Map<pageNumber, User[]>
nextPage          number | null
loadingNext       boolean
failedPage        number | null
queryGeneration   nombre monotone
```

`mobileUsers` est une projection calculée des pages contiguës depuis `1`, avec
déduplication stable par `uniqId`. `medium` et `expanded` continuent d'utiliser
les éléments de la page courante.

`queryGeneration` change lorsque la recherche ou les filtres appliqués changent
et après une création réussie. Une réponse tardive d'une génération antérieure
est ignorée. La politique réseau `latest-wins` reste le premier garde-fou ; la
génération protège l'accumulateur de présentation.

## 4. Déclenchement anticipé

Une sentinelle non interactive est rendue après les cartes compactes tant que
`nextPage` existe. `IntersectionObserver` l'observe avec une marge verticale
positive correspondant approximativement à une à deux hauteurs de viewport.

Le callback ne charge que si toutes les conditions sont vraies :

- disposition `compact` ;
- sentinelle intersectée ;
- page suivante connue ;
- aucune demande suivante active ;
- aucune erreur de page suivante en attente de décision humaine.

L'observer est déconnecté à la destruction et recréé seulement si la sentinelle
réelle change. Aucun handler `scroll` global n'est ajouté.

## 5. Présentation visible

### Nominal

- aucun spinner ;
- aucun skeleton ;
- aucun texte « chargement » visible ;
- les nouvelles cartes apparaissent à la suite ;
- aucun saut vers la nouvelle carte et aucun changement de focus.

### Réseau trop lent

La frontière peut momentanément rester sans nouvelle carte. La page garde
`aria-busy="true"` et un statut `aria-live="polite"` non visuel, mais n'ajoute
pas une animation contraire à la décision produit.

### Erreur

- les cartes existantes restent affichées ;
- le chargement automatique est suspendu ;
- `Réessayer` devient visible et nomme l'action ;
- un seul clic redemande la même page ;
- aucune temporisation ne boucle en arrière-plan.

### Fin réelle

La sentinelle est retirée lorsque `lastPage` est atteinte. La liste se termine
naturellement sans loader permanent ni message obligatoire.

## 6. Transitions qui réinitialisent l'accumulation

| Événement                   | Effet compact                                              |
| --------------------------- | ---------------------------------------------------------- |
| recherche appliquée         | génération suivante, pages vidées, GET page `1`            |
| filtres appliqués           | génération suivante, pages vidées, GET page `1`            |
| chip de filtre retirée      | génération suivante, pages vidées, GET page `1`            |
| création réussie            | génération suivante, pages vidées, GET page `1`            |
| resize compact → medium     | aucun GET ; page courante conservée                         |
| resize medium → compact     | aucun GET ; pages compactes connues réutilisées             |
| erreur de page suivante     | données gardées, auto-load suspendu, retry humain           |
| réponse ancienne/supersédée | aucune mutation visible                                     |

## 7. Oracles à écrire avant le runtime

### Navigateur

1. à 390×844, aucun bouton ou numéro de pagination n'est exposé ;
2. la page `2` est demandée avant que la sentinelle atteigne la zone visible
   stricte ;
3. les cartes de page `1` restent présentes après l'ajout de la page `2` ;
4. une sentinelle intersectée longtemps ne produit qu'un GET à la fois ;
5. aucune barre, spinner, skeleton ou chaîne visible de chargement n'apparaît ;
6. la page `lastPage + 1` n'est jamais demandée ;
7. une erreur conserve les cartes et expose `Réessayer` ;
8. recherche, filtre et création repartent de `page=1` ;
9. à 1024×768 et 1440×1024, la pagination explicite reste disponible ;
10. un resize seul ne produit aucune requête.

### Composant

- accumulation ordonnée de pages reçues ;
- déduplication `uniqId` ;
- rejet d'une réponse d'ancienne génération ;
- verrou `loadingNext` ;
- calcul exact de `nextPage` et arrêt terminal ;
- reprise de la page échouée ;
- reset après création réussie.

## 8. Séquence de livraison

1. faire revoir et fusionner ADR-0075 et le présent contrat ;
2. ajouter uniquement les oracles en échec attendu borné ;
3. faire revoir et fusionner les oracles ;
4. recalculer le work order depuis le nouveau `main` ;
5. réaliser dans les fichiers autorisés de la page ;
6. exécuter tests Angular, Playwright ciblé/complet, lint, build et Oracle ;
7. fournir une session mobile visible pour revue humaine ;
8. seulement après validation, commit, review Soumaila, fusion et CI
   post-fusion.

## 9. Hors périmètre

- changement du backend ou adoption forcée de curseurs ;
- modification générique du moteur `list-query` ;
- virtualisation ;
- persistance du scroll après fermeture du navigateur ;
- synchronisation de la pagination dans l'URL ;
- chargement progressif du tableau medium/desktop ;
- extraction d'une primitive partagée sans second cas réel.

## 10. Relation avec ADAPT-8

ADAPT-8 et ADAPT-9 modifient deux surfaces indépendantes : le contenu du
panneau de filtres en `medium`/`expanded` pour le premier, la navigation dans
les cartes `compact` pour le second. ADAPT-9 ne remplace, ne simplifie et ne
réordonne pas implicitement ADAPT-8. Chaque chantier garde ses propres
références, oracles, work order et revue visuelle afin qu'un défaut de l'un ne
soit pas masqué par l'autre.

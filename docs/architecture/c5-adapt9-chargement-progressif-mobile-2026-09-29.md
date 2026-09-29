# C5 / ADAPT-9 — Chargement progressif mobile silencieux

**Date :** 2026-09-29 **Statut :** terminé ; ADAPT-9a et ADAPT-9b approuvés,
fusionnés et vérifiés par la CI post-fusion **Décision :**
[ADR-0075](../adr/0075-chargement-progressif-mobile-silencieux.md)

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

| Événement                   | Effet compact                                     |
| --------------------------- | ------------------------------------------------- |
| recherche appliquée         | génération suivante, pages vidées, GET page `1`   |
| filtres appliqués           | génération suivante, pages vidées, GET page `1`   |
| chip de filtre retirée      | génération suivante, pages vidées, GET page `1`   |
| création réussie            | génération suivante, pages vidées, GET page `1`   |
| resize compact → medium     | aucun GET ; page courante conservée               |
| resize medium → compact     | aucun GET ; pages compactes connues réutilisées   |
| erreur de page suivante     | données gardées, auto-load suspendu, retry humain |
| réponse ancienne/supersédée | aucune mutation visible                           |

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

### ADAPT-9a — réalisation des oracles

Le fichier
`apps/users-management-proof/e2e/mobile-progressive-loading-oracles.spec.ts`
porte dix scénarios navigateur. Sur le runtime historique, neuf échouent de
façon attendue uniquement lorsque la pagination compacte est visible et que la
sentinelle progressive est absente. Le dixième est déjà un succès réel :
`medium` et `expanded` conservent leur pagination sans chargement automatique.
Le passage ciblé termine à `10 passed` en 10,2 s ; le passage Playwright complet
termine à `33 passed` en 27,6 s, sans régression des vingt-trois scénarios
préexistants.

Trois oracles de composant complètent la frontière navigateur dans
`page.component.spec.ts` : accumulation ordonnée avec déduplication `uniqId`,
verrou de page suivante avec retry borné, et reset page `1` après création. Le
passage Angular termine à `26 passed | 3 expected fail`, soit vingt-neuf tests
exécutés. Les échecs attendus restent déclarés dans les tests et devront être
convertis en succès réels pendant la réalisation.

Ce lot ne modifie aucun fichier Angular de production, aucun fichier généré,
aucune dépendance et aucun work order. Après sa revue et sa fusion, un nouveau
work order devra être calculé depuis `main` avant tout changement runtime.

### ADAPT-9b — réalisation du runtime

La page réalise maintenant la projection compacte sans modifier la primitive
`list-query` générée :

- `linkedSignal` accumule les pages contiguës par génération et déduplique
  stablement `uniqId` ;
- `IntersectionObserver` observe la sentinelle dans le vrai conteneur scrollable
  avec `rootMargin: 150%`, sans listener global de scroll ;
- une seule page suivante peut être active ; une erreur suspend l'automatisme et
  expose un retry local, sans dupliquer l'alerte globale ;
- recherche, filtres, retrait de chip et création réussie réinitialisent
  explicitement la projection et demandent la page `1` ;
- les réponses qui ne correspondent plus à la génération et à la page attendues
  ne mutent pas la liste visible ;
- `medium` et `expanded` gardent la pagination explicite et ne déclenchent aucun
  chargement progressif ;
- l'état nominal reste silencieux visuellement ; `aria-busy` et un live region
  non visuel exposent l'attente aux technologies d'assistance ;
- la sentinelle conserve une courte grâce DOM après une réponse très rapide,
  puis disparaît à la dernière page ; son timer et l'observer sont nettoyés à la
  destruction.

La vérification confinée du work order
`8153714da6295f2b9edfaab31247b587ed3e819402fc2aae281beb39124b0f75` est verte :
compilation, build, lint, tests et zéro violation de périmètre. Les trois
anciens échecs attendus du composant sont devenus des succès réels ; le fichier
ciblé termine à `15 passed`. Les dix oracles navigateur ADAPT-9 terminent à
`10 passed`, dont single-flight, erreur/retry, réponse tardive, reset
recherche/filtre/création, resize et accessibilité. La suite Angular complète
termine à `30 passed`, la régression Playwright à `33 passed` et le build
production passe avec `7,89 kB` de style composant pour une limite d'erreur à
`8 kB`.

Les suites de filtre et de présentation ont été raccordées au nouveau contrat :
les fixtures de filtre restent mono-page pour isoler leur responsabilité, alors
que la preuve de présentation attend la fin du préchargement avant de mesurer le
silence réseau d'un resize. Deux captures issues du vrai rendu Angular sont
attachées par Playwright : collection compacte de 15 utilisateurs et frontière
d'erreur avec `Réessayer`.

La relecture de cette preuve a fixé la hiérarchie compacte finale sans changer
le contrat réseau : le titre suffit sans sous-titre, la recherche primaire «
Rechercher un utilisateur » reste avant le déclencheur des filtres, et son
indice explicite couvre nom, prénom et adresse e-mail. L'action de création
reste l'unique FAB fixé au scaffold, mais la décision produit postérieure au
wireframe retient un simple `+` visible. Le bouton natif conserve le nom
accessible et le tooltip « Créer un utilisateur » ; `medium` et `expanded`
gardent le libellé visible dans le heading. Cette exception C5 ne crée aucune
règle génératrice `create -> FAB` ni `compact -> icon-only`.

Le budget CSS n'a pas été relevé pour accepter l'ajustement : des règles
redondantes ont été consolidées et le build reste sous sa limite stricte.

## 8. Séquence de livraison

1. ~~faire revoir et fusionner ADR-0075 et le présent contrat~~ — PR #141,
   commit `0db8669ef76ee9986911b2c333405667bc2ac8cc`, fusion
   `2805763217653e85d8f125568fb1b5ccd903bcfb`, 17 contrôles et CI post-fusion
   `36596093253` verts ;
2. ~~ajouter uniquement les oracles en échec attendu borné — ADAPT-9a~~ — PR
   #142 fusionnée ;
3. ~~recalculer le work order depuis le nouveau `main`~~ — work order
   `8153714d…` ;
4. ~~réaliser dans les fichiers autorisés et convertir les échecs attendus~~ ;
5. ~~exécuter tests Angular, Playwright ciblé, lint, build et Oracle~~ ;
6. ~~exécuter la régression Playwright complète et produire les captures
   réelles~~ — `33 passed` ;
7. ~~ajustements issus de la validation visuelle, preuve actualisée, commit,
   push et revue obligatoire~~ — Soumaila a approuvé le commit exact
   `fcbd60b6d360c59d107b88518e79c83dbe1c4a02` ;
8. ~~fusion puis vérification de la CI exacte post-fusion~~ — PR #143 fusionnée
   dans `63318d783d8dde15ec7e9ceb15b1f61f1bb7c7d1`, CI `36615553281` verte sur
   `main`.

## 9. Hors périmètre

- changement du backend ou adoption forcée de curseurs ;
- modification générique du moteur `list-query` ;
- virtualisation ;
- persistance du scroll après fermeture du navigateur ;
- synchronisation de la pagination dans l'URL ;
- chargement progressif du tableau medium/desktop ;
- extraction d'une primitive partagée sans second cas réel.

## 10. Relation avec ADAPT-8

ADAPT-8 et ADAPT-9 modifient deux surfaces indépendantes : le contenu du panneau
de filtres en `medium`/`expanded` pour le premier, la navigation dans les cartes
`compact` pour le second. ADAPT-9 ne remplace, ne simplifie et ne réordonne pas
implicitement ADAPT-8. Chaque chantier garde ses propres références, oracles,
work order et revue visuelle afin qu'un défaut de l'un ne soit pas masqué par
l'autre.

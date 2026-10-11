# ADR-0100 — Tri des vues de données par modes explicites

- **Statut :** Accepted
- **Date :** 2026-10-11
- **Décideur :** propriétaire du produit CMZ
- **Supersède partiellement :**
  [ADR-0074](./0074-filtres-progressifs-par-blocs-actifs.md), uniquement la
  condition qui exigeait une capacité de tri backend pour autoriser un tri
  local. Les filtres, le regroupement et le choix de colonnes restent régis par
  ADR-0074.
- **Construit sur :**
  [ADR-0078](./0078-vues-de-donnees-par-capacites-optionnelles.md), sans le
  superséder.

## Contexte

Les vues de données de la plateforme peuvent afficher une collection complète,
une page fournie par un backend ou des fragments chargés progressivement. Les
API officielles recensées dans le guide associé emploient plusieurs écritures de
tri serveur. Aucun de ces faits ne permet de déduire qu'une colonne est triable,
que le navigateur possède toute la collection ou qu'un backend accepte un
paramètre donné.

ADR-0074 interdisait le tri local sans capacité métier et backend explicite.
Cette prudence empêchait une simulation trompeuse du tri global, mais ne
distinguait pas le cas désormais décidé par le propriétaire : trier uniquement
la page courante dans le navigateur.

Le 2026-10-11, le propriétaire a décidé :

1. qu'une vue peut être non triable, triable dans le navigateur ou triable par
   le backend ;
2. que le tri backend multi-dialectes est documenté maintenant mais réalisé plus
   tard contre une API réelle ;
3. que la première réalisation utilise Angular Material en Angular et des
   primitives web/React en React, sans bibliothèque de table ajoutée ;
4. que C5 peut trier seulement les éléments de la page courante renvoyée par le
   backend.

L'exigence de rendre cette portée perceptible complète la proposition acceptée :
elle est ajoutée par cet ADR pour éviter de présenter le résultat comme un tri
global. Aucune forme visuelle n'est approuvée à ce stade ; le propriétaire devra
valider sa réalisation dans le lot Angular.

Cette décision est acceptée comme politique d'architecture. Elle ne constitue
pas une preuve de réalisation Angular, React ou backend.

## Options envisagées

### Option A — Aucun modèle commun

Chaque page définit librement le tri.

- Avantage : aucun contrat nouveau.
- Inconvénients : sémantique, portée, accessibilité et dialecte backend peuvent
  diverger ou rester implicites.

### Option B — Tri client universel

Toute vue trie dans le navigateur.

- Avantage : réalisation immédiate et indépendante du backend.
- Inconvénients : résultat faux ou trompeur avec pagination distante, chargement
  progressif ou virtualisation serveur.

### Option C — Dialecte serveur universel

La plateforme impose un paramètre, par exemple `sort` ou `order_by`.

- Avantage : contrat wire uniforme.
- Inconvénient : aucun standard universel n'existe ; l'écriture ne se déduit ni
  du langage ni du framework du backend.

### Option D — Intention commune et exécutions natives explicites

La vue déclare un mode fermé et, pour le serveur, l'adaptateur du backend encode
l'intention dans son dialecte réel.

- Avantages : portée honnête, échec fermé, neutralité backend et rendus
  idiomatiques par cible.
- Coûts : davantage de contrats et de preuves ; aucune réalisation ne peut être
  promue sur la seule décision documentaire.

## Décision

L'option D est retenue. Une vue ou une lecture déclare exactement un mode :

- `none` : aucune capacité de tri ; valeur par défaut fail-closed ;
- `client` : tri local avec portée obligatoire `complete-collection` ou
  `current-page` ;
- `server` : tri distant, encodé par un adaptateur choisi d'après le contrat de
  l'API réelle.

Une colonne n'est triable que si elle figure dans une liste fermée avec son
identifiant, sa source de valeur et sa règle de comparaison ou son mapping
serveur. La V1 est mono-tri et suit le cycle `asc → desc → none`.

### Portée du mode client

- `complete-collection` exige la preuve que toute la collection, bornée, est
  présente dans le navigateur ;
- `current-page` trie uniquement la réponse courante visible. Cette limite est
  communiquée visuellement et aux technologies d'assistance lorsque le tri est
  actif ;
- trier séparément les fragments d'un chargement progressif ou d'une fenêtre
  virtualisée distante est refusé.

La position des valeurs absentes est déclarée par le contrat. C5 choisit
`nulls-last` dans les deux directions. Les égalités conservent l'ordre reçu.

### Mode serveur différé

Le modèle commun porte une intention typée — identifiant de champ et direction —
jamais un nom de paramètre wire universel. L'adaptateur du backend choisit
explicitement son codec. Un champ non allowlisté est refusé ; il n'est ni ignoré
ni concaténé dans SQL ou l'ORM. Un ordre total stable complète les valeurs ex
aequo pour préserver la pagination.

Un outil local (`MatTableDataSource`, `Array.sort()` ou équivalent) ne peut pas
simuler un mode `server`. Tant que le codec et l'API réelle ne sont pas prouvés,
la vue reste `none` ou utilise explicitement un mode `client` avec sa portée.

### Réalisations UI

Angular et React partagent la sémantique, pas un composant cross-stack :

- Angular utilise `MatSort`/`MatSortHeader`, un état signal et une projection
  non mutante ;
- React utilise un bouton HTML, un état React et une projection non mutante,
  sans nouvelle bibliothèque.

Le lot Angular mesure le poids de production avant et après l'ajout de la
primitive Material. Un dépassement d'un budget existant arrête le lot : le
budget n'est pas relevé pour faire passer la réalisation.

WAI-ARIA recommande qu'une seule colonne porte `aria-sort` et l'exemple APG le
retire des colonnes inactives. Angular Material 22.2.1 expose officiellement
`aria-sort="none"` sur ses en-têtes inactifs. La réalisation Angular conserve la
primitive officielle, compte seulement `ascending|descending` comme direction
active et qualifie ce comportement avec NVDA et VoiceOver. Elle ne manipule ni
API privée ni DOM pour fabriquer une conformité apparente. Un résultat ambigu ou
bruyant arrête le lot Angular pour arbitrage.

## Application à C5

Cette cible est décidée mais pas encore réalisée :

- Medium et Expanded : Nom, Prénom, Email, Profil, Rôle, Statut et Mise à jour
  sont triables ; `#` ne l'est pas ;
- Compact V1 reste `none`, car les pages y sont ajoutées progressivement ;
- le tri est `client/current-page`, ne déclenche aucune requête et est
  réappliqué à toute nouvelle réponse après page, recherche, filtre ou
  rechargement ;
- `Réinitialiser` efface recherche, filtres et tri, puis relance la lecture avec
  des paramètres de recherche et de filtre vides. En mode client, aucun tri
  n'est envoyé sur le réseau et la nouvelle réponse devient l'ordre reçu ;
- les textes utilisent une collation française sans sensibilité à la casse ;
  Profil, Rôle et Statut utilisent leur libellé localisé affiché ; Mise à jour
  utilise la date brute ; les valeurs absentes restent en dernier.

L'oracle C5 actuel qui interdit tout `aria-sort` reste la vérité exécutable
jusqu'au lot de réalisation Angular. Aucun claim de tri C5 n'est donc promu par
cet ADR.

## Justification

Le modèle rend explicite ce qui change le sens du résultat : où se trouve la
collection triée, quelle portion est couverte et quel système applique l'ordre.
Il permet d'utiliser les primitives officielles de chaque cible sans confondre
leur DOM, leur API ou leur maturité. Il évite surtout le faux sentiment de tri
global produit par un navigateur qui ne possède qu'une page.

## Conséquences

### Positives

- aucune colonne ni écriture backend n'est déduite ;
- un tri local limité reste utile sans mentir sur sa portée ;
- un backend Laravel, Django, Spring, .NET, Rust ou propriétaire garde son
  contrat wire réel ;
- les règles de comparaison, de reset et d'accessibilité deviennent testables ;
- Angular et React restent idiomatiques et remplaçables séparément.

### Négatives / dette acceptée

- le schéma exécutable, les codecs et les renderers restent à réaliser ;
- `current-page` ne produit aucune cohérence entre plusieurs pages ;
- le comportement `aria-sort="none"` de Material exige des essais lecteurs
  d'écran réels ;
- la portée locale doit occuper une place perceptible dans l'interface ; sa
  forme exacte sera validée visuellement dans le lot Angular.

### Points à réévaluer

- première API réelle qui déclare un dialecte de tri serveur ;
- premier besoin de multi-tri, de tri Compact ou de collection virtualisée ;
- dépassement mesuré de poids ou régression d'accessibilité de Material ;
- second usage indépendant permettant d'envisager une primitive partagée.

## Références

- [Guide multi-backend du tri](../architecture/tri-vues-donnees-multi-backend-2026-10-11.md)
- [WAI-ARIA 1.2 — `aria-sort`](https://www.w3.org/TR/wai-aria-1.2/#aria-sort)
- [WAI-ARIA APG — sortable table](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/)
- [Angular Material — Sort](https://material.angular.dev/components/sort/overview)
- [Angular Material 22.2.1 — source `MatSortHeader`](https://github.com/angular/components/blob/v22.2.1/src/material/sort/sort-header.ts)
- [Angular Material 22.2.1 — tests de tri](https://github.com/angular/components/blob/v22.2.1/src/material/sort/sort.spec.ts)

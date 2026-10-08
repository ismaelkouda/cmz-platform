# ADR-0093 — Réaliser le filtre Compact à deux niveaux de C5 en React

- **Statut :** Accepted
- **Date :** 2026-10-08
- **Décideurs :** équipe plateforme CMZ

## Contexte

ADR-0092 a fermé le chargement progressif Compact de la surface C5 React. Le
filtre restait toutefois un `aside` visuellement déplacé en bas de l'écran : il
n'était ni modal, ni navigable par critère et exposait simultanément tous les
contrôles. Cette projection contredisait le parcours Compact approuvé par
ADR-0073 et les exemples génériques content-addressed.

Le runtime possède déjà le bon modèle métier : `appliedFilters` est distinct de
`draftFilters` et seul `Appliquer` déclenche la requête. La correction doit donc
rester une responsabilité de présentation. Elle ne doit modifier ni le contrat
de composition, ni les hooks générés, ni les endpoints.

## Décision

En Compact seulement, le panneau devient un élément HTML natif `<dialog>` ouvert
avec `showModal()`. Le navigateur fournit la pile top-layer, le backdrop, la
modalité, la gestion d'Échap et la borne de focus. Aucun gestionnaire de focus
trap ou mécanisme `inert` maison n'est ajouté.

Le même dialogue possède deux vues internes :

1. un sommaire de boutons `Profil`, `Rôle` et `Statut`, chacun accompagné de la
   valeur brouillon courante et d'un chevron décoratif ;
2. le contrôle du critère choisi, avec un bouton `Retour` qui restaure le focus
   au bouton de sommaire correspondant.

Le titre accessible du dialogue suit la vue (`Filtres`, puis le libellé du
critère). Entrer dans un détail déplace le focus vers son premier contrôle.
Fermer, Échap ou le démontage restituent le focus au déclencheur. Le footer
`Réinitialiser` / `Appliquer` reste commun, visible et séparé du corps
scrollable. Le sheet occupe la largeur disponible, reste ancré au bas de la
fenêtre et ne dépasse jamais `80dvh`.

Medium et Expanded conservent leur panneau existant dans cette tranche. Le
brouillon demeure possédé par la page : un changement de classe de largeur ne le
recrée pas et n'émet aucun GET. Revenir en Compact restaure également la vue
interne du critère lorsqu'elle est encore pertinente.

Les images du corpus générique Compact restent des exemples de disposition sans
autorité métier. Elles ne sont pas promues dans le manifeste de présentation de
la page utilisateurs. La conformité de cette réalisation est établie par le
contrat de page et les preuves de son runtime réel.

## Invariants vérifiés

- un seul dialogue existe pendant la transition sommaire → détail ;
- aucune modification ou réinitialisation du brouillon n'émet de requête ;
- fermer sans appliquer abandonne le brouillon ;
- appliquer ferme le dialogue et produit exactement un GET page 1 ;
- le compteur et les résumés reflètent seulement les filtres appliqués ;
- le resize conserve le brouillon sans accès réseau ;
- le rendu reste utilisable à 320 CSS px et avec le texte agrandi à 200 % ;
- axe ne remonte aucune violation WCAG A/AA sur le dialogue ;
- les fichiers générés et le runtime de composition ne sont pas modifiés.

## Conséquences

- le deuxième des trois écarts Compact d'ADR-0091 est fermé ;
- le FAB de création reste la dernière parité Compact explicitement ouverte ;
- aucune primitive de filtre partagée n'est extraite à partir de ce seul cas ;
- le corpus générique reste réutilisable sans devenir une preuve de cette page ;
- la solution s'appuie sur la plateforme Web native déjà utilisée par le
  dialogue de création React et n'ajoute aucune dépendance.

## Preuves de réalisation

La réalisation est contrôlée par trois scénarios Chromium dédiés et par les onze
scénarios de régression existants de la page. Ils couvrent la géométrie, axe
WCAG A/AA, l'identité du dialogue, les transferts de focus, l'abandon et
l'application du brouillon, le silence réseau au resize, le reflow à 200 % et la
coexistence avec le chargement progressif Compact.

Le profil CDP exécute désormais, à chaque cycle, le dialogue de création puis le
parcours Compact `Filtres → Statut → Retour → Fermer`. Trois campagnes
indépendantes de 30 cycles de chauffe et 100 cycles mesurés donnent :

- 366–367 Kio de croissance heap totale ;
- 64–75 Kio sur le dernier quart ;
- `1 document / 227 nœuds / 168 listeners`, constants à chaque checkpoint.

Les seuils bloquants restent 512 Kio au total et 128 Kio sur le dernier quart.
Les captures du runtime réel Compact, Medium et Expanded sont produites comme
artefacts temporaires de test ; elles ne remplacent ni les références approuvées
ni une décision humaine de promotion visuelle.

## Références

- [ADR-0073 — Filtrage adaptatif](./0073-filtrage-adaptatif-par-panneau-unique.md)
- [ADR-0091 — Qualification Chromium C5 React](./0091-qualifier-c5-react-dans-chromium-sans-declarer-la-parite.md)
- [ADR-0092 — Chargement progressif Compact React](./0092-chargement-progressif-compact-react-c5.md)
- [HTML Living Standard — The `dialog` element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element)
- [WAI-ARIA APG — Modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [WCAG 2.2 — Focus order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)

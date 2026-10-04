# Exemples génériques de mise en page — vue de données Compact

- **Statut :** exemple approuvé par revue humaine le 3 octobre 2026
- **Autorité :** mise en page seulement (`layout-guidance-only`)
- **Sujet :** vue de données générique en espace Compact
- **Manifeste :** [`example-set.json`](./example-set.json)
- **Décision :**
  [ADR-0083](../../../docs/adr/0083-preuve-page-exemple-mise-en-page-et-archive.md)

## Objectif

Ce dossier illustre une projection Compact d'une vue de données. Il ne réduit
pas le tableau Medium/Expanded : il remplace la grille par une liste de cartes
lisibles, adapte les capacités déclarées par le contrat de page et utilise un
bottom sheet modal pour les filtres détaillés.

Les images sont génériques. Elles ne représentent aucune page métier et
n'autorisent aucune capacité absente du contrat de page.

`example-set.json` porte désormais `status: approved-example` à la suite de la
validation visuelle humaine explicite des cinq PNG exacts. Une génération ne
peut néanmoins les consommer qu'avec un contrat de page compatible, une
correspondance explicite des capacités et une preuve runtime séparée.

## États approuvés

| Fichier                                              | État illustré                                      |
| ---------------------------------------------------- | -------------------------------------------------- |
| `compact-list.proposed.png`                          | cartes, recherche, commandes et FAB                |
| `compact-search-active.proposed.png`                 | recherche locale renseignée et action d'effacement |
| `compact-list-with-card-actions.proposed.png`        | actions de carte optionnelles                      |
| `compact-filter-summary.proposed.png`                | sommaire du bottom sheet modal                     |
| `compact-filter-detail.proposed.png`                 | contrôle d'un critère dans le même bottom sheet    |

## Ce qui fait autorité

- le titre et le total autoritatif précèdent les commandes locales ;
- si le contrat l'autorise, la recherche locale occupe sa propre ligne et toute
  la largeur utile, sans partager l'espace avec les boutons d'action ;
- les données deviennent une liste de cartes et non un tableau horizontal
  écrasé ;
- les cartes ne sont activables que si un contrat déclare une action de détail ;
- les actions internes d'une carte restent distinctes de l'activation de la
  carte ;
- le bouton de création flottant reste optionnel, unique, nommé et hors du
  contenu/focus ;
- le fonctionnement nominal n'affiche ni pagination, ni spinner, ni faux état
  « chargement » ;
- le bottom sheet monte depuis le bas, reste sous `80dvh`, rend le fond inerte
  et conserve un header, un corps scrollable et un footer sticky ;
- le sommaire présente des critères activables avec libellé, valeur brouillon et
  chevron ;
- le détail remplace le sommaire dans le même sheet et fournit un retour ;
- `Réinitialiser` modifie seulement le brouillon ; `Filtrer` applique ;
- fermer ou Échap abandonne le brouillon et restitue le focus au déclencheur.

## Capacités optionnelles et inférences interdites

La recherche, le FAB, le rafraîchissement, le filtrage et les actions de carte
ne sont jamais déduits de l'image. Le contrat de page doit les déclarer
séparément. La présence d'un interrupteur ou d'une suppression dans l'exemple
n'autorise ni mutation, ni permission, ni endpoint.

Le nombre `42`, les champs, les libellés, les couleurs et les données sont
illustratifs. Le total n'est affiché dans un runtime que s'il vient d'une source
autoritative ; il ne représente jamais le nombre de cartes déjà chargées.

## Contrat de recherche locale

La recherche illustrée porte uniquement sur la collection courante. Elle ne
doit pas être déplacée dans la barre globale de l'application, ce qui lui
donnerait à tort une portée globale. Elle est absente quand le contrat de page
ne déclare pas cette capacité.

Le contrat doit définir au minimum :

- `search.enabled` : présence explicite de la capacité ;
- `search.fields` : champs métier réellement recherchables ;
- `search.parameter` : paramètre accepté par le backend ;
- `search.execution` : `submit` ou `debounced` ;
- `search.clearable` : présence de l'effacement ;
- `search.preserve_on_refresh` : conservation lors d'un rafraîchissement.

`submit` est le mode sûr par défaut lorsque le coût ou le comportement du
backend est inconnu. `debounced` exige un délai déclaré, l'annulation logique
des requêtes dépassées et l'ignorance des réponses obsolètes. L'interface ne
doit jamais présenter une recherche appliquée en direct si le runtime attend en
réalité une validation invisible au clavier.

Une nouvelle requête repart du début de la collection. Un rafraîchissement
conserve la requête. Un changement de classe de largeur conserve l'état sans
émettre de GET supplémentaire.

## Projection Angular Web

Angular Material 22.2.1 ne fournit pas de `MatSearchBar`. L'implémentation de
référence doit donc composer les primitives natives et maintenues :

- un `<form role="search">` ou un élément `<search>` nommé ;
- un `<input matInput type="search">` dans `mat-form-field` ;
- un `mat-icon-button` nommé pour effacer une valeur non vide ;
- un bouton de soumission visible si `search.execution` vaut `submit` et que
  l'action clavier seule ne suffit pas à rendre le comportement évident ;
- `MatAutocomplete` ou Angular Aria Combobox uniquement si le contrat prévoit
  réellement des suggestions.

La loupe décorative n'est pas un bouton. Le champ conserve un vrai libellé
associé, `enterkeyhint="search"`, un focus visible et une cible tactile d'au
moins 48 px. Le bouton d'effacement n'existe dans l'ordre de tabulation que
lorsqu'une valeur est présente.

## Références officielles

- [Material 3 — Search](https://m3.material.io/components/search/guidelines) :
  portée, anatomie et comportements de recherche ;
- [Android Developers — Search bar](https://developer.android.com/develop/ui/compose/components/search-bar) :
  distinction entre barre persistante, état étendu et recherche principale ;
- [Angular Material — Input](https://material.angular.dev/components/input/overview)
  et [Button](https://material.angular.dev/components/button/overview) :
  primitives Web maintenues à composer ;
- [WAI-ARIA APG — Search landmark](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/search)
  et [WAI — Labeling controls](https://www.w3.org/WAI/tutorials/forms/labels/) :
  landmark et nom accessible ;
- [WCAG 2.2 — Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) :
  exigences minimales de cible interactive.

## Accessibilité et runtime

L'image ne prouve pas la modalité, le focus, le clavier ou le chargement
progressif. La réalisation doit prouver :

- `role="dialog"`, `aria-modal="true"`, focus initial, focus trap et restitution
  pour le sheet ;
- boutons icônes de taille tactile, nom accessible, tooltip et focus visible ;
- liste/région nommée, `aria-busy` interne et annonce polie lors de l'ajout ;
- préchargement anticipé, concurrence unique, déduplication et arrêt exact sur
  la dernière page ;
- erreur de page suivante avec conservation des cartes et action `Réessayer` ;
- absence de GET ou POST causé uniquement par un redimensionnement.

[`mockup.html`](./mockup.html), [`mockup.css`](./mockup.css) et
[`render.mjs`](./render.mjs) servent uniquement
à reproduire les images. Ils ne constituent pas un exemple d'implémentation
Angular ou une preuve d'accessibilité.

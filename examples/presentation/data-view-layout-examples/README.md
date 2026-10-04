# Exemples génériques de mise en page — vue de données

- **Statut :** exemple approuvé, indépendant de toute fonctionnalité
- **Autorité :** mise en page seulement (`layout-guidance-only`)
- **Sujet :** vue de données générique
- **Manifeste :** [`example-set.json`](./example-set.json)
- **Décision :**
  [ADR-0083](../../../docs/adr/0083-preuve-page-exemple-mise-en-page-et-archive.md)

## Objectif

Ce dossier donne à un humain ou à un LLM des exemples de composition pour une
vue de données dense. Les images montrent comment organiser un titre de table,
un total, une recherche, des commandes optionnelles, des filtres de colonne, un
panneau de filtres, un rail d'actions et un défilement horizontal.

Elles ne représentent aucune fonctionnalité du produit. Les mots, lignes,
colonnes et valeurs sont fictifs. Aucun écran ne doit être généré en copiant les
images sans relire son contrat de page.

Les six images exactes ont reçu une validation visuelle humaine explicite le
2026-10-03. Cette approbation porte seulement sur la disposition et reste
soumise aux capacités et interdictions du manifeste.

## Lecture obligatoire par un LLM

Avant d'utiliser une image, le réalisateur DOIT :

1. lire `example-set.json` avec l'image ;
2. sélectionner une image dont les capacités correspondent au contrat de page ;
3. ignorer toute capacité montrée mais non déclarée par ce contrat ;
4. conserver l'ordre des régions et les priorités adaptatives applicables ;
5. choisir les primitives officielles de la stack cible ;
6. produire une preuve runtime d'accessibilité, de clavier, de focus, de
   redimensionnement et de défilement ;
7. soumettre le résultat à une validation humaine distincte.

## Ce qui fait autorité

- le titre du tableau et le total sont regroupés à gauche de sa toolbar ;
- la recherche et les commandes sont regroupées à droite ;
- les commandes gardent icône et libellé lorsque l'espace est confortable ;
- elles deviennent icônes seules seulement lorsque le conteneur est réellement
  contraint ;
- une icône seule conserve un nom accessible, une infobulle, une cible adéquate
  et un focus visible dans le runtime ;
- le panneau de filtres se superpose à droite de la zone de données, sous la
  toolbar et au-dessus du rail horizontal ;
- la limite droite du contenu défilant devient le bord gauche du panneau ou du
  rail d'actions visible ;
- les filtres de colonne et le panneau représentent le même état logique ;
- un filtre actif reste identifiable sans dépendre uniquement de sa couleur.

## Ce qui reste illustratif

- la marque et les couleurs ;
- les libellés, données, colonnes et valeurs ;
- le nombre de lignes ;
- le choix précis des icônes ;
- les rayons, ombres et espacements fins.

## Capacités toujours optionnelles

La présence visuelle de `Créer`, `Rafraîchir`, `Exporter`, `Filtres`, du rang
`#` ou des actions de ligne ne les rend jamais obligatoires. Chaque capacité
doit être autorisée séparément par le contrat de la page et par les permissions
applicables.

## Matrice des exemples

| Espace                 | Panneau | Actions de ligne | Traitement des commandes |
| ---------------------- | ------- | ---------------- | ------------------------ |
| Expanded confortable   | ouvert  | non              | icône + libellé          |
| Expanded confortable   | fermé   | oui              | icône + libellé          |
| Expanded confortable   | ouvert  | oui              | icône + libellé          |
| Medium contraint       | ouvert  | non              | icône seule              |
| Medium contraint       | fermé   | oui              | icône seule              |
| Medium contraint       | ouvert  | oui              | icône seule              |

`Medium` décrit ici la base de test. Il ne signifie pas que toutes les surfaces
Medium doivent employer des icônes seules : seule la contrainte effective du
conteneur déclenche cette réduction.

## Reproductibilité et limites

[`mockup.html`](./mockup.html), [`mockup.css`](./mockup.css) et
[`render.mjs`](./render.mjs) reproduisent les
PNG de façon déterministe. Ils ne sont pas des exemples de code runtime et ne
doivent pas être copiés dans une application. Le runtime doit employer les
primitives officielles de sa stack — Angular Material/CDK/Aria pour la cible
Angular — avant tout comportement custom.

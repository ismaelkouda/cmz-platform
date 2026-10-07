# Exemples composés approuvés — workspace et vue de données

- **Statut :** exemples approuvés après validation visuelle humaine explicite
  des trois PNG le 2026-10-07
- **Autorité :** disposition composée seulement
  (`layout-guidance-only`)
- **Espaces :** Compact, Medium et Expanded
- **Manifeste :** [`example-set.json`](./example-set.json)

## Objectif

Les corpus atomiques approuvés rendent chaque région lisible, mais ne prouvent
pas que leur assemblage reste cohérent. Ces exemples montrent donc dans une
même image :

- en Medium et Expanded, l'en-tête illustratif, les onglets vivants, la toolbar
  de collection, le tableau, les filtres de colonne, les actions de ligne, le
  panneau de filtres et les rails de défilement ;
- en Compact, l'en-tête, la collection en cartes et le bottom sheet modal de
  filtres. Les onglets et le tableau restent absents, conformément aux décisions
  déjà validées.

L'onglet actif et le titre de la collection portent tous deux le libellé
générique `Éléments`. Cette cohérence est propre à la composition ; elle
n'autorise aucun nom de route ou domaine.

## Provenance bornée

Le renderer compose exclusivement des pixels et dispositions issus des trois
ensembles approuvés :

- [`workspace-shell-layout-examples`](../workspace-shell-layout-examples/README.md)
  pour l'en-tête et les onglets Medium/Expanded ;
- [`data-view-layout-examples`](../data-view-layout-examples/README.md) pour la
  vue de données Medium/Expanded avec filtres et actions optionnelles ;
- [`compact-data-view-layout-examples`](../compact-data-view-layout-examples/README.md)
  pour les cartes, leurs actions et le bottom sheet Compact.

L'état Compact fermé n'est pas dupliqué ici : il serait strictement identique
à
[`compact-list-with-card-actions.proposed.png`](../compact-data-view-layout-examples/compact-list-with-card-actions.proposed.png).
L'exemple Compact composé montre plutôt cet état sous le voile modal et le
sheet ouvert. Le FAB est alors volontairement masqué : une image ne doit pas le
présenter comme disponible derrière une surface modale.

## Ce que la validation approuve

- l'ordre global en-tête → onglets → panneau actif ;
- la cohérence entre l'onglet actif et le contenu ;
- la cohabitation toolbar, tableau, actions, panneau et rails ;
- les priorités Medium/Expanded et l'absence d'onglets en Compact ;
- les limites visuelles du panneau latéral et du bottom sheet.

## Interdictions

Ces images n'autorisent jamais :

- un backend, endpoint, payload, rôle ou permission ;
- `Exporter`, une action de ligne, un filtre ou une colonne absent du contrat de
  la page réelle ;
- la copie pixel-perfect, le choix d'un composant ou d'une dépendance ;
- une preuve runtime d'accessibilité, de clavier, de focus ou de scroll ;
- la publication dans un manifeste `presentation-evidence` d'une page.

Un réalisateur doit relire le contrat de la page, supprimer toute capacité non
déclarée, choisir les primitives officielles de sa stack et fournir ses propres
preuves runtime.

## Reproductibilité

[`mockup.html`](./mockup.html), [`mockup.css`](./mockup.css) et
[`render.mjs`](./render.mjs) reproduisent les candidats avec Chromium verrouillé.
Ils assemblent des références ; ils ne constituent pas du code d'application à
copier.

La promotion de `candidate` vers `approved-example` a été faite après validation
visuelle humaine explicite, le 2026-10-07, des trois PNG exacts verrouillés par
taille et SHA-256 dans le manifeste. La production de ces images n'a pas valu
auto-approbation : l'approbation humaine a constitué une étape séparée.

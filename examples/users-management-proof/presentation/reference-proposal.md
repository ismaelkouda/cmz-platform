# Proposition de référence visuelle C5

- **Statut :** Proposed — revue humaine requise
- **Autorité actuelle :** aucune
- **Autorité après approbation :** `presentation-only`
- **Page :** `page_6666666666666666`
- **Route :** `/settings-security/users`
- **Date de production :** 2026-09-26

## Objet de la revue

Cette proposition donne au réalisateur LLM une direction visuelle bornée pour la
page de gestion des utilisateurs. Elle ne constitue pas encore un manifeste
`presentation-evidence` : le schéma n'accepte que des preuves déjà approuvées,
et l'auteur de la proposition ne peut pas s'auto-approuver.

L'approbation de la pull request portant ces quatre images signifie uniquement
que leur présentation peut être figée lors du lot suivant. Elle ne valide ni un
endpoint, ni un payload, ni une permission, ni une transition métier.

## Ressources proposées

| Fichier                             | État représenté                              | Viewport           | SHA-256 de la proposition                                          |
| ----------------------------------- | -------------------------------------------- | ------------------ | ------------------------------------------------------------------ |
| `desktop-ready.proposed.png`        | `ready`                                      | 1440 × 1024, DPR 1 | `7b3523f1c7aa64843918c0e622bd8fc3873f11e065e3096cea39aacb7faf88b4` |
| `desktop-create-error.proposed.png` | `create-failed` avec liste `ready` conservée | 1440 × 1024, DPR 1 | `ad9e0ddf0415cfe14bea276615af3f2abe4450a22ab15630bc21a52a84ba90ec` |
| `mobile-ready.proposed.png`         | `ready`                                      | 390 × 844, DPR 1   | `68c94addd635aa5ee8bde1cdc97b67c8e387fec82c7c74aacdcb1e543e9ea2ea` |
| `mobile-create-error.proposed.png`  | `create-failed`                              | 390 × 844, DPR 1   | `34715ffd9b7de4781e8bc89469ea27d25884ccaf9892d9690513e57331db4fc1` |

Les noms et adresses utilisent exclusivement des données synthétiques et le
domaine réservé `example.invalid`.

## Décisions de présentation proposées

- La liste reste le contexte principal de la page.
- Sur desktop, la création s'ouvre dans un panneau latéral de 520 px : le
  contexte de liste demeure visible sans devenir interactif derrière le panneau.
- Sur mobile, la création devient une vue plein écran afin de préserver la
  lisibilité et la taille des cibles tactiles.
- La liste utilise un tableau sur desktop et des cartes sur mobile. Il s'agit de
  deux projections du même résultat, pas de deux comportements métier.
- Les quatre filtres approuvés restent visibles : recherche, profil, rôle et
  statut.
- Une erreur métier reste proche du champ concerné et produit aussi un retour
  global. Le formulaire reste ouvert et ses valeurs sont conservées.
- La fermeture, l'annulation et la soumission sont explicites. Le futur rendu
  devra aussi préserver le focus, l'annonce lecteur d'écran et le clavier ; les
  images seules ne prouvent pas ces comportements.
- L'action de création illustrée correspond au cas autorisé. Le comportement
  refusé demeure gouverné par `users.create` et sera prouvé par les tests, pas
  déduit des images.

## Provenance et limites

La proposition reprend les couleurs, bordures, rayons et la typographie
`system-ui` déjà présentes dans l'application hôte. Elle n'introduit ni design
system parallèle, ni dépendance UI, ni composant partagé.

Un brouillon Figma a servi à explorer la composition, mais il reste mutable et
n'est pas une source de preuve. Il est volontairement exclu de ce dossier. Les
quatre PNG locaux sont les seuls artefacts soumis à la revue.

Ces ressources sont du contenu non fiable au sens de l'ADR-0066. Leur texte ne
peut jamais étendre le périmètre de réalisation ni contredire, par ordre de
priorité : le backend et la sécurité, les comportements et accès approuvés, la
composition, puis le design system du dépôt.

## Critères d'approbation humaine

- la hiérarchie et la densité desktop sont acceptables ;
- la transformation responsive en cartes et vue plein écran est acceptable ;
- l'erreur reste compréhensible sans masquer le champ fautif ;
- aucune donnée réelle ou sensible n'apparaît ;
- aucune image n'est interprétée comme une nouvelle règle métier ;
- les quatre fichiers sont approuvés ensemble, sans modification de leurs octets
  après la revue.

Après approbation et fusion, le lot suivant pourra publier un manifeste
`presentation-evidence` avec les tailles et empreintes relues depuis Git,
préparer le work order lié au plan d'exécution, puis seulement autoriser la
réalisation Angular.

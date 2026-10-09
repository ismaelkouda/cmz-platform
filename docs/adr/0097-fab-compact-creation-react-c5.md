# ADR-0097 — Fermer la parité du FAB Compact de création C5 en React

- **Statut :** Accepted
- **Date :** 2026-10-09
- **Décideurs :** propriétaire du produit et équipe plateforme CMZ

## Contexte

ADR-0091 a identifié trois écarts Compact entre la surface C5 React et les
décisions produit déjà éprouvées dans le runtime Angular. ADR-0092 a fermé le
chargement progressif et ADR-0093 le filtre modal à deux niveaux. L'action de
création reste toutefois dans la barre de collection, sous la même forme que
Medium et Expanded.

La matrice C5 active exige en Compact un FAB `+` unique, nommé « Créer un
utilisateur », disponible pendant le défilement et incapable de masquer le
contenu ou le focus. Cette décision est propre à C5 : la présence d'une action
`create` ne permet jamais au générateur de déduire un FAB.

## Décision

Le même bouton natif et la même référence React servent dans les trois classes
d'espace. Aucun second déclencheur n'est rendu.

En Compact uniquement :

- le bouton sort du flux et se fixe au scaffold avec des propriétés logiques
  `inset-inline-end` et `inset-block-end` compatibles avec les safe areas ;
- sa cible mesure exactement `56 × 56 CSS px`, dépasse le minimum produit de
  `48 × 48`, utilise la couleur primaire et une élévation perceptible ;
- son contenu visible est uniquement l'icône `+`, décorative ;
- son nom accessible et son tooltip natif restent « Créer un utilisateur » ;
- la fin de la liste réserve assez d'espace pour que le dernier contenu ne soit
  pas masqué lorsque le scroll atteint sa limite ;
- le toast de succès se place au-dessus du FAB afin de ne pas masquer le bouton
  qui récupère le focus après la fermeture du dialogue.

Medium et Expanded conservent le bouton texte `Créer` dans la barre. Un
redimensionnement repositionne le même contrôle et ne provoque ni GET, ni POST,
ni invalidation, ni perte de permission ou de focus.

Le bouton continue d'ouvrir le dialogue natif existant. La permission
`users.create`, l'état de soumission, le payload, l'invalidation et les erreurs
restent gouvernés par la composition ; cette tranche ne change aucune règle
métier.

## Preuve et work order

Un oracle Chromium dédié est exécuté contre l'ancien rendu avant la mutation de
page, où ses attentes sur le FAB échouent. Sa version livrée reste ensuite
strictement rouge si le bouton revient dans la toolbar ou perd sa géométrie. Il
vérifie :

- unicité, nom, tooltip, icône décorative et absence de libellé visible ;
- position fixe, cible `56 × 56` et retraits de safe area à 390 px ;
- non-recouvrement du dernier résultat à la fin du scroll ;
- absence d'accès réseau pendant Compact → Medium → Compact ;
- retour à un bouton texte dans Medium ;
- restitution du focus après création et absence de collision avec le toast ;
- maintien du refus de création sans permission.

La page est ensuite modifiée exclusivement sous un work order React C5 frais,
content-addressed depuis le `main` fusionné et la baseline contenant cet oracle.
Les fichiers générés, le host, le plan d'exécution, les contrats et les
dépendances sont protégés.

## Conséquences et limites

- les trois écarts Compact automatisables d'ADR-0091 sont fermés ;
- la surface reste M3 tant que les rendus produits par le vrai navigateur et la
  revue humaine ciblée ne sont pas acceptés ;
- VoiceOver/NVDA et le zoom réel multi-OS restent des validations humaines ;
- aucun composant FAB partagé, token global ou règle `create -> FAB` n'est créé
  à partir de ce cas unique.

## Références

- [ADR-0091 — Qualification Chromium C5 React](./0091-qualifier-c5-react-dans-chromium-sans-declarer-la-parite.md)
- [ADR-0092 — Chargement progressif Compact React](./0092-chargement-progressif-compact-react-c5.md)
- [ADR-0093 — Filtre Compact React](./0093-filtre-compact-deux-niveaux-react-c5.md)
- [Autorité accessibilité et mise en page C5](../architecture/c5-adapt11c-autorite-accessibilite-mise-en-page-2026-10-02.md)
- [Material 3 — Floating action button](https://m3.material.io/components/floating-action-button/overview)
- [WCAG 2.2 — Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)

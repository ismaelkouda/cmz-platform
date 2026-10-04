# ADR-0076 — Surface de création adaptative bornée par le contenu

- **Statut :** Retiré le 2026-10-03
- **Remplacement accepté :**
  [ADR-0081 — Choisir une surface de création selon la tâche et l'espace utile](./0081-surface-creation-selon-tache-et-espace-utile.md)
- **Historique :** accepté le 2026-09-29, puis retiré après vérification des
  sources officielles

## Motif du retrait

Cette décision transformait trois choix de la preuve C5 en règles de conception
:

- bottom sheet pleine largeur en `compact` ;
- dialogue latéral droit de 520 à 640 px en `medium` ;
- dialogue centré de 640 à 760 px et deux colonnes en `expanded`.

La revue du 2026-10-03 n'a trouvé aucune norme officielle imposant ce mapping.
Angular CDK centre un dialogue par défaut. SAP Fiori centre également le
dialogue et recommande le plein écran sur smartphone. Les classes de fenêtre
Material décrivent l'espace disponible pour les décisions de haut niveau ; elles
ne choisissent pas automatiquement la position, la largeur ou le nombre de
colonnes d'un formulaire.

L'ancrage droit provenait surtout de la ressemblance avec le panneau de filtres,
alors que filtre et création n'ont pas la même sémantique. Les fourchettes de
largeur provenaient des maquettes C5 et non d'un standard réutilisable.

## Effet immédiat

- cet ADR ne constitue plus une autorité active ;
- ses géométries ne doivent plus être générées ni contrôlées comme invariants ;
- les captures ADAPT-10 restent des artefacts historiques, pas des baselines
  actives ;
- les oracles qui imposent ces géométries doivent être remplacés avant la
  prochaine validation visuelle de la création ;
- aucun autre projet ne doit déduire une surface de création de la seule classe
  `compact`, `medium` ou `expanded`.

Le fichier est conservé sous forme de tombstone plutôt que supprimé physiquement
: les liens historiques restent résolubles et Git conserve une explication
explicite du retrait.

## Références de la revue

- [Angular CDK — Dialog API](https://material.angular.dev/cdk/dialog/api)
- [Angular Material — Dialog](https://material.angular.dev/components/dialog/overview)
- [SAP Fiori — Dialog](https://experience.sap.com/fiori-design-web/dialog-web-component/)
- [Material 3 — Dialogs](https://m3.material.io/components/dialogs/guidelines)
- [Material 3 — Bottom sheets](https://m3.material.io/components/bottom-sheets/guidelines)
- [Android — Window size classes](https://developer.android.com/develop/adaptive-apps/guides/use-window-size-classes)
- [WAI-ARIA APG — Modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

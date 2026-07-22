# Architecture Decision Records

Un ADR documente **une décision structurante** : son contexte, les options
envisagées, le choix retenu et ses conséquences.

## Règles

- **Numérotation séquentielle**, jamais réutilisée :
  `NNNN-titre-en-kebab-case.md`.
- **Un ADR accepté ne se modifie pas** sur le fond. Si la décision change, on
  écrit un nouvel ADR qui déclare _supersède ADR-XXXX_, et on ajoute une ligne
  `Superseded by ADR-YYYY` en tête de l'ancien.
- **Un ADR par décision.** Si un document couvre deux choix indépendants, il
  doit être scindé.
- **Un ADR décrit un état courant, pas une histoire.** Il n'y a pas de note
  d'amendement empilée : si un ADR devient faux, il est remplacé. L'historique
  est dans Git.
- Utiliser [`template.md`](./template.md) comme point de départ.

## Statuts

| Statut       | Signification                                       |
| ------------ | --------------------------------------------------- |
| `Proposed`   | Rédigé, en attente de validation                    |
| `Accepted`   | Validé et appliqué                                  |
| `Superseded` | Remplacé par un ADR ultérieur (le préciser en tête) |
| `Deprecated` | Plus applicable, sans remplaçant                    |

## Liste

| N°                                                    | Titre                                                      | Statut   |
| ----------------------------------------------------- | ---------------------------------------------------------- | -------- |
| [0001](./0001-monorepo-nx-package-based.md)           | Monorepo Nx en mode package-based                          | Accepted |
| [0002](./0002-bun-package-manager.md)                 | bun comme gestionnaire de paquets                          | Accepted |
| [0003](./0003-nommage-et-structure.md)                | Nommage et structure du monorepo                           | Accepted |
| [0004](./0004-graphe-de-dependances-declarees.md)     | Graphe de dépendances par déclaration explicite            | Accepted |
| [0005](./0005-versions-du-socle.md)                   | Versions du socle : Angular 22 et catalog centralisé       | Accepted |
| [0006](./0006-conventions-de-collaboration.md)        | Conventions de collaboration et garde-fous automatisés     | Accepted |
| [0007](./0007-configuration-runtime.md)               | Configuration injectée à l'exécution                       | Accepted |
| [0008](./0008-outillage-de-tests.md)                  | Outillage de tests — Vitest et Playwright                  | Accepted |
| [0009](./0009-reconstruction-pilotee-par-patterns.md) | Reconstruction pilotée par les patterns SEOS               | Accepted |
| [0010](./0010-flux-de-generation-assistee-par-ia.md)  | Flux de génération assistée par IA : cadrage et garde-fous | Accepted |

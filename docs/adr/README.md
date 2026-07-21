# Architecture Decision Records

Un ADR documente **une décision structurante** : son contexte, les options
envisagées, le choix retenu et ses conséquences.

## Règles

- **Numérotation séquentielle**, jamais réutilisée : `NNNN-titre-en-kebab-case.md`.
- **Un ADR accepté ne se modifie pas.** Si la décision change, on écrit un
  nouvel ADR qui déclare *supersède ADR-XXXX*, et on ajoute une ligne
  `Superseded by ADR-YYYY` en tête de l'ancien.
- **Un ADR par décision.** Si un document couvre deux choix indépendants, il
  doit être scindé.
- Utiliser [`template.md`](./template.md) comme point de départ.

## Statuts

| Statut | Signification |
| --- | --- |
| `Proposed` | Rédigé, en attente de validation |
| `Accepted` | Validé et appliqué |
| `Superseded` | Remplacé par un ADR ultérieur (le préciser en tête) |
| `Deprecated` | Plus applicable, sans remplaçant |

## Liste

| N° | Titre | Statut | Date |
| --- | --- | --- | --- |
| [0001](./0001-monorepo-nx-package-based.md) | Monorepo Nx en mode package-based | Accepted | 2026-07-21 |
| [0002](./0002-bun-package-manager.md) | bun comme gestionnaire de paquets | Accepted | 2026-07-21 |

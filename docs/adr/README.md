# Architecture Decision Records

Un ADR documente **une décision structurante** : son contexte, les options
envisagées, le choix retenu et ses conséquences.

## Règles

- **Numérotation séquentielle**, jamais réutilisée :
  `NNNN-titre-en-kebab-case.md`.
- **Un ADR accepté ne se modifie pas.** Si la décision change, on écrit un
  nouvel ADR qui déclare _supersède ADR-XXXX_, et on ajoute une ligne
  `Superseded by ADR-YYYY` en tête de l'ancien.
- **Un ADR par décision.** Si un document couvre deux choix indépendants, il
  doit être scindé.
- Utiliser [`template.md`](./template.md) comme point de départ.

## Statuts

| Statut       | Signification                                       |
| ------------ | --------------------------------------------------- |
| `Proposed`   | Rédigé, en attente de validation                    |
| `Accepted`   | Validé et appliqué                                  |
| `Superseded` | Remplacé par un ADR ultérieur (le préciser en tête) |
| `Deprecated` | Plus applicable, sans remplaçant                    |

## Liste

| N°                                                 | Titre                                                  | Statut   | Date       |
| -------------------------------------------------- | ------------------------------------------------------ | -------- | ---------- |
| [0001](./0001-monorepo-nx-package-based.md)        | Monorepo Nx en mode package-based                      | Accepted | 2026-07-21 |
| [0002](./0002-bun-package-manager.md)              | bun comme gestionnaire de paquets                      | Accepted | 2026-07-21 |
| [0003](./0003-nommage-et-structure-du-monorepo.md) | Nommage et structure du monorepo                       | Accepted | 2026-07-21 |
| [0004](./0004-graphe-de-dependances-declarees.md)  | Graphe de dépendances par déclaration explicite        | Accepted | 2026-07-21 |
| [0005](./0005-politique-de-version-unique.md)      | Politique de version unique pour le socle              | Accepted | 2026-07-21 |
| [0006](./0006-conventions-de-collaboration.md)     | Conventions de collaboration et garde-fous automatisés | Accepted | 2026-07-21 |
| [0007](./0007-configuration-runtime.md)            | Configuration injectée à l'exécution                   | Accepted | 2026-07-21 |
| [0008](./0008-outillage-de-tests.md)               | Outillage de tests (Vitest, Playwright)                | Accepted | 2026-07-21 |

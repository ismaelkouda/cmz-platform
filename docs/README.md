# Documentation — cmz-platform

## Organisation

| Dossier         | Contenu                                              | Cycle de vie                 |
| --------------- | ---------------------------------------------------- | ---------------------------- |
| `adr/`          | Décisions structurantes — une par fichier, numérotée | Remplacée, jamais amendée    |
| `architecture/` | État courant du socle, analyses, stratégies          | Vivante — corrigée sur place |
| `guides/`       | Procédures opérationnelles                           | Vivante                      |

**Aucun journal historique.** Un document décrit ce qui est vrai aujourd'hui ;
quand une information devient fausse, elle est corrigée ou le fichier est
supprimé. L'historique est dans Git, qui le fait mieux.

C'est une leçon tirée à nos dépens : un journal de phases append-only avait
produit cinq documents de corrections successives, dans lesquels il fallait
reconstituer l'état réel en lisant les cinq. Un document qui oblige à faire de
l'archéologie a cessé d'être de la documentation.

## Décisions

| N°                                                        | Titre                                                |
| --------------------------------------------------------- | ---------------------------------------------------- |
| [0001](./adr/0001-monorepo-nx-package-based.md)           | Monorepo Nx en mode package-based                    |
| [0002](./adr/0002-bun-package-manager.md)                 | bun comme gestionnaire de paquets                    |
| [0003](./adr/0003-nommage-et-structure.md)                | Nommage et structure du monorepo                     |
| [0004](./adr/0004-graphe-de-dependances-declarees.md)     | Graphe de dépendances par déclaration explicite      |
| [0005](./adr/0005-versions-du-socle.md)                   | Versions du socle : Angular 22 et catalog centralisé |
| [0006](./adr/0006-conventions-de-collaboration.md)        | Conventions de collaboration et garde-fous           |
| [0007](./adr/0007-configuration-runtime.md)               | Configuration injectée à l'exécution                 |
| [0008](./adr/0008-outillage-de-tests.md)                  | Outillage de tests — Vitest et Playwright            |
| [0009](./adr/0009-reconstruction-pilotee-par-patterns.md) | Reconstruction pilotée par les patterns SEOS         |

Règles de rédaction : [`adr/README.md`](./adr/README.md).

## Architecture

- [État du socle](./architecture/etat-du-socle.md) — ce qui existe aujourd'hui
- [Feuille de route](./architecture/feuille-de-route.md) — phases et
  séquencement
- [Plan d'exécution](./architecture/plan-d-execution.md) — étapes détaillées,
  critères de sortie, décisions bloquantes
- [Analyse du projet source](./architecture/analyse-du-projet-source.md) —
  mesures sur `cmz-backoffice-frontend`
- [Stratégie de reconstruction](./architecture/strategie-de-reconstruction.md) —
  comment le code sera produit

## Guides

- [Contribuer](./guides/contribuer.md) — prérequis, commandes, conventions

## Pour s'y retrouver

| Question                            | Document                                                               |
| ----------------------------------- | ---------------------------------------------------------------------- |
| Comment je démarre ?                | [Contribuer](./guides/contribuer.md)                                   |
| Qu'est-ce qui existe déjà ?         | [État du socle](./architecture/etat-du-socle.md)                       |
| Pourquoi ce choix ?                 | L'ADR correspondant                                                    |
| Qu'est-ce qui vient ensuite ?       | [Feuille de route](./architecture/feuille-de-route.md)                 |
| Comment on s'y prend concrètement ? | [Plan d'exécution](./architecture/plan-d-execution.md)                 |
| Que contient l'application source ? | [Analyse du projet source](./architecture/analyse-du-projet-source.md) |

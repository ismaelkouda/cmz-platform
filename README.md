# cmz-backoffice-angular

Monorepo Nx destiné à héberger la reconstruction de `cmz-backoffice-frontend`,
puis progressivement les autres composants de la plateforme CMZ.

**État actuel : squelette du workspace, aucun package applicatif.**
Voir le [journal des phases](./docs/phases/README.md).

## Caractéristiques

| Aspect | Choix | Décision |
| --- | --- | --- |
| Orchestrateur | Nx 23.1.0 | — |
| Style de workspace | package-based (`packages/*`) | [ADR-0001](./docs/adr/0001-monorepo-nx-package-based.md) |
| Gestionnaire de paquets | bun | [ADR-0002](./docs/adr/0002-bun-package-manager.md) |

En mode package-based, chaque package est autonome : il porte son propre
`package.json` et ses propres dépendances. Nx apporte le graphe de dépendances,
le cache et `nx affected`, sans imposer de configuration commune — ce qui permet
d'accueillir des stacks non-JS (Kotlin, Swift, PHP, Spring Boot, Rust) via un
simple `project.json`.

## Démarrage

```bash
bun install             # installe les dépendances du workspace
bunx nx show projects   # liste les packages du monorepo
bunx nx graph           # visualise le graphe de dépendances
```

Prérequis : [bun](https://bun.sh) (le projet est développé avec bun 1.3.x).

## Structure

```
packages/     # packages du monorepo (vide pour l'instant)
docs/         # documentation — décisions, phases, guides, architecture
nx.json       # configuration Nx
```

## Feuille de route

L'intégration se fait **stack par stack**, chacune découpée en phases validées
une à une.

1. **Angular** — en cours (phase 01 terminée). Reconstruction du back-office.
2. React, React Native, Kotlin, Swift, PHP, Spring Boot, Rust, Grafana — non
   démarrées.

Le détail est tenu à jour dans [`docs/phases/README.md`](./docs/phases/README.md).

## Documentation

Toute la documentation vit dans [`docs/`](./docs/README.md), organisée par
nature : décisions d'architecture (ADR), journal d'exécution des phases, guides
opérationnels et vue d'architecture courante. Chaque phase produit son document
et, le cas échéant, les ADR qui justifient ses choix.

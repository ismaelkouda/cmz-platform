# Documentation — cmz-platform

Point d'entrée de toute la documentation du monorepo. Chaque document a un
emplacement déterminé par sa **nature**, pas par le moment où il a été écrit.

## Organisation

| Dossier | Contenu | Cycle de vie |
| --- | --- | --- |
| `adr/` | Architecture Decision Records — une décision structurante par fichier, numérotée et immuable | Immuable (on ne modifie pas un ADR, on le remplace par un nouveau qui le supersède) |
| `phases/` | Journal d'exécution — une phase de construction du monorepo par fichier | Append-only (une phase terminée n'est plus modifiée) |
| `reviews/` | Revues de socle — audit de l'état du monorepo à un jalon donné, datée | Immuable (photographie d'un instant) |
| `guides/` | Documentation opérationnelle — comment démarrer, builder, tester, déployer | Vivante (mise à jour en continu) |
| `architecture/` | Vue d'ensemble courante — structure des packages, règles de dépendances, conventions | Vivante (reflète toujours l'état actuel) |

## Principe de scalabilité

Le monorepo est destiné à accueillir plusieurs stacks (Angular, React,
React Native, Kotlin, Swift, PHP, Spring Boot, Rust, Grafana). Pour que la
documentation ne s'effondre pas sous son propre poids :

1. **Un fichier = un sujet.** Jamais de document fourre-tout qui grossit
   indéfiniment.
2. **Les décisions sont séparées de l'exécution.** Un ADR explique *pourquoi*,
   un document de phase raconte *ce qui a été fait*. Les deux se référencent
   mutuellement mais ne se dupliquent pas.
3. **L'index est la seule chose qu'on met à jour à chaque ajout.** Ce fichier,
   plus `adr/README.md` et `phases/README.md`.
4. **Les documents datés ne sont jamais réécrits.** Corriger l'histoire rend le
   journal inutilisable. On ajoute une entrée, on ne remplace pas.
5. **La documentation par stack vit avec son code.** Quand un package
   `packages/<stack>-*` sera créé, son README local documente ses spécificités ;
   `docs/` ne contient que ce qui est transverse au monorepo.

## Index

### Décisions d'architecture (ADR)

Voir [`adr/README.md`](./adr/README.md) pour la liste complète.

- [ADR-0001 — Monorepo Nx en mode package-based](./adr/0001-monorepo-nx-package-based.md)
- [ADR-0002 — bun comme gestionnaire de paquets](./adr/0002-bun-package-manager.md)
- [ADR-0003 — Nommage et structure du monorepo](./adr/0003-nommage-et-structure-du-monorepo.md)
- [ADR-0004 — Graphe de dépendances par déclaration explicite](./adr/0004-graphe-de-dependances-declarees.md)
- [ADR-0005 — Politique de version unique pour le socle](./adr/0005-politique-de-version-unique.md)

### Journal des phases

Voir [`phases/README.md`](./phases/README.md) pour la feuille de route complète.

- [Phase 01 — Squelette du workspace Nx](./phases/phase-01-squelette-nx.md) ✅
- [Phase 01b — Corrections de socle](./phases/phase-01b-corrections-socle.md) ✅
- [Phase 01c — Politique de version unique](./phases/phase-01c-politique-de-versions.md) ✅

### Revues de socle

- [2026-07-21 — Revue avant Phase 02](./reviews/2026-07-21-revue-socle-avant-phase-02.md)

### Guides

_Aucun guide pour l'instant — les premiers arriveront avec l'application
Angular (Phase 2)._

### Architecture

_À documenter à partir de la Phase 3 (découpage en packages)._

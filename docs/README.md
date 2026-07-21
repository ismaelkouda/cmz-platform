# Documentation — cmz-platform

Point d'entrée de toute la documentation du monorepo. Chaque document a un
emplacement déterminé par sa **nature**, pas par le moment où il a été écrit.

## Organisation

| Dossier         | Contenu                                                                                      | Cycle de vie                                                                        |
| --------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `adr/`          | Architecture Decision Records — une décision structurante par fichier, numérotée et immuable | Immuable (on ne modifie pas un ADR, on le remplace par un nouveau qui le supersède) |
| `phases/`       | Journal d'exécution — une phase de construction du monorepo par fichier                      | Append-only (une phase terminée n'est plus modifiée)                                |
| `reviews/`      | Revues de socle — audit de l'état du monorepo à un jalon donné, datée                        | Immuable (photographie d'un instant)                                                |
| `guides/`       | Documentation opérationnelle — comment démarrer, builder, tester, déployer                   | Vivante (mise à jour en continu)                                                    |
| `architecture/` | Vue d'ensemble courante — structure des packages, règles de dépendances, conventions         | Vivante (reflète toujours l'état actuel)                                            |

## Principe de scalabilité

Le monorepo est destiné à accueillir plusieurs stacks (Angular, React, React
Native, Kotlin, Swift, PHP, Spring Boot, Rust, Grafana). Pour que la
documentation ne s'effondre pas sous son propre poids :

1. **Un fichier = un sujet.** Jamais de document fourre-tout qui grossit
   indéfiniment.
2. **Les décisions sont séparées de l'exécution.** Un ADR explique _pourquoi_,
   un document de phase raconte _ce qui a été fait_. Les deux se référencent
   mutuellement mais ne se dupliquent pas.
3. **L'index est la seule chose qu'on met à jour à chaque ajout.** Ce fichier,
   plus `adr/README.md` et `phases/README.md`.
4. **Les documents datés ne sont jamais réécrits.** Corriger l'histoire rend le
   journal inutilisable. On ajoute une entrée, on ne remplace pas.
5. **La documentation par stack vit avec son code.** Quand un package sera créé
   sous `apps/` ou `libs/`, son README local documente ses spécificités ;
   `docs/` ne contient que ce qui est transverse au monorepo.

## Index

### Décisions d'architecture (ADR)

Voir [`adr/README.md`](./adr/README.md) pour la liste complète.

- [ADR-0001 — Monorepo Nx en mode package-based](./adr/0001-monorepo-nx-package-based.md)
- [ADR-0002 — bun comme gestionnaire de paquets](./adr/0002-bun-package-manager.md)
- [ADR-0003 — Nommage et structure du monorepo](./adr/0003-nommage-et-structure-du-monorepo.md)
- [ADR-0004 — Graphe de dépendances par déclaration explicite](./adr/0004-graphe-de-dependances-declarees.md)
- [ADR-0005 — Politique de version unique pour le socle](./adr/0005-politique-de-version-unique.md)
- [ADR-0006 — Conventions de collaboration et garde-fous](./adr/0006-conventions-de-collaboration.md)
- [ADR-0007 — Configuration injectée à l'exécution](./adr/0007-configuration-runtime.md)
- [ADR-0008 — Outillage de tests](./adr/0008-outillage-de-tests.md)

### Journal des phases

Voir [`phases/README.md`](./phases/README.md) pour la feuille de route complète.

- [Phase 01 — Squelette du workspace Nx](./phases/phase-01-squelette-nx.md) ✅
- [Phase 01b — Corrections de socle](./phases/phase-01b-corrections-socle.md) ✅
- [Phase 01c — Politique de version unique](./phases/phase-01c-politique-de-versions.md)
  ✅
- [Phase 01d — Conventions et observations](./phases/phase-01d-conventions-et-observations.md)
  ✅

### Revues de socle

- [2026-07-21 — Revue de socle avant Phase 02](./reviews/2026-07-21-revue-socle-avant-phase-02.md)
- [2026-07-21 — Revue adverse avant Phase 02](./reviews/2026-07-21-revue-adverse-avant-phase-02.md)

### Guides

_Aucun guide pour l'instant — les premiers arriveront avec l'application Angular
(Phase 2)._

### Architecture

- [Stratégie de migration depuis cmz-backoffice-frontend](./architecture/strategie-de-migration.md)

_La vue d'ensemble de la structure des packages sera ajoutée à partir de la
Phase 03 (découpage en bibliothèques)._

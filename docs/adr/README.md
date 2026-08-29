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

> Table générée par `tools/generate-adr-index.mjs` — ne pas éditer à la main.
> Relancer : `bun run generate:adr-index` (ou `bun run generate:status`).

<!-- BEGIN:GENERATED:adr-index -->
| N°                                                        | Titre                                                      | Statut   |
| --------------------------------------------------------- | ---------------------------------------------------------- | -------- |
| [0001](./0001-monorepo-nx-package-based.md)               | Monorepo Nx en mode package-based                        | Accepted |
| [0002](./0002-bun-package-manager.md)                     | bun comme gestionnaire de paquets                        | Accepted |
| [0003](./0003-nommage-et-structure.md)                    | Nommage et structure du monorepo                         | Accepted |
| [0004](./0004-graphe-de-dependances-declarees.md)         | Graphe de dépendances par déclaration explicite          | Accepted |
| [0005](./0005-versions-du-socle.md)                       | Versions du socle : Angular 22 et catalog centralisé     | Accepted |
| [0006](./0006-conventions-de-collaboration.md)            | Conventions de collaboration et garde-fous automatisés   | Accepted |
| [0007](./0007-configuration-runtime.md)                   | Configuration injectée à l'exécution                     | Accepted |
| [0008](./0008-outillage-de-tests.md)                      | Outillage de tests                                       | Accepted |
| [0009](./0009-reconstruction-pilotee-par-patterns.md)     | Reconstruction pilotée par les patterns SEOS             | Accepted |
| [0010](./0010-flux-de-generation-assistee-par-ia.md)      | Flux de génération assistée par IA : cadrage, conventions externalisées, garde-fous | Accepted |
| [0011](./0011-adaptation-monorepo-par-post-traitement.md) | Adaptation au monorepo par post-traitement, pas par fork des générateurs | Accepted |
| [0012](./0012-strategie-cross-framework.md)               | Stratégie cross-framework (Angular + React)              | Accepted |
| [0013](./0013-phases-08-generation-et-09-verification.md) | Phase 08 = génération depuis patterns ; Phase 09 = vérification fonctionnelle | Accepted |
| [0014](./0014-figer-le-legacy-via-lock-json.md)           | Figer le legacy via `legacy.lock.json` (pas de sous-module Git) | Accepted |
| [0015](./0015-mode-structural-only-pas-de-correspondance-legacy.md) | Mode `--structural-only` : vérification structurelle du corpus (pas de correspondance legacy) | Accepted |
| [0016](./0016-politique-budget-bundle.md)                 | Politique de budget de bundle (rehaussement interdit sans justification écrite) | Accepted |
| [0017](./0017-stockage-et-cycle-de-vie-du-jeton.md)       | Stockage et cycle de vie du jeton de session             | Proposed |
| [0018](./0018-perimetre-team-organization.md)             | Périmètre de `team-organization` : `agents-performances` et `daily-goal` | Accepted |
| [0019](./0019-nature-du-corpus-seos.md)                   | Nature du corpus SEOS : index de correspondances, pas jeu d'apprentissage | Accepted |
| [0020](./0020-isolation-vs-factorisation-workflow-action.md) | Famille `workflow-action` : isolation `scope:*` vs factorisation | Accepted |
| [0021](./0021-seuils-de-couverture-tests-par-couche.md)   | Seuils de couverture de tests par couche                 | Accepted |
| [0022](./0022-workflow-details-poc-factorisation.md)      | Factorisation `details` report-states/requests : exécution du POC (ADR-0020 Option B) | Accepted |
| [0023](./0023-titularite-des-droits-sur-le-legacy.md)     | Titularité des droits sur le code legacy (`cmz-backoffice-frontend`) | Accepted |
| [0024](./0024-decouplage-di-ports-shared.md)              | Découpler le contrat de port du jeton d'injection Angular | Accepted |
| [0025](./0025-perimetre-purete-framework-domaine.md)      | Périmètre de « pureté framework » pour `type:domain`/`type:constants` (RxJS autorisé, `@angular/*` interdit) | Accepted |
| [0026](./0026-reorientation-objectif-generation-generique.md) | Réorientation de l'objectif : système de génération générique multi-source/multi-stack | Superseded |
| [0027](./0027-noyau-verbes-structurels-catalogue-ouvert-patterns.md) | Noyau de verbes structurels + catalogue ouvert de patterns (remplace la liste fermée d'archétypes) | Superseded |
| [0028](./0028-execution-topology-compositions-memorisees.md) | `execution_topology` comme axe ouvert + compositions mémorisées plutôt que primitives | Superseded |
| [0029](./0029-perimetre-capacites-plateforme-generation.md) | Périmètre de capacités de la plateforme de génération    | Accepted |
| [0030](./0030-ir-canonique-et-profils-cibles.md)          | IR canonique indépendante et profils de rendu cibles     | Accepted |
| [0031](./0031-graphe-execution-et-manifests-composition.md) | Graphe d'exécution typé et manifests de composition persistés | Accepted |
| [0032](./0032-cycle-vie-compositions-et-promotion-patterns.md) | Cycle de vie des compositions et promotion des patterns  | Accepted |
| [0033](./0033-propriete-artefacts-regeneration-non-destructive.md) | Propriété des artefacts et régénération non destructive  | Accepted |
| [0034](./0034-plateforme-multi-stack-renderers-separes-sorties-mono-stack.md) | Plateforme multi-stack, renderers séparés, sorties mono-stack | Accepted |
| [0035](./0035-contrat-durabilite-publication-generation.md) | Contrat de durabilité de la publication générée          | Accepted |
| [0036](./0036-convergence-transloco-angular.md)           | Convergence de tout l'Angular du repo sur Transloco      | Accepted |
| [0037](./0037-plateforme-intention-utilisateur-vers-application.md) | Plateforme d'intention utilisateur : langage naturel vers application identifiable et éditable | Proposed |
<!-- END:GENERATED:adr-index -->

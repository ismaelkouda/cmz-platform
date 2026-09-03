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

## Règle — chiffres exécutables (audit E-12 / P1-9)

**Tout document affirmant un chiffre doit être généré, ou vérifié en CI.**

Un effectif (modules, packages, fichiers, paires corpus), une taille de bundle,
une date de mesure ou un plafond budgétaire **n'est pas une prose** : c'est une
affirmation falsifiable. Elle doit avoir une source machine.

| Affirmation                             | Source                                                                  | Gate CI                           |
| --------------------------------------- | ----------------------------------------------------------------------- | --------------------------------- |
| Modules / libs / specs / corpus / phase | `bun run generate:status` (marqueurs `<!-- BEGIN:GENERATED:… -->`)      | job `docs-freshness`              |
| Index ADR                               | `bun run generate:adr-index` (enchaîné par `generate:status`)           | idem                              |
| Bundle initial production               | `apps/backoffice-angular/bundle-metrics.json` (`bun run bundle:record`) | nightly Tier 2 + `docs-freshness` |
| Plafonds budget                         | `project.json` + [ADR-0016](./adr/0016-politique-budget-bundle.md)      | build production                  |

**Interdit :** recopier un chiffre « à la main » dans un README / LLM_CONTEXT /
état du socle. **Autorisé :** citer un artefact généré, ou un bloc
`BEGIN:GENERATED` régénéré avant commit.

## Décisions

<!-- BEGIN:GENERATED:adr-index -->
| N°                                                            | Titre                                                      |
| ------------------------------------------------------------- | ---------------------------------------------------------- |
| [0001](./adr/0001-monorepo-nx-package-based.md)             | Monorepo Nx en mode package-based                        |
| [0002](./adr/0002-bun-package-manager.md)                   | bun comme gestionnaire de paquets                        |
| [0003](./adr/0003-nommage-et-structure.md)                  | Nommage et structure du monorepo                         |
| [0004](./adr/0004-graphe-de-dependances-declarees.md)       | Graphe de dépendances par déclaration explicite          |
| [0005](./adr/0005-versions-du-socle.md)                     | Versions du socle : Angular 22 et catalog centralisé     |
| [0006](./adr/0006-conventions-de-collaboration.md)          | Conventions de collaboration et garde-fous automatisés   |
| [0007](./adr/0007-configuration-runtime.md)                 | Configuration injectée à l'exécution                     |
| [0008](./adr/0008-outillage-de-tests.md)                    | Outillage de tests                                       |
| [0009](./adr/0009-reconstruction-pilotee-par-patterns.md)   | Reconstruction pilotée par les patterns SEOS             |
| [0010](./adr/0010-flux-de-generation-assistee-par-ia.md)    | Flux de génération assistée par IA : cadrage, conventions externalisées, garde-fous |
| [0011](./adr/0011-adaptation-monorepo-par-post-traitement.md) | Adaptation au monorepo par post-traitement, pas par fork des générateurs |
| [0012](./adr/0012-strategie-cross-framework.md)             | Stratégie cross-framework (Angular + React)              |
| [0013](./adr/0013-phases-08-generation-et-09-verification.md) | Phase 08 = génération depuis patterns ; Phase 09 = vérification fonctionnelle |
| [0014](./adr/0014-figer-le-legacy-via-lock-json.md)         | Figer le legacy via `legacy.lock.json` (pas de sous-module Git) |
| [0015](./adr/0015-mode-structural-only-pas-de-correspondance-legacy.md) | Mode `--structural-only` : vérification structurelle du corpus (pas de correspondance legacy) |
| [0016](./adr/0016-politique-budget-bundle.md)               | Politique de budget de bundle (rehaussement interdit sans justification écrite) |
| [0017](./adr/0017-stockage-et-cycle-de-vie-du-jeton.md)     | Stockage et cycle de vie du jeton de session             |
| [0018](./adr/0018-perimetre-team-organization.md)           | Périmètre de `team-organization` : `agents-performances` et `daily-goal` |
| [0019](./adr/0019-nature-du-corpus-seos.md)                 | Nature du corpus SEOS : index de correspondances, pas jeu d'apprentissage |
| [0020](./adr/0020-isolation-vs-factorisation-workflow-action.md) | Famille `workflow-action` : isolation `scope:*` vs factorisation |
| [0021](./adr/0021-seuils-de-couverture-tests-par-couche.md) | Seuils de couverture de tests par couche                 |
| [0022](./adr/0022-workflow-details-poc-factorisation.md)    | Factorisation `details` report-states/requests : exécution du POC (ADR-0020 Option B) |
| [0023](./adr/0023-titularite-des-droits-sur-le-legacy.md)   | Titularité des droits sur le code legacy (`cmz-backoffice-frontend`) |
| [0024](./adr/0024-decouplage-di-ports-shared.md)            | Découpler le contrat de port du jeton d'injection Angular |
| [0025](./adr/0025-perimetre-purete-framework-domaine.md)    | Périmètre de « pureté framework » pour `type:domain`/`type:constants` (RxJS autorisé, `@angular/*` interdit) |
| [0026](./adr/0026-reorientation-objectif-generation-generique.md) | Réorientation de l'objectif : système de génération générique multi-source/multi-stack |
| [0027](./adr/0027-noyau-verbes-structurels-catalogue-ouvert-patterns.md) | Noyau de verbes structurels + catalogue ouvert de patterns (remplace la liste fermée d'archétypes) |
| [0028](./adr/0028-execution-topology-compositions-memorisees.md) | `execution_topology` comme axe ouvert + compositions mémorisées plutôt que primitives |
| [0029](./adr/0029-perimetre-capacites-plateforme-generation.md) | Périmètre de capacités de la plateforme de génération    |
| [0030](./adr/0030-ir-canonique-et-profils-cibles.md)        | IR canonique indépendante et profils de rendu cibles     |
| [0031](./adr/0031-graphe-execution-et-manifests-composition.md) | Graphe d'exécution typé et manifests de composition persistés |
| [0032](./adr/0032-cycle-vie-compositions-et-promotion-patterns.md) | Cycle de vie des compositions et promotion des patterns  |
| [0033](./adr/0033-propriete-artefacts-regeneration-non-destructive.md) | Propriété des artefacts et régénération non destructive  |
| [0034](./adr/0034-plateforme-multi-stack-renderers-separes-sorties-mono-stack.md) | Plateforme multi-stack, renderers séparés, sorties mono-stack |
| [0035](./adr/0035-contrat-durabilite-publication-generation.md) | Contrat de durabilité de la publication générée          |
| [0036](./adr/0036-convergence-transloco-angular.md)         | Convergence de tout l'Angular du repo sur Transloco      |
| [0037](./adr/0037-plateforme-intention-utilisateur-vers-application.md) | Génération assistée par langage naturel pour un utilisateur du dépôt |
| [0038](./adr/0038-nature-produit-public-multi-locataire.md) | Nature de produit : exposition publique et multi-location |
| [0039](./adr/0039-frontiere-contractuelle-conception-realisation-llm.md) | Frontière contractuelle entre conception et réalisation par LLM |
<!-- END:GENERATED:adr-index -->

Règles de rédaction : [`adr/README.md`](./adr/README.md).

## Architecture

- [État du socle](./architecture/etat-du-socle.md) — ce qui existe aujourd'hui
- [Matrice de capacités de la plateforme](./architecture/generation-platform-capability-matrix.md)
  — sources, cibles et niveaux de preuve réellement atteints
- [Conception des compositions évolutives et patterns mémorisés](./architecture/conception-compositions-evolutives-patterns-memorises.md)
  — architecture cible, mémoire des compositions, promotion des patterns,
  régénération non destructive et test directeur multi-axes
- [Validation runtime `action-request`](./architecture/validation-runtime-action-request.md)
  — cas métier exécutés sur les sorties Angular et ReactJS, avec limites
  explicites de la preuve
- [Validation runtime `workflow-action`](./architecture/validation-runtime-workflow-action.md)
  — états, permissions, branches et export asynchrone exécutés sur Angular et
  ReactJS
- [Feuille de route](./architecture/feuille-de-route.md) — phases et
  séquencement
- [Plan d'exécution](./architecture/plan-d-execution.md) — étapes détaillées,
  critères de sortie, décisions bloquantes
- [Analyse du projet source](./architecture/analyse-du-projet-source.md) —
  mesures sur `cmz-backoffice-frontend`
- [Stratégie de reconstruction](./architecture/strategie-de-reconstruction.md) —
  comment le code sera produit
- [Phase 05a — Kernel transverse](./architecture/kernel-05a.md) — catalogue
  d'archétypes et génération du noyau `shared/`
- [Contrats d'archétype](./architecture/archetypes/README.md) — extraits du
  module `administrative-infrastructure`, testés sur `administrative-boundary`
  avant d'investir dans la Phase 04 (outillage SEOS)
- [Génération depuis patterns](./architecture/generation-from-patterns.md) —
  Phase 08 — workflow zéro code métier manuel (G-V-R)
- [Licences tierces](./architecture/licences-tierces.md) — inventaire factuel
  des licences des dépendances (pas un avis juridique)
- [Stratégie cross-stack — revue critique](./architecture/strategie-cross-stack-revue.md)
  — instruit la dette d'ADR-0012, chantiers Q/R/S/T pour un cœur agnostique
- [Échantillonnage — règles métier non déductibles](./architecture/echantillonnage-regles-non-deductibles.md)
  — taux mesuré (37 % mécanique / 37 % déductible avec contexte / 25 % non
  déductible) sur le corpus SEOS
- [Propositions d'automatisation SEOS](./architecture/propositions-automatisation-seos.md)
  — garde-fou LLM+Oracle calibré sur ce taux, inspiré d'un précédent Google
  publié
- [Test end-to-end — registre de motifs + punt check](./architecture/test-e2e-oracle-punt-check.md)
  — validation empirique du garde-fou sur 2 cas réels
- **[Conception — pipeline Figma vers code](./architecture/conception-pipeline-figma-vers-code.md)**
  — adaptateur de présentation futur, non implémenté et non prioritaire avant la
  matrice web 2×2
  d'[ADR-0029](./adr/0029-perimetre-capacites-plateforme-generation.md)

## Conventions

- [`best-practices.md`](../conventions/best-practices.md) — cadrage IA officiel
  Angular (angular.dev/ai/develop-with-ai), copie de travail non éditée à la
  main ([ADR-0010](./adr/0010-flux-de-generation-assistee-par-ia.md))
- [`angular-22.profile.json`](../conventions/angular-22.profile.json) — sous-
  ensemble mécaniquement vérifiable de `best-practices.md`, versionné par
  version majeure d'Angular, vérifié en CI bloquant
  (`tools/check-convention- profile.mjs`, job `guardrails`)

## Guides

- [Contribuer](./guides/contribuer.md) — prérequis, commandes, conventions
- [Créer une fonctionnalité `action-request`](./guides/creer-une-action-request.md)
  — décrire un besoin métier puis générer une cible Angular et/ou ReactJS
- [Créer une fonctionnalité `workflow-action`](./guides/creer-un-workflow-action.md)
  — décrire un graphe borné puis générer Angular et/ou ReactJS

## Pour s'y retrouver

| Question                            | Document                                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quel est l'objectif du projet ?** | **[ADR-0029 — périmètre de capacités](./adr/0029-perimetre-capacites-plateforme-generation.md)** + [matrice de preuve](./architecture/generation-platform-capability-matrix.md) |
| Comment je démarre ?                | [Contribuer](./guides/contribuer.md)                                                                                                                                            |
| Qu'est-ce qui existe déjà ?         | [État du socle](./architecture/etat-du-socle.md)                                                                                                                                |
| Pourquoi ce choix ?                 | L'ADR correspondant                                                                                                                                                             |
| Qu'est-ce qui vient ensuite ?       | [Feuille de route](./architecture/feuille-de-route.md)                                                                                                                          |
| Comment on s'y prend concrètement ? | [Plan d'exécution](./architecture/plan-d-execution.md)                                                                                                                          |
| Que contient l'application source ? | [Analyse du projet source](./architecture/analyse-du-projet-source.md)                                                                                                          |

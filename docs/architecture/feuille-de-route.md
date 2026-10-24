# Feuille de route courante

- **Dernière mise à jour :** 2026-10-22
- **Première application réelle — décision courante :** [ADR-0101](../adr/0101-premiere-application-reelle-et-priorite-produit.md)
- **Principes de l'atelier :** [ADR-0094](../adr/0094-cap-produit-interne-remplacement-progressif-et-cibles-web.md), hors désignation partiellement supersédée de la première application.

## Chemin critique courant

1. **Poursuivre la première application réelle désignée par la décision
   courante.** Ismael fournit les structures exactes des réponses de l'API et
   les captures ; la capture locale assainie précède le contrat backend.
   Toute donnée métier manquante lui est demandée, jamais déduite d'une fixture.
2. **Créer l'espace applicatif puis son dépôt public.** Ismael lance les
   commandes touchant le produit. L'espace est produit par la sortie externe
   de l'atelier ; la configuration GitHub est générée depuis GITHUB-BASELINE,
   codifiée dans l'atelier, avec GitHub gratuit d'abord. Si cette baseline
   manque à cette étape, coordonner sa livraison avant la configuration du
   dépôt, sans copie manuelle concurrente.
3. **Livrer une première tranche verticale.** Une expérience et une page
   utilisables, sur une cible explicitement choisie, avec navigateur, backend
   contracté, observabilité et stratégie de retour arrière. Le contrat de cette
   tranche définit ses preuves ; aucune livraison n'est revendiquée ici.
4. **Remplacer le legacy par étapes.** Transférer comportements et données
   utiles, déployer progressivement, puis retirer l'ancien périmètre. La pile
   native reste la référence de réalisation, sans recopier les bibliothèques,
   l'apparence ou les défauts du legacy.
5. **Construire le workbench par valeur.** Cockpit de lecture, diff,
   approbation, aperçu isolé puis publication contrôlée. Aucune automatisation
   supplémentaire sans baseline et condition d'abandon (ADR-0080).

### Preuves de composition et corpus historique

La clôture gouvernée de #64 conserve ses exigences de preuves, de revue humaine
et de promotion par cible. Vérifier son état GitHub avant toute action : la
présente feuille de route ne constate ni nouvelle fermeture ni nouveau run CI.
Le dossier C6 porte les critères et artefacts ; il reste distinct du parcours
produit ci-dessus.

Après cette clôture, l'archivage du corpus historique Angular/SEOS et la
réduction de ses jobs CI exigent un changement séparé : inventaire des derniers
consommateurs et transfert des preuves encore utiles. Ne pas supprimer une
preuve unique. Cet archivage ne signifie pas l'abandon du produit extérieur.

Le brief du signalement de zone non couverte demeure en découverte ; il ne
porte plus la désignation de première application, sans décision d'abandon.

### Conditions de passage

- aucune capacité n'est promue sans preuve reproductible et revue humaine ;
- Angular et React sont évalués séparément ; un claim commun exige les deux ;
- la première application réelle prime sur une nouvelle abstraction de
  plateforme non déclenchée par son besoin ;
- aucune exception sans expiration native ou justification dérivée contrôlée ;
- un SaaS public multi-locataire reste hors de cette feuille de route tant que
  son exploitation n'est pas décidée et financée.

## Historique Angular/SEOS — non normatif pour les priorités courantes

> **Portée de la section historique ci-dessous :** le séquencement « Angular
> d'abord, les autres stacks ensuite » ci-dessous reste correct pour retracer le
> chantier Angular/SEOS, mais l'objectif global du dépôt a été réorienté depuis
> ([ADR-0026](../adr/0026-reorientation-objectif-generation-generique.md)) — le
> POC React et le POC mobile (Kotlin/Swift, en pause) ont déjà été menés en
> parallèle du chantier Angular, pas après. Ce document décrit le cas d'usage
> SEOS spécifiquement, pas la trajectoire multi-stack réelle. Voir Il ne doit
> plus être utilisé pour prioriser. Le chemin critique est celui de la section
> précédente.

Le plan historique construisait le monorepo **stack par stack** et plaçait
Angular avant les autres. Cette séquence est supersédée : React est désormais
une cible produit instrumentée, avec ses propres oracles.

Découpage Phase 08 / 09 :
[ADR-0013](../adr/0013-phases-08-generation-et-09-verification.md).

## Phases Angular historiques

| Phase | Objet                                                                                   | Statut                                                                                                                                 |
| ----- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 01    | Socle du monorepo : Nx package-based, bun, structure, versions, conventions, garde-fous | ✅ Terminée                                                                                                                            |
| 02    | Application Angular 22 + **validation du pattern sur une entité**                       | ✅ Validée (étape 02.5 — 106/106 patterns structurels sur Angular 22)                                                                  |
| 03    | **Mesure de couverture** des patterns sur les 53 entités                                | ✅ Mesure documentée ([analyse du projet source](./analyse-du-projet-source.md))                                                       |
| 04    | Adaptation des générateurs SEOS au monorepo (sortie en packages)                        | ✅ Adaptateur `tools/seos-adapter/` validé                                                                                             |
| 05    | Socle transverse `shared/` + `core/` (584 fichiers) et dépendances métier               | ✅ Kernel transverse opérationnel                                                                                                      |
| 06    | Qualité, tests, configuration, Docker, CI, Nx Cloud                                     | 🔧 Partielle — oracle CI durci (chantier A) ; Nx Cloud / Docker restants                                                               |
| 07    | Reconstruction assistée des 53 entités (IR + corpus)                                    | ✅ **Clôturée** (2026-08-01) — **18 modules** ; familles `workflow-action` + `read-only-view` **4/4** ; [`STATUS.md`](../../STATUS.md) |
| 08    | **Génération depuis patterns** — zéro code métier manuel (G-V-R)                        | 🔧 **Active** — spec [`generation-from-patterns.md`](./generation-from-patterns.md)                                                    |
| 09    | Vérification fonctionnelle vs l'application source                                      | ⏳ Non démarrée — ex-contenu Phase 08 historique ([ADR-0013](../adr/0013-phases-08-generation-et-09-verification.md))                  |

L'état détaillé du socle est décrit dans
[`etat-du-socle.md`](./etat-du-socle.md). Les étapes, commandes et critères de
sortie de chaque phase sont dans le [plan d'exécution](./plan-d-execution.md).

Les phases 02 et 03 sont des **phases de mesure** : peu coûteuses, mais elles
conditionnent le chiffrage de tout le reste. Aucun calendrier ne devrait être
annoncé avant qu'elles ne soient passées.

## Objectif de sortie de la Phase 02

Au-delà de la génération de l'application, la Phase 02 doit répondre à **une
question bloquante** : les patterns SEOS, extraits sur Angular 21, restent-ils
valides sur Angular 22 ?

Ils décrivent une structure de fichiers et des responsabilités, pas des API du
framework — la réponse est probablement oui, mais elle n'est pas vérifiée. Le
test se fait **sur une seule entité** : générer, compiler, passer
`check-pattern.js`. Il vaut mieux découvrir un écart sur une entité que sur
cinquante.

## Ancienne projection des stacks

Cette projection n'est plus un état courant. React est démarré et constitue une
cible produit. React Native, Kotlin, Swift, PHP, Spring Boot, Rust et Grafana ne
sont pas déclarés supportés sans preuve dédiée.

La structure `apps/` + `libs/` et le mode package-based ont été choisis pour les
accueillir sans réorganisation : un package non-JS s'intègre au graphe Nx par un
`project.json` déclarant ses tâches via `nx:run-commands`.

Chacune aura besoin de son propre mécanisme de version unique — le catalog bun
ne couvre que l'écosystème JS/TS.

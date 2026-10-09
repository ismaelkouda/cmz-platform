# Feuille de route courante

- **Dernière mise à jour :** 2026-10-09
- **Autorité produit :**
  [ADR-0094](../adr/0094-cap-produit-interne-remplacement-progressif-et-cibles-web.md)

## Chemin critique courant

1. **Finaliser la clôture gouvernée de #64.** Le dossier C6 relie désormais les
   critères aux artefacts/tests et le registre porte séparément les primitives
   v1 et v2 par cible. La PR #233 est fusionnée, ses 17 jobs sont verts et la CI
   post-fusion de `main` est réussie. Les SHA, runs et limites sont reportés
   dans l'issue ; Soumaila est assigné. Il reste uniquement sa confirmation
   explicite des huit points d'équivalence, puis la fermeture de l'issue. Aucun
   nouveau code de composition n'est attendu pour cette clôture.
2. **Archiver progressivement SEOS.** Dans un changement séparé, inventorier les
   derniers consommateurs et retirer du chemin critique CI les preuves déjà
   transférées. Ne pas supprimer une preuve encore unique.
3. **Démarrer la première application réelle.** Écrire avec le propriétaire le
   brief du produit « signalement de zone non couverte », puis son contrat
   backend cible. Ne rien déduire du legacy à la place des données disponibles.
4. **Livrer une première tranche verticale.** Une expérience et une page
   utilisables, sur une cible explicitement choisie, avec navigateur, backend
   contracté, observabilité et stratégie de retour arrière.
5. **Remplacer le legacy par étapes.** Transférer comportements et données
   utiles, déployer progressivement, puis retirer l'ancien périmètre.
6. **Construire le workbench par valeur.** Cockpit de lecture, diff,
   approbation, aperçu isolé puis publication contrôlée. Aucune automatisation
   supplémentaire sans baseline et condition d'abandon (ADR-0080).

### Conditions de passage

- aucune capacité n'est promue sans preuve reproductible et revue humaine ;
- Angular et React sont évalués séparément ; un claim commun exige les deux ;
- la première application réelle prime sur une nouvelle abstraction de
  plateforme non déclenchée par son besoin ;
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

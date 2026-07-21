# Feuille de route

- **Dernière mise à jour :** 2026-07-21

Le monorepo se construit **stack par stack**, chaque stack étant découpée en
phases validées une à une. Angular d'abord ; les autres ne démarreront qu'une
fois celle-ci stabilisée.

## Angular — en cours

| Phase | Objet                                                                                   | Statut          |
| ----- | --------------------------------------------------------------------------------------- | --------------- |
| 01    | Socle du monorepo : Nx package-based, bun, structure, versions, conventions, garde-fous | ✅ Terminée     |
| 02    | Application Angular 22 + **validation du pattern sur une entité**                       | ⏳ Non démarrée |
| 03    | **Mesure de couverture** des patterns sur les 53 entités                                | ⏳ Non démarrée |
| 04    | Adaptation des générateurs SEOS au monorepo (sortie en packages)                        | ⏳ Non démarrée |
| 05    | Socle transverse `shared/` + `core/` (584 fichiers) et dépendances métier               | ⏳ Non démarrée |
| 06    | Qualité, tests, configuration, Docker, CI, Nx Cloud                                     | ⏳ Non démarrée |
| 07    | Reconstruction des 53 entités par génération                                            | ⏳ Non démarrée |
| 08    | Vérification fonctionnelle par rapport à l'application source                           | ⏳ Non démarrée |

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

## Stacks ultérieures

React, React Native, Kotlin, Swift, PHP, Spring Boot, Rust, Grafana. Aucune
n'est démarrée, et aucune ne le sera avant qu'Angular ne soit stabilisé.

La structure `apps/` + `libs/` et le mode package-based ont été choisis pour les
accueillir sans réorganisation : un package non-JS s'intègre au graphe Nx par un
`project.json` déclarant ses tâches via `nx:run-commands`.

Chacune aura besoin de son propre mécanisme de version unique — le catalog bun
ne couvre que l'écosystème JS/TS.

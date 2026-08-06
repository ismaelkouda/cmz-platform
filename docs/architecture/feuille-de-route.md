# Feuille de route

- **Dernière mise à jour :** 2026-08-02

Le monorepo se construit **stack par stack**, chaque stack étant découpée en
phases validées une à une. Angular d'abord ; les autres ne démarreront qu'une
fois celle-ci stabilisée.

Découpage Phase 08 / 09 :
[ADR-0013](../adr/0013-phases-08-generation-et-09-verification.md).

## Angular — en cours

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

## Stacks ultérieures

React, React Native, Kotlin, Swift, PHP, Spring Boot, Rust, Grafana. Aucune
n'est démarrée, et aucune ne le sera avant qu'Angular ne soit stabilisé.

La structure `apps/` + `libs/` et le mode package-based ont été choisis pour les
accueillir sans réorganisation : un package non-JS s'intègre au graphe Nx par un
`project.json` déclarant ses tâches via `nx:run-commands`.

Chacune aura besoin de son propre mécanisme de version unique — le catalog bun
ne couvre que l'écosystème JS/TS.

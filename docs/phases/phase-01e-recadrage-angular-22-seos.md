# Phase 01e — Recadrage : Angular 22 et reconstruction pilotée par les patterns

- **Statut :** ✅ Terminée
- **Date :** 2026-07-21
- **Prérequis :** [Phase 01d](./phase-01d-conventions-et-observations.md)
- **ADR associés :**
  [ADR-0009 — Cible Angular 22](../adr/0009-cible-angular-22.md),
  [ADR-0010 — Reconstruction pilotée par les patterns](../adr/0010-reconstruction-pilotee-par-patterns.md)

## Objectif

Prendre en compte deux changements de cadrage énoncés avant le démarrage de la
Phase 02 :

1. le projet cible la **dernière version d'Angular (22)**, et non la version du
   projet d'origine ;
2. la reconstruction s'appuie sur les **patterns SEOS** du dossier `seos/` du
   projet d'origine, et non sur un déplacement de fichiers.

## Périmètre

### Inclus

- Bascule du catalog et de `engines` sur Angular 22.
- Inspection du dossier `seos/` et mesure de la couverture des patterns.
- Formalisation des deux décisions et refonte de la stratégie de reconstruction.

### Explicitement exclu

- Aucun générateur n'est adapté au monorepo : Phase 02 et suivantes.
- Aucune validation des patterns sur Angular 22 : c'est le premier travail de la
  Phase 02, sur une entité unique.
- L'emplacement définitif des schémas et outils SEOS n'est pas tranché.

## Étapes exécutées

### 1. Bascule sur Angular 22

Version stable courante relevée sur le registre : **22.0.7** (`22.1.0-next.6` en
préparation, écartée).

| Élément                                    | Avant                                  | Après                                  |
| ------------------------------------------ | -------------------------------------- | -------------------------------------- |
| Framework `@angular/*`                     | 21.2.16                                | 22.0.7                                 |
| `@angular/cdk`                             | 21.2.14                                | 22.0.5                                 |
| Outillage (`build`, `cli`, `compiler-cli`) | 21.2.16                                | 22.0.7                                 |
| `engines.node`                             | `^20.19.0 \|\| ^22.12.0 \|\| >=24.0.0` | `^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0` |
| `.nvmrc`                                   | `22`                                   | `22.22.3`                              |

`typescript` (6.0.3), `rxjs` (7.8.2) et `zone.js` (0.16.2) satisfont déjà les
contraintes d'Angular 22 et restent inchangés.

### 2. Contrainte Node — le point réellement dangereux

Angular 22 exige `node: ^22.22.3 || ^24.15.0 || >=26.0.0`. L'ancienne plage du
socle acceptait quatre configurations qu'Angular 22 refuse :

| Node    | Ancienne plage | Angular 22 |
| ------- | -------------- | ---------- |
| 20.19.0 | ✅             | ❌         |
| 22.12.0 | ✅             | ❌         |
| 22.22.2 | ✅             | ❌         |
| 24.0.0  | ✅             | ❌         |

Sans cette mise à jour, `check-engines` aurait continué d'afficher «
environnement conforme » sur un poste Node 20 — le garde-fou aurait certifié une
configuration cassée.

### 3. Inspection du dossier `seos/`

| Élément                             | Contenu                                         |
| ----------------------------------- | ----------------------------------------------- |
| `crud-entity.pattern.json`          | Schéma v23 — 106 fichiers canoniques par entité |
| `action-request.pattern.json`       | Schéma v6 — 34 fichiers par opération           |
| `generate-reference-module.js`      | 1 984 lignes                                    |
| `generate-action-request-module.js` | 698 lignes                                      |
| `check-semantics.js`                | 727 lignes                                      |
| `check-pattern.js`                  | 122 lignes                                      |
| `extract-pattern.js`                | 410 lignes                                      |

Répartition des 106 fichiers canoniques de `crud-entity` par couche :
`application` 31, `domain` 26, `infrastructure` 23, `presentation` 21, `di` 4,
racine 1.

Le schéma porte 23 itérations de conception (`design_decisions_v3` à `v23`),
chacune rattachée à une expérience datée du `SEOS-Assumptions-Register.md` (1
082 lignes).

### 4. Mesure de la couverture des patterns

Cette mesure conditionne tout chiffrage de la Phase 07 ; elle a donc été faite
sur le code réel plutôt que supposée.

| Indicateur                                          | Valeur                        |
| --------------------------------------------------- | ----------------------------- |
| Entités déclarées dans le projet d'origine          | **53**                        |
| Domaines concernés                                  | 16                            |
| Unités sur lesquelles les patterns sont **prouvés** | **6** (3 CRUD + 3 opérations) |

Trois domaines (`interactive-map`, `monitoring`, `reporting`) ne déclarent
**aucune commande** : ils ne relèvent visiblement d'aucun des deux schémas
existants.

**La couverture réelle est donc largement inconnue.** C'est le premier travail
de la Phase 07, et `extract-pattern.js` existe pour y répondre.

## Ce que ce recadrage invalide

| Élément                                              | Statut                                                 |
| ---------------------------------------------------- | ------------------------------------------------------ |
| Stratégie de migration fichier par fichier           | ❌ Remplacée par la reconstruction générative          |
| Codemod de réécriture des imports (~4 000 fichiers)  | ❌ Sans objet — le code est généré, pas déplacé        |
| Ordre de migration par volume de fichiers            | ⚠️ Remplacé par un ordre par **couverture de pattern** |
| Analyse du couplage inter-domaines (12/18 découplés) | ✅ Toujours valide et utile                            |
| ADR-0001 à 0008                                      | ✅ Aucun n'est remis en cause                          |

L'analyse du couplage garde toute sa valeur : elle établissait que les domaines
sont indépendants, donc parallélisables. Cela reste vrai que le code soit
déplacé ou régénéré.

## Vérifications

| Contrôle                                  | Résultat                             |
| ----------------------------------------- | ------------------------------------ |
| `bun run check:engines` sous Node 22.22.3 | ✅ conforme                          |
| Frontière 22.22.2 / 22.22.3               | ✅ refusée / acceptée                |
| Frontière 24.14.9 / 24.15.0               | ✅ refusée / acceptée                |
| Node 20.19.0 (ancienne plage)             | ✅ désormais refusé                  |
| `@nx/angular` 23.1.0 vs Angular 22        | ✅ `>= 20.0.0 < 23.0.0` — compatible |
| `typescript` 6.0.3 vs Angular 22          | ✅ `>=6.0 <6.1`                      |
| Liens de la documentation                 | ✅ aucun cassé                       |

## Points d'attention

- **Les patterns ont été extraits sur Angular 21.** Ils décrivent une structure
  de fichiers et des responsabilités, pas des API du framework — leur validité
  sur Angular 22 est probable, mais **non vérifiée**. À confirmer sur une seule
  entité avant tout engagement de calendrier.
- **Les générateurs produisent une arborescence d'application, pas des
  packages.** Leur sortie vise `src/presentation/pages/{MODULE}/` ; le monorepo
  attend des packages `libs/*` avec `package.json` et dépendances déclarées
  ([ADR-0004](../adr/0004-graphe-de-dependances-declarees.md)). Adaptation
  réelle à prévoir — c'est précisément la généralisation que SEOS voulait
  éprouver.
- **La conformité structurelle n'est pas une preuve de correction.** Le schéma
  le dit lui-même et renvoie à neuf expériences où des déviations réelles ont
  été trouvées malgré 100 % de conformité.
- **Deux dépôts porteront temporairement une vérité partagée** : les schémas et
  outils vivent dans le projet d'origine, la reconstruction ici. À trancher.

## Suite

**Phase 02 — Application Angular 22.** Génération de `apps/backoffice-angular`
(package `@cmz/backoffice-angular`), premier consommateur du catalog. La
validation des patterns sur Angular 22 devient l'objectif de sortie de phase,
sur une entité unique.

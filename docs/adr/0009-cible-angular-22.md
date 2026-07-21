# ADR-0009 — Cible Angular 22, et non l'iso-version du projet d'origine

- **Statut :** Accepted
- **Date :** 2026-07-21
- **Phase concernée :**
  [Phase 01e](../phases/phase-01e-recadrage-angular-22-seos.md)
- **Amende :**
  [ADR-0005 — Politique de version unique](./0005-politique-de-version-unique.md)
  (la politique est inchangée ; seules les versions du catalog évoluent)

## Contexte

Le catalog du socle avait été initialisé sur **Angular 21.2.16**, c'est-à-dire
la version effectivement résolue dans le projet d'origine. L'intention était de
partir de la base exacte de l'application à reconstruire, afin de ne pas cumuler
migration structurelle et montée de version.

Cette hypothèse est révisée : le projet ne consiste pas à déplacer du code
existant, mais à **reconstruire** l'application à partir des patterns SEOS (cf.
[ADR-0010](./0010-reconstruction-pilotee-par-patterns.md)). Le code n'étant pas
transporté ligne à ligne, l'argument de l'iso-version perd son objet.

**Angular 22.0.7** est la version stable courante.

## Décision

Le socle cible **Angular 22.0.7**. Le catalog est mis à jour en conséquence, et
la plage `engines.node` est alignée sur l'exigence réelle d'Angular 22.

| Dépendance                              | Avant                                  | Après                                      |
| --------------------------------------- | -------------------------------------- | ------------------------------------------ |
| `@angular/*` (framework)                | 21.2.16                                | **22.0.7**                                 |
| `@angular/cdk`                          | 21.2.14                                | **22.0.5**                                 |
| `@angular/build`, `cli`, `compiler-cli` | 21.2.16                                | **22.0.7**                                 |
| `typescript`                            | 6.0.3                                  | 6.0.3 (Angular 22 exige `>=6.0 <6.1`)      |
| `rxjs`                                  | 7.8.2                                  | 7.8.2 (`^6.5.3 \|\| ^7.4.0`)               |
| `zone.js`                               | 0.16.2                                 | 0.16.2 (`~0.15.0 \|\| ~0.16.0`)            |
| `engines.node`                          | `^20.19.0 \|\| ^22.12.0 \|\| >=24.0.0` | **`^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0`** |

## Justification

### Reconstruire sur la version courante plutôt que sur une version à rattraper

Reconstruire sur Angular 21 imposerait une montée de version immédiatement après
la reconstruction — c'est-à-dire refaire deux fois le travail de vérification.

### La contrainte Node était le point réellement dangereux

Angular 22 déclare `node: ^22.22.3 || ^24.15.0 || >=26.0.0`. Confronté à
l'ancienne plage du socle, l'écart n'est pas anecdotique :

| Version de Node | Ancienne plage | Exigence Angular 22                             |
| --------------- | -------------- | ----------------------------------------------- |
| 20.19.0         | ✅ acceptée    | ❌ refusée — la branche 20 n'est plus supportée |
| 22.12.0         | ✅ acceptée    | ❌ refusée                                      |
| 22.22.2         | ✅ acceptée    | ❌ refusée                                      |
| 24.0.0          | ✅ acceptée    | ❌ refusée — le minimum est 24.15.0             |

Autrement dit, quatre configurations que le socle déclarait valides auraient
échoué au build. Sans mise à jour de `engines`, `check-engines.mjs` aurait
continué d'afficher « environnement conforme » sur un poste Node 20 — le
garde-fou aurait certifié une configuration cassée. C'est précisément le mode de
défaillance qu'il existe pour empêcher.

Ces frontières sont vérifiées : `22.22.2` est refusée, `22.22.3` acceptée ;
`24.14.9` refusée, `24.15.0` acceptée.

### Nx 23.1.0 reste compatible

`@nx/angular` 23.1.0 (dernière version) déclare
`@angular/build: ">= 20.0.0 < 23.0.0"`. Angular 22 est dans la plage — aucune
adaptation de Nx n'est nécessaire.

## Conséquences

### Positives

- La reconstruction part de la version courante, sans dette de version à
  rattraper aussitôt après.
- Accès aux évolutions d'Angular 22 pour du code écrit sans historique à
  préserver.
- `engines` décrit enfin une contrainte exacte plutôt qu'approximative.

### Négatives / dette acceptée

- **Node 20 n'est plus supporté.** Tout poste ou agent de CI en Node 20 doit
  monter en version — `check-engines` échouera à l'installation, avec un message
  explicite.
- Les patterns SEOS ont été extraits et validés sur Angular 21. Leur validité
  sur Angular 22 est **probable mais non vérifiée** : les patterns décrivent une
  structure de fichiers et des responsabilités, pas des API du framework. C'est
  la première chose à confirmer en Phase 02, sur une seule entité.
- Le projet d'origine reste en Angular 21 : les deux applications divergeront,
  ce qui complique la comparaison ligne à ligne — mais celle-ci n'était de toute
  façon plus l'approche retenue.

### Points à réévaluer

- Angular 22.1 est en préparation (`22.1.0-next.6`). Rester sur la branche
  stable ; monter par le catalog quand elle sortira, en une seule ligne.

## Références

- `npm view @angular/core@22.0.7 engines peerDependencies`
- `npm view @angular/compiler-cli@22.0.7 peerDependencies` →
  `typescript: >=6.0 <6.1`
- [ADR-0010 — Reconstruction pilotée par les patterns](./0010-reconstruction-pilotee-par-patterns.md)

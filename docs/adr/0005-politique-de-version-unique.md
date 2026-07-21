# ADR-0005 — Politique de version unique pour le socle

- **Statut :** Accepted
- **Date :** 2026-07-21
- **Phase concernée :** [Phase 01c](../phases/phase-01c-politique-de-versions.md)
- **Origine :** point C4 de la
  [revue de socle du 2026-07-21](../reviews/2026-07-21-revue-socle-avant-phase-02.md)

## Contexte

Le mode package-based ([ADR-0001](./0001-monorepo-nx-package-based.md)) donne à
chaque package son propre `package.json` et ses propres dépendances. C'est
précisément ce qui permet d'accueillir des technologies hétérogènes — mais rien
n'empêche alors deux packages Angular d'embarquer deux versions différentes du
framework.

Les conséquences ne sont pas théoriques. Deux versions d'Angular dans un même
graphe produisent des erreurs de compilation difficiles à relier à leur cause
(`NG0203`, injecteurs incompatibles), et deux copies du framework dans le bundle
final. Deux versions de TypeScript font diverger le typage entre packages qui se
consomment mutuellement.

Le risque croît avec le nombre de packages : c'est la dette identifiée comme
contrepartie assumée de l'ADR-0001, qu'il faut désormais outiller.

## Options envisagées

### Option A — Catalog de bun

bun centralise les versions à la racine du workspace ; les packages déclarent
`"@angular/core": "catalog:"` sans version.

- Avantages : natif au gestionnaire de paquets déjà retenu, sans dépendance
  supplémentaire ; une seule ligne à modifier pour une montée de version ; le
  lockfile matérialise le catalog, donc la contrainte est vérifiable.
- Inconvénients : ne s'applique qu'aux packages JS/TS ; **ne contraint pas un
  package à utiliser le catalog** — une version écrite en dur reste acceptée
  sans erreur.

### Option B — Vérification en CI uniquement

Un script compare les versions déclarées entre packages et échoue en cas de
divergence.

- Avantages : indépendant du gestionnaire de paquets, applicable à toutes les
  stacks.
- Inconvénients : purement défensif — la divergence est détectée après coup,
  pas empêchée ; oblige à répéter la version dans chaque package.

### Option C — Dépendances au niveau racine

Toutes les dépendances Angular déclarées à la racine, aucune dans les packages.

- Avantages : unicité garantie par construction.
- Inconvénients : revient de fait au mode intégré et annule l'autonomie des
  packages recherchée par l'ADR-0001.

## Décision

**Options A et B combinées.**

1. Le **catalog de bun** centralise les versions du socle à la racine :
   - catalog par défaut — dépendances d'exécution : `@angular/*`, `rxjs`,
     `zone.js`, `tslib` ;
   - catalog `tooling` — dépendances de compilation : `@angular/build`,
     `@angular/cli`, `@angular/compiler-cli`, `typescript`.
2. Un script **`bun run check:versions`** (`tools/check-catalog-usage.mjs`)
   vérifie que tout package utilisant une dépendance présente au catalog la
   déclare bien en `catalog:`. Il sort en code 1 en cas de violation, et sera
   branché sur la CI en Phase 06.
3. **Nx n'est pas au catalog** : `nx` et `@nx/*` restent des dépendances de la
   racine exclusivement. Leur unicité est garantie par construction, un package
   n'ayant aucune raison de déclarer sa propre version de l'orchestrateur.

Les versions initiales reprennent celles effectivement résolues dans le projet
d'origine (Angular 21.2.16, TypeScript 6.0.3, RxJS 7.8.2, zone.js 0.16.2), afin
que le monorepo parte de la base exacte de l'application à reconstruire.

## Justification

Le catalog seul laisse un trou : il rend le bon comportement facile, mais
n'interdit pas le mauvais. Un développeur pressé peut écrire une version en dur,
et `bun install` l'acceptera sans broncher. Le script referme ce trou en rendant
la politique vérifiable automatiquement — c'est la combinaison des deux qui la
rend effective, l'un pour la commodité, l'autre pour la garantie.

L'option C a été écartée parce qu'elle résoudrait le problème en annulant la
décision d'architecture qui l'a créé.

## Conséquences

### Positives

- Une montée de version d'Angular se fait en un seul endroit.
- Une divergence est détectée en CI, pas au moment où un bug incompréhensible
  apparaît en production.
- La version du socle devient une donnée explicite et documentée du dépôt.

### Négatives / dette acceptée

- Un package qui aurait une raison légitime de diverger devra faire l'objet
  d'une exception explicite — le script ne prévoit pas de liste d'exclusion pour
  l'instant, à ajouter le jour où le besoin se présente réellement.
- La politique ne couvre que l'écosystème JS/TS. Les stacks Kotlin, Swift, PHP,
  Rust et Spring Boot auront besoin d'un mécanisme équivalent propre à leur
  gestionnaire de dépendances (version catalog Gradle, `Cargo.toml` de workspace,
  contraintes Composer) — à traiter lors de leur intégration.

### Points à réévaluer

- Étendre le catalog au-delà du socle (PrimeNG, NgRx, etc.) une fois les
  dépendances métier introduites en Phase 04.
- Si le nombre d'exceptions légitimes devenait significatif, revoir le
  périmètre du catalog plutôt que d'affaiblir la vérification.

## Références

- Mécanisme validé sur bun 1.3.14 : résolution `catalog:` et `catalog:tooling`
  confirmée dans `bun.lock`.
- Versions relevées dans `node_modules` du projet d'origine.
- [Revue de socle du 2026-07-21, point C4](../reviews/2026-07-21-revue-socle-avant-phase-02.md)

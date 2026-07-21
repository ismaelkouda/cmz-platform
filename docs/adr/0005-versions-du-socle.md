# ADR-0005 — Versions du socle : Angular 22 et catalog centralisé

- **Statut :** Accepted
- **Date :** 2026-07-21

## Contexte

Deux questions distinctes se posaient, mais leur réponse est indissociable :
**quelle version d'Angular viser**, et **comment empêcher que les packages ne
divergent** une fois cette version choisie.

### La version

Le projet reconstruit `cmz-backoffice-frontend`, qui tourne en Angular 21.2.16.
Deux cibles étaient possibles : reprendre cette version à l'identique, ou partir
de la version courante.

L'argument de l'iso-version — ne pas cumuler restructuration et montée de
version — perd son objet dès lors que le code n'est **pas transporté ligne à
ligne** mais régénéré à partir des patterns
([ADR-0009](./0009-reconstruction-pilotee-par-patterns.md)).

### La divergence entre packages

Le mode package-based ([ADR-0001](./0001-monorepo-nx-package-based.md)) donne à
chaque package son propre `package.json`. C'est ce qui permet d'accueillir des
technologies hétérogènes, mais rien n'empêche alors deux packages Angular
d'embarquer deux versions du framework.

Les conséquences ne sont pas théoriques : deux versions d'Angular dans un même
graphe produisent des erreurs difficiles à relier à leur cause (`NG0203`,
injecteurs incompatibles) et deux copies du framework dans le bundle. Deux
versions de TypeScript font diverger le typage entre packages qui se consomment.

## Décision

### Angular 22.0.7, la version stable courante

| Dépendance                              | Version                                | Contrainte d'origine             |
| --------------------------------------- | -------------------------------------- | -------------------------------- |
| `@angular/*` (framework)                | 22.0.7                                 | —                                |
| `@angular/cdk`                          | 22.0.5                                 | dernière publiée                 |
| `@angular/build`, `cli`, `compiler-cli` | 22.0.7                                 | lockstep avec le framework       |
| `typescript`                            | 6.0.3                                  | Angular 22 exige `>=6.0 <6.1`    |
| `rxjs`                                  | 7.8.2                                  | `^6.5.3 \|\| ^7.4.0`             |
| `zone.js`                               | 0.16.2                                 | `~0.15.0 \|\| ~0.16.0`           |
| `engines.node`                          | `^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0` | **exigence exacte d'Angular 22** |

### Un catalog bun pour centraliser

- **catalog par défaut** — exécution : `@angular/*`, `rxjs`, `zone.js`, `tslib`
  ;
- **catalog `tooling`** — compilation : `@angular/build`, `cli`, `compiler-cli`,
  `typescript`.

Deux catalogs plutôt qu'un : exécution et compilation n'évoluent pas au même
rythme et ne concernent pas les mêmes packages — une bibliothèque de domaine a
besoin de TypeScript, pas de la CLI Angular.

### Un contrôle qui rend la politique effective

`bun run check:versions` (`tools/check-catalog-usage.mjs`) vérifie que tout
package utilisant une dépendance présente au catalog la déclare bien en
`catalog:`. Sortie en code 1 en cas de violation.

### Nx hors catalog

`nx` et `@nx/*` restent des dépendances de la racine exclusivement. Leur unicité
est garantie par leur emplacement — un package n'a aucune raison de déclarer sa
propre version de l'orchestrateur.

## Justification

### Pourquoi la version courante

Reconstruire sur Angular 21 imposerait une montée de version immédiatement après
la reconstruction, c'est-à-dire refaire deux fois le travail de vérification.

### Pourquoi la contrainte Node était le point réellement dangereux

Angular 22 déclare `node: ^22.22.3 || ^24.15.0 || >=26.0.0`. Une plage
approximative aurait laissé passer quatre configurations qui échouent au build :

| Node    | Angular 22                                 |
| ------- | ------------------------------------------ |
| 20.19.0 | ❌ la branche 20 n'est plus supportée      |
| 22.12.0 | ❌                                         |
| 22.22.2 | ❌                                         |
| 24.0.0  | ❌ le minimum de la branche 24 est 24.15.0 |

Un `engines` approximatif est pire qu'absent : `check-engines.mjs` aurait
affiché « environnement conforme » sur un poste Node 20, certifiant une
configuration cassée. Les frontières sont vérifiées : `22.22.2` refusée /
`22.22.3` acceptée, `24.14.9` refusée / `24.15.0` acceptée.

### Pourquoi le catalog seul ne suffit pas

Le catalog rend le bon comportement facile, mais n'interdit pas le mauvais :
écrire `"@angular/core": "^21.0.0"` en dur reste accepté par `bun install`. Le
script referme ce trou — c'est la combinaison des deux qui rend la politique
effective, l'un pour la commodité, l'autre pour la garantie.

Une variante consistant à déclarer toutes les dépendances Angular à la racine a
été écartée : elle résoudrait le problème en annulant la décision d'architecture
qui l'a créé ([ADR-0001](./0001-monorepo-nx-package-based.md)).

## Conséquences

### Positives

- Une montée de version se fait en un seul endroit.
- La divergence est détectée automatiquement, pas au moment où un bug
  incompréhensible apparaît.
- `engines` décrit une contrainte exacte, vérifiée à l'installation.

### Négatives / dette acceptée

- **Node 20 n'est plus supporté.** Tout poste ou agent de CI en Node 20 doit
  monter en version.
- Les patterns SEOS ont été extraits sur Angular 21. Ils décrivent une structure
  de fichiers et des responsabilités, pas des API du framework : leur validité
  sur Angular 22 est **probable mais non vérifiée** — à confirmer sur une entité
  unique avant tout engagement.
- Le projet source restant en Angular 21, les deux applications divergeront.
- Un package ayant une raison légitime de diverger devra faire l'objet d'une
  exception explicite ; le script ne prévoit pas de liste d'exclusion tant que
  le besoin n'est pas réel.
- La politique ne couvre que l'écosystème JS/TS. Les stacks Kotlin, Swift, PHP,
  Rust et Spring Boot auront besoin d'un mécanisme équivalent propre à leur
  gestionnaire de dépendances.

### Points à réévaluer

- Angular 22.1 est en préparation (`22.1.0-next.6`) : rester sur la branche
  stable, monter par le catalog en une ligne quand elle sortira.
- Étendre le catalog aux dépendances métier (PrimeNG, NgRx…) quand elles seront
  introduites.

## Références

- `npm view @angular/core@22.0.7 engines peerDependencies`
- `npm view @angular/compiler-cli@22.0.7 peerDependencies` →
  `typescript: >=6.0 <6.1`
- Mécanisme de catalog validé sur bun 1.3.14 (résolution confirmée dans
  `bun.lock`)

# ADR-0004 — Graphe de dépendances par déclaration explicite

- **Statut :** Accepted
- **Date :** 2026-07-21

## Contexte

Le mode package-based hérite du preset `nx/presets/npm.json`, dont le contenu
intégral est :

```json
{ "pluginsConfig": { "@nx/js": { "analyzeSourceFiles": false } } }
```

Nx ne construit donc **pas** le graphe de dépendances à partir des `import` du
code : il s'appuie exclusivement sur les dépendances déclarées dans les
`package.json`.

Or le projet d'origine repose entièrement sur des alias de chemins TypeScript :

```json
"paths": {
  "@app/*": ["./src/app/*"],          "@core/*": ["./src/core/*"],
  "@shared/*": ["./src/shared/*"],    "@presentation/*": ["./src/presentation/*"],
  "@pages/*": ["./src/presentation/pages/*"], "@assets/*": ["./src/assets/*"]
}
```

Transposés tels quels lors du découpage en packages, ces alias produiraient un
graphe **vide** : Nx considérerait chaque package comme indépendant de tous les
autres. `nx affected` renverrait alors des faux négatifs — une modification du
domaine ne déclencherait ni la reconstruction ni les tests des features qui en
dépendent — et le cache servirait des artefacts périmés.

Un graphe faux est plus dangereux qu'une absence de graphe : il inspire une
confiance injustifiée, et les régressions passent silencieusement.

## Options envisagées

### Option A — Dépendances déclarées

Chaque package déclare ses dépendances internes dans son `package.json` :

```json
{ "dependencies": { "@cmz/shared-domain": "workspace:*" } }
```

et les imports passent par le nom du package :

```ts
import { Report } from '@cmz/shared-domain';
```

- Avantages : graphe exact et vérifiable ; usage canonique du mode package-based
  ; une dépendance non déclarée devient une erreur de résolution immédiate, ce
  qui rend les frontières entre couches réellement opposables ; chaque package
  reste extractible du monorepo.
- Inconvénients : une déclaration à maintenir par dépendance ; réécriture des
  imports lors de la migration.

### Option B — `analyzeSourceFiles: true`

Nx déduit le graphe des imports TypeScript, les alias sont conservés.

- Avantages : aucune réécriture, continuité avec les habitudes de l'équipe.
- Inconvénients : les frontières entre packages redeviennent implicites — rien
  n'empêche un import qui contourne l'architecture ; on perd le bénéfice
  principal du mode package-based sans en payer moins le coût ; l'analyse
  statique alourdit le calcul du graphe à mesure que le dépôt grossit.

## Décision

Le graphe repose sur des **dépendances déclarées** : `"workspace:*"` dans les
`package.json`, imports par nom de package. `analyzeSourceFiles` reste à
`false`.

Les alias de chemins TypeScript hérités du projet d'origine (`@core/*`,
`@shared/*`, `@presentation/*`, `@pages/*`) **ne sont pas reconduits** entre
packages. Ils restent acceptables _à l'intérieur_ d'un package, pour ses chemins
internes.

## Justification

Ce choix est la contrepartie logique de
l'[ADR-0001](./0001-monorepo-nx-package-based.md). Adopter le mode package-based
pour son cloisonnement, puis rétablir des alias globaux qui traversent les
packages, reviendrait à en conserver les contraintes sans les bénéfices.

La déclaration explicite apporte en outre une propriété que l'analyse statique
ne donne pas : une dépendance non déclarée **échoue à la résolution**, sans
attendre une règle de lint. L'architecture devient exécutable plutôt que
documentaire.

## Conséquences

### Positives

- `nx affected` et le cache sont fiables — condition nécessaire à toute CI
  incrémentale.
- Le graphe se lit dans les `package.json`, sans outil.
- Les packages non-JS s'intègrent au même modèle via leur `project.json`, sans
  exception à prévoir.

### Négatives / dette acceptée

- La migration des ~4 000 fichiers TypeScript devra réécrire les imports
  inter-packages. À automatiser (codemod) plutôt qu'à faire à la main : à
  prévoir explicitement dans la Phase 07.
- Chaque nouvelle dépendance entre packages demande une déclaration — friction
  volontaire, qui incite à réfléchir avant de créer un couplage.

### Points à réévaluer

- Si la maintenance des déclarations devenait le principal frein au rythme de
  développement, réexaminer l'option B — mais alors en assumant de compléter par
  des règles de frontières ESLint (`@nx/enforce-module-boundaries`).

## Références

- `node_modules/nx/dist/presets/npm.json` (contenu du preset hérité)
- `tsconfig.app.json` du projet d'origine (alias de chemins)
- [analyse du projet source](../architecture/analyse-du-projet-source.md)

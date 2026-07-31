# ADR-0003 — Nommage et structure du monorepo

- **Statut :** Accepted — **Amendé le 2026-07-29**
- **Date initiale :** 2026-07-21
- **Amendement :** 2026-07-29 — Formalisation de la taxonomie des tags Nx, du
  sous-niveau kernel `libs/shared/`, du cas singleton `libs/core/`, de la
  convention canonique de nommage des packages, et de la règle de tenue à jour
  obligatoire à chaque nouveau module.

## Contexte

Le nom du dépôt et l'emplacement des packages devaient être arrêtés **avant que
le premier package n'existe** : ils se propagent à l'URL Git, aux scopes npm,
aux images Docker, aux jobs de CI et aux imports de chaque package. Les corriger
ensuite impose de déplacer chaque package et de réécrire ses références.

Le premier chantier est le back-office Angular, mais le dépôt est destiné à
héberger React, React Native, Kotlin, Swift, PHP, Spring Boot, Rust et Grafana.
Un nom qui reflète le premier chantier vieillirait mal.

Au 2026-07-29, **16 modules** sont présents dans `libs/` (11 modules métier + le
kernel `shared/` + `core`). Les décisions prises en juillet 2026 ont tenu à
l'épreuve du code réel ; cet amendement en formalise les extensions non
documentées initialement.

## Options envisagées (inchangées)

### Nommage

| Option                   | Évaluation                                                                    |
| ------------------------ | ----------------------------------------------------------------------------- |
| `cmz-backoffice-angular` | Un package Rust vivrait à terme dans un dépôt nommé « angular »               |
| `cmz-platform`           | Neutre vis-à-vis des technologies, décrit ce que le dépôt contient réellement |
| `cmz-monorepo`           | Neutre également, mais décrit le contenant plutôt que le produit              |

### Structure

| Option                   | Évaluation                                                                   |
| ------------------------ | ---------------------------------------------------------------------------- |
| `packages/*` plat        | Simple, mais ne distingue ni la nature ni la stack ; illisible à l'échelle   |
| `apps/` + `libs/`        | Sépare le déployable du réutilisable ; convention Nx la mieux outillée       |
| `packages/<stack>/<nom>` | Bon cloisonnement par technologie, mais éclate les bibliothèques transverses |

## Décision

### 1. Nom du dépôt et scope npm

- Le dépôt s'appelle **`cmz-platform`**, le package racine **`@cmz/source`**, et
  tous les packages adoptent le scope **`@cmz/*`**.

### 2. Structure `apps/` + `libs/`

La structure retenue est **`apps/` + `libs/`**, déclarée dans les _workspaces_
bun et dans `workspaceLayout` de `nx.json`. Le workspace bun déclare trois globs
pour couvrir les sous-niveaux existants :

```json
"workspaces": {
  "packages": ["apps/*", "libs/*", "libs/*/*"]
}
```

La technologie d'un package est portée par **son nom** et par ses **tags Nx**,
jamais par l'arborescence.

### 3. Convention de nommage canonique des packages

Le nom d'un package suit le schéma **`@cmz/<module>-<couche>`**, où `<couche>`
est l'un des cinq identifiants ci-dessous :

| Couche      | Identifiant   | Chemin disque                              |
| ----------- | ------------- | ------------------------------------------ |
| Domaine     | `domain`      | `libs/<module>/domain/src/`                |
| Données     | `data`        | `libs/<module>/data/src/`                  |
| Application | `application` | `libs/<module>/application/src/`           |
| Interface   | `ui`          | `libs/<module>/ui/src/`                    |
| Navigateur  | `browser`     | `libs/shared/browser/src/` _(kernel only)_ |

Exemples validés par `tsconfig.base.json` :

```
@cmz/report-states-domain        →  libs/report-states/domain/
@cmz/report-states-data          →  libs/report-states/data/
@cmz/report-states-application   →  libs/report-states/application/
@cmz/report-states-ui            →  libs/report-states/ui/
```

**Interdiction** : créer un package avec un suffixe autre que les cinq
identifiants ci-dessus (ex. `@cmz/report-states-helpers`, `@cmz/utils`). Tout
élément transverse trouve sa place dans `@cmz/shared-*` ou `@cmz/core`.

### 4. Taxonomie des tags Nx (deux axes orthogonaux)

La source de vérité exécutable des boundaries est `eslint.config.mjs` via la
règle `@nx/enforce-module-boundaries`. Deux axes de tags sont imposés :

#### Axe `type:*` — la couche

Chaque package est taggué avec **exactement un** type :

| Tag                | Autorisé à dépendre de                                         |
| :----------------- | :------------------------------------------------------------- |
| `type:constants`   | `type:constants`                                               |
| `type:domain`      | `type:domain`, `type:constants`                                |
| `type:core`        | `type:core`, `type:domain`, `type:constants`                   |
| `type:browser`     | `type:browser`, `type:domain`, `type:constants`                |
| `type:data`        | `type:data`, `type:domain`, `type:core`, `type:constants`      |
| `type:application` | `type:application`, `type:domain`, `type:constants`            |
| `type:ui`          | `type:ui`, `type:application`, `type:domain`, `type:constants` |
| `type:app`         | `*` (composition root — peut tout brancher)                    |

**Règle inviolable** : `type:ui` ne peut jamais importer depuis `type:data`.
`type:domain` ne dépend d'aucun framework. Ces règles sont exécutées à chaque
`eslint` ; une violation est une erreur bloquante (`'error'`).

#### Axe `scope:*` — l'isolation du module

Chaque package porte **exactement un** scope. Un module ne voit que ses propres
packages **et** le kernel (`scope:shared`) :

```
scope:<module>  →  onlyDependOnLibsWithTags: ['scope:<module>', 'scope:shared']
```

**Exception documentée (2026-07-28)** : `scope:communication` est autorisé à
dépendre de `scope:administrative-boundary` — le formulaire de messagerie
réutilise la cascade géographique région→département→commune plutôt que de la
dupliquer. C'est le premier et (au 2026-07-29) seul couplage inter-domaines du
monorepo ; tout nouveau couplage inter-domaines doit faire l'objet d'un
commentaire explicatif dans `eslint.config.mjs`.

### 5. Cas spéciaux documentés

#### 5a. Le kernel `libs/shared/`

`libs/shared/` est le seul dossier à porter un **sous-niveau de regroupement**
activé dès la Phase 05. Il contient six packages :

```
libs/shared/
  ├── constants/    @cmz/shared-constants    type:constants  scope:shared
  ├── domain/       @cmz/shared-domain       type:domain     scope:shared
  ├── browser/      @cmz/shared-browser      type:browser    scope:shared
  ├── data/         @cmz/shared-data         type:data       scope:shared
  ├── application/  @cmz/shared-application  type:application scope:shared
  └── ui/           @cmz/shared-ui           type:ui         scope:shared
```

Ce groupement est acté. **Aucun module métier ne peut adopter un sous-niveau
similaire** : `libs/<module>/` expose directement ses quatre couches.

#### 5b. Le singleton `libs/core/`

`@cmz/core` (`libs/core/`) est un package sans sous-couches : il porte
exclusivement la **configuration runtime et les tokens d'injection** (URL API,
`BYPASS_CACHE`, intercepteurs HTTP). Il est taggué `type:core scope:shared`.

C'est l'unique exception au pattern à quatre couches. Elle est délibérée :
`core` ne contient ni entité, ni use-case, ni composant — un découpage en
`core/domain`, `core/data`, etc. serait du sur-découpage sans valeur.

**Règle de périmètre** : si un besoin `core` ne peut pas être classé comme token
d'injection ou configuration runtime, il appartient à `shared-domain` ou
`shared-application`, pas à `core`.

## Justification

La distinction utile au quotidien est « qu'est-ce qui se déploie ? » — c'est
celle que `apps/` + `libs/` matérialise. Elle reste pertinente quelle que soit
la technologie : une application Spring Boot est une _app_, un module de domaine
partagé est une _lib_. Un découpage par stack obligerait à choisir un dossier
arbitraire pour toute bibliothèque transverse.

La taxonomie des tags (`type:*` × `scope:*`) transforme les boundaries
architecturales en **erreurs de résolution immédiates** — l'architecture est
exécutable, pas documentaire. Un import inter-domaines non déclaré **échoue**,
sans attendre une revue de code.

## Conséquences

### Positives

- Le dépôt peut accueillir n'importe quelle technologie sans incohérence de nom.
- Le scope `@cmz/*` est court, cohérent, et prêt pour une éventuelle
  publication.
- `apps/` + `libs/` est la convention attendue par la majorité des générateurs
  Nx.
- La taxonomie des tags forme un contrat machine-vérifiable à chaque push.
- La convention de nommage `<module>-<couche>` est apprenante par l'exemple :
  `tsconfig.base.json` en est le registre exhaustif.

### Négatives / dette acceptée

- Les packages non-JS (Kotlin, Swift, Rust, PHP) vivront eux aussi sous `apps/`
  ou `libs/`, ce qui peut surprendre : ces dossiers ne sont pas réservés à
  l'écosystème npm. Le tag `type:app` ou `type:lib` (selon ADR-0012) les
  identifie sans ambiguïté.
- Le maintien de la liste `scope:*` dans `eslint.config.mjs` est manuel et
  bloquant (voir règle ci-dessous).

## Règle de tenue à jour — obligatoire à chaque nouveau module

**Tout ajout d'un module** (`libs/<nouveau-module>/`) exige, dans le même
commit, les trois mises à jour suivantes :

1. **`eslint.config.mjs`** — ajouter la contrainte `scope:<nouveau-module>` dans
   `depConstraints`. Sans cette entrée, le module n'est soumis à aucune règle
   d'isolation et peut importer n'importe quel autre scope sans erreur.

2. **`tsconfig.base.json`** — ajouter les quatre chemins
   `@cmz/<nouveau-module>-{domain,data,application,ui}`. Sans ces chemins, les
   imports en nom de package échouent à la résolution TypeScript.

3. **`package.json` racine** — aucune modification si `libs/*/*` est déjà
   déclaré dans `workspaces.packages` ; vérifier que le glob couvre bien le
   nouveau chemin.

**Modules `processing`, `requests`, `finalization`, `report-states`** — scopes
`eslint.config.mjs` + chemins `tsconfig.base.json` **✅ corrigés 2026-07-30+**.
Vérifier le même triplet (eslint + tsconfig + workspaces) pour tout **nouveau**
module avant travail de code.

## Références

- [`eslint.config.mjs`](../../eslint.config.mjs) — source de vérité exécutable
  des boundaries
- [`tsconfig.base.json`](../../tsconfig.base.json) — registre des chemins de
  packages
- [`package.json`](../../package.json) — déclaration des workspaces bun
- [`nx.json`](../../nx.json) — `workspaceLayout`
- [ADR-0001](./0001-monorepo-nx-package-based.md) — mode package-based
- [ADR-0004](./0004-graphe-de-dependances-declarees.md) — graphe de dépendances
  déclarées
- [ADR-0012](./0012-strategie-cross-framework.md) — stratégie cross-framework
- [analyse du projet source](../architecture/analyse-du-projet-source.md)

# ADR-0001 — Monorepo Nx en mode package-based

- **Statut :** Accepted
- **Date :** 2026-07-21

## Contexte

L'objectif est de reconstruire `cmz-backoffice-frontend` — application Angular
existante, autonome, à l'architecture Clean/Hexagonal — au sein d'un monorepo.

Le monorepo n'est pas destiné à héberger seulement Angular : la feuille de route
prévoit d'y accueillir progressivement React, React Native, Kotlin, Swift, PHP,
Spring Boot, Rust et Grafana. Le choix du style de workspace doit donc tenir
compte de projets qui, pour la plupart, ne sont pas des packages Node et n'ont
ni `package.json` ni dépendances npm.

Nx propose trois styles de workspace :

| Style           | Principe                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `standalone`    | Une seule application à la racine                                                                                              |
| `integrated`    | Nx pilote la configuration : dépendances centralisées à la racine, projets sans `package.json propre                           |
| `package-based` | Chaque projet est un package autonome avec son propre `package.json` ; Nx se limite à orchestrer et mettre en cache les tâches |

## Options envisagées

### Option A — Workspace intégré (`integrated`)

- Avantages : une seule liste de dépendances, versions homogènes garanties ;
  génération de code Nx la plus fluide ; configuration mutualisée.
- Inconvénients : impose le modèle Nx à tous les projets ; couplage fort entre
  packages ; s'accommode mal de projets non-JS qui n'ont rien à faire d'un
  `package.json` racine ; toute montée de version affecte l'ensemble du monorepo
  d'un coup.

### Option B — Workspace package-based

- Avantages : chaque package déclare ses propres dépendances et peut évoluer à
  son rythme ; frontière naturelle entre stacks hétérogènes ; migration
  progressive possible sans big bang ; Nx reste un orchestrateur qu'on peut
  retirer sans réécrire les projets.
- Inconvénients : risque de divergence de versions entre packages si aucune
  discipline n'est appliquée ; un peu plus de configuration par package ;
  certains générateurs Nx supposent un workspace intégré.

## Décision

Le monorepo est créé en mode **package-based**, via le preset `npm` de Nx
(`--preset=npm --workspaceType=package-based`). Les packages sont déclarés dans
les _workspaces_ bun de la racine ; leur emplacement (`apps/` et `libs/`) relève
de l'[ADR-0003](./0003-nommage-et-structure.md), et la construction du graphe de
dépendances de l'[ADR-0004](./0004-graphe-de-dependances-declarees.md).

## Justification

L'hétérogénéité annoncée des stacks est le critère déterminant. Un workspace
intégré suppose que tous les projets partagent une configuration et un arbre de
dépendances Node : cette hypothèse est fausse dès qu'on ajoute Kotlin, Swift,
PHP, Spring Boot ou Rust. Le mode package-based ne fait au contraire aucune
hypothèse sur la nature d'un projet — un package Rust ou un module Gradle
s'intègre au graphe Nx par un simple `project.json` déclarant ses tâches via
`nx:run-commands`, exactement au même titre qu'un package Angular.

Ce mode sert également la contrainte de progressivité : l'application Angular
peut être migrée package par package, chacun restant fonctionnel isolément.

## Conséquences

### Positives

- Chaque stack conserve son outillage natif ; Nx apporte le graphe de
  dépendances, le cache et `nx affected` sans imposer son modèle.
- Les packages peuvent être versionnés et publiés indépendamment si le besoin
  apparaît.
- La sortie du monorepo (ou d'un package) reste possible à faible coût.

### Négatives / dette acceptée

- Sans discipline, les versions d'Angular ou de TypeScript peuvent diverger
  entre packages. À encadrer par une convention explicite dès la Phase 03, et à
  surveiller ensuite.
- Certains générateurs Nx pensés pour le mode intégré demanderont un ajustement
  manuel.
- Les règles de frontières entre couches (domain / data / application / ui)
  devront être posées explicitement via les tags Nx et ESLint — elles ne
  découlent pas du style de workspace.

### Points à réévaluer

- Si, après plusieurs stacks intégrées, le partage de configuration devient le
  problème dominant, réexaminer une bascule partielle vers le mode intégré pour
  le seul sous-ensemble JS/TS.

## Références

- [create-nx-workspace — `--workspaceType` et presets](https://nx.dev/docs/reference/create-nx-workspace)
- Projet d'origine analysé :
  `/Users/macbookair/Dev/Angular/cmz-backoffice-frontend`

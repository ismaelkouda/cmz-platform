# ADR-0002 — bun comme gestionnaire de paquets

- **Statut :** Accepted
- **Date :** 2026-07-21
- **Phase concernée :** [Phase 01](../phases/phase-01-squelette-nx.md)

## Contexte

Le monorepo doit choisir un gestionnaire de paquets qui servira à la fois pour
l'installation des dépendances, le linkage des packages internes et l'exécution
des scripts.

Le projet d'origine `cmz-backoffice-frontend` utilise déjà bun
(`"packageManager": "bun@1.3.8"` dans son `package.json`, lockfile `bun.lock`),
et l'équipe l'utilise donc au quotidien.

Nx supporte officiellement npm, yarn, pnpm et bun via l'option `--pm`, et les
quatre implémentent la notion de _workspaces_ nécessaire au mode package-based.

## Options envisagées

### Option A — bun

- Avantages : continuité avec le projet d'origine et les habitudes de l'équipe ;
  installation nettement plus rapide ; runtime, gestionnaire de paquets et
  exécuteur de scripts unifiés.
- Inconvénients : écosystème plus jeune ; quelques outils Node supposent encore
  npm/yarn ; l'environnement d'exécution ne l'a pas toujours préinstallé.

### Option B — pnpm

- Avantages : référence de fait sur les gros monorepos ; très économe en espace
  disque grâce au store partagé ; résolution stricte des dépendances.
- Inconvénients : rupture avec l'outillage actuel de l'équipe ; migration du
  lockfile existant.

### Option C — npm

- Avantages : disponible partout, aucune installation préalable.
- Inconvénients : le plus lent des trois ; rupture avec l'existant sans
  contrepartie.

## Décision

Le monorepo utilise **bun** comme gestionnaire de paquets, déclaré au niveau du
workspace, avec un lockfile `bun.lock` unique à la racine.

## Justification

Le critère décisif est la continuité : l'équipe et le projet source travaillent
déjà avec bun. Changer de gestionnaire de paquets en même temps qu'on introduit
Nx multiplierait les sources de problèmes pendant la migration, sans bénéfice
proportionné — pnpm n'apporterait pas d'avantage suffisant pour justifier cette
double rupture.

## Conséquences

### Positives

- Les commandes du projet d'origine restent transposables presque à l'identique.
- Installations et exécutions de scripts rapides, ce qui compte sur un monorepo
  destiné à grossir.

### Négatives / dette acceptée

- bun doit être disponible dans tous les environnements d'exécution, y compris
  la CI et les images Docker — à traiter explicitement en Phase 06.
- En cas d'incompatibilité d'un outil de l'écosystème Angular/Nx avec bun, il
  faudra un contournement ponctuel (exécution via `npx`/Node) plutôt qu'un
  changement global.

### Points à réévaluer

- Si un outil critique de la chaîne Angular/Nx se révèle durablement
  incompatible avec bun, reconsidérer pnpm.
- Les _stacks_ non-JS à venir (Kotlin, Swift, PHP, Rust, Spring Boot) ne sont
  pas concernées par ce choix : elles conservent leurs propres gestionnaires de
  dépendances et s'intègrent au graphe Nx par un autre mécanisme (cf.
  [ADR-0001](./0001-monorepo-nx-package-based.md)).

## Références

- [create-nx-workspace — option `--packageManager` / `--pm`](https://nx.dev/docs/reference/create-nx-workspace)
- `package.json` du projet d'origine : `"packageManager": "bun@1.3.8"`

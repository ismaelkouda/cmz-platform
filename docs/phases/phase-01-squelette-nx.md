# Phase 01 — Squelette du workspace Nx

- **Statut :** ✅ Terminée
- **Date :** 2026-07-21
- **Prérequis :** aucun
- **ADR associés :**
  [ADR-0001 — Monorepo Nx package-based](../adr/0001-monorepo-nx-package-based.md),
  [ADR-0002 — bun comme gestionnaire de paquets](../adr/0002-bun-package-manager.md)

## Objectif

Créer le squelette du monorepo Nx en mode package-based avec bun, et poser le
socle documentaire qui accueillera toutes les phases suivantes.

## Périmètre

### Inclus

- Génération du workspace Nx (`nx.json`, `package.json` racine, `packages/`).
- Installation des dépendances Nx via bun.
- Mise en place de `docs/` : index, ADR (règles + gabarit + 2 premiers ADR),
  journal des phases (règles + gabarit + le présent document).

### Explicitement exclu

- Aucune application n'est générée — le dossier `packages/` est vide.
- Aucun plugin Nx applicatif (`@nx/angular`, etc.) n'est installé : c'est
  l'objet de la Phase 02.
- Aucune configuration de lint, de tests, de CI ou de Docker : Phases 05 et 06.
- Aucun code du projet d'origine n'est copié : Phase 07.

## Étapes exécutées

### 1. Mise à disposition de bun

bun était absent de l'environnement d'exécution ; installé via npm dans un
préfixe utilisateur (l'installateur officiel `bun.sh/install` étant inaccessible
depuis cet environnement).

```bash
npm config set prefix ~/.npm-global
npm install -g bun
```

Version obtenue : **bun 1.3.14**.

> Cette étape est propre à l'environnement d'exécution utilisé, pas au projet.
> Sur un poste de développement, bun s'installe normalement via
> `curl -fsSL https://bun.sh/install | bash`.

### 2. Création du workspace

```bash
bunx --bun create-nx-workspace@latest cmz-backoffice-angular \
  --preset=npm \
  --workspaceType=package-based \
  --pm=bun \
  --interactive=false \
  --nxCloud=skip \
  --no-git
```

| Option                          | Raison                                                                                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--preset=npm`                  | Preset des workspaces package-based (le nom fait référence au mécanisme _npm workspaces_, standard implémenté aussi par bun — il n'impose pas npm comme gestionnaire) |
| `--workspaceType=package-based` | Cf. [ADR-0001](../adr/0001-monorepo-nx-package-based.md)                                                                                                              |
| `--pm=bun`                      | Cf. [ADR-0002](../adr/0002-bun-package-manager.md)                                                                                                                    |
| `--nxCloud=skip`                | Pas de cache distribué à ce stade ; décision reportée à la Phase 06 (CI)                                                                                              |
| `--no-git`                      | L'initialisation Git et la stratégie de branches seront décidées séparément                                                                                           |

### 3. Installation des dépendances

```bash
bun install
```

284 paquets installés, lockfile `bun.lock` généré.

### 4. Socle documentaire

Création de `docs/` selon la structure décrite dans
[`docs/README.md`](../README.md) : séparation entre décisions (`adr/`), journal
d'exécution (`phases/`), et — à venir — `guides/` et `architecture/`.

## État du workspace à l'issue de la phase

```
cmz-backoffice-angular/
├── .gitignore
├── .vscode/
│   └── extensions.json
├── bun.lock
├── docs/
│   ├── README.md
│   ├── adr/
│   │   ├── README.md
│   │   ├── template.md
│   │   ├── 0001-monorepo-nx-package-based.md
│   │   └── 0002-bun-package-manager.md
│   └── phases/
│       ├── README.md
│       ├── template.md
│       └── phase-01-squelette-nx.md
├── node_modules/
├── nx.json
├── package.json
├── packages/          ← vide (.gitkeep)
└── README.md
```

`nx.json` :

```json
{
    "extends": "nx/presets/npm.json",
    "$schema": "./node_modules/nx/schemas/nx-schema.json",
    "analytics": false
}
```

`package.json` racine :

```json
{
    "name": "@cmz-backoffice-angular/source",
    "version": "0.0.0",
    "private": true,
    "workspaces": ["packages/*"],
    "devDependencies": {
        "@nx/js": "23.1.0",
        "nx": "23.1.0"
    }
}
```

L'héritage `nx/presets/npm.json` est ce qui caractérise le mode package-based :
Nx n'infère aucune tâche et se contente d'orchestrer ce que chaque package
déclare lui-même.

## Vérifications

| Contrôle                  | Commande                | Résultat                          |
| ------------------------- | ----------------------- | --------------------------------- |
| Nx installé localement    | `bunx nx --version`     | ✅ v23.1.0                        |
| Graphe de projets lisible | `bunx nx show projects` | ✅ vide (attendu : aucun package) |
| Lockfile bun généré       | `ls bun.lock`           | ✅ présent                        |
| Dépendances installées    | `bun install`           | ✅ 284 paquets                    |

## Points d'attention

- **Version de Nx : 23.1.0.** À figer explicitement lors de l'ajout des plugins
  en Phase 02, pour éviter toute divergence entre `nx` et `@nx/*`.
- **Pas de `tsconfig.base.json`.** Le preset `npm` n'en génère pas : en mode
  package-based, chaque package porte sa propre configuration TypeScript. Le
  besoin éventuel d'un tsconfig partagé sera tranché en Phase 03.
- **Git non initialisé.** À faire avant tout développement, pour que
  `nx affected` dispose d'une base de comparaison.
- **Nx Cloud non configuré.** Sans lui, le cache reste local ; à reconsidérer en
  Phase 06 si les temps de CI le justifient.

## Suite

**Phase 02 — Application Angular** : installation de `@nx/angular` puis
génération de `packages/backoffice-angular` en Angular 21 standalone (builder
`application`), aligné sur la configuration du projet d'origine.

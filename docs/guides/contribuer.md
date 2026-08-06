# Contribuer

## Prérequis

| Outil | Version                                                        |
| ----- | -------------------------------------------------------------- |
| Node  | `^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0` — `.nvmrc` fixe 22.22.3 |
| bun   | `>= 1.3.0`                                                     |

Ces contraintes viennent d'Angular 22 et sont **vérifiées à l'installation**. Un
Node non conforme fait échouer `bun install` avec un message explicite, plutôt
que de laisser le build échouer plus tard.

```bash
nvm use          # aligne Node sur .nvmrc
bun install      # installe et active les hooks Git
```

## Commandes

```bash
bun run check:all           # moteurs, versions du socle, poids des fichiers
bun run format              # formate le périmètre produit (voir § Format)
bun run format:check        # vérifie le même périmètre, sans modifier
bunx nx show projects       # liste les packages
bunx nx graph               # graphe de dépendances
bunx nx affected -t build   # ne reconstruit que ce qui a changé depuis main
```

## Format (Prettier) — périmètre produit

`format` et `format:check` partagent **le même scope** (ADR-0006 : garde-fou
local et CI alignés) :

| Inclus | Exclu (hors gate CI) |
| ------ | -------------------- |
| `apps/`, `libs/`, `tools/`, `deploy/` | `docs/**` (audits, guides hors collatéral ADR vivant) |
| configs monorepo listées dans `tools/run-prettier.mjs` (`PRETTIER_PATHS`) | patterns SEOS vendored `tools/seos/patterns/**` |
| | artefacts générés E-5 (déjà dans `.prettierignore`) |
| | templates `*.in` (ex. `deploy/env.template.js.in`) |

Les scripts `format` / `format:check` appellent `tools/run-prettier.mjs` (même
liste de chemins). Le hook `lint-staged` miroite ce périmètre. Un fichier sous
`docs/` peut être commité sans reformat Prettier automatique.

## Commits

Convention **Conventional Commits**, vérifiée automatiquement.

```
feat(backoffice-angular): ajoute la page de connexion
fix(shared-domain): corrige la validation des coordonnées
docs: clarifie la politique de versions
```

| Élément | Règle                                                                               |
| ------- | ----------------------------------------------------------------------------------- |
| Type    | `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `chore`, `revert` |
| Portée  | Nom du package en kebab-case — facultative, certains commits sont transverses       |
| Sujet   | Impératif, sans majuscule initiale, sans point final                                |
| En-tête | 72 caractères maximum                                                               |

## Branches

| Motif                         | Usage                                               |
| ----------------------------- | --------------------------------------------------- |
| `main`                        | Branche de référence, base de `nx affected`         |
| `feat/<ticket>-<description>` | Nouvelle fonctionnalité                             |
| `fix/<ticket>-<description>`  | Correction                                          |
| `refactor/<description>`      | Refonte sans changement de comportement             |
| `reconstruction/<domaine>`    | Reconstruction d'un domaine depuis le projet source |

Cette convention n'est pas vérifiée par un hook : elle est imposée par la
**protection de branche `main`** (audit G-2 / P1-13) :

| Règle | Valeur |
| ----- | ------ |
| Pull request obligatoire | oui |
| Approbations | **1** (+ relecture CODEOWNERS) |
| Status checks requis | jobs bloquants de `.github/workflows/ci.yml` (`Garde-fous socle`, `Docs freshness`, `Oracle — …`, `Corpus SEOS — …`) |
| Force-push / suppression de `main` | **interdit** |
| Applique aux admins | oui (`enforce_admins`) |

Source de vérité versionnée : [`.github/branch-protection.main.json`](../../.github/branch-protection.main.json).
Application / resynchronisation forge :

```bash
gh auth login
# remote GitHub requis, ou : export CMZ_GITHUB_REPO=owner/cmz-platform
bun run protect:main          # applique
bun run protect:main -- --dry-run
```

### Fraîcheur du socle — 24 h maximum hors PR (N1-5)

Un changement touchant le **socle** — `tsconfig.base.json`, `nx.json`,
`eslint.config.mjs` — ne reste **jamais plus de 24 h** hors d'une pull
request ouverte. Ces trois fichiers gouvernent la compilation, le graphe
Nx et le linting de **l'ensemble** du monorepo : un écart local prolongé
(commit non poussé, branche non ouverte en PR) masque une dérive du socle
à tous les autres contributeurs jusqu'au merge, à l'inverse d'un
changement de package isolé.

**Règle pratique** : dès qu'un de ces trois fichiers est modifié,
committer et ouvrir la PR **le jour même** — même en brouillon
(`draft`) si le travail n'est pas terminé. Ne pas attendre la fin d'un
chantier plus large pour pousser un changement de socle qu'il contient.

*Origine de cette règle* : constat P0-N1 (audits successifs,
2026-08-02 → 2026-08-04) — un sprint de plusieurs jours modifiant entre
autres `tsconfig.base.json` et `tools/vitest-lib.config.ts` est resté
non commis pendant toute sa durée, rendant impossible toute revue
incrémentale ou tout `nx affected` fiable entre-temps.

## Ajouter une dépendance

Les versions du socle (Angular, TypeScript, RxJS, zone.js) sont centralisées
dans le _catalog_ bun de la racine. Un package ne les redéclare **jamais** :

```json
{
    "dependencies": { "@angular/core": "catalog:" },
    "devDependencies": { "typescript": "catalog:tooling" }
}
```

Écrire une version en dur fait échouer `bun run check:versions`. Pour faire
évoluer une version du socle, modifier le catalog à la racine — un seul endroit.

Voir [ADR-0005](../adr/0005-versions-du-socle.md).

## Dépendances entre packages

Elles sont **déclarées**, jamais déduites d'un alias de chemin :

```json
{ "dependencies": { "@cmz/shared-domain": "workspace:*" } }
```

```ts
import { Report } from '@cmz/shared-domain'; // par nom de package
```

Nx construit son graphe à partir de ces déclarations. Un alias TypeScript qui
traverserait une frontière de package rendrait `nx affected` et le cache faux —
sans aucune erreur visible. Voir
[ADR-0004](../adr/0004-graphe-de-dependances-declarees.md).

## Garde-fous

| Déclencheur  | Contrôle                                    |
| ------------ | ------------------------------------------- |
| `preinstall` | Node et bun conformes à `engines`           |
| `pre-commit` | Aucun fichier volumineux / hors plafond de lignes ; formatage |
| `commit-msg` | Message conforme à la convention            |
| `pre-push`   | Politique de version unique                 |

### `--no-verify` et la CI (ADR-0006 / audit G-3)

`git commit --no-verify` / `git push --no-verify` **contournent uniquement les
hooks locaux** (Husky). Ce n'est pas un laissez-passer pour merger.

1. **La CI rejoue les mêmes contrôles** (et d'autres) via
   [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — garde-fous
   socle, format, oracle lint/build/ngc/test, corpus, fraîcheur doc, etc.
2. **La CI fait foi.** Un commit passé en local avec `--no-verify` qui fait
   échouer un job bloquant **bloque la PR** : `main` exige ces status checks
   (voir [protection de branche](#branches)). Le vert CI est la condition de
   merge, pas le vert des hooks.
3. `--no-verify` reste réservé aux cas **légitimes et temporaires** (ex. gros
   fichier justifié le temps d'ajuster l'allowlist) — jamais pour masquer une
   violation durable. Si le contrôle local est faux positif, corrigez le script
   ou documentez l'exception ; ne « sautez » pas la forge.

### Si un hook échoue sur « bun: not found »

Les clients Git graphiques ne chargent pas le profil du shell. Les hooks
rétablissent `$HOME/.bun/bin`, ce qui couvre l'installation standard de bun.
Pour un emplacement non standard, créer un
[`~/.config/husky/init.sh`](https://typicode.github.io/husky/how-to.html)
exportant le bon PATH.

## Outils SEOS (`tools/seos/`)

`check-pattern.mjs`/`check-semantics.mjs`/`generate-reference-module.mjs`
vivent dans ce dépôt (vendorés le 2026-08-03, J-8/M-5 — voir
[`tools/seos/README.md`](../../tools/seos/README.md) pour la provenance
complète) mais **ne sont pas réécrits ici** : toute correction doit être
portée dans le dépôt legacy (`cmz-backoffice-frontend/seos/tools/`) puis
re-vendorée par copie octet pour octet, jamais éditée directement dans
`tools/seos/`, pour ne jamais diverger silencieusement de la source de
vérité de la recherche SEOS.

**Prérequis pour re-vendorer** (contributeur qui a besoin de mettre à jour
ces outils, pas pour un usage courant — le vendoring actuel fonctionne sans
prérequis supplémentaire) : accès en lecture au dépôt
`cmz-backoffice-frontend` au commit épinglé par
[`legacy.lock.json`](../../legacy.lock.json). Sans cet accès, `tools/seos/`
reste utilisable tel quel (auto-testé, voir son README) mais ne peut pas
être mis à jour.

```bash
rm -rf /tmp/seos-reference
node tools/seos/generate-reference-module.mjs /tmp/seos-reference
node tools/seos/check-pattern.mjs /tmp/seos-reference resources \
  --schema tools/seos/patterns/crud-entity.pattern.json
# → Conformite : 106/106 fichiers du coeur presents (100.0%)
```

## Documentation

| Ce que vous écrivez                          | Où                                    |
| -------------------------------------------- | ------------------------------------- |
| Une décision structurante                    | `docs/adr/` — un fichier par décision |
| L'état courant du socle ou de l'architecture | `docs/architecture/`                  |
| Une procédure opérationnelle                 | `docs/guides/`                        |
| Les spécificités d'un package                | Le README du package                  |

Les documents d'architecture décrivent **l'état courant**, pas l'historique des
corrections : quand une information devient fausse, elle est corrigée sur place.
L'historique est dans Git.

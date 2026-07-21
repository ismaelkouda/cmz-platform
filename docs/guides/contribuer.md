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
bun run format              # formate le dépôt
bun run format:check        # vérifie sans modifier
bunx nx show projects       # liste les packages
bunx nx graph               # graphe de dépendances
bunx nx affected -t build   # ne reconstruit que ce qui a changé depuis main
```

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

Cette convention n'est pas vérifiée par un hook : une règle de protection de
branche côté forge est le bon endroit pour l'imposer.

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
| `pre-commit` | Aucun fichier volumineux ajouté ; formatage |
| `commit-msg` | Message conforme à la convention            |
| `pre-push`   | Politique de version unique                 |

`--no-verify` reste disponible pour les cas légitimes — par exemple l'ajout
justifié d'un fichier volumineux. Le message d'erreur le rappelle.

### Si un hook échoue sur « bun: not found »

Les clients Git graphiques ne chargent pas le profil du shell. Les hooks
rétablissent `$HOME/.bun/bin`, ce qui couvre l'installation standard de bun.
Pour un emplacement non standard, créer un
[`~/.config/husky/init.sh`](https://typicode.github.io/husky/how-to.html)
exportant le bon PATH.

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

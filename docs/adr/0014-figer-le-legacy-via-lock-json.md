# ADR-0014 — Figer le legacy via `legacy.lock.json` (pas de sous-module Git)

- **Statut :** Accepted
- **Date :** 2026-08-02

## Contexte

Le corpus SEOS (livrable de niveau 3) n'est reproductible que si la source
legacy confrontée par `--verify` est **identifiée et figée**. Aujourd'hui
`SEOS_LEGACY_ROOT` pointe vers un working tree local dont le commit peut dériver
sans trace (audit P0-6 / B-3).

Deux options étaient ouvertes :

1. Sous-module Git du dépôt legacy dans `cmz-platform`
2. Fichier de verrouillage `{ repo, commit, date }` + checkout CI à la demande

Mesure sur le legacy au moment de la décision :

| Indicateur | Valeur |
| ---------- | ------ |
| Taille working tree | ~858 Mo |
| Fichiers trackés | ~5 500 |
| Origin | GitLab privé `ansut-apps/cmz-backoffice-frontend` |
| Miroir | GitHub `ismaelkouda/cmz-backoffice` |

## Options envisagées

### Option A — Sous-module Git

- Avantages : working tree toujours présent ; SHA lié au commit parent.
- Inconvénients : clone monorepo × ~858 Mo ; auth GitLab en CI pour chaque PR ;
  UX sous-module (init/update) coûteuse ; inutile pour les jobs qui n'exécutent
  que `--structural-only` ([ADR-0015](./0015-mode-structural-only-pas-de-correspondance-legacy.md)).

### Option B — `legacy.lock.json` + checkout explicite

- Avantages : pin scientifique léger versionné dans le monorepo ; CI
  `corpus-full` (B-5) clone uniquement le SHA verrouillé ; developpeurs
  locaux gardent `SEOS_LEGACY_ROOT` et le gate vérifie la concordance.
- Inconvénients : le working tree n'est pas embarqué — il faut un checkout
  séparé (local ou CI) pour `--verify` complet.

## Décision

**Option B.** Le dépôt legacy est figé par
[`legacy.lock.json`](../../legacy.lock.json) à la racine :

```json
{
  "repo": "<url canonique>",
  "commit": "<sha40>",
  "date": "<date commit ISO>",
  "branch": "<branche informative>",
  "pinned_at": "<date du pin>"
}
```

`SEOS_LEGACY_ROOT` reste le chemin de travail. Lorsque la variable est définie,
`tools/corpus/check-legacy-lock.mjs` exige que `git rev-parse HEAD` égale
`legacy.lock.json#commit`.

## Justification

- Le pin doit être **scientifique et cheap**, pas une copie permanente du
  frontend legacy dans chaque clone agent/CI.
- B-5 (`corpus-full`) peut faire `actions/checkout` avec `ref: <commit>` depuis
  le lock, sans sous-module.
- Aligné avec B-1 : pas de chemin machine ; variable + lock.

## Conséquences

### Positives

- Reproductibilité du SHA legacy traçable dans Git.
- Gate local/CI de concordance (`check:legacy-lock`).
- Prépare B-4 (`legacy_ref` dans les paires) et B-5 (job CI full verify).
- B-5 livré : workflow
  [`.github/workflows/corpus-full.yml`](../../.github/workflows/corpus-full.yml)
  + `bun run legacy:checkout` / `bun run corpus:full`.

### Négatives / dette acceptée

- Un développeur avec un legacy « en avance » doit soit re-pin, soit
  `git checkout <commit>` dans `SEOS_LEGACY_ROOT`.
- Accès au dépôt privé toujours requis pour un `--verify` complet (inchangé).

### Points à réévaluer

- Si le legacy devient public et petit (&lt; 50 Mo), un sous-module pourra être
  reconsidéré — nouvel ADR.

## Références

- Audit workspace 2026-08-02 — P0-6, B-3
- [ADR-0013](./0013-phases-08-generation-et-09-verification.md)
- [`tools/corpus/legacy-root.mjs`](../../tools/corpus/legacy-root.mjs)

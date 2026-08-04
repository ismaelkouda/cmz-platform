# ADR-0015 — Mode `--structural-only` : vérification structurelle du corpus (pas de correspondance legacy)

- **Statut :** Accepted
- **Date :** 2026-08-02

## Contexte

Le flag historique `--oracle-only` (et `CORPUS_ORACLE_ONLY=1`) active un mode
de `emit-pairs --verify` utilisé dans le job CI PR `corpus` : les oracles Nx
Tier 1 (`build` / `test` / eslint scoped) s'exécutent **sans** exiger
`SEOS_LEGACY_ROOT` ni contrôler l'existence des fichiers legacy.

Ce nom est **ambigu** :

1. « Oracle » désigne déjà, dans le corpus, la cible Nx attachée à une paire —
   le flag ne « coupe » pas l'oracle, il coupe la **correspondance legacy**.
2. Un statut paire `verified` obtenu sous ce mode peut être lu comme
   « équivalent au legacy », alors qu'aucune présence de chemin legacy n'a été
   vérifiée (audit P0-6 / B-6).

Sans ADR, le job PR et le job `corpus-full` (B-5) se distinguent seulement par
un commentaire YAML — insuffisant pour un livrable de niveau 3.

## Options envisagées

### Option A — Garder `--oracle-only` et documenter le sens dans le README

- Avantages : zéro changement de CLI / CI.
- Inconvénients : le nom trompeur reste dans chaque invocation ; la dette
  sémantique revient à chaque onboarding.

### Option B — Renommer brutalement (supprimer `--oracle-only`)

- Avantages : un seul nom.
- Inconvénients : casse scripts locaux / docs externes sans période de
  transition.

### Option C — Nom canonique `--structural-only` + alias `--oracle-only`

- Avantages : nom explicite (structure Nx, pas legacy) ; CI et docs basculent
  vers le canon ; l'alias historique reste accepté le temps de la transition.
- Inconvénients : deux flags pour un temps.

## Décision

**Option C.**

1. **Nom canonique du mode :** `--structural-only`
   (env : `CORPUS_STRUCTURAL_ONLY=1`).
2. **Sémantique (non négociable) :**
   - **Fait :** exécute les oracles Nx Tier 1 déclarés sur les paires ;
     vérifie la présence des chemins `nx` dans le monorepo.
   - **Ne fait pas :** aucune lecture / existence check sous
     `SEOS_LEGACY_ROOT` ; aucune preuve d'équivalence métier ou de
     correspondance legacy → Nx.
3. **Alias conservé :** `--oracle-only` et `CORPUS_ORACLE_ONLY=1` restent
   acceptés avec **identique** sémantique (dépréciés dans la doc).
4. **Correspondance legacy :** uniquement via `--verify` **sans**
   `--structural-only` (job [`corpus-full`](../../.github/workflows/corpus-full.yml),
   `bun run corpus:full`) — exige `SEOS_LEGACY_ROOT` au SHA de
   [`legacy.lock.json`](../../legacy.lock.json) ([ADR-0014](./0014-figer-le-legacy-via-lock-json.md)).

Formulation courte à réutiliser :

> `--structural-only` = **vérification structurelle** (oracles Nx).  
> Ce n'est **pas** une validation de correspondance legacy.

## Justification

- L'audit B-6 / P0-6 exige de lever l'ambiguïté par décision écrite, pas par
  commentaire de workflow.
- « Structural-only » décrit l'effet réel (structure monorepo / cibles Nx),
  pas un sous-ensemble magique d'« oracle ».
- L'alias évite de casser `corpus:ci` et les habitudes locales pendant la
  bascule doc/CI.

## Conséquences

### Positives

- Vocabulaire unique pour distinguer job PR (`structural-only`) et job `main`
  (`corpus-full` + chemins legacy).
- Un statut `verified` sous `--structural-only` ne peut plus être revendiqué
  comme preuve legacy sans contredire cet ADR.
- Aligné avec A-2026-07-30-08 (Tier 1 module) et A-2026-07-30-11 (CI PR).

### Négatives / dette acceptée

- Deux flags pendant la période d'alias ; suppression éventuelle de
  `--oracle-only` dans un ADR ultérieur.
- Le statut JSONL `verified` reste le même libellé dans les deux modes — la
  distinction est dans le **mode d'exécution**, pas dans un nouveau statut
  (évolution possible : champ `oracle.mode` — hors B-6).

### Points à réévaluer

- Quand plus aucun appelant n'utilise `--oracle-only` : retirer l'alias
  (nouvel ADR).
- Si un mode « legacy paths only » (sans oracles Nx) devient utile : le
  nommer séparément, ne pas réutiliser `--structural-only`.

## Références

- Audit workspace 2026-08-02 — P0-6, B-6
- [ADR-0014](./0014-figer-le-legacy-via-lock-json.md) — pin legacy
- [A-2026-07-30-08](../seos/Assumptions-Register.md) — oracle Tier 1 / Tier 2
- [A-2026-07-30-11](../seos/Assumptions-Register.md) — CI corpus PR
- [`tools/corpus/emit-pairs.mjs`](../../tools/corpus/emit-pairs.mjs)
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — job `corpus`
- [`.github/workflows/corpus-full.yml`](../../.github/workflows/corpus-full.yml)

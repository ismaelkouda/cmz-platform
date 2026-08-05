# Outil corpus SEOS

Émet les manifests `corpus/*.pairs.jsonl` — paires annotées legacy → Nx.

## Usage

```bash
# Émettre processing.pairs.jsonl (scan filesystem)
node tools/corpus/emit-pairs.mjs processing

# Rapport sans écriture
node tools/corpus/emit-pairs.mjs processing --report --dry-run

# Émettre + vérifier (Tier 1 oracle)
node tools/corpus/emit-pairs.mjs processing --verify
node tools/corpus/emit-pairs.mjs requests --verify

# Ou via package.json
bun run corpus:processing
bun run corpus:requests

# CI local — structural-only (ADR-0015, sans legacy)
bun run corpus:ci

# Full verify (chemins legacy — audit B-5)
bun run legacy:checkout          # ou export SEOS_LEGACY_ROOT=…
bun run check:legacy-lock
bun run corpus:full

# Sync pattern → legacy seos/patterns/
bun run corpus:sync-pattern
```

## Variables d'environnement

| Variable                  | Défaut | Rôle                                                                 |
| ------------------------- | ------ | -------------------------------------------------------------------- |
| `SEOS_LEGACY_ROOT`        | —      | **Obligatoire** hors `--structural-only` / sync pattern (audit B-1)  |
| `CORPUS_STRUCTURAL_ONLY`  | —      | Si `1`, équivalent `--structural-only` (ADR-0015 — pas de legacy)    |
| `CORPUS_ORACLE_ONLY`      | —      | Alias déprécié de `CORPUS_STRUCTURAL_ONLY`                           |
| `LEGACY_CHECKOUT_TOKEN`   | —      | Token lecture origin/miroir pour `legacy:checkout` (CI B-5)          |

Pin SHA : [`legacy.lock.json`](../../legacy.lock.json) — `bun run check:legacy-lock` /
`bun run legacy:pin` / `bun run legacy:checkout`
([ADR-0014](../../docs/adr/0014-figer-le-legacy-via-lock-json.md)).

## Fichiers

| Fichier             | Rôle                                                         |
| ------------------- | ------------------------------------------------------------ |
| `chains.mjs`        | Définition `chain_id` + liste de nœuds IR                    |
| `mapping.mjs` + `mapping-helpers.mjs` + `mapping-nodes-*.mjs` | Règles legacy→Nx par nœud (façade + packs ≤800 l.) |
| `read-only-view.mjs` + `read-only-view-shared.mjs` + `read-only-view-nodes.mjs` | Famille ROV (chaînes / sections / nœuds) |
| `oracle-levels.mjs` | H-1 — empile `:test` (behavioral) sur `:build` si target Vitest |
| `module-gate.mjs`   | H-2/H-3 — build/lint/test + no byte-identical cross-module   |
| `emit-pairs.mjs`    | Générateur + vérificateur                                    |

## Spec

[`docs/architecture/corpus/README.md`](../../docs/architecture/corpus/README.md)

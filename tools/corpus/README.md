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

# CI local (Tier 1, sans legacy checkout)
bun run corpus:ci

# Sync pattern → legacy seos/patterns/
bun run corpus:sync-pattern
```

## Variables d'environnement

| Variable           | Défaut                                                  | Rôle                 |
| ------------------ | ------------------------------------------------------- | -------------------- |
| `SEOS_LEGACY_ROOT` | `/Users/macbookair/Dev/Angular/cmz-backoffice-frontend` | Racine source legacy |

## Fichiers

| Fichier          | Rôle                                      |
| ---------------- | ----------------------------------------- |
| `chains.mjs`     | Définition `chain_id` + liste de nœuds IR |
| `mapping.mjs`    | Règles legacy path → nx path par nœud     |
| `emit-pairs.mjs` | Générateur + vérificateur                 |

## Spec

[`docs/architecture/corpus/README.md`](../../docs/architecture/corpus/README.md)

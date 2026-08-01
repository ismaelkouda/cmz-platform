# Corpus SEOS — paires legacy → Nx (Méthode 2)

- **Créé :** 2026-07-30
- **Objectif :** jeu de données d'apprentissage **annoté et oracle-vérifié**
  pour la synthèse neurosymbolique ([LLM_CONTEXT.md](../../LLM_CONTEXT.md)
  §1.2).

## Modèle hybride (décision A-2026-07-30-02)

Chaque entrée = **une paire fichier-à-fichier** + **`chain_id`** pour regrouper
les slices verticales.

```
file-level  → granularité d'apprentissage (mapping d'un archétype)
chain_id    → sémantique bout-en-bout (ex. processing.queues.list)
```

## Format — JSONL

Un fichier par module : `corpus/{module}.pairs.jsonl`  
Une ligne = un objet JSON validé par [`pair.schema.json`](./pair.schema.json).

### Exemple

```json
{
    "id": "processing.queues.list-item-entity",
    "legacy": "src/presentation/pages/processing/domain/entities/queues/queues.entity.ts",
    "nx": "libs/processing/domain/src/lib/entities/queues-processing.entity.ts",
    "chain_id": "processing.queues.list",
    "node": "list-item-entity",
    "pattern": "workflow-action",
    "module": "processing",
    "volet": "queues",
    "layer": "domain",
    "status": "verified",
    "oracle": ["@cmz/processing-domain:build"],
    "verified_at": "2026-07-30"
}
```

## Statuts (`status`)

| Valeur     | Signification                                             |
| ---------- | --------------------------------------------------------- |
| `pending`  | Paire déclarée — fichier Nx absent ou non vérifié         |
| `emitted`  | Fichier Nx présent — oracle non exécuté                   |
| `verified` | Fichier Nx présent + oracle vert                          |
| `blocked`  | Écart architectural documenté — nécessite décision        |
| `n/a`      | Legacy existe — pas d'équivalent Nx voulu (ex. query-bus) |

## Chaînes (`chain_id`)

Déclarées dans [`tools/corpus/chains.mjs`](../../tools/corpus/chains.mjs) et
miroir dans
[`workflow-action.pattern.json`](../patterns/workflow-action.pattern.json).

### Seuils double barre ([A-2026-07-30-09](../../seos/Assumptions-Register.md))

| Barre              | Seuil                               | Usage                                    |
| ------------------ | ----------------------------------- | ---------------------------------------- |
| **corpus-ready**   | ≥ 80 % nœuds applicables `verified` | Émission intermédiaire dataset Méthode 2 |
| **tranche-closed** | 100 % nœuds applicables `verified`  | Clôture tranche (ex. tranche A listes)   |

### Oracle ([A-2026-07-30-08](../../seos/Assumptions-Register.md))

| Tier                     | Périmètre                                                 | Quand                          |
| ------------------------ | --------------------------------------------------------- | ------------------------------ |
| **Tier 1 — module**      | `@cmz/{module}-*:build\|test` + eslint `libs/{module}/**` | `emit-pairs --verify` (PR)     |
| **Tier 2 — intégration** | `backoffice-angular:build` + `ngc --strictTemplates`      | PR touchant `apps/` ou nightly |

Les paires corpus n'attachent **pas** `backoffice-angular:build` comme oracle de
nœud.

## Outil

```bash
# Émettre / mettre à jour le manifest (scan filesystem)
node tools/corpus/emit-pairs.mjs processing

# Émettre + exécuter les oracles nx declarés
node tools/corpus/emit-pairs.mjs processing --verify

# Rapport lisible (stdout)
node tools/corpus/emit-pairs.mjs processing --report
```

## Règles de qualité (Big Tech bar)

1. **Pas de paire sans legacy path relatif vérifiable** (depuis
   `cmz-backoffice-frontend`).
2. **Pas de paire générique multi-volet** — une entité legacy = une entité Nx
   nommée.
3. **`n/a` exige `notes` + référence Assumptions Register.**
4. **`verified` exige au moins un oracle nx exécuté avec succès.**
5. **Révision humaine métier** reste obligatoire — l'oracle ne couvre pas la
   sémantique ([ADR-0009](../adr/0009-reconstruction-pilotee-par-patterns.md)).

## Fichiers

| Fichier                            | Rôle                                                  |
| ---------------------------------- | ----------------------------------------------------- |
| `corpus/processing.pairs.jsonl`    | Manifest module processing (156 paires, 7 chaînes)    |
| `corpus/report-states.pairs.jsonl` | Manifest module report-states (187 paires, 8 chaînes) |
| `corpus/requests.pairs.jsonl`      | Manifest module requests (100 %)                      |
| `tools/corpus/chains.mjs`          | Définition des chaînes et nœuds                       |
| `tools/corpus/mapping.mjs`         | Règles legacy → nx par nœud (multi-module)            |
| `tools/corpus/emit-pairs.mjs`      | Générateur / vérificateur                             |

## Scripts

```bash
bun run corpus:processing          # tranche A — verify (gate audit listes)
bun run corpus:processing:full     # 7 chaînes (listes + details + tasks/actions + export)
bun run corpus:processing:export   # chaîne export.list seule
bun run corpus:report-states       # 8 chaînes (listes + details + export)
bun run corpus:report-states:full    # idem — verify complet
bun run corpus:report-states:export  # chaîne export.list seule
bun run corpus:requests            # tranche A — listes + shell (gate rapide)
bun run corpus:requests:full       # 8 chaînes (listes + details + export + permissions + qualification)
bun run corpus:ci                  # Tier 1 CI — processing + requests (full) + finalization + report-states
bun run corpus:sync-pattern        # push pattern → legacy seos/patterns/
```

## Prochaines étapes

1. ✅ Spec + outillage v0
2. ✅ Tranche A `processing` + `requests` (100 % verified)
3. ✅ CI Tier 1 sur PR (job `corpus` — `corpus:ci`)
4. 🔧 CI Tier 2 intégration (nightly ou PR `apps/**`)
5. ✅ Sync legacy `seos/patterns/workflow-action.pattern.json`
6. ✅ Module `requests` clôturé IR (A-2026-07-31-01)
7. ✅ Tranches B/C processing — corpus `tasks.actions` + `export.list` (156
   paires, 7 chaînes)
8. ✅ Module `finalization` clôturé IR (A-2026-07-31-02)
9. ✅ Module `processing` clôturé IR (A-2026-07-31-03) — Meta 12/12
10. ✅ Module `report-states` clôturé IR (A-2026-07-31-04) — Meta 12/12 —
    famille `workflow-action` 4/4
11. ✅ Pattern `read-only-view` v0 extrait (2026-08-01) — monitoring + reporting
    validés ; corpus monitoring/reporting à émettre

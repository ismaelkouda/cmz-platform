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
    "verified_at": "2026-07-30",
    "legacy_ref": {
        "commit": "cb15bf80fa072e12e9d4fce4b9236abe6ac78058",
        "repo": "https://gitlab.imako.digital/ansut-apps/cmz-backoffice-frontend.git",
        "date": "2026-07-31"
    }
}
```

`legacy_ref` est tamponné à chaque émission depuis [`legacy.lock.json`](../../legacy.lock.json)
(audit B-4 / [ADR-0014](../../adr/0014-figer-le-legacy-via-lock-json.md)).

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

| Tier                     | Périmètre                                                 | Quand                                                                                                              |
| ------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Tier 1 — module**      | `@cmz/{module}-*:build\|test` + eslint `libs/{module}/**` | `emit-pairs --verify` (PR)                                                                                         |
| **Tier 2 — intégration** | `backoffice-angular:build` + `ngc --strictTemplates`      | Nightly [`nightly-integration.yml`](../../.github/workflows/nightly-integration.yml) + `bun run check:tier2` local |

Les paires corpus n'attachent **pas** `backoffice-angular:build` comme oracle de
nœud.

#### Niveaux d'oracle par paire (audit H-1)

| Niveau | Cible | Rôle |
| ------ | ----- | ---- |
| **structural** | `:build` | Forme / types |
| **behavioral** | `:test` | Comportement Vitest (chantier C) — ajouté auto via [`oracle-levels.mjs`](../../../tools/corpus/oracle-levels.mjs) dès qu'un target `test` existe |
| **functional** | Phase 09 | Équivalence legacy — hors corpus emit |

Logs `emit-pairs` : `[oracle:structural]`, `[oracle:behavioral]`, puis un
résumé `niveaux — structural=N behavioral=M`.

#### Gate module avant écriture (audit H-2)

Avant d'écrire `corpus/<module>.pairs.jsonl` (et sous `--verify`),
[`module-gate.mjs`](../../../tools/corpus/module-gate.mjs) exige :

| Contrôle | Commande | Bloquant |
| -------- | -------- | -------- |
| **build** | `nx run-many -t build --projects=tag:scope:<module>` | ✅ |
| **lint** | `nx run-many -t lint --projects=tag:scope:<module>` | ✅ |
| **test** | idem `-t test` | ✅ si ≥1 projet a `targets.test` ; sinon ⚠ C-2 (non bloquant) |
| **no-duplicates** (H-3) | `check-duplicate-files --module=<module>` | ✅ contrainte `pattern.json` |

Échec → **exit 1**, fichier JSONL **non écrit**.

### Modes `--verify` ([ADR-0015](../../adr/0015-mode-structural-only-pas-de-correspondance-legacy.md))

| Mode | Flag | Legacy paths | Rôle |
| ---- | ---- | ------------ | ---- |
| **Structurel** | `--structural-only` (`CORPUS_STRUCTURAL_ONLY=1`) | ignorés | Job PR `corpus` / `bun run corpus:ci` — oracles Nx seulement |
| **Complet** | `--verify` seul | `SEOS_LEGACY_ROOT` obligatoire | Job `corpus-full` / `bun run corpus:full` — structure + présence legacy |

`--structural-only` **n'est pas** une validation de correspondance legacy.
Alias déprécié : `--oracle-only` / `CORPUS_ORACLE_ONLY`.

## Legacy figé ([ADR-0014](../../adr/0014-figer-le-legacy-via-lock-json.md))

| Artefact | Rôle |
| -------- | ---- |
| [`legacy.lock.json`](../../legacy.lock.json) | Pin `{ repo, commit, date }` — source de vérité du SHA |
| `bun run check:legacy-lock` | Valide le lock ; si `SEOS_LEGACY_ROOT` défini, exige HEAD == pin |
| `bun run legacy:pin` | Réécrit le lock depuis le HEAD courant de `SEOS_LEGACY_ROOT` |
| `bun run legacy:checkout` | Clone le pin vers `.legacy-cmz-backoffice/` (CI `corpus-full`) |
| `bun run corpus:full` | `--verify` sur tous les modules **sans** `--structural-only` |
| [`.github/workflows/corpus-full.yml`](../../../.github/workflows/corpus-full.yml) | Job `corpus-full` sur `main` (audit B-5) |

```bash
export SEOS_LEGACY_ROOT=/chemin/vers/cmz-backoffice-frontend
bun run check:legacy-lock   # doit être vert avant emit-pairs --verify
# ou : bun run legacy:checkout && export SEOS_LEGACY_ROOT=…/.legacy-cmz-backoffice
```

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
bun run corpus:monitoring            # 5 chaînes read-only-view (4 vues + shell)
bun run corpus:reporting             # 5 chaînes read-only-view (4 vues + shell)
bun run corpus:dashboard             # 2 chaînes aggregated_stats_view
bun run corpus:interactive-map       # 3 chaînes (visualization + SIG v1 + shell)
bun run corpus:requests            # tranche A — listes + shell (gate rapide)
bun run corpus:requests:full       # 8 chaînes (listes + details + export + permissions + qualification)
bun run corpus:ci                  # Tier 1 CI — processing + requests (full) + finalization + report-states
bun run corpus:sync-pattern        # push pattern → legacy seos/patterns/
```

## Prochaines étapes

1. ✅ Spec + outillage v0
2. ✅ Tranche A `processing` + `requests` (100 % verified)
3. ✅ CI Tier 1 sur PR (job `corpus` — `corpus:ci`)
4. ✅ CI Tier 2 intégration — nightly `nightly-integration.yml` +
   `bun run check:tier2`
5. ✅ Sync legacy `seos/patterns/workflow-action.pattern.json`
6. ✅ Module `requests` clôturé IR (A-2026-07-31-01)
7. ✅ Tranches B/C processing — corpus `tasks.actions` + `export.list` (156
   paires, 7 chaînes)
8. ✅ Module `finalization` clôturé IR (A-2026-07-31-02)
9. ✅ Module `processing` clôturé IR (A-2026-07-31-03) — Meta 12/12
10. ✅ Module `report-states` clôturé IR (A-2026-07-31-04) — Meta 12/12 —
    famille `workflow-action` 4/4
11. ✅ Pattern `read-only-view` v0 extrait (2026-08-01) — monitoring + reporting
    validés ; corpus monitoring/reporting émis (51 + 51 paires)
12. ✅ CI Tier 2 intégration — nightly + `check:tier2` ; bundle initial =
    [`bundle-metrics.json`](../../../apps/backoffice-angular/bundle-metrics.json)
    (audit E-8)
13. ✅ Corpus `interactive-map` partiel — 28 paires, 3 chaînes (visualization
    ✅, SIG stub, shell)
14. ✅ Sync legacy `seos/patterns/read-only-view.pattern.json`
15. ✅ Corpus `dashboard` — 25 paires, Meta 12/12 IR clôturé
    (`aggregated_stats_view`)
16. ✅ Meta `interactive-map` — IR clôturée (Grafana + SIG v1 ; P2
    clusters/tiles)
17. ✅ **Phase 07 clôturée** — familles `workflow-action` 4/4 + `read-only-view`
    4/4 (2026-08-01, A-2026-08-01-01)
18. ⬜ **Phase 08** — génération depuis patterns
    ([`generation-from-patterns.md`](../generation-from-patterns.md))

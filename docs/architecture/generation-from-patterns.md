# Génération d'application depuis les patterns — zéro code métier à la main

- **Créé :** 2026-08-01
- **Statut :** **Phase 08 — spec opérationnelle**
- **Prérequis :** Phase 07 clôturée — familles `workflow-action` **4/4** et
  `read-only-view` **4/4** (cf.
  [A-2026-08-01-01](../seos/Assumptions-Register.md#a-2026-08-01-01--clôture-famille-read-only-view-4-4--fin-phase-07))
- **Cadre :**
  [ADR-0010 — Flux de génération assistée par IA](../adr/0010-flux-de-generation-assistee-par-ia.md)
- **Arbitrage de phase :**
  [ADR-0013 — Phase 08 génération / Phase 09 vérification](../adr/0013-phases-08-generation-et-09-verification.md)
  (la vérification fonctionnelle vs legacy est **Phase 09**, pas 08)

---

## 1. Objectif

Concevoir et livrer un **nouveau module ou une nouvelle application** en :

1. Choisissant un **pattern SEOS** et un sous-graphe ;
2. Déclarant les **chaînes corpus** (nœuds → paires legacy→Nx) ;
3. Exécutant la boucle **Generate → Verify → Repair** jusqu'à oracle vert ;

**sans saisir le TypeScript métier à la main.** L'humain fournit le cadrage
(pattern, module, permissions, i18n keys, contrats wire) ; la machine produit
l'IR et le code sous contrat.

---

## 2. Entrées obligatoires (contrat de conception)

| Entrée             | Source                                              | Rôle                                                        |
| ------------------ | --------------------------------------------------- | ----------------------------------------------------------- |
| **Pattern JSON**   | `docs/architecture/patterns/<pattern>.pattern.json` | Schéma des sous-graphes, chaînes, `nx_mapping`, interdits   |
| **Module spec**    | `docs/architecture/module-<name>.md`                | Endpoints wire, entités, sections/volets, écarts documentés |
| **Chaînes corpus** | `tools/corpus/*.mjs` + pattern `chains`             | Nœuds expandables → paires JSONL                            |
| **Legacy oracle**  | `$SEOS_LEGACY_ROOT` (hors `--structural-only`)      | Paths legacy pour `--verify` complet (ADR-0015)             |
| **Archétypes**     | `docs/architecture/archetypes/*.md`                 | Règles par couche (facade, use-case, page…)                 |
| **Assumption ref** | `docs/seos/Assumptions-Register.md`                 | Décisions non négociables (CQRS drop, naming…)              |

**Interdit en Phase 08 :** inventer un DTO, un endpoint ou un champ absent du
legacy / de la spec module.

---

## 3. Pipeline Generate → Verify → Repair

```
┌─────────────────┐
│ 1. CONCEVOIR    │  Pattern + module spec + chaînes (humain / LLM plan)
└────────┬────────┘
         ▼
┌─────────────────┐
│ 2. SCAFFOLD     │  nx g (libs) + providers + routes + i18n shell
└────────┬────────┘
         ▼
┌─────────────────┐
│ 3. GÉNÉRER      │  Par nœud corpus : domain → data → application → ui
│    (G)          │  Squelette fixe (archétype) + injection métier depuis legacy
└────────┬────────┘
         ▼
┌─────────────────┐
│ 4. VÉRIFIER (V) │  Oracle empilé (§4)
└────────┬────────┘
         ▼
     échec ? ──► 5. REPAIR (R) ──► retour 4
         │
         ▼
┌─────────────────┐
│ 6. CORPUS       │  emit-pairs --verify → corpus/<module>.pairs.jsonl
└────────┬────────┘
         ▼
┌─────────────────┐
│ 7. CLÔTURE      │  Meta 12/12 + assumption register + sync pattern legacy
└─────────────────┘
```

---

## 4. Oracle de sortie (non négociable)

Un module généré n'est **pas livré** tant que :

| Tier              | Commande                                                          | Bloquant                              |
| ----------------- | ----------------------------------------------------------------- | ------------------------------------- |
| **1 build**       | `bunx nx run-many -t build --projects=tag:scope:<module>`         | ✅                                    |
| **1 lint**        | `bunx eslint libs/<module> --max-warnings=0`                      | ✅                                    |
| **1 corpus**      | `bun run corpus:<module>` (ou `emit-pairs.mjs <module> --verify`) | ✅ 100 % applicable                   |
| **2 intégration** | `bun run check:tier2`                                             | ✅ nightly ; recommandé avant clôture |
| **Templates**     | `ngc -p apps/backoffice-angular/tsconfig.app.json --noEmit`       | ✅ si pages câblées app               |

### 4.1 Niveaux d'oracle corpus (audit H-1)

`emit-pairs --verify` exécute les cibles déclarées sur chaque paire, empilées
par [`tools/corpus/oracle-levels.mjs`](../../tools/corpus/oracle-levels.mjs) :

| Niveau | Cible Nx | Contenu | Attache |
| ------ | -------- | ------- | ------- |
| **structural** | `:build` | Compile / types | toujours |
| **behavioral** | `:test` | Vitest (chantier C) | auto si `project.json` déclare `targets.test` |
| **functional** | Phase 09 | Équivalence legacy | hors emit-pairs ([ADR-0013](../adr/0013-phases-08-generation-et-09-verification.md)) |

Les modules sans suite Vitest restent en build-only jusqu'à C-2/C-4 ; dès qu'un
target `test` existe, le niveau comportemental entre dans le G-V-R sans éditer
chaque nœud à la main.

### 4.2 Gate module avant émission (audit H-2)

[`module-gate.mjs`](../../tools/corpus/module-gate.mjs) bloque l'écriture du
JSONL (et tout `--verify`) si `build` ou `lint` (ou `test` lorsqu'un target
existe) échoue sur `tag:scope:<module>`. Un corpus ne peut plus être émis « au
vert » alors que le module est rouge.

Tier 1 CI PR : `bun run corpus:ci` (`--structural-only`, ADR-0015) pour les modules déjà dans la
chaîne CI.

---

## 5. Choix du pattern (arbre de décision)

| Besoin métier                                | Pattern                                                   | Référence module                |
| -------------------------------------------- | --------------------------------------------------------- | ------------------------------- |
| Listes workflow + take/treat + export Excel  | `workflow-action`                                         | `processing`                    |
| Embeds Grafana multi-sections                | `read-only-view` / `grafana_multi_section`                | `monitoring`                    |
| Embed Grafana single + carte SIG optionnelle | `read-only-view` / `grafana_single_view` + `gis_map_view` | `interactive-map`               |
| Tableau de bord agrégé + filtre période      | `read-only-view` / `aggregated_stats_view`                | `dashboard`                     |
| CRUD entité paginée                          | `crud-entity`                                             | `administrative-infrastructure` |
| Action unique (login, reset…)                | `action-request`                                          | `authentication`                |

Réplication : **schéma pattern inchangé** entre modules d'une même famille
(discipline Rule 0 — cf. `reporting` depuis `monitoring`).

---

## 6. Workflow opérationnel (nouveau module)

### 6.1 Avant génération

```bash
# 1. Rédiger docs/architecture/module-<name>.md (endpoints, entités, chaînes)
# 2. Étendre pattern JSON si nouveau sous-graphe (version bump + assumption)
# 3. Ajouter chaînes dans tools/corpus/<pattern>.mjs ou module dédié
```

### 6.2 Génération

```bash
# Scaffolding Nx (4 libs + tags scope:<module>)
bunx nx g @nx/angular:library ...

# Génération contenu : agent + skills angular-developer + legacy path
# Un fichier / nœud corpus à la fois — jamais de module entier en un prompt aveugle
```

### 6.3 Vérification & corpus

```bash
bun run corpus:<module>          # émet + verify + oracle build libs
bun run check:tier2              # intégration app
bun run corpus:sync-pattern      # push pattern → legacy seos/patterns/
```

### 6.4 Clôture

- Rédiger `docs/architecture/audits/<module>-meta-verification.md` (12 critères)
- Entrée `Assumptions-Register` A-YYYY-MM-DD-NN
- Mettre à jour `LLM_CONTEXT.md`, `STATUS.md` (`node tools/generate-status.mjs`)

---

## 7. Ce que l'humain écrit vs ce que la machine produit

| Humain (conception)                | Machine (génération)             |
| ---------------------------------- | -------------------------------- |
| Spec module, pattern, chaînes      | Fichiers `.ts` par archétype     |
| i18n keys / libellés métier        | Composants, mappers, DTOs        |
| Décisions d'écart documentées (P2) | Tests oracle, corpus JSONL       |
| Revue Meta scorecard               | Repair loop sur échec lint/build |

**Exception autorisée :** glue app (`app.routes.ts`, `*.providers.ts`, mock
`tools/mock-server.mjs`) — minimal, reproductible, documenté dans spec module.

---

## 8. Écarts et P2 en génération

Tout écart au legacy **doit** être :

1. Documenté dans la spec module ;
2. Refléter dans le corpus (`notes`, `status: n/a`) ou assumption register ;
3. **Non bloquant** pour l'oracle si explicitement hors périmètre IR.

Exemples acceptés Phase 07→08 : `ManagementDialog` shell, SIG clusters/tiles
([A-2026-08-01-02](../seos/Assumptions-Register.md#a-2026-08-01-02--sig-interactive-map-p2-hors-génération-v0)).

---

## 9. Prochaine itération outillage (Phase 08 backlog)

| Item                                               | Priorité | Statut |
| -------------------------------------------------- | -------- | ------ |
| Oracle comportemental (`:test` / chantier C) — H-1 | P0       | ✅     |
| Gate émission build+lint+test verts — H-2          | P0       | ✅     |
| Contrainte no byte-identical cross-module — H-3    | P1       | ✅     |
| Générateur chaînes depuis pattern JSON seul        | P1       | ⬜     |
| `conventions/angular-22.profile.json` (ADR-0010)   | P1       | ⬜     |
| Contrats archétype machine-readable (`contracts/`) | P1       | ⬜     |
| Tier 2 déclencheur PR sur `apps/**`                | P2       | ⬜     |
| Web Codegen Scorer en CI                           | P2       | ⬜     |

---

## Références

- [`corpus/README.md`](./corpus/README.md) — Méthode 2, scripts, Tier 1/2
- [`patterns/README.md`](./patterns/README.md) — familles validées
- [`LLM_CONTEXT.md`](../../LLM_CONTEXT.md) — directives agents
- [`ADR-0009`](./adr/0009-reconstruction-pilotee-par-patterns.md) —
  reconstruction pilotée par patterns

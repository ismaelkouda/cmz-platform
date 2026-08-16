# Patterns SEOS — monorepo `cmz-platform`

- **Créé :** 2026-07-30
- **Statut :** extension du système SEOS (dépôt legacy) pour la **cible de
  validation Nx**
  ([ADR-0009](../../adr/0009-reconstruction-pilotee-par-patterns.md)).

## Rôle

> ⚠️ **Portée consolidée le 2026-08-14** — voir
> [ADR-0030](../../adr/0030-ir-canonique-et-profils-cibles.md) et
> [ADR-0031](../../adr/0031-graphe-execution-et-manifests-composition.md).
> Les 4 schémas ci-dessous sont des **compositions mémorisées du profil cible
> Angular/Nx**. Le nom `pattern-core.schema.json` est conservé temporairement
> pour compatibilité, mais ce fichier n'est pas l'IR canonique multi-stack. Ses
> cinq catégories et ses chemins Nx servent à vérifier la cible actuelle.

Les schémas JSON de ce dossier décrivent la **structure attendue du renderer
Angular/Nx** pour une famille d'entités. Ils servent à :

1. **Générer** (LLM ou générateur) sous contrat d'archétype — pas d'invention.
2. **Vérifier** la conformité structurelle (`tools/check-pattern-nx.mjs`,
   généralisé pour consommer n'importe quel pattern du catalogue —
   `--files-field`/`--set` ; `check-pattern.js` côté legacy reste la
   référence historique pour le dépôt d'origine).
3. **Annoter l'index de correspondances** legacy → Nx. Le corpus actuel n'est
   pas un jeu d'apprentissage autoporteur.

Le gate `bun run check:pattern-profile-schema`, inclus dans `check:all`, valide
le registre `CORE_VERBS`, les placeholders, les références de variantes, les
`files_field` et les quatre compositions mémorisées.

## Schémas disponibles

| Pattern               | Fichier                                                           | Module de référence                                                       | Statut                                                                              |
| ---------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `crud-entity`          | [`crud-entity.pattern.json`](./crud-entity.pattern.json)           | `administrative-infrastructure`                                           | ✅ v0 — migré, `composition` = Entity + Collection + Collection/select               |
| `action-request`       | [`action-request.pattern.json`](./action-request.pattern.json)     | `authentication`                                                          | ✅ v0 — premier fichier natif du noyau (T2-8, jamais eu de contrepartie Nx-shaped avant) |
| `read-only-view`       | [`read-only-view.pattern.json`](./read-only-view.pattern.json)     | **`monitoring`**, **`reporting`**, **`dashboard`**, **`interactive-map`** | ✅ v0 — migré, `composition` = Composite Read ; templates corrigés 2026-08-14 (T1-6 consolidation `GrafanaLinkEntity`) ; `check:pattern-nx:read-only-view` 9/9 entités 100 % |
| **`workflow-action`** | [`workflow-action.pattern.json`](./workflow-action.pattern.json) | **`processing`**, **`requests`**, **`finalization`**, **`report-states`** | ✅ v0 — migré, `composition` = Collection×4 + Transition×4 (6 sous-graphes réels)     |

## Différence legacy vs monorepo

| Legacy (mono-app)                                             | Monorepo Nx (cible)                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| `domain/`, `infrastructure/`, `application/`, `presentation/` | `libs/{module}/{domain,data,application,ui}/`                 |
| `di/{module}.providers.ts`                                    | `apps/backoffice-angular/.../providers/{module}.providers.ts` |
| CQRS bus/handler (souvent)                                    | use-case + façade directe (décision monorepo)                 |

Chaque pattern v0+ inclut une section **`nx_mapping`** : règles de traduction
legacy → chemins Nx. L'adaptateur
[`tools/seos-adapter/`](../../../tools/seos-adapter/README.md) reste le
post-traitement pour la sortie **plate** des générateurs legacy ; le corpus et
`tools/corpus/` couvrent la **reconstruction assistée** (Phase 07 clôturée) et
la **génération depuis patterns** (Phase 08 — cf.
[`generation-from-patterns.md`](../generation-from-patterns.md)).

### Contraintes machine (`constraints`)

| Clé | Id | Enforcement |
| --- | -- | ----------- |
| `no_cross_module_byte_identical_files` | **H-3** / P1-11 | `bun run check:duplicates` (+ `--module=<m>` dans le gate corpus) |

Prévention F-1/F-2 : la génération ne doit **jamais** recopier un helper
transverse — le remonter dans `@cmz/shared-*`.

## Boucle G-V-R (Generate — Verify — Repair)

```
Legacy source (vérité métier)
    → LLM instancie IR (pattern + archétypes markdown)
    → Oracle (tsc, eslint, nx test, corpus emit-pairs --verify)
    → Repair jusqu'à oracle vert
    → corpus/*.pairs.jsonl (paire annotée)
```

## Références

- [Corpus — spec](../corpus/README.md)
- [Archétype workflow-action](../archetypes/workflow-action.md)
- [Archétype read-only-view](../archetypes/read-only-view.md)
- [Module processing (référence workflow)](../module-processing.md)
- [Module monitoring (référence read-only-view)](../module-monitoring.md)
- [ADR-0010 — Flux IA](../../adr/0010-flux-de-generation-assistee-par-ia.md)
- [Génération depuis patterns (Phase 08)](../generation-from-patterns.md)

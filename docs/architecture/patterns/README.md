# Patterns SEOS — monorepo `cmz-platform`

- **Créé :** 2026-07-30
- **Statut :** extension du système SEOS (dépôt legacy) pour la **cible de
  validation Nx**
  ([ADR-0009](../adr/0009-reconstruction-pilotee-par-patterns.md)).

## Rôle

Les schémas JSON de ce dossier décrivent la **structure canonique** d'une
famille d'entités. Ils servent à :

1. **Générer** (LLM ou générateur) sous contrat d'archétype — pas d'invention.
2. **Vérifier** la conformité structurelle (`check-pattern.js` côté legacy, ou
   outils monorepo).
3. **Annoter le corpus** d'apprentissage (paires legacy → Nx) pour la Méthode 2.

## Schémas disponibles

| Pattern               | Fichier                                                          | Module de référence                                                       | Statut                              |
| --------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------- |
| `crud-entity`         | legacy `seos/patterns/crud-entity.pattern.json`                  | `administrative-infrastructure`                                           | ✅ v23 — référence historique       |
| `action-request`      | legacy `seos/patterns/action-request.pattern.json`               | `authentication`                                                          | ✅ v6                               |
| `read-only-view`      | [`read-only-view.pattern.json`](./read-only-view.pattern.json)   | **`monitoring`**, **`reporting`**, **`dashboard`**, **`interactive-map`** | ✅ **v0 — 4/4 modules IR clôturés** |
| **`workflow-action`** | [`workflow-action.pattern.json`](./workflow-action.pattern.json) | **`processing`**, **`requests`**, **`finalization`**, **`report-states`** | ✅ **v0 — 4/4 modules IR clôturés** |

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
- [ADR-0010 — Flux IA](../adr/0010-flux-de-generation-assistee-par-ia.md)
- [Génération depuis patterns (Phase 08)](../generation-from-patterns.md)
- [Génération depuis patterns (Phase 08)](../generation-from-patterns.md)

# STATUS — cmz-platform

> **Généré automatiquement** par `tools/generate-status.mjs` le 2026-08-18.
> Ne pas éditer manuellement — lancer `node tools/generate-status.mjs` pour régénérer.

> Ces métriques décrivent le golden reference Angular/SEOS. Périmètre courant
> de la plateforme (consolidé 2026-08-14) : [ADR-0029](./docs/adr/0029-perimetre-capacites-plateforme-generation.md).

## Résumé

| Indicateur | Valeur |
|:---|---:|
| Packages Nx | **72 libs + 1 app** (73 `project.json`) |
| Fichiers TypeScript (`libs/`) | **2 730 fichiers hors tests** (2 979 au total, dont 249 specs) |
| Modules détectés | **19** |
| Périmètre applicatif (`scope.json`, M-7) | **55 / 55 entités construites** (1 fixture SEOS hors périmètre) — [détail](./docs/architecture/scope.json) |
| Corpus SEOS — couverture fichiers (N-4) | **918 / 2 730 fichiers libs/ hors tests → 33.6 %** — 1 modules sans aucune paire (1 `kernel`) |
| Corpus SEOS — nature des paires (N-6) | **583 correspondances** + **924 décisions d'architecture** (`status: n/a`) — pas 1507 paires d'apprentissage |

## Légende

| Symbole | Signification |
|:---:|:---|
| ✅ | Compilant, livré |
| ⚠️ | Partiel ou incomplet |
| 🔧 | En cours de reconstruction |
| ❌ | Non commencé |
| ❓ | Statut inconnu |

## Détail par module

| Module | Statut | Famille | Couches | Fichiers .ts | Notes |
|:---|:---:|:---|:---|---:|:---|
| `administrative-boundary` | ✅ | crud-entity | application, data, domain, ui | 254 | Compilant — 3 entités + hiérarchie géo |
| `administrative-infrastructure` | ✅ | crud-entity | application, data, domain, ui | 155 | Compilant — 2 entités |
| `authentication` | ✅ | action-request | application, data, domain, ui | 67 | Compilant — login/forgot/reset |
| `communication` | ✅ | crud-entity | application, data, domain, ui | 129 | Compilant — messagerie + notifications |
| `content-management` | ✅ | crud-entity | application, data, domain, ui | 505 | Compilant — 6 entités |
| `core` | ✅ | kernel |  | 11 | Tokens d'injection + intercepteurs |
| `coverage-areas` | ✅ | crud-entity | application, data, domain, ui | 335 | Compilant — 4 entités |
| `dashboard` | ✅ | read-only-view | application, data, domain, ui | 30 | Module IR clôturé — corpus 25 paires, Meta 12/12 ; aggregated_stats_view |
| `finalization` | ✅ | workflow-action | application, data, domain, ui | 108 | Module IR clôturé — corpus 126 paires, 6 chaînes, Meta 12/12 |
| `interactive-map` | ✅ | read-only-view | application, data, domain, ui | 22 | Module IR clôturé — SIG v1 + Grafana ; corpus 28 paires, Meta 12/12 ; P2 clusters/tiles |
| `monitoring` | ✅ | read-only-view | application, data, domain, ui | 21 | Module IR clôturé (a posteriori 2026-08-04) — 4 embeds Grafana ; corpus 51 paires, 5 chaînes, Meta 12/12 |
| `processing` | ✅ | workflow-action | application, data, domain, ui | 138 | Module IR clôturé — corpus 156 paires, 7 chaînes, Meta 12/12 |
| `report-states` | ✅ | workflow-action | application, data, domain, ui | 151 | Module IR clôturé — corpus 187 paires, 8 chaînes, Meta 12/12 |
| `reporting` | ✅ | read-only-view | application, data, domain, ui | 21 | Module IR clôturé (a posteriori 2026-08-04) — 4 vues analytiques ; corpus 51 paires, 5 chaînes, Meta 12/12 |
| `requests` | ✅ | workflow-action | application, data, domain, ui | 107 | Module IR clôturé — corpus 157 paires, 8 chaînes, Meta 12/12 |
| `settings-security` | ✅ | crud-entity | application, data, domain, ui | 204 | Compilant — 3 entités |
| `shared` | ✅ | kernel | application, browser, constants, data, domain, ui | 197 | Kernel transverse opérationnel |
| `team-organization` | ✅ | crud-entity | application, data, domain, ui | 254 | Compilant — 2 entités |
| `workflow-details` | ✅ | kernel | domain | 21 | ADR-0020 (Option B, POC 2026-08-11) — sous-graphe "details" partagé report-states/requests (domain uniquement, 1 seule couche) ; pas un module fonctionnel — kernel comme shared/core. |

## Modules non commencés (attendus)

Calculé depuis l'écart entre `docs/architecture/scope.json` (périmètre
déclaré, 53 entités) et une trace réelle dans `libs/` — pas une liste tenue à
la main (M-7/L-2/L-3, `audit-workspace-2026-08-02-addendum.md` P1-19).

| Module | Entité | Famille | Fichiers source (legacy) | Statut |
|:---|:---|:---|---:|:---|
| — | — | — | — | Aucun écart — les 55 entités du périmètre (hors fixture SEOS) ont une trace dans libs/ |

---
*[LLM_CONTEXT.md](./LLM_CONTEXT.md) — point d'entrée architecture et directives agents IA*

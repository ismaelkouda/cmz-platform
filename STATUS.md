# STATUS — cmz-platform

> **Généré automatiquement** par `tools/generate-status.mjs` le 2026-08-01. Ne
> pas éditer manuellement — lancer `node tools/generate-status.mjs` pour
> régénérer.

## Résumé

| Indicateur                     |   Valeur |
| :----------------------------- | -------: |
| Packages Nx (project.json)     |   **71** |
| Fichiers TypeScript dans libs/ | **2565** |
| Modules détectés               |   **18** |

## Légende

| Symbole | Signification              |
| :-----: | :------------------------- |
|   ✅    | Compilant, livré           |
|   ⚠️    | Partiel ou incomplet       |
|   🔧    | En cours de reconstruction |
|   ❌    | Non commencé               |
|   ❓    | Statut inconnu             |

## Détail par module

| Module                          | Statut | Famille         | Couches                                           | Fichiers .ts | Notes                                                        |
| :------------------------------ | :----: | :-------------- | :------------------------------------------------ | -----------: | :----------------------------------------------------------- |
| `administrative-boundary`       |   ✅   | crud-entity     | application, data, domain, ui                     |          249 | Compilant — 3 entités + hiérarchie géo                       |
| `administrative-infrastructure` |   ✅   | crud-entity     | application, data, domain, ui                     |          158 | Compilant — 2 entités                                        |
| `authentication`                |   ✅   | action-request  | application, data, domain, ui                     |           67 | Compilant — login/forgot/reset                               |
| `communication`                 |   ✅   | crud-entity     | application, data, domain, ui                     |          121 | Compilant — messagerie + notifications                       |
| `content-management`            |   ✅   | crud-entity     | application, data, domain, ui                     |          459 | Compilant — 6 entités                                        |
| `core`                          |   ✅   | kernel          |                                                   |            4 | Tokens d'injection + intercepteurs                           |
| `coverage-areas`                |   ✅   | crud-entity     | application, data, domain, ui                     |          317 | Compilant — 4 entités                                        |
| `dashboard`                     |   ✅   | read-only-view  | application, data, domain, ui                     |           29 | Compilant                                                    |
| `finalization`                  |   ✅   | workflow-action | application, data, domain, ui                     |          111 | Module IR clôturé — corpus 126 paires, 6 chaînes, Meta 12/12 |
| `interactive-map`               |   ⚠️   | read-only-view  | application, data, domain, ui                     |           17 | Vue statique — SIG OpenLayers non reconstruit                |
| `monitoring`                    |   ✅   | read-only-view  | application, data, domain, ui                     |           22 | Compilant — 4 embeds Grafana ; corpus 51 paires, 5 chaînes   |
| `processing`                    |   ✅   | workflow-action | application, data, domain, ui                     |          140 | Module IR clôturé — corpus 156 paires, 7 chaînes, Meta 12/12 |
| `report-states`                 |   ✅   | workflow-action | application, data, domain, ui                     |          172 | Module IR clôturé — corpus 187 paires, 8 chaînes, Meta 12/12 |
| `reporting`                     |   ✅   | read-only-view  | application, data, domain, ui                     |           22 | Compilant — 4 vues analytiques ; corpus 51 paires, 5 chaînes |
| `requests`                      |   ✅   | workflow-action | application, data, domain, ui                     |          128 | Module IR clôturé — corpus 157 paires, 8 chaînes, Meta 12/12 |
| `settings-security`             |   ✅   | crud-entity     | application, data, domain, ui                     |          197 | Compilant — 3 entités                                        |
| `shared`                        |   ✅   | kernel          | application, browser, constants, data, domain, ui |          182 | Kernel transverse opérationnel                               |
| `team-organization`             |   ✅   | crud-entity     | application, data, domain, ui                     |          170 | Compilant — 2 entités                                        |

## Modules non commencés (attendus)

| Module | Famille |
| :----- | :------ |

---

_[LLM_CONTEXT.md](./LLM_CONTEXT.md) — source de vérité architecture et
directives agents IA_

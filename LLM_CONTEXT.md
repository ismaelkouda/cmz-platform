# LLM Master Context & System Architecture Guide — cmz-platform

> **Note pour tout Agent IA / LLM (Claude, Gemini, GPT, Cursor, etc.)** : Ce
> document est la source de vérité absolue pour comprendre l'architecture, la
> philosophie de recherche, la structure et l'état courant de `cmz-platform`.
> Lisez ce document au démarrage de chaque session pour avoir la vision à 360°
> du projet.

---

## 1. Vision Système & Paradigme SEOS

### 1.1 Objet du Projet

`cmz-platform` est le monorepo Nx TypeScript central de la plateforme **CMZ
(_Connect My Zone_)**. Il héberge la reconstruction industrielle et le découpage
modulaire du backoffice front-end (`cmz-backoffice-frontend`) en **Angular 22**
avec **Bun 1.3** et **Nx 23.1** (mode _package-based_).

### 1.2 Thèse Scientifique & Philosophie d'Ingénierie

Le projet n'est pas une simple refonte front-end : c'est le terrain
d'expérimentation et de validation industrielle du système **SEOS (_Software
Engineering Operating System_)**, un compilateur d'architecture logicielle.

- **Paradigme d'exécution (Méthode 3 Big Tech)** : Nous fonctionnons en **Boucle
  MDE + LLM fermée par un Oracle de Vérification Stricte
  (_Generate-Verify-Repair_)**.
- **Rôle de l'IA (LLM)** : L'IA agit comme le **générateur déterministe sous
  contrat d'archétype**. Elle n'invente pas le code métier : elle lit la source
  de vérité métier d'origine
  (`/Users/macbookair/Dev/Angular/cmz-backoffice-frontend`), extrait les
  métadonnées et instancie la Représentation Intermédiaire (**IR**) de
  l'archétype cible.
- **Objectif à Long Terme** : Constituer le jeu de données d'apprentissage
  annoté et validé (Corpus de paires _Source legacy → Cible Nx 4 couches_) pour
  alimenter la **Synthèse Neurosymbolique (Méthode 2)**.

---

## 2. Invariants d'Architecture (Nx Package-Based)

Le monorepo impose une isolation absolue par package et par couche (_Clean
Architecture / DDD_) :

```
libs/<module>/
  ├── domain/       (@cmz/<module>-domain)       ──► Zero dépendance framework/ui/data. Entités, Value Objects, Repositories interfaces.
  ├── data/         (@cmz/<module>-data)         ──► Dépend de domain, core, shared-data. DTOs, Mappers, Sources HTTP (Api), RepositoryImpl.
  ├── application/  (@cmz/<module>-application)  ──► Dépend de domain, shared-application. Use-cases (deferred), Façades Signal-based (ResourceFacade).
  └── ui/           (@cmz/<module>-ui)           ──► Dépend de application, domain, shared-ui. Composants de page minces, routes.
```

### Règles d'or d'Isolation :

1. **0 Dépendance inter-domaines** : Le domaine `reporting` ne peut JAMAIS
   importer un élément du domaine `monitoring` ou `authentication`. Tout
   couplage transverse passe exclusivement par `@cmz/shared-*` ou `@cmz/core`.
2. **Catalog bun centralisé** : Toutes les dépendances externes (`@angular/*`,
   `rxjs`, `zone.js`) sont gérées dans le catalog racine de `package.json` et
   référencées en `catalog:`.
3. **Boundaries Nx vérifiées** : Les règles `@nx/enforce-module-boundaries` dans
   `eslint.config.mjs` interdisent tout import ascendant ou latéral non
   autorisé.

---

## 3. Catalogue des Archétypes (IR SEOS)

L'ensemble des 53 entités du projet legacy (18 domaines) se répartit en 4
grandes familles d'archétypes :

| Archétype  
| Périmètre / Famille  
| Modules Cibles

| Modèle / Structure IR                                                             |
| --------------------------------------------------------------------------------- |
| `crud-entity`                                                                     |
| CRUD Complet (106 fichiers/entité)                                                |
| `administrative-infrastructure`, `administrative-boundary`, `coverage-area`       |
| Entity + Props + Value Objects + Mappers + Facades + Components                   |
| `action-request`                                                                  |
| Commandes & Mutations (34 fichiers/op)                                            |
| `authentication`, `seos-reference-action`                                         |
| Command DTOs + Handlers + Action Facades                                          |
| `read-only-view`                                                                  |
| Vues analytiques Query-only (17%)                                                 |
| `monitoring`, `reporting`, `interactive-map` (⚠️ SIG non reconstruit)             |
| Consolidated Entity/DTO + Section Mapper + ResourceFacade + GrafanaEmbedComponent |
| `workflow-action`                                                                 |
| Files de traitement & State Machine (36%) — **4/4 IR clôturés (2026-07-31)**      |
| `requests`, `processing`, `finalization`, `report-states`                         |
| Workflow Task Queue + Status Transitions + Detail Views                           |

---

## 4. Directives & Garde-Fous pour l'Agent LLM

Lorsque vous exécutez une tâche dans ce workspace, vous devez respecter les
directives suivantes :

1. **Posture d'Architecte Senior (Meta / Google Level)** : Ne vous comportez pas
   en exécutant aveugle. Comprenez la vision globale, explicitez vos arbitrages
   d'architecture et reliez chaque action aux 4 niveaux d'abstraction (Thèse
   SEOS, Isolation Monorepo, Domaine Métier, Oracle de Vérification).

2. **Source de Vérité Métier Impérative** : N'inventez JAMAIS de champs,
   d'interfaces, d'URLs ou de règles métier. Inspectez le projet source local :
   `/Users/macbookair/Dev/Angular/cmz-backoffice-frontend/src/presentation/pages/<module>`

3. **Passage Obligatoire par l'Oracle de Vérification** : Aucun module ou
   fichier n'est réputé terminé sans la validation stricte de l'Oracle :
    - `bunx nx run-many -t build` (ou `tsc --noEmit`)
    - `bunx eslint --max-warnings=0`
    - `ngc --strictTemplates` (Zéro erreur de template)

4. **Documentation Systématique** : Chaque module reconstruit possède son
   fichier de suivi détaillé dans `docs/architecture/module-<nom>.md` (voir
   exemple type :
   [`docs/architecture/module-monitoring.md`](file:///Users/macbookair/deepswift/dev/cmz/cmz-platform/docs/architecture/module-monitoring.md)).

5. **Corpus SEOS (Méthode 2)** : chaque paire legacy → Nx validée est émise dans
   `corpus/{module}.pairs.jsonl` via
   `node tools/corpus/emit-pairs.mjs <module>`. Spec :
   [`docs/architecture/corpus/README.md`](./docs/architecture/corpus/README.md).
   Pattern `workflow-action` v0 :
   [`docs/architecture/patterns/workflow-action.pattern.json`](./docs/architecture/patterns/workflow-action.pattern.json).
   Module de référence : **`processing`**. Famille **clôturée 4/4** :
   `processing`, `requests`, `finalization`, `report-states` (2026-07-31).

---

## 5. État courant du monorepo (2026-07-31)

| Indicateur                | Valeur                                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| Modules livrés            | **18** (voir [`STATUS.md`](./STATUS.md))                                                            |
| Famille `workflow-action` | **4/4 IR clôturés** — corpus + Meta 12/12 par module                                                |
| Famille `read-only-view`  | **3 modules** (`monitoring`, `reporting`, `interactive-map` ⚠️) — schéma JSON **encore à extraire** |
| Phase active              | **07** — reconstruction par patterns ; **08** non démarrée                                          |
| Oracle obligatoire        | build + eslint + strictTemplates + corpus `--verify` pour clôture module                            |

Documents de référence mis à jour en continu : `docs/architecture/module-*.md`,
`docs/architecture/audits/*-meta-verification.md`,
`docs/seos/Assumptions-Register.md`.

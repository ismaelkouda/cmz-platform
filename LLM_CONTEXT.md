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

| Archétype         | Périmètre / Famille                       | Modules Cibles                                                               | Modèle / Structure IR                                                             |
| :---------------- | :---------------------------------------- | :--------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
| `crud-entity`     | CRUD Complet (106 fichiers/entité)        | `administrative-infrastructure`, `administrative-boundary`, `coverage-areas` | Entity + Props + Value Objects + Mappers + Facades + Components                   |
| `action-request`  | Commandes & Mutations (34 fichiers/op)    | `authentication`, `seos-reference-action`                                    | Command DTOs + Handlers + Action Facades                                          |
| `read-only-view`  | Vues analytiques Query-only (17%)         | `monitoring`, `reporting`, `interactive-map`                                 | Consolidated Entity/DTO + Section Mapper + ResourceFacade + GrafanaEmbedComponent |
| `workflow-action` | Files de traitement & State Machine (36%) | `requests`, `processing`, `finalization`, `report-states`                    | Workflow Task Queue + Status Transitions + Detail Views                           |

---

## 4. État Réel du Monorepo & Feuille de Route (Mise à jour : 2026-07-28)

**Phase Actuelle : Phase 07 — Reconstruction Progressive des Modules Métier**

### Statut des Composants du Monorepo :

- **Socle & Tooling (Phases 01–04)** : ✅ **Validé** (Nx 23, Bun 1.3, Angular
  22, esbuild, Playwright, Vitest, Adaptateur SEOS).
- **Kernel Transverse (`shared/` + `core`) (Phases 05–06)** : ✅
  **Opérationnel** :
    - `@cmz/core` (Tokens d'URL `SETTINGS_API_URL`, Intercepteurs/Tokens
      `BYPASS_CACHE`).
    - `@cmz/shared-domain` (Interfaces communes, `SelectOption`, `DomainError`).
    - `@cmz/shared-data` (DTOs enveloppes, `unwrapResponse`,
      `SimpleResponseMapper`, `buildHttpParams`).
    - `@cmz/shared-application` (`ResourceFacade`, `PaginatedFacade`,
      `BaseFacade`).
    - `@cmz/shared-ui` (`GrafanaEmbedComponent`, `PaginationComponent`,
      validators de formulaires).
- **Modules Métier Livrés / En Cours (Phase 07)** :
    - `administrative-infrastructure` : ✅ Reconstruit & compilé.
    - `administrative-boundary` : ✅ Reconstruit & compilé.
    - `authentication` : ✅ Reconstruit & compilé.
    - `monitoring` : ✅ **Livré & Validé (4 sous-pages Grafana embeds, Phase 8
      complete)**.
    - `reporting` : ⏳ **En cours d'instanciation (Phase 1 d'analyse Big Tech
      complète dans `docs/architecture/module-reporting.md`)**.

---

## 5. Directives & Garde-Fous pour l'Agent LLM

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

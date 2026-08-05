# cmz-platform

Monorepo Nx de la plateforme CMZ (_Connect My Zone_). Il accueille la
reconstruction industrielle de `cmz-backoffice-frontend` en **Angular 22** avec
**Bun 1.3** et **Nx 23.1**, puis progressivement les autres composants de la
plateforme.

<!-- BEGIN:GENERATED:monorepo-status -->
**État au 2026-08-05 :** Phase **08** (génération depuis patterns) — **18** modules, **71** libs + **1** app, **2 696** fichiers `.ts` hors tests. Bundle initial prod **882.18 kB**. Voir [`STATUS.md`](./STATUS.md).
<!-- END:GENERATED:monorepo-status -->

> 🤖 **Note pour les LLM / Agents IA** : Consulter le document maître
> d'architecture [`LLM_CONTEXT.md`](./LLM_CONTEXT.md) pour comprendre le cadrage
> SEOS, la vision Big Tech, la structure des archétypes et les garde-fous du
> workspace.

---

## 🏗️ Structure du Socle

| Aspect                     | Choix                                 | Décision / Documentation                                           |
| :------------------------- | :------------------------------------ | :----------------------------------------------------------------- |
| Orchestrateur              | Nx 23.1.0, mode package-based         | [ADR-0001](./docs/adr/0001-monorepo-nx-package-based.md)           |
| Gestionnaire de paquets    | bun 1.3.x (catalog centralisé)        | [ADR-0002](./docs/adr/0002-bun-package-manager.md)                 |
| Structure & Scope          | `apps/` + `libs/`, scope `@cmz/*`     | [ADR-0003](./docs/adr/0003-nommage-et-structure.md)                |
| Dépendances entre packages | Déclarées en `workspace:*`            | [ADR-0004](./docs/adr/0004-graphe-de-dependances-declarees.md)     |
| Framework & Versions       | Angular 22.0.7, catalog bun           | [ADR-0005](./docs/adr/0005-versions-du-socle.md)                   |
| Architecture & Patterns    | SEOS (Software Architecture Compiler) | [ADR-0009](./docs/adr/0009-reconstruction-pilotee-par-patterns.md) |
| Méthode d'exécution IA     | Closed MDE + LLM Oracle Loop          | [LLM_CONTEXT.md](./LLM_CONTEXT.md)                                 |

---

## ⚡ Démarrage & Commandes Utiles

```bash
nvm use                     # Node ^22.22.3 (cf. .nvmrc)
bun install                 # installe et active les hooks Git
bunx nx show projects       # liste les packages du monorepo
bunx nx graph               # graphe de dépendances interactif
bun run check:all           # moteurs, versions du socle, poids des fichiers
bunx nx run-many -t build   # vérification de compilation globale
```

---

## 📁 Arborescence du Workspace

```
apps/                       Applications déployables (ex: backoffice-angular)
libs/
  ├── core/                 Configuration runtime & tokens d'injection (@cmz/core)
  ├── shared/               Kernel transverse (@cmz/shared-{domain,data,application,ui,constants})
  └── <module>/             Modules métier découplés (@cmz/<module>-{domain,data,application,ui})
tools/                      Scripts de vérification du socle & adaptateur SEOS
docs/                       Décisions (ADR), architecture, guides et suivi des modules
LLM_CONTEXT.md              Guide d'architecture et de cadrage pour les agents IA
```

---

## 📚 Documentation

Tout l'écosystème documentaire est disponible sous [`docs/`](./docs/README.md) :

- [Guide d'Architecture LLM](./LLM_CONTEXT.md) — cadrage et directives de
  travail
- [État du socle](./docs/architecture/etat-du-socle.md) — état réel du monorepo
- [Feuille de route](./docs/architecture/feuille-de-route.md) — phases et
  séquencement
- [Analyse du projet source](./docs/architecture/analyse-du-projet-source.md) —
  mesures et cartographie des 53 entités
- [Décisions (ADR)](./docs/adr/README.md) — registres des décisions
  d'architecture

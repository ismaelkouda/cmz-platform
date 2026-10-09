# cmz-platform

Monorepo Nx de la plateforme CMZ (_Connect My Zone_). Il construit un atelier
interne assisté par IA pour produire des applications métier Angular ou React,
standard, lisibles, vérifiables et publiables. La reconstruction Angular du
backoffice sert au remplacement progressif du legacy ; elle n'est pas
l'autorité universelle de la plateforme.

> **Cap produit courant :** construire d'abord nos propres applications,
> remplacer le legacy fonctionnalité par fonctionnalité, puis permettre une
> publication en ligne contrôlée. Commencer par
> [`PROJECT_AUTHORITY.md`](./PROJECT_AUTHORITY.md) et
> [ADR-0094](./docs/adr/0094-cap-produit-interne-remplacement-progressif-et-cibles-web.md).
> Une capacité n'est déclarée supportée qu'après une preuve reproductible dans
> la [matrice de capacités](./docs/architecture/generation-platform-capability-matrix.md).

<!-- BEGIN:GENERATED:monorepo-status -->
**État au 2026-10-09 :** Phase **08** (génération depuis patterns) — **19** modules, **72** libs + **5** app, **2 734** fichiers `.ts` hors tests. Bundle initial prod **754.77 kB**. Voir [`STATUS.md`](./STATUS.md).
<!-- END:GENERATED:monorepo-status -->

> 🤖 **Agents IA :** [`AGENTS.md`](./AGENTS.md) est chargé automatiquement et
> impose la lecture de [`PROJECT_AUTHORITY.md`](./PROJECT_AUTHORITY.md). Choisir
> ensuite un rôle dans le
> [modèle opératoire](./docs/agents/operating-model.md). Le propriétaire dispose
> d'un [guide simple d'orchestration](./docs/agents/guide-utilisateur.md).
> `LLM_CONTEXT.md` reste un contexte technique historique.

---

## 🏗️ Structure du Socle

| Aspect                     | Choix                                 | Décision / Documentation                                           |
| :------------------------- | :------------------------------------ | :----------------------------------------------------------------- |
| Orchestrateur              | Nx 23.1.0, mode package-based         | [ADR-0001](./docs/adr/0001-monorepo-nx-package-based.md)           |
| Gestionnaire de paquets    | bun 1.3.x (catalog centralisé)        | [ADR-0002](./docs/adr/0002-bun-package-manager.md)                 |
| Structure & Scope          | `apps/` + `libs/`, scope `@cmz/*`     | [ADR-0003](./docs/adr/0003-nommage-et-structure.md)                |
| Dépendances entre packages | Déclarées en `workspace:*`            | [ADR-0004](./docs/adr/0004-graphe-de-dependances-declarees.md)     |
| Framework & Versions       | Angular 22.2.0, catalog bun           | [ADR-0005](./docs/adr/0005-versions-du-socle.md)                   |
| Cap produit                | Atelier interne → applications publiables | [ADR-0094](./docs/adr/0094-cap-produit-interne-remplacement-progressif-et-cibles-web.md) |
| Méthode d'exécution IA     | Contrats bornés + oracles déterministes   | [ADR-0039](./docs/adr/0039-frontiere-contractuelle-conception-realisation-llm.md)          |

---

## ⚡ Démarrage & Commandes Utiles

```bash
nvm use                     # Node ^22.22.3 (cf. .nvmrc)
bun install --frozen-lockfile # installe sans réécrire le lockfile
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
PROJECT_AUTHORITY.md        Cap courant et guide obligatoire des agents
AGENTS.md                   Instructions automatiques et routage des rôles
.agents/skills/             Skills de rôle et techniques découvertes par l'agent
conventions/agents/         Contrat machine des rôles et permissions d'agents
LLM_CONTEXT.md              Contexte technique historique et métriques générées
```

---

## 📚 Documentation

Tout l'écosystème documentaire est disponible sous [`docs/`](./docs/README.md) :

- [Autorité produit](./PROJECT_AUTHORITY.md) — cap, ordre des preuves et
  directives de travail
- [Guide de construction](./LLM_APP_BUILDER.md) — entretien, contrats, pages et
  vérification
- [Modèle opératoire des agents](./docs/agents/operating-model.md) — rôles,
  permissions, gates, preuves et handoffs
- [Guide simple d'orchestration](./docs/agents/guide-utilisateur.md) — commandes
  et prompts prêts à copier pour le propriétaire
- [État du socle](./docs/architecture/etat-du-socle.md) — état réel du monorepo
- [Feuille de route](./docs/architecture/feuille-de-route.md) — phases et
  séquencement
- [Analyse du projet source](./docs/architecture/analyse-du-projet-source.md) —
  mesures et cartographie des 53 entités
- [Décisions (ADR)](./docs/adr/README.md) — registres des décisions
  d'architecture

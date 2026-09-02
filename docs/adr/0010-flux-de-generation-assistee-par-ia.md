# ADR-0010 — Flux de génération assistée par IA : cadrage, conventions externalisées, garde-fous

- **Statut :** Accepted
- **Date :** 2026-07-21
- **Note du 2026-09-02 — modèle de couches multi-stack.** Le mécanisme décrit
  ici n'est pas propre à Angular. Il se répartit en couches :
    - **neutre** — les compositions (`action-request`, `list-query`…) et l'IR /
      artefact de conception d'application
      ([ADR-0029](./0029-perimetre-capacites-plateforme-generation.md),
      [ADR-0030](./0030-ir-canonique-et-profils-cibles.md)) disent _quoi_
      produire, sans référence à une stack ;
    - **par (plateforme, version)** — `conventions/profile.schema.json` : un jeu
      de préoccupations identique pour toute stack (`component_model`,
      `server_state`, `i18n`, `forms`…), rempli dans les termes natifs de la
      plateforme, sans abstraction cross-platform ;
    - **par plateforme** — les archétypes de types de fichier. Le §3 ci-dessous
      décrit ceux d'Angular ; ils vivent désormais sous
      `conventions/archetypes/angular/` (déplacés de `contracts/` le 2026-09-02,
      pour ne plus occuper la racine comme s'ils étaient neutres). Une cible
      React / Kotlin / Swift aura son propre jeu, jamais celui-ci.

## Contexte

Le projet interdit le **code manuel**. Le flux de production est :

```
données (fournies par l'humain)
   → patterns + scripts (déterministe, zéro IA)
   → IA (remplit le contenu métier, sous contrainte)
   → interface / vérification
```

Trois exigences en découlent, et elles sont en tension :

1. **L'IA doit produire du code conforme aux normes courantes** — pas à celles
   de son corpus d'entraînement, souvent périmé pour un framework qui évolue
   vite.
2. **Les conventions changent vite.** Preuve concrète et non hypothétique :
   Angular v20 déclarait un service avec `@Injectable({providedIn:'root'})` ;
   Angular v22 introduit `@Service`, désormais la forme recommandée. Un
   générateur qui code cette convention en dur devient faux à chaque version
   majeure.
3. **La conformité structurelle ne garantit pas la correction du contenu.** Un
   fichier peut être une classe, une fonction, un injectable, un value-object,
   un mapper, un handler — chacun a des règles de contenu différentes que
   `check-pattern.js` (présence des fichiers) ne voit pas.

## Décision

### 1. Cadrer l'IA avec l'outillage officiel, pas avec des règles maison

Avant de démarrer chaque stack, on installe le cadrage IA **officiel** de cette
stack (règle de projet : recherche documentaire préalable obligatoire). Pour
Angular :

| Ressource officielle | Rôle                            | Source |
| -------------------- | ------------------------------- | ------ |
| `best-practices.md`  | Instructions système : signals, |

                                            `@Service`, `input()`/`output()`, control
                                            flow natif, `inject()`, a11y AXE/WCAG   | angular.dev/ai/develop-with-ai      |

| Agent Skills `angular-developer`, `angular-new-app` | Compétences maintenues,
synchronisées avec le framework | angular.dev/ai/agent-skills | | MCP CLI
Angular | Contexte outillage entemps | angular.dev/ai/mcp | | `llms-full.txt` |
Corpus de référence | angular.dev/context/llm-files | | Nx AI integration
(`nx configure-ai-agents`) | MCP Nx : structure du workspace, générateurs,
graphe | nx.dev/docs/getting-started/ai-setup|

Écrire nos propres règles Angular reviendrait à réinventer, en moins bien et
sans maintenance, ce que l'équipe Angular publie et met à jour à chaque version.
Notre travail n'est pas de décrire Angular à l'IA, mais de décrire **notre
architecture** (DDD/CQRS, frontières Nx) par-dessus.

### 2. Externaliser les conventions dans un profil versionné par framework

Les conventions **ne sont jamais codées en dur** dans les générateurs. Elles
vivent dans un **profil de convention** versionné :

```
conventions/angular-22.profile.json
```

Le profil déclare les choix qui changent d'une version à l'autre — décorateur de
service (`@Service` vs `@Injectable`), forme d'injection (`inject()`), API de
formulaires (Signal Forms), etc. Le générateur et l'IA le **lisent** au moment
de la génération ; ils ne le contiennent pas.

Quand Angular 23 sortira, on écrit `angular-23.profile.json` et on ne touche pas
au générateur. C'est le même principe que le catalog de versions
([ADR-0005](./0005-versions-du-socle.md)) appliqué aux conventions de code : une
seule source de vérité, un seul endroit à modifier.

**Emplacement.** Le profil vit dans **ce monorepo** (non dans le dépôt tiers des
outils SEOS), parce qu'il est spécifique au dépôt : il dit « ici on cible
Angular 22 ». Les outils SEOS, eux, sont génériques et publiés séparément
([ADR-0009](./0009-reconstruction-pilotee-par-patterns.md)).

### 3. Archétypes de types de fichier (cible Angular) pour le contenu

> Ces archétypes sont **spécifiques à la sortie Angular/Nx** et vivent sous
> [`conventions/archetypes/angular/`](../../conventions/archetypes/angular/README.md).
> Voir la note de tête pour le modèle de couches (neutre / par-version / par-plateforme).

`check-pattern.js` vérifie _quels_ fichiers existent. Le contenu de _chaque_
fichier est cadré par un **archétype**.

Les 106 fichiers canoniques ne relèvent que d'une quinzaine d'archétypes
(`command-mapper`, `use-case`, `entity-vo`, `handler`, `facade`, `repository`,
`contract`, `validator`, `dto`, `providers`…). Chaque archétype porte :

- son **rôle** dans l'architecture DDD/CQRS ;
- la **règle mécanique** qu'il doit respecter (ex. un use-case enveloppe tout
  appel au repository dans `defer()`) ;
- un **exemplaire de référence** tiré du module validé 106/106 ;
- un **prompt structuré** qui n'autorise l'IA qu'à injecter le **contenu
  métier**, jamais à réinventer le squelette.

Le prompt d'un archétype = rôle + règle + profil de convention courant +
exemplaire + données métier. L'IA ne remplit qu'un trou dont la forme est fixée.

### 4. Un portail de validation empilé (défense en profondeur)

Aucun contrôle ne suffit seul. Ils s'empilent, chacun attrapant une classe
d'erreur différente :

| Niveau      | Outil                                                     | Attrape                                        |
| ----------- | --------------------------------------------------------- | ---------------------------------------------- |
| Compilation | `tsc --noEmit`                                            | Erreurs de type                                |
| Lint        | ESLint + `@nx/enforce-module-boundaries` + règles Angular | Style, frontières de couche                    |
| Structure   | `check-pattern.js`                                        | Fichier manquant ou mal placé                  |
| Sémantique  | `check-semantics.js`                                      | Bugs mécaniques connus (defer, i18n, handler…) |
| Qualité IA  | **Web Codegen Scorer** (officiel Angular)                 | Qualité globale du code généré, régressions    |
| Métier      | Revue humaine                                             | Règle de gestion mal reportée                  |

Web Codegen Scorer est l'apport nouveau : un score objectif et reproductible sur
le code généré, maintenu par l'équipe Angular. Il permet de comparer des prompts
et de suivre la qualité dans le temps, au lieu de juger « à l'œil ».

### 5. Élargir la couverture des bugs par un processus, pas par la devinette

`check-semantics.js` couvre 9 familles de bugs, chacune ayant déjà attrapé un
bug réel. On **n'invente pas** de règles spéculatives. La règle de projet est :

> Tout bug trouvé en production ou en revue devient un test qui échoue, puis une
> règle mécanique. Jamais une règle sans bug réel à son origine.

C'est déjà la méthode SEOS. On l'inscrit comme processus obligatoire du portail
de validation : la couverture croît de façon monotone et justifiée.

## Justification

Le fil conducteur est la **séparation entre ce qui est stable et ce qui
change**.

- Ce qui est stable (l'architecture DDD/CQRS, les archétypes, les frontières Nx)
  vit dans les scripts et les contrats — déterministe, versionné, testé.
- Ce qui change vite (les conventions du framework) vit dans un profil externe
  et dans l'outillage officiel maintenu par l'éditeur.
- Ce qui est créatif (le contenu métier) est délégué à l'IA, mais dans un trou
  de forme fixe et derrière un portail de validation empilé.

Coder les conventions en dur mélangerait les trois et rendrait le générateur
faux à chaque version. Laisser l'IA produire librement mélangerait créativité et
structure et rendrait le résultat invérifiable.

## Conséquences

### Positives

- Une montée de version d'Angular se traite dans un fichier de profil, pas dans
  le générateur.
- Le cadrage IA est maintenu par l'équipe Angular, gratuitement et en continu.
- La qualité du code généré devient **mesurable** (Web Codegen Scorer), donc
  pilotable.
- La couverture de bugs croît de façon traçable.

### Négatives / dette acceptée

- L'outillage IA officiel Angular est jeune (v22) et évoluera — il faudra le
  suivre. C'est un coût de veille, assumé, et inférieur à celui de le réécrire.
- Web Codegen Scorer et les MCP ajoutent des dépendances d'outillage à installer
  et à maintenir — **soumises à approbation** avant installation (règle de
  projet).
- Écrire les contrats d'archétype est un travail initial réel (une quinzaine de
  contrats), mais amorti sur les 53 entités.
- Le profil de convention doit rester synchronisé avec la version d'Angular du
  catalog : un écart entre les deux est un bug — à vérifier en CI (Phase 06).

### Points à réévaluer

- Si un jour l'outillage officiel Angular couvre nos besoins d'archétypes, une
  partie des contrats maison pourrait être retirée.
- Si Web Codegen Scorer se révèle inadapté à du code de couche domaine (il vise
  surtout l'UI), le limiter aux archétypes de présentation.

## Références

- [Angular — LLM prompts and AI IDE setup](https://angular.dev/ai/develop-with-ai)
- [Angular — Agent Skills](https://angular.dev/ai/agent-skills)
- [Angular — CLI MCP Server](https://angular.dev/ai/mcp)
- [Angular — Web Codegen Scorer](https://github.com/angular/web-codegen-scorer)
- [Nx — Integrate with your Coding Assistant](https://nx.dev/docs/getting-started/ai-setup)
- Angular 22 : `@Service` stable (sorti le 2026-06-03) — preuve de convention en
  évolution

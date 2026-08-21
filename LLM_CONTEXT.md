# LLM Master Context & System Architecture Guide — cmz-platform

> **Note pour tout Agent IA / LLM (Claude, Gemini, GPT, Cursor, etc.)** : Ce
> document est le point d'entrée vers l'architecture, la philosophie de
> recherche, la structure et l'état courant de `cmz-platform`. En cas de
> conflit, les ADR non supersédés, les schémas exécutables et les résultats CI
> priment sur la prose. Lisez ce document au démarrage de chaque session.

---

## 0. Objectif du projet — PÉRIMÈTRE CONSOLIDÉ le 2026-08-14

**Décision structurante courante :
[ADR-0029](./docs/adr/0029-perimetre-capacites-plateforme-generation.md).**
ADR-0029 supersède la formulation non bornée d'ADR-0026 : le dépôt ne promet
plus « n'importe quelle source vers n'importe quelle stack ». Il construit une
**plateforme extensible de compilation de spécifications applicatives**, dans
une enveloppe initiale d'applications métier data-centric (backoffices, CRUD,
vues analytiques et workflows).

Les capacités sont déclarées et promues par preuve dans la
[`matrice de capacités`](./docs/architecture/generation-platform-capability-matrix.md).
La première démonstration attendue est une matrice reproductible de deux sources
(spécification structurée + legacy TypeScript) vers deux cibles utilisateur
(Angular + ReactJS), sur `action-request` puis `workflow-action`. Les
identifiants techniques des profils restent `angular-nx` et `react-typescript`.

**État local de la preuve :** PLAT-1 à PLAT-5K sont implémentés localement ;
la promotion externe de PLAT-5F attend la première matrice CI APFS/ext4 verte.
Pour `action-request`, les deux sources convergent sur une IR et une seconde
fonctionnalité `support` suit le parcours déclaratif. Pour `workflow-action`, un
adaptateur borné du cas réel `requests` sépare provenance et Behavior Model,
puis une définition JSON indépendante converge sur le même graphe. La commande
`generate:workflow-action` génère Angular et ReactJS pour cette composition
bornée ; le même Oracle couvre états, permissions, branches et export
asynchrone. Les mutations ciblées sont tuées sur chaque cible. La promotion
reste conditionnée à une CI verte. PLAT-5A ajoute un Artifact Plan neutre
partagé par les deux renderers et un manifest 1.1 où chaque fichier possède une
responsabilité, un owner et une politique d'écriture. PLAT-5B ajoute un dry-run
read-only, un Change Set déterministe et le refus du drift des fichiers générés.
PLAT-5C raccorde un slot typé `after-success` dans `action-request` et
`workflow-action`, avec un fichier séparé `human-owned/preserve` dont le hash
réel est conservé avant/après par le Change Set sur Angular et ReactJS. Les
Oracles prouvent son exécution et interdisent son remplacement ou sa
suppression. PLAT-5D sépare désormais les tests par cible : le core et ses
Oracles boîte noire restent sous `node:test`, les sorties Angular passent un
gate Vitest + `TestBed`, et les hooks ReactJS un gate Vitest + React Testing
Library avec React/ReactDOM réels. PLAT-5E autorise désormais une régénération
explicite avec `--apply <change_set_id>` : l'identifiant fourni doit être celui
du dry-run revu, sinon l'application est refusée. Le plan de contrôle et les
artefacts des deux cibles sont vérifiés par ownership, une arborescence candidate est compilée, les slots
humains y sont recopiés octet par octet, puis la sortie est publiée avec rollback
sur erreur. La capacité `regeneration.existing-output` est donc prouvée. Le
durcissement PLAT-5F ajoute un verrou exclusif publié atomiquement, un journal
de transaction durable, la synchronisation des fichiers/répertoires et une
reprise déterministe qui restaure l'ancienne version ou vérifie intégralement
la version publiée. La concurrence, les verrous périmés, les deux états de crash
— y compris un processus réellement tué par `SIGKILL` après chacun des deux
renommages — et les journaux contradictoires ont des tests négatifs. ADR-0035
borne la v1 au modèle `offline-activation` : aucun lecteur externe concurrent
n'est supporté pendant la commande. Le runtime refuse tout stockage autre
qu'APFS/macOS ou ext4/Linux local. Le probe APFS est vert localement et une
matrice CI bloquante vérifie les deux profils ; son premier résultat externe
reste requis avant promotion M3. Voir
[`validation-runtime-action-request.md`](./docs/architecture/validation-runtime-action-request.md)
et
[`validation-runtime-workflow-action.md`](./docs/architecture/validation-runtime-workflow-action.md).

PLAT-5G ferme en outre la lacune
`permissions.runtime-enforcement` du contrat directeur : une opération
`authorized` exige toutes les permissions canoniques à sa frontière
d'exécution. Angular génère un `PERMISSION_PORT` obligatoire et évalue la garde
à la souscription RxJS ; ReactJS exige le port dans la factory de hooks et
évalue la garde à chaque exécution. Un refus produit l'erreur stable
`permission_denied` avant HTTP/fetch. Le gate directeur, les tests natifs
TestBed/React Testing Library et quatre mutants ciblés prouvent ce comportement.
Ce contrôle frontend ne remplace jamais l'autorisation du backend.

PLAT-5H ferme la lacune `composition.persisted-instance` en implémentant le
premier acte d'ADR-0032 Option C — l'instance de composition persistée,
distincte de la promotion en pattern qui reste hors périmètre. Le module
`core/composition-instance.mjs` construit une enveloppe JSON versionnée et
immuable (`projected_definition` exacte, hash d'arbre des deux cibles,
intégrité `sha256-stable-json-v1` sur l'enveloppe) qui ne porte jamais de
champ de promotion ou de réutilisabilité. Le cycle persist → écriture disque →
relecture depuis les octets → régénération à partir de la définition
rechargée → comparaison des hash d'arbre est exécuté réellement, pas simulé.
Le rechargement échoue fermé sur hash d'enveloppe non concordant, violation de
schéma, JSON corrompu, `contract_ref` erroné et divergence de régénération —
cinq scénarios testés séparément, dont un qui prouve que l'intégrité de
l'enveloppe et la comparaison de régénération sont des contrôles
complémentaires, non redondants. Preuves : Oracle du gate directeur, 8 tests
directs et 3 mutants tués sur les gardes fail-closed. Limite explicite : ce
mécanisme ne définit pas où stocker les instances en production ni les
critères de promotion en pattern, qu'ADR-0032 déclare explicitement comme
dette assumée.

PLAT-5I ferme la lacune `behavior.graph` : le graphe
`evolution.behavior_graph` (`editing`/`submitting`/`confirmed`/
`business-error`, 3 transitions) est désormais prouvé par exécution réelle,
pas par validation de schéma. Le mécanisme `workflow-action` existant a été
examiné puis écarté comme base de réutilisation directe — c'est une state
machine liée en dur à son propre domaine (`take`/`qualify`/`export`), pas un
moteur générique ; le réutiliser aurait dupliqué une forme figée ou affaibli
ses invariants. Le patron architectural réutilisé est celui déjà prouvé par
`oracles/workflow-runtime-oracle.mjs` (garde fail-closed exécutée réellement en
Angular DI et via un port de hooks React), transposé dans un nouveau module
générique `core/behavior-graph.mjs` piloté par les données du contrat, jamais
par des noms d'état codés en dur. Les renderers
`renderers/behavior-graph-renderer.mjs` /
`renderers/behavior-graph-stack-adapters.mjs` émettent un moteur
`BehaviorGraphEngine` identique pour Angular et ReactJS ; ce moteur n'est pas
câblé dans les renderers `action-request` génériques (qui servent aussi
`login` sans graphe déclaré) mais matérialisé séparément à partir de
`contract.evolution.behavior_graph`, sur le modèle d'isolation de PLAT-5H —
sans toucher aux hash d'arbre déjà couverts par `composition.persisted-instance`.
Preuves : Oracle du gate directeur (`probeBehaviorGraph`), 12 tests directs,
6+6 tests natifs TestBed/Testing Library et 2 mutants tués sur la garde de
transition rendue. Limite explicite : ce moteur gouverne uniquement le
graphe de cette composition (`support-request`) ; il n'est pas encore un
mécanisme générique disponible à toute définition `action-request` future.

PLAT-5J ferme `presentation.flow`, la **dernière** lacune du contrat
directeur : `expected_gaps` passe à `[]`. Le wizard
`evolution.presentation` (`request`→`review`→`confirmation`, champs propres
par étape) est prouvé par exécution réelle, remplaçant une validation de
schéma suivie d'une recherche de sous-chaîne `'confirmation'` dans le code
généré. **Choix délibéré : mécanisme séparé de `behavior-graph.mjs`, pas une
extension.** ADR-0030 traite le Behavior model (états/transitions) et la
Presentation intent (vues/navigation) comme deux axes orthogonaux de l'IR ;
le contrat directeur reflète ce découpage (`behavior_graph` et
`presentation` sont des clés sœurs sous `evolution`). Une étape de wizard
est une position dans un ordre linéaire déclaré, pas un état atteint par un
événement arbitraire — réutiliser le graphe de comportement aurait forcé un
couplage artificiel entre id d'étape et nom de nœud. Nouveau module
générique `core/presentation-flow.mjs` piloté par les données du contrat
(`{ kind, steps }`), jamais par des noms d'étape/champ codés en dur :
`applyPresentationAdvance` accepte uniquement l'étape suivante déclarée une
fois l'étape courante complète (chaque champ déclaré présent et non vide) et
refuse fail-closed tout saut, étape inconnue, ou avance prématurée ;
`applyPresentationBack` accepte un retour d'une étape sans re-vérifier la
complétude — choix assumé, ADR-0030 ne tranchant pas ce point. Renderers
`renderers/presentation-flow-renderer.mjs` /
`renderers/presentation-flow-stack-adapters.mjs` émettent un
`PresentationFlowEngine` identique pour Angular et ReactJS, matérialisé
séparément (comme PLAT-5I/5H) sans toucher aux hash d'arbre déjà couverts.
Preuves : Oracle du gate directeur (`probePresentationFlow`), 20 tests
directs, 9+9 tests natifs TestBed/Testing Library et 2 mutants tués (garde
anti-saut, garde de complétude). Validations : 149/149 tests core (23
propres à ce lot), gate directeur PASS avec `regressions:[]`,
`unexpectedly_implemented:[]`, `actual_gaps:[]` — `promotion_rule.success`
voit sa première condition (`expected_gaps` vide) satisfaite, mais ce script
n'évalue ni ne déclenche la seconde condition ni aucune promotion ;
`contract.status` reste `"characterization"`. Limite explicite : comme
PLAT-5I, ce moteur ne gouverne que le flux de cette composition ; le critère
de complétude par champ (présence + non-vide) est délibérément simple, sans
validation métier par étape plus riche.

PLAT-5K ferme le dernier des 6 invariants du contrat directeur sans oracle
exécutable : « The evolution run itself does not modify core, planner,
profiles, or renderers. » Avant ce chantier ce fait tenait uniquement par
construction du code (tout `writeFile`/`mkdir`/`rm` du pipeline cible un
`mkdtemp(tmpdir())`), jamais vérifié activement. Nouveau module
`core/run-isolation-oracle.mjs` : `snapshotProtectedTree(root)` hash chaque
octet de chaque fichier sous `root` ; `assertRunIsolation(run, { root })`
capture un instantané, exécute `run()` réellement, recapture, et lève sur la
moindre différence. Protection retenue : tout l'arbre
`tools/generator-platform/` (le planner `core/artifact-plan.mjs` vit dans
`core/`, donc protéger `core/` le couvre) à l'exception du scratch gitignored
`.stack-test-runtime/`. `check-evolvable-composition.mjs` enveloppe
désormais le corps entier de `probeEvolvableComposition()` (calcul des
cibles + les 5 probes existants) dans `assertRunIsolation`, pas seulement un
sous-probe — un futur bug pourrait fuir depuis n'importe lequel. Le rapport
gagne un champ `run_isolation: { files_checked, violated }`, volontairement
absent de `expected_supported`/`expected_gaps` (pas de slot contractuel pour
un invariant). Preuve de non-tautologie : `run-isolation.test.mjs` (10
tests) construit une fixture isolée et injecte une écriture délibérée dans
le répertoire protégé — l'oracle doit lever, puis le test relit le fichier
pour prouver que la corruption a réellement eu lieu (l'oracle détecte, ne
répare pas). Un test d'intégration appelle le vrai
`probeEvolvableComposition()` et vérifie `run_isolation.violated === false`
contre le vrai arbre source. En cours de route, le nouvel oracle a détecté
un vrai défaut latent préexistant : `composition-instance-mutations.test.mjs`
(PLAT-5H) écrivait son mutant comme fichier frère réel dans `core/` avant de
le supprimer, un effet de bord transitoire sur l'arbre protégé sous
parallélisation `node --test` — corrigé en écrivant désormais le mutant dans
un `mkdtemp` avec imports symlinkés. Validations : 159/159 tests
(149 préexistants + 10 nouveaux), 3 lancements consécutifs sans flakiness,
`eslint --max-warnings=0` propre, `format:check` vert, poids de fichiers
conforme, gate directeur PASS avec `regressions:[]`, `actual_gaps:[]`,
`run_isolation.violated: false`, hash d'arbre Angular/ReactJS inchangés.
**Conclusion sur `promotion_rule.success` :** les 2 conditions cumulatives
(`expected_gaps` vide et chaque invariant vérifié par un oracle exécutable)
sont désormais, sur la base des preuves listées dans
`taches-restantes.md`, toutes deux satisfaites — mais ce chantier ne
déclenche, n'active ni ne câble aucun mécanisme de promotion ;
`contract.status` reste `"characterization"`, inchangé.

**Direction d'évolution :** `action-request`, `workflow-action`, `crud-entity`
et `read-only-view` sont des compositions de référence, pas des familles
exhaustives du core. Toute fonctionnalité générée doit conserver une composition
persistée ; seules les compositions démontrées comme réutilisables sont promues
en patterns versionnés. La conception cible, la propriété des artefacts, le
cycle de vie des patterns et le test directeur de régénération non destructive
sont définis dans
[`conception-compositions-evolutives-patterns-memorises.md`](./docs/architecture/conception-compositions-evolutives-patterns-memorises.md).
Cette direction n'est pas encore une capacité livrée : les vertical slices
actuelles restent bornées et spécialisées.

**SEOS/Angular est le golden reference et le cas d'usage industriel déjà bâti.**
Il reste un livrable produit et le terrain de la Phase 09 d'équivalence
fonctionnelle. Les sections suivantes décrivent ce cas concret ; elles ne sont
pas, par défaut, des invariants de la plateforme. Figma est une future source
partielle d'intention de présentation, non le premier chemin de preuve du core.

---

## 1. Vision Système & Paradigme SEOS (cas d'usage concret — voir §0 pour l'objectif global)

### 1.1 Objet du Projet

`cmz-platform` est le monorepo Nx TypeScript central de la plateforme **CMZ
(_Connect My Zone_)**. Il héberge la reconstruction industrielle et le découpage
modulaire du backoffice front-end (`cmz-backoffice-frontend`) en **Angular 22**
avec **Bun 1.3** et **Nx 23.1** (mode _package-based_) — **le cas d'usage SEOS
du système de génération générique décrit en §0.**

### 1.2 Thèse Scientifique & Philosophie d'Ingénierie

Le projet n'est pas une simple refonte front-end : c'est le terrain
d'expérimentation et de validation industrielle de **SEOS (_Software Engineering
Operating System_)** et de la future plateforme de génération.

- **Paradigme d'exécution** : Nous fonctionnons en **boucle MDE + LLM fermée par
  un Oracle de Vérification Stricte (_Generate-Verify-Repair_)**.
- **Rôle de l'IA (LLM)** : l'IA est un moteur d'inférence et de réparation sous
  contraintes. Elle n'est pas le composant déterministe. Le déterminisme doit
  appartenir à l'IR normalisée, au manifest, au planner et aux renderers. Sur le
  cas SEOS, elle lit la source métier (`$SEOS_LEGACY_ROOT`) et ne doit jamais
  inventer un fait absent.
- **Objectif à Long Terme** : Constituer le jeu de données d'apprentissage
  annoté et validé (Corpus de paires _Source legacy → Cible Nx 4 couches_) pour
  alimenter la **Synthèse Neurosymbolique (Méthode 2)**. **État réel, mesuré et
  tranché par [ADR-0019](./docs/adr/0019-nature-du-corpus-seos.md) (2026-08-03)
  : le corpus actuel (`corpus/*.pairs.jsonl`) est un **index de correspondances
  de chemins** (587 correspondances + 194 décisions d'architecture documentées,
  0 contenu/diff/IR sur les 781 paires) — pas encore le jeu d'apprentissage visé
  ici. Voir le bloc généré ci-dessous (« Corpus SEOS — nature »/« couverture »)
  pour les chiffres à jour.

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

### Convention d'injection : `@Service()` vs `@Injectable()`

Deux décorateurs Angular coexistent dans le monorepo, avec un usage strict et
non interchangeable (vérifié 2026-08-10 :
`grep -rl "@Service()" libs/ apps/ | wc -l` → **555** fichiers,
`grep -rl "@Injectable()" libs/ apps/ | wc -l` → **66** fichiers, aucun
chevauchement) :

- **`@Service()`** (`import { Service } from '@angular/core'`, Angular 22) —
  décorateur "auto-provided" (`autoProvided` vaut `true` par défaut dans son
  type Angular natif) : la classe est fournie automatiquement, sans entrée
  `providers:` explicite, avec une durée de vie de singleton applicatif
  (tree-shakable, dans l'esprit de l'ancien
  `@Injectable({ providedIn: 'root' })`). Utilisé pour **tout ce qui est injecté
  au niveau applicatif standard** : services, mappers, facades, use-cases,
  repositories (555 fichiers au total, catégories non ventilées
  individuellement). Exemple :
  `libs/report-states/data/src/lib/mappers/report-states-details.mapper.ts`.

- **`@Injectable()` sans options** — **n'est PAS auto-fourni** : la classe doit
  obligatoirement être déclarée dans un tableau `providers: [...]` au niveau
  d'un composant pour être injectable, ce qui lie sa durée de vie au cycle de
  vie de ce composant (nouvelle instance à chaque activation, détruite avec le
  composant — pas un singleton applicatif). Réservé **exclusivement aux stores
  de composant `*-filter.store.ts` (42 fichiers) et `*-form.store.ts` (24
  fichiers)**, fournis via `providers: [XxxFilterStore]` ou
  `providers: [XxxFormStore]` sur le composant de page ou de dialog qui les
  possède — jamais sur un composant enfant. Exemples :
  `libs/report-states/ui/src/lib/stores/approve-report-states-filter.store.ts`
  (fourni par `libs/report-states/ui/src/lib/features/*-list.component.ts`),
  `libs/communication/ui/src/lib/stores/messaging-form.store.ts` (fourni par
  `messaging-form.component.ts` via `providers: [MessagingFormStore]`). Aucun
  des 66 fichiers ne déclare `providedIn`.

**Règle pour un nouveau fichier :** un mapper/service/facade/use-case/
repository → `@Service()`. Un store de formulaire ou de filtre porté par un
composant de page/dialog → `@Injectable()` sans options, fourni explicitement
via `providers:` sur ce composant.

---

## 3. Profil structurel Angular/Nx du cas SEOS

> ⚠️ **Portée consolidée par
> [ADR-0030](./docs/adr/0030-ir-canonique-et-profils-cibles.md) et
> [ADR-0031](./docs/adr/0031-graphe-execution-et-manifests-composition.md).**
> Les quatre lignes ci-dessous sont des compositions mémorisées du **profil de
> rendu Angular/Nx**. Les cinq catégories historiques restent utiles pour
> planifier cette cible, mais ne sont plus l'IR canonique de la plateforme. Le
> fichier `pattern-core.schema.json`, malgré son nom conservé temporairement,
> contient des chemins et conventions Nx et doit être traité comme un artefact
> de compatibilité cible.

L'ensemble des 52 entités métier du projet legacy (hors fixture SEOS) se
répartit aujourd'hui en 4 compositions mémorisées (voir avertissement ci-dessus
pour leur statut réel) :

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
| Vues analytiques Query-only (17%) — **v0 extrait 2026-08-01**                     |
| `monitoring`, `reporting` ✅ ; `interactive-map` ⚠️ (SIG hors IR)                 |
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
   d'interfaces, d'URLs ou de règles métier. Inspectez le projet source via la
   variable d'environnement **`SEOS_LEGACY_ROOT`** (obligatoire hors
   `--structural-only` — ADR-0015 ; alias déprécié `--oracle-only`) :
   `$SEOS_LEGACY_ROOT/src/presentation/pages/<module>`

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

    Pattern `read-only-view` v0 :
    [`docs/architecture/patterns/read-only-view.pattern.json`](./docs/architecture/patterns/read-only-view.pattern.json).
    Module de référence : **`monitoring`**. Famille **clôturée 4/4** :
    `monitoring`, `reporting`, `dashboard`, `interactive-map` (2026-08-01).

    Phase **08 — génération depuis patterns** :
    [`docs/architecture/generation-from-patterns.md`](./docs/architecture/generation-from-patterns.md)
    ([ADR-0013](./docs/adr/0013-phases-08-generation-et-09-verification.md)).
    Phase **09** = vérification fonctionnelle vs legacy (non démarrée).

---

## 5. État courant du monorepo

<!-- BEGIN:GENERATED:monorepo-status -->
| Indicateur                | Valeur                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Dernière génération       | **2026-08-21** (`bun run generate:status`)                                                                      |
| Modules livrés            | **19** (voir [`STATUS.md`](./STATUS.md))                                                         |
| Packages Nx               | **73** (72 libs + 1 app)                                              |
| Fichiers TypeScript       | **2 730** hors tests / **2 979** total (249 specs)                 |
| Corpus SEOS               | **1 507** paires / **18** modules (`corpus/*.pairs.jsonl`)                       |
| Corpus SEOS — nature (N-6)| **583 correspondances** + **924 décisions d'architecture** (`n/a`) — pas 1507 paires d'apprentissage (P0-12) |
| Corpus SEOS — couverture (N-4) | **918 / 2 730 fichiers libs/ hors tests → 33.6 %** — 1 modules sans aucune paire (1 `kernel`), absent sans ce chiffre (P0-12) |
| Périmètre applicatif (M-7)| **55 / 55 entités** construites (`docs/architecture/scope.json`, 0 manquantes — voir [ADR-0018](./docs/adr/0018-perimetre-team-organization.md)) |
| Bundle initial (prod, raw)| **629.01 kB** ([`bundle-metrics.json`](./apps/backoffice-angular/bundle-metrics.json), 2026-08-21) |
| Famille `workflow-action` | **4/4 IR clôturés** — corpus + Meta 12/12 par module                                         |
| Famille `read-only-view`  | **4/4 IR clôturés** — `monitoring`, `reporting`, `dashboard`, `interactive-map`              |
| Phase active              | **08** — génération depuis patterns ([ADR-0013](./docs/adr/0013-phases-08-generation-et-09-verification.md) ; Phase 09 = vérification fonctionnelle) |
| Oracle obligatoire        | build + eslint + strictTemplates + corpus `--verify` pour clôture module                                     |
| Oracle Tier 2 (nightly)   | `bun run check:tier2` — ngc + build development + build production                                           |
<!-- END:GENERATED:monorepo-status -->

Documents de référence mis à jour en continu : `docs/architecture/module-*.md`,
`docs/architecture/audits/*-meta-verification.md`,
`docs/seos/Assumptions-Register.md`.

# Plan d'exécution

- **Dernière mise à jour :** 2026-07-21
- **Objectif :** reconstruire `cmz-backoffice-frontend` en Angular 22 dans le
  monorepo, par génération à partir des patterns SEOS
  ([ADR-0009](../adr/0009-reconstruction-pilotee-par-patterns.md))
- **Point de départ :** socle terminé — voir [état du socle](./etat-du-socle.md)

## Comment lire ce plan

Chaque phase déclare un **critère de sortie vérifiable par une commande**. Une
phase n'est pas terminée parce qu'elle « semble faite » : elle l'est quand la
commande passe.

**Aucune date n'est donnée.** Nous n'avons pas de vélocité mesurée sur ce type
de travail, et le volume réel de la Phase 07 dépend d'une mesure qui n'a pas
encore été faite (§ Phase 03). Annoncer un calendrier maintenant reviendrait à
inventer un chiffre. Les efforts sont exprimés en ordres de grandeur relatifs,
et la Phase 03 produira les données nécessaires à un vrai chiffrage.

## Vue d'ensemble

| Phase | Objet                                                         | Bloque             | Effort         |
| ----- | ------------------------------------------------------------- | ------------------ | -------------- |
| 02    | Application Angular 22 + validation du pattern sur une entité | Tout               | Faible         |
| 03    | Mesure de couverture des patterns sur les 53 entités          | 07                 | Faible         |
| 04    | Adaptation des générateurs au monorepo                        | 06, 07             | **Élevé**      |
| 05    | Socle transverse `shared/` + `core/` (584 fichiers)           | 07                 | **Élevé**      |
| 06    | Qualité, tests, CI, Docker                                    | 07 (partiellement) | Moyen          |
| 07    | Reconstruction des 53 entités                                 | 08                 | **Très élevé** |
| 08    | Vérification fonctionnelle globale                            | —                  | Moyen          |

Les phases 02 et 03 sont des **phases de mesure** : peu coûteuses, mais elles
conditionnent tout le reste. Les exécuter avant tout engagement est le point le
plus important de ce plan.

---

## Phase 02 — Application Angular 22 et validation du pattern

**Objectif réel : répondre à une question, pas produire du code.** Les patterns
SEOS ont été extraits sur Angular 21. Ils décrivent une structure de fichiers et
des responsabilités, pas des API du framework — leur validité sur Angular 22 est
probable mais non vérifiée. Si elle est fausse, tout le plan change.

### Étapes

**02.1 — Installer le plugin Angular (sous approbation)**

```bash
bun add -d @nx/angular@latest
```

`@latest` plutôt qu'une version épinglée : on veut la version qui connaît
Angular 22. Compatibilité vérifiée sur 23.1.0
(`@angular/build: ">= 20.0.0 < 23.0.0"`) ; `@latest` sera relu au moment de
l'installation. **Installation soumise à approbation** (règle de projet).

**02.2 — Compléter le catalog**

`@nx/angular` requiert `@angular-devkit/build-angular` et `@schematics/angular`,
absents du catalog. Les ajouter au catalog `tooling` **après** avoir relevé les
versions réellement résolues — pas avant.

**02.3 — Générer l'application**

```bash
bunx nx g @nx/angular:application backoffice-angular \
  --directory=apps/backoffice-angular \
  --standalone --style=scss --routing \
  --unitTestRunner=vitest --e2eTestRunner=none \
  --bundler=esbuild
```

`--e2eTestRunner=none` : Playwright est mis en place en Phase 06, pas ici.

**02.4 — Mettre le package en conformité**

Le générateur écrit des versions en dur dans le `package.json` du package. Les
remplacer par `catalog:` / `catalog:tooling`, puis vérifier.

**02.5 — Valider le pattern sur une entité — l'étape qui compte**

Générer une entité de référence dans l'application neuve, puis :

```bash
node <seos>/tools/check-pattern.js apps/backoffice-angular/src/app/<module> <entite>
bunx nx build backoffice-angular
```

Choisir une entité du module `administrative-infrastructure`, seul module validé
106/106 sur le schéma v23.

### Critère de sortie

```bash
bunx nx build backoffice-angular          # succès
bun run check:versions                     # aucune violation
node <seos>/tools/check-pattern.js ...     # 106/106
```

### Cadrage IA (préalable à toute génération)

Avant de générer quoi que ce soit, installer le cadrage IA officiel Angular + Nx
([ADR-0010](../adr/0010-flux-de-generation-assistee-par-ia.md)) — **sous réserve
d'approbation** de chaque installation :

```bash
npx skills add https://github.com/angular/skills   # angular-developer, angular-new-app
npx nx configure-ai-agents                          # MCP Nx + skills agents
# best-practices.md + llms-full.txt en instructions système
```

Et créer le profil de convention `conventions/angular-22.profile.json`
(`@Service`, `inject()`, Signal Forms…). Aucune convention Angular n'est codée
en dur dans les scripts.

### D1 — Emplacement des outils SEOS : **dépôt tiers publié** (décidé)

Les schémas et outils SEOS vivent dans un **dépôt tiers publié**, consommé comme
dépendance versionnée. Ce monorepo n'en contient aucune copie — il déclare une
dépendance sur une version. Le profil de convention, lui, reste **dans ce
monorepo** (il est spécifique au dépôt).

Conséquence à outiller : la version du dépôt SEOS est épinglée (catalog ou
dépendance directe), et sa montée de version suit le même contrôle de relecture
que le reste du socle.

### Si le pattern ne tient pas sur Angular 22 : **adapter, jamais revenir en arrière**

Règle de projet : **on ne revient jamais à Angular 21.** Si un archétype ne
tient pas sur Angular 22, on adapte le pattern — concrètement, on met à jour le
profil de convention et/ou le contrat d'archétype concerné, on régénère
l'exemplaire de référence, et on revalide 106/106. L'écart Angular 22 devient
une entrée du profil, pas un motif de recul.

---

## Phase 03 — Mesure de couverture des patterns

**Phase de mesure, peu coûteuse, et le seul chemin vers un chiffrage honnête.**
Aujourd'hui les patterns sont prouvés sur 6 unités ; le projet en compte 53.

### Étapes

**03.1 — Exécuter le mineur sur le projet source**

```bash
node <seos>/tools/extract-pattern.js
```

L'outil découvre les entités par signal structurel et calcule la fréquence
d'apparition de chaque chemin normalisé.

**03.2 — Vérifier chaque entité contre le schéma**

```bash
for entite in <les 53>; do
  node <seos>/tools/check-pattern.js <module> "$entite"
done
```

**03.3 — Classer**

| Classe      | Définition                         | Traitement en Phase 07                                           |
| ----------- | ---------------------------------- | ---------------------------------------------------------------- |
| Conforme    | 106/106 ou écart documenté         | Génération directe                                               |
| Proche      | Écart mineur, réductible           | Génération + ajustement du profil / contrat                      |
| Hors schéma | Ne relève d'aucun pattern existant | **Extraction d'un nouveau pattern** (jamais de reprise manuelle) |

**03.4 — Extraire un troisième pattern `read-only-view` (décidé)**

`interactive-map`, `monitoring` et `reporting` ne déclarent aucune commande : ce
sont des domaines en lecture seule. Plutôt que de les traiter à la main — ce qui
reviendrait à du code manuel, interdit
([ADR-0010](../adr/0010-flux-de-generation-assistee-par-ia.md)) — on **extrait
un troisième pattern `read-only-view`** avec `extract-pattern.js`, sur le
sous-corpus en lecture seule que le mineur isole déjà.

Ce pattern a son propre schéma canonique (sans la branche commands/handlers du
CRUD), ses propres archétypes et son propre exemplaire de référence validé. Une
fois extrait et validé sur un domaine, les deux autres se génèrent.

### Critère de sortie

Un tableau des 53 entités classées, ajouté à
[l'analyse du projet source](./analyse-du-projet-source.md), et un chiffrage de
la Phase 07 fondé dessus.

### Ce que la mesure peut révéler

| Couverture | Conséquence sur le plan                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| > 80 %     | Le plan tient tel quel                                                                                                     |
| 40–80 %    | Extraire davantage de patterns pour couvrir les entités « proches »                                                        |
| < 40 %     | Le cadrage est à revoir — soit enrichir fortement les patterns, soit reconsidérer l'approche générative pour cette portion |

---

## Phase 04 — Adaptation des générateurs au monorepo

**La phase la plus incertaine, et l'objectif de recherche du projet SEOS.**

Les générateurs produisent `src/presentation/pages/{MODULE}/`, une arborescence
d'application unique. Le monorepo attend des packages `libs/*` portant leur
`package.json` et leurs dépendances déclarées en `workspace:*`
([ADR-0004](../adr/0004-graphe-de-dependances-declarees.md)).

C'est exactement la généralisation que `besoin-reformule-SEOS.md` (§4.4) désigne
comme deuxième cible de validation : passer d'une structure applicative à une
**structure organisationnelle** différente.

### Étapes

**04.1 — Découpage : une lib par couche et par module (décidé)**

Un module donne **une bibliothèque par couche** — soit, pour un module CRUD,
quatre à cinq packages :

```
libs/<module>/domain          @cmz/<module>-domain        type:domain
libs/<module>/data            @cmz/<module>-data          type:data
libs/<module>/application      @cmz/<module>-application   type:application
libs/<module>/ui              @cmz/<module>-ui            type:ui
libs/<module>/feature         @cmz/<module>-feature       type:feature
```

Les 106 fichiers canoniques se répartissent déjà en `application` 31, `domain`
26, `infrastructure` 23, `presentation` 21, `di` 4 — le découpage suit cette
répartition naturelle. Les frontières deviennent **réellement opposables** par
le graphe Nx et les règles ESLint
([ADR-0004](../adr/0004-graphe-de-dependances-declarees.md)) : `domain` ne peut
importer personne, `feature` peut importer les couches inférieures, jamais
l'inverse.

Contrepartie assumée : ~72 packages pour les 18 modules, plus le socle. C'est le
prix de frontières imposées plutôt que documentées — et la structure `apps/` +
`libs/` a été choisie pour l'absorber. Le générateur produisant les
`package.json`, la multiplication n'est pas un coût manuel.

**04.2 — Un adaptateur monorepo, pas un fork des générateurs
([ADR-0011](../adr/0011-adaptation-monorepo-par-post-traitement.md))**

Décision prise après lecture du générateur (1 984 lignes) et de la structure
d'imports du module de référence : **on ne forke pas les générateurs.** On écrit
**un adaptateur** (`tools/seos-adapter/`) qui post-traite la sortie de n'importe
quel générateur SEOS — un seul outil pour les 4 patterns.

L'adaptateur :

1. **distribue** les dossiers de couche dans les libs de couche (table couche →
   lib de l'ADR-0011) ;
2. **réécrit** les imports alias en imports de package, par AST (ts-morph) et
   non par regex : `@presentation/pages/<m>/domain/…` → `@cmz/<m>-domain`,
   `@shared/domain/…` → `@cmz/shared-domain`, etc. ;
3. **émet** `package.json` (deps internes en `workspace:*`, socle en `catalog:`)
   et `project.json` (tags `type:domain`…`type:feature`) par lib.

La lecture a confirmé que le découpage tient : les imports du module de
référence expriment déjà les dépendances de couche dans le sens Clean
Architecture (`application` → `domain`, `di` → tout).

**04.3 — Ordre du pipeline**

`check-pattern` s'exécute **avant** distribution (il valide le pattern sur la
sortie plate, pas la disposition monorepo) ; l'adaptateur distribue ensuite. Pas
besoin de modifier `check-pattern.js` ni `check-semantics.js` — ils gardent leur
chemin de module plat, appliqué à la sortie intermédiaire.

```
générer (plat) → check-pattern 106/106 → adapter (distribue + réécrit + émet) → tsc/build/graph
```

### Critère de sortie

L'adaptateur transforme la sortie d'un générateur en libs qui :

```bash
bun install                                  # résout les workspace:*
bunx nx build <lib>                          # compile
bunx nx graph                                # dépendances attendues, aucune autre, acyclique
bun run check:versions                       # aucune violation
```

le tout après un `check-pattern` à 106/106 sur la sortie plate intermédiaire.

### Risque principal

Le risque s'est **déplacé** du générateur (intact, éprouvé) vers l'adaptateur
(neuf, mais isolé et testable). La réécriture d'imports par AST est déterministe
; le point à surveiller est un couplage circulaire entre couches qui rendrait le
graphe cyclique — détecté par `nx graph`, et relevant alors du découpage du
pattern concerné, pas de l'adaptateur.

---

## Phase 05 — Socle transverse

584 fichiers TypeScript : `shared/domain` 129, `shared/data` 50,
`shared/application` 5, `shared/components` 351, `core/` 28, divers 21.

Plus de 3 300 imports du projet source pointent vers `shared/*` : **rien ne peut
être reconstruit avant**.

### Ce que la cartographie a établi (mesuré)

Contrairement aux entités (couches proprement en pile), le `shared/` du projet
source a des dépendances **circulaires et inversées**. Mais la mesure les réduit
à peu de chose :

| Constat                                      | Mesure                                                                             |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| Cycle `domain → data`                        | **1 fichier** (`domain/enums/priority-level.enum.ts` importe un DTO de `data`)     |
| Cycle `domain → components`                  | **1 fichier** (`domain/services/history-data-parser.ts`)                           |
| Back-references `shared → @pages`            | 20 fichiers, **tous dans `shared/components`** (widgets) ; le kernel en est exempt |
| Back-references `shared → @core`             | 10 fichiers                                                                        |
| Sous-espaces feuilles (0 dépendance interne) | `constants`, `interface`, `class`                                                  |
| `core` → `shared`                            | 16 (bon sens ; core dépend de shared, pas l'inverse)                               |

**Une fois les 2 fichiers relocalisés, le kernel est un DAG propre :**
`constants·interface·class` (feuilles) ← `domain` ← `data` ← `application`.

### Le découpage qui en découle : kernel d'abord, composants ensuite

| Sous-phase              | Contenu                                                            | Fichiers | Débloque                                                                       |
| ----------------------- | ------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------ |
| **05a — Kernel**        | `domain`, `data`, `application`, `constants`, `interface`, `class` | **200**  | Les couches `domain`/`data`/`application` de **toutes les entités** (Phase 07) |
| **05b — Composants UI** | `shared/components` (48 widgets) + `directives`                    | **352**  | Seulement la couche `ui` des entités                                           |
| **05c — Core**          | `core/`                                                            | 28       | Configuration, guards, intercepteurs                                           |

**Le point décisif : la sous-phase 05a (200 fichiers) suffit à débloquer la
reconstruction des entités** aux couches domain/data/application. Les 352
fichiers de composants (05b) ne bloquent que la couche `ui` — ils sont
parallélisables et non critiques pour valider le pipeline entité.

### Packages cibles (05a — kernel)

| Package                   | Source                    | Tag                | Dépend de                  |
| ------------------------- | ------------------------- | ------------------ | -------------------------- |
| `@cmz/shared-constants`   | `constants` + `interface` | `type:util`        | (rien)                     |
| `@cmz/shared-domain`      | `domain` + `class`        | `type:domain`      | shared-constants           |
| `@cmz/shared-data`        | `data`                    | `type:data`        | shared-domain              |
| `@cmz/shared-application` | `application`             | `type:application` | shared-domain, shared-data |

Les composants (05b) donneront `@cmz/shared-ui`, `core` (05c) donnera
`@cmz/core`.

### Dépendances métier

Elles arrivent **ici** et non plus tôt : `shared/components` en est le principal
consommateur, et rien ne sert d'installer PrimeNG avant d'avoir un composant qui
l'utilise.

| Famille      | Paquets                                                              |
| ------------ | -------------------------------------------------------------------- |
| État         | `@ngrx/store`, `effects`, `entity`, `signals`, `router-store`        |
| UI           | `primeng`, `@primeng/themes`, `primeicons`, `primeflex`, `bootstrap` |
| i18n         | `@ngx-translate/core`, `http-loader`                                 |
| Cartographie | `ol`                                                                 |
| Documents    | `exceljs`, `file-saver`, `pdfmake`                                   |
| Divers       | `quill`, `apexcharts`, `sweetalert2`, `date-fns`, `jwt-decode`       |

Chacune est ajoutée **au catalog** au moment de son introduction
([ADR-0005](../adr/0005-versions-du-socle.md)) — un paquet métier installé en
version libre dans un package est exactement ce que `check:versions` refuse.

Ne pas reprendre en bloc les 60 dépendances du projet source : n'installer que
ce qu'un package consomme réellement. Le `package.json` source contient des
dépendances manifestement inutilisées (`i`, `chalk`, `commander`,
`replace-json-property`).

### Étapes (05a — kernel)

**05a.1 — Casser les 2 cycles.** Relocaliser les 2 fichiers mal placés :
`priority-level.enum.ts` (le DTO qu'il référence rejoint le domaine, ou l'enum
cesse d'y référer) et `history-data-parser.ts` (vers `application` ou une lib
dédiée). Vérifier ensuite que le kernel est acyclique.

**05a.2 — Produire les 4 libs kernel**, dans l'ordre du DAG (`constants` →
`domain` → `data` → `application`). Chaque lib compile et passe `nx graph` avant
la suivante.

**05a.3 — Résoudre les back-references `@core` du kernel** (10 fichiers) : soit
le concept a sa place dans le kernel, soit c'est un couplage à inverser. Aucun
ne doit subsister vers `@pages` (le kernel en est déjà exempt).

### Critère de sortie (05a)

```bash
bunx nx run-many -t build --projects=tag:scope:shared   # les 4 libs kernel compilent
bunx nx graph                                            # acyclique
# puis : une entité générée+adaptée dont domain/data/application build vert
```

Le vrai critère de sortie de 05a : **une entité (couches
domain/data/application) compile**, c'est-à-dire que les `@cmz/shared-*` que
l'adaptateur a produits en Phase 04 résolvent enfin.

### Comment le kernel est produit — décision à prendre

Le kernel est un **one-off** : il n'a pas d'exemplaire de référence validé
106/106 comme les 53 entités, et ce n'est pas _N instances d'une même forme_
mais un ensemble hétérogène (value-objects, hiérarchies d'erreurs, bus
générique, DTO, types). Extraire un « pattern » d'un one-off aurait peu de sens.

Deux voies, à trancher (voir la question posée à la fin de la Phase 05) :

- **Voie A — Transformer le source par l'adaptateur.** `shared` est déjà
  structuré en couches ; l'adaptateur (ADR-0011), étendu pour traiter
  `@shared/<couche>` comme interne, le distribue en libs et réécrit les imports.
  Le contenu reste le code réel, éprouvé, du source ; la transformation est
  **déterministe et scriptée** (donc « aucun code manuel »). La normalisation
  aux conventions Angular 22 (`@Service`…) se fait par une passe séparée pilotée
  par le profil.
- **Voie B — Générer le kernel par l'IA sous contrats d'archétype.** Aligné sur
  la génération, applique les conventions nativement, mais l'hétérogénéité du
  kernel impose de nombreux archétypes pour un objet unique — coût élevé,
  bénéfice moindre que pour des entités répétées.

Dans les deux cas : **aucun code écrit à la main**, et le résultat passe le
portail de validation
([ADR-0010](../adr/0010-flux-de-generation-assistee-par-ia.md)).

### Dépendances métier — en 05b, pas en 05a

Le kernel (05a) n'a besoin que d'`@angular/*`, `rxjs`, `tslib`. Les paquets
métier (NgRx, PrimeNG, `ol`, `exceljs`…) n'arrivent qu'avec les composants UI
(05b) : inutile d'installer PrimeNG avant d'avoir un composant qui l'utilise.
Chacun est ajouté **au catalog** à son introduction
([ADR-0005](../adr/0005-versions-du-socle.md)), et seulement s'il est réellement
consommé — le `package.json` source contient des dépendances mortes (`i`,
`chalk`, `commander`, `replace-json-property`).

---

## Phase 06 — Qualité, tests, CI, déploiement

### Étapes

**06.1 — ESLint et frontières**

Règle `@nx/enforce-module-boundaries` appuyée sur les tags de la Phase 04 :

```
type:domain      → ne dépend de rien
type:data        → domain
type:application → domain, data
type:ui          → domain, constants
type:feature     → toutes les couches
app              → feature
```

C'est ce qui rend l'architecture **opposable** plutôt que documentaire.

**06.2 — Stylelint** — repris du projet source.

**06.3 — Vitest** ([ADR-0008](../adr/0008-outillage-de-tests.md)) via
`@angular/build:unit-test`.

**06.4 — Playwright** — réécriture, pas migration : Protractor est abandonné
depuis Angular 12.

**06.5 — Configuration runtime**
([ADR-0007](../adr/0007-configuration-runtime.md)) — reprendre
`generate-env.js`, avec les trois corrections : valeurs hors du dépôt, fichier
généré réellement ignoré, validation au démarrage.

**06.6 — Docker**

Contrainte connue : le hook `preinstall` impose de copier `tools/` **avant**
l'installation.

```dockerfile
COPY package.json bun.lock ./
COPY tools/ ./tools/
RUN bun install
COPY . .
```

**06.7 — CI**

Rejouer les mêmes contrôles que les hooks — sinon `--no-verify` suffit à tout
contourner. Node aligné sur `engines` (le projet source déclarait Node 18 pour
un projet Angular 21 : ne pas reproduire).

```bash
bun run check:all
bun run format:check
bunx nx affected -t lint test build
```

**06.8 — Nx Cloud**

`bunx nx connect` — nécessite un compte, revient au propriétaire du dépôt.

### Critère de sortie

Un pipeline qui passe de bout en bout sur une branche, et une image Docker qui
démarre avec une configuration injectée.

---

## Phase 07 — Reconstruction des domaines

**La phase la plus lourde**, et la seule dont le volume dépend d'une mesure qui
n'a pas encore été faite (Phase 03).

### Séquencement

| Lot    | Contenu                                                                 | Parallélisable                 |
| ------ | ----------------------------------------------------------------------- | ------------------------------ |
| Pilote | 1 entité de `administrative-infrastructure`                             | Non — valide la méthode        |
| Lot 1  | `authentication` (3 opérations, pattern `action-request`)               | Non — valide le second pattern |
| Lot 2  | Domaines conformes, du plus petit au plus grand                         | **Oui**                        |
| Lot 3  | Domaines « proches »                                                    | Oui                            |
| Lot 4  | Hors schéma : `interactive-map`, `monitoring`, `reporting`, et le reste | Oui                            |

**La parallélisation est réelle, pas théorique** : 12 domaines sur 18 n'ont
aucune dépendance vers un autre domaine, et les 6 restants totalisent 16
imports.

`content-management` (637 fichiers, 19 composants, 16 % de la base) est traité
en dernier et probablement découpé.

### Boucle par entité

1. Générer les fichiers canoniques dans les packages de couche (squelette
   déterministe, zéro IA).
2. **Injecter le contenu métier par l'IA, sous contrat d'archétype** — jamais à
   la main ([ADR-0010](../adr/0010-flux-de-generation-assistee-par-ia.md)).
   Chaque fichier est rempli selon son archétype : rôle DDD/CQRS + règle
   mécanique + profil de convention Angular 22 + exemplaire de référence + les
   données métier issues du projet source.
3. `tsc --noEmit` → 0 erreur.
4. ESLint + frontières → 0 erreur.
5. `check-pattern.js` → 106/106 (structure).
6. `check-semantics.js` → 0 erreur (bugs mécaniques).
7. **Web Codegen Scorer** → score au-dessus du seuil retenu.
8. `nx build`, tests Vitest.
9. `nx graph` : dépendances attendues, **et aucune inattendue**.
10. Revue humaine du **contenu métier uniquement** — la seule chose que les
    outils ne peuvent pas juger.

### Le piège central — et comment le traiter

Le schéma `crud-entity` l'écrit lui-même : ces vérifications couvrent la
**conformité structurelle**, pas le contenu sémantique. Il renvoie à **neuf
expériences** où des déviations réelles ont été trouvées malgré 100 % de
conformité. 106/106 signifie que les bons fichiers existent au bon endroit — pas
que l'entité fonctionne.

Le problème, formulé précisément : un fichier peut être une classe, une
fonction, un injectable ou non ; son contenu dépend de plusieurs paramètres. Il
n'existe pas **une** structure de contenu unique. La réponse est de ne pas en
chercher une, mais de **typer chaque fichier par son archétype** et de donner à
chaque archétype son propre prompt contraint.

**Contrats d'archétype.** Les 106 fichiers ne relèvent que d'une quinzaine
d'archétypes. Chacun porte :

| Élément du contrat      | Rôle                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Rôle DDD/CQRS           | Ce que le fichier fait dans l'architecture (ex. un `use-case` orchestre, ne valide pas) |
| Règle mécanique         | Invariant vérifiable (ex. tout appel repository dans `defer()`)                         |
| Profil de convention    | Décorateurs et API de la version Angular courante (`@Service`, `inject()`…)             |
| Exemplaire de référence | Le fichier correspondant du module validé 106/106                                       |
| Prompt structuré        | Force l'IA à ne remplir que le **contenu métier**, dans une forme fixée                 |

Le prompt n'est pas libre : c'est un gabarit qui impose les bonnes pratiques
(niveau entreprise) et n'ouvre qu'un trou de forme connue. L'IA n'invente jamais
le squelette — il est déterministe — elle ne fournit que la logique métier que
seul le projet source connaît.

**Élargir la couverture des bugs — par processus, pas par devinette.**
`check-semantics.js` couvre 9 familles aujourd'hui, chacune née d'un bug réel.
La règle est stricte :

> Tout bug trouvé (revue humaine de l'étape 10, ou incident) devient un test qui
> échoue, puis une règle mécanique ajoutée à `check-semantics.js`. On n'ajoute
> jamais une règle sans un bug réel à son origine.

La couverture croît ainsi de façon monotone et justifiée. Chaque entité migrée
peut donc _renforcer_ le portail pour les suivantes — le système apprend de ses
propres erreurs au lieu de les répéter.

**L'étape 10 n'est pas optionnelle.** Le portail réduit le champ à vérifier
manuellement au strict contenu métier, mais ne l'élimine pas.

### Traitement des 16 imports inter-domaines

Chacun est examiné individuellement : soit il révèle un concept qui a sa place
dans `shared/`, soit un couplage à supprimer. Ne pas les reproduire
mécaniquement.

---

## Phase 08 — Vérification fonctionnelle

### Trois niveaux, du moins coûteux au plus coûteux

**08.1 — Structurel.** `nx graph` sur l'ensemble : aucune dépendance imprévue,
aucun cycle, frontières ESLint respectées.

**08.2 — Fonctionnel.** Parcours principal de chaque domaine rejoué à
l'identique sur les deux applications, avec les mêmes données. C'est le seul
niveau qui détecte une règle de gestion mal reportée.

**08.3 — Non-régression.** Suite Playwright sur les parcours critiques,
constituée au fil de la Phase 07 et non à la fin.

### Critère de sortie du projet

- Tous les domaines migrés selon les critères de la Phase 07.
- `bunx nx run-many -t lint test build` passe sur l'intégralité du monorepo.
- Suite Playwright verte sur les parcours critiques.
- Aucun écart fonctionnel non documenté par rapport à l'application source.
- Application déployée sur un environnement de recette et validée.

---

## Décisions

| #   | Décision                                        | Statut                                                           |
| --- | ----------------------------------------------- | ---------------------------------------------------------------- |
| D1  | Emplacement des outils SEOS                     | ✅ Dépôt tiers publié                                            |
| D2  | Une lib par domaine ou par couche               | ✅ Par couche **et** par module (~72 packages)                   |
| D4  | Sort des 3 domaines en lecture seule            | ✅ Extraction d'un pattern `read-only-view`                      |
| D5  | Cadrage IA officiel Angular + Nx                | ✅ [ADR-0010](../adr/0010-flux-de-generation-assistee-par-ia.md) |
| D3  | Découpage de `shared/components` (351 fichiers) | ⏳ À trancher en Phase 05, une fois son contenu inventorié       |

## Ce qui rendrait ce plan caduc

Trois hypothèses le sous-tendent. Chacune est testée tôt et à faible coût —
c'est délibéré.

| Hypothèse                                   | Testée en | Si fausse                                                                                         |
| ------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| Les patterns tiennent sur Angular 22        | Phase 02  | **Adapter le pattern** (profil de convention + contrat d'archétype) — jamais revenir à Angular 21 |
| La couverture des patterns est élevée       | Phase 03  | Extraire les patterns manquants (dont `read-only-view`), pas de reprise manuelle                  |
| Les générateurs sont adaptables au monorepo | Phase 04  | Générer puis transformer, ou refondre le générateur                                               |

L'ordre des phases est construit pour que **la découverte d'une hypothèse fausse
coûte le moins cher possible** : les deux phases de mesure passent avant les
deux phases lourdes.

## Règles de projet transverses

Ces règles s'appliquent à **toutes** les phases :

1. **Aucun code manuel.** Le flux est : données → patterns/scripts → IA sous
   contrat → validation. Y compris `shared/` et les correctifs.
2. **Approbation avant toute installation de bibliothèque.** Chaque `bun add` /
   `npx … add` est soumis à validation explicite.
3. **Recherche documentaire officielle avant chaque nouvelle stack.** Avant
   d'entamer Angular, React, Rust, Spring, Kotlin, Swift…, parcourir la
   documentation officielle et les sources crédibles pour installer le cadrage
   IA (skills, MCP, règles) de cette stack. Cf.
   [ADR-0010](../adr/0010-flux-de-generation-assistee-par-ia.md).
4. **Conventions externalisées.** Aucune convention de framework codée en dur
   dans un générateur — tout passe par un profil de convention versionné.
5. **Jamais de recul de version pour contourner un pattern.** On adapte le
   pattern.

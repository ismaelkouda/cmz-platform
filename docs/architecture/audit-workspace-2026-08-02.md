# Audit workspace — revue architecte senior (2026-08-02)

- **Périmètre :** intégralité du monorepo — 137 fichiers `.md` (dont 98 propres au
  projet, 39 issus de la skill `angular-developer`), 72 `project.json`,
  2 630 fichiers `.ts` dans `libs/`, configuration Nx / ESLint / TypeScript,
  workflows CI, outillage `tools/`, 781 paires de corpus.
- **Méthode :** mesure directe. Chaque constat est reproductible par une
  commande, exécutée pendant l'audit. Aucun constat n'est déduit d'une
  déclaration de la documentation.
- **Posture :** l'objectif n'est pas de valider les règles que le projet s'est
  données, mais de vérifier si ces règles **sont réellement appliquées par une
  machine**. Une règle non instrumentée n'est pas une règle : c'est une
  intention.
- **Prédécesseur :** [`audit-workspace-2026-07-27.md`](./audit-workspace-2026-07-27.md).
  Ses 9 constats ont été **vérifiés un par un** ; 7 sont clos (§0).

---

## 0. Suivi de l'audit précédent — vérifié, pas supposé

| #   | Constat 2026-07-27                        | État 2026-08-02 | Preuve                                              |
| --- | ----------------------------------------- | :-------------: | --------------------------------------------------- |
| 1   | Docs racine désynchronisées               |   ⚠️ **Rouvert** | Nouvelle désynchronisation, autre nature (§P0-4/P1-9)|
| 2   | 0 test sur 678 fichiers                   |   🔧 Partiel     | 58 spec / 2 630 = 2,2 % ; 14 modules à zéro (§P0-5) |
| 3   | Code mort `form-errors.helper.ts` × 3     |   ✅ Clos        | `grep getControlError` → 0 occurrence               |
| 4   | `createdAt` mappé puis inaccessible       |   ✅ Clos        | Getters présents dans les 2 entités                 |
| 5   | Refactor `PageNumber` en suspens          |   ✅ Clos        | 0 occurrence, arbre de travail propre               |
| 6   | `nx-welcome.ts` orphelin                  |   ✅ Clos        | Fichier supprimé                                    |
| 7   | Commentaire Transloco erroné              |   ✅ Clos        | 0 occurrence de « Transloco » dans le code          |
| 8   | `messageKey` dynamique non marqué         |   ✅ Clos        | —                                                   |
| 9   | Ré-export « pour override futur »         |   ✅ Clos        | Supprimé avec #3                                    |

**Lecture.** Ce projet clôt ses constats. C'est rare et c'est le principal actif
de gouvernance du dépôt. Les deux constats non clos sont précisément les deux
seuls qui demandaient un **changement de système** (instrumentation, discipline
documentaire continue) plutôt qu'une correction ponctuelle — c'est le motif
central de cet audit.

---

## 1. Compréhension du projet — ce que disent les 98 documents

### 1.1 Objectif réel, à trois niveaux

Le dépôt se présente comme la reconstruction d'un back-office. C'est le niveau
le moins intéressant, et ce n'est pas le vrai objectif.

| Niveau | Objectif                                                                                                                       | Preuve documentaire                                       |
| :----: | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| **1** | Reconstruire `cmz-backoffice-frontend` (53 entités, 18 domaines) en Angular 22 / Nx 23 / Bun 1.3, découpé en 4 couches         | `README.md`, `feuille-de-route.md`                        |
| **2** | Valider industriellement **SEOS** — un « compilateur d'architecture logicielle » : boucle MDE + LLM fermée par un oracle strict | `LLM_CONTEXT.md` §1.2, ADR-0009, ADR-0010                 |
| **3** | Produire un **corpus annoté** de paires `legacy → cible Nx 4 couches` pour entraîner une synthèse neurosymbolique (« Méthode 2 ») | `LLM_CONTEXT.md` §5, `docs/architecture/corpus/README.md` |

**Conséquence architecturale, souvent perdue de vue.** Au niveau 3, le livrable
n'est pas l'application : **c'est le corpus, et sa fiabilité**. Or la valeur
d'un corpus d'entraînement est exactement égale à la sévérité de l'oracle qui
l'a validé. Un corpus de 781 paires validé par un oracle faible est pire qu'un
corpus de 100 paires validé par un oracle fort : il enseigne des erreurs à
grande échelle et avec confiance.

C'est le fil rouge de tout ce qui suit. **Les constats P0 ne portent pas sur le
code : ils portent sur l'oracle.**

### 1.2 Le système de règles que le projet s'est donné

Sept mécanismes, cohérents entre eux, tous documentés :

1. **Isolation à deux axes orthogonaux** — `type:*` (couche) × `scope:*`
   (module), encodés en tags Nx et en `depConstraints` ESLint.
2. **Graphe de dépendances déclaré** (ADR-0004) — chaque package déclare ses
   dépendances en `workspace:*` ; le graphe implicite ne fait pas foi.
3. **Version unique par catalog bun** (ADR-0005) — aucun package ne redéclare
   une version.
4. **Nommage mécanique** (`conventions/nommage.md`) — `<métier>.<archétype>.ts`,
   un fichier = un symbole, dossiers au pluriel (exception `dto/` assumée).
5. **Contrats d'archétype** (`contracts/*.contract.md`, 20 fichiers) — le prompt
   de génération est *assemblé*, jamais libre : contrat + profil de convention +
   données métier.
6. **Oracle de vérification** — `build` + `eslint --max-warnings=0` +
   `ngc --strictTemplates` + `corpus --verify`.
7. **Documentation vivante sans journal** (`docs/README.md`) — « un document
   décrit ce qui est vrai aujourd'hui ; quand une information devient fausse,
   elle est corrigée ou le fichier est supprimé ».

**Ce corpus de règles est d'un niveau réellement Meta/Google.** La règle 7 en
particulier — l'interdiction explicite du journal append-only, justifiée par un
échec passé — est une maturité documentaire que la plupart des grandes équipes
n'atteignent pas.

**Le problème n'est pas le référentiel. C'est son exécution mécanique.**

### 1.3 Diagnostic central

> Sur les 7 règles ci-dessus, **3 sont appliquées par une machine à chaque PR**
> (3, 4 partiellement, 5). Les 4 autres — dont les deux plus structurantes,
> l'isolation (1) et l'oracle (6) — reposent sur la discipline humaine, ou sont
> instrumentées sur un périmètre bien plus étroit que ce que la documentation
> affirme.

Un monorepo Meta/Google se juge à une seule question : *que se passe-t-il si un
ingénieur qui n'a lu aucun de ces 130 documents ouvre une PR qui viole une
règle ?* Aujourd'hui, dans la majorité des cas : **la CI est verte.**

---

## 2. Ce qui tient — mesuré pendant l'audit

Sans ces points, la sévérité du §3 n'aurait aucun sens : le socle est solide.

| Vérification                             | Commande                                                             | Résultat                            |
| ---------------------------------------- | -------------------------------------------------------------------- | ----------------------------------- |
| **0 violation de frontière**             | `eslint "libs/**/*.ts"` (règle `enforce-module-boundaries`)           | **0 erreur** sur 2 630 fichiers     |
| **Code de production strict-clean**      | `tsc --strict` sur l'ensemble de `libs/`                              | **0 erreur** hors `.spec.ts`        |
| **Compilation nominale**                 | `tsc --noEmit` par lib (config du dépôt)                              | **0 erreur** sur les 71 libs        |
| **Zéro échappatoire de typage**          | `grep any / @ts-ignore / eslint-disable`                              | **0 occurrence** dans `libs/`       |
| **Zéro dette annotée**                   | `grep TODO / FIXME / HACK`                                            | **0 occurrence**                    |
| **Tags Nx complets**                     | 72 `project.json`                                                     | **72/72** portent `scope:` + `type:` |
| **Composition root propre**              | `app.config.ts` — 16 `provide<Module>()`, ports → adaptateurs         | conforme au pattern Ports & Adapters |
| **Aucun artefact versionné**             | `git ls-files` sur `dist/`, `.angular/`, `.nx/`                       | **0 fichier**                       |
| **Catalog respecté**                     | `check-catalog-usage.mjs` en `pre-push` + CI                          | opérationnel                        |

Deux points méritent d'être soulignés, parce qu'ils sont contre-intuitifs :

- **Les frontières sont respectées alors même que rien ne les vérifie** (§P0-2).
  L'isolation `scope × type` tient par discipline, sur 2 630 fichiers. C'est un
  résultat remarquable — et exactement pour cette raison, l'instrumenter coûte
  aujourd'hui **zéro correction** : la barrière peut être levée sans dette.
- **Le code de production passe déjà `--strict`** (§P0-3). Les 39 erreurs
  mesurées sont **toutes** dans des `.spec.ts`. Là aussi : la barrière peut être
  levée à coût quasi nul, et ce coût ne fera qu'augmenter.

> **Fenêtre de tir.** Les deux durcissements les plus structurants de cet audit
> sont gratuits **aujourd'hui**. Ils ne le seront plus dans 10 modules.

---

## 3. Constats

### P0 — l'oracle ne couvre pas ce qu'il prétend couvrir

#### P0-1 · L'oracle par package couvre 26,5 % du code

`LLM_CONTEXT.md` §4 et `CLAUDE.md` posent comme non négociable :
« Aucun module ou fichier n'est réputé terminé sans `bunx nx run-many -t build` ».

Mesure : **39 des 71 libs n'ont aucun target `build`.**

| Périmètre                  | Libs   | Fichiers `.ts` | Part      |
| -------------------------- | -----: | -------------: | --------: |
| Avec target `build`        | **32** |        **694** | **26,5 %** |
| **Sans aucun target**      | **39** |      **1 924** | **73,5 %** |

Les 39 libs non couvertes incluent **la totalité du kernel** — `shared/domain`,
`shared/data`, `shared/application`, `shared/ui`, `shared/browser`,
`shared/constants`, `@cmz/core` — c'est-à-dire précisément le code dont
dépendent les 17 autres modules. Également non couverts : `content-management`
(459 fichiers), `coverage-areas` (317), `administrative-boundary` (249),
`settings-security` (197), `team-organization` (170).

`nx run-many -t build` sur ce workspace exécute donc 32 tâches et en passe 39
sous silence — **sans avertissement**, puisque Nx ignore simplement les projets
sans le target demandé.

> **Le mode package-based existe pour garantir qu'un package compile isolément.**
> Cette garantie est aujourd'hui absente pour les trois quarts du dépôt, dont le
> noyau. La documentation affirme une propriété que l'outillage ne vérifie pas.

#### P0-2 · `enforce-module-boundaries` n'est appliqué à aucune lib

`nx.json` :

```json
"plugins": [{ "plugin": "@nx/eslint/plugin",
              "options": { "targetName": "lint" },
              "include": ["apps/backoffice-angular/**/*"] }]
```

Conséquence mécanique : **aucune lib ne possède de target `lint`** (vérifié sur
les 72 `project.json` : seul `backoffice-angular` en a un). Le gate CI
`bunx nx affected -t lint --max-warnings=0` ne lint donc **que l'application**,
soit 25 fichiers sur 2 655.

La règle `@nx/enforce-module-boundaries` — 253 lignes de `depConstraints`,
l'invariant central de toute l'architecture, celui que `LLM_CONTEXT.md` appelle
« Règles d'or d'Isolation » — **n'est évaluée sur aucun des 2 630 fichiers
qu'elle est censée contraindre.**

Preuve directe de l'angle mort, exécutée pendant l'audit :

```
$ eslint "libs/**/*.ts" --max-warnings=0
  libs/interactive-map/data/.../interactive-map.repository.impl.ts
    15:5   warning  'InteractiveMapReportApiDto' is defined but never used
  libs/interactive-map/ui/.../interactive-map-ol-view.component.ts
    123:13 warning  Forbidden non-null assertion
    137:17 warning  Forbidden non-null assertion
  ✖ 3 problems (0 errors, 3 warnings) → exit 1
```

**La commande documentée dans `CLAUDE.md` échoue. La CI est verte.** Un module
livré et audité « Meta 12/12 » (`interactive-map`, clôturé le 2026-08-01) porte
3 warnings que le gate déclaré aurait rejetés.

Note : `--max-warnings=0` est passé à `nx affected`, pas à `eslint`. Nx ne
propage pas ce flag aux exécuteurs inférés — le drapeau est probablement inopérant
même sur l'application.

#### P0-3 · `strict: false` à la racine — la dette mesurée est de 39 erreurs, toutes dans des tests

`tsconfig.base.json` ligne 16 : `"strict": false`.

Les 71 `tsconfig.json` de libs se réduisent tous à
`{ "extends": "../../../tsconfig.base.json", "include": ["src/**/*.ts"] }` :
**aucun ne relève le niveau**. Seul `apps/backoffice-angular/tsconfig.json`
pose `strict: true` + `noImplicitOverride` + `noImplicitReturns` +
`noPropertyAccessFromIndexSignature` + `strictTemplates`.

Le workspace applique donc **deux régimes de typage** :

| Périmètre                   | Fichiers | Régime          | Vérifié à chaque PR             |
| --------------------------- | -------: | --------------- | ------------------------------- |
| `apps/backoffice-angular`   |       25 | strict complet  | oui                             |
| `libs/**` (dont le kernel)  |    2 630 | **non strict**  | 26,5 %, en non-strict (§P0-1)   |

Mesure de la dette réelle (`tsc --strict` sur l'ensemble de `libs/`) :

| Périmètre                | Erreurs `--strict` |
| ------------------------ | -----------------: |
| Code de production       |          **0**     |
| Fichiers `.spec.ts`      |         **39**     |
| **Total**                |         **39**     |

Répartition : `processing/data` 15, `requests/data` 12, `finalization/data` 12.
Nature : `TS2322`/`TS2345` sur des fixtures de mappers (littéraux `'abi'`,
`'sms'` non élargis vers `ReportTypeDto`/`ReportSourceDto`, et
`PaginatedResponseDto<T>` incomplet). **Ce sont des fixtures à typer, pas des
bugs.**

> Le passage à `strict: true` coûte **39 corrections mécaniques dans 3 libs**, et
> **zéro** dans le code de production. Ce chiffre ne sera plus jamais aussi bas.

#### P0-4 · La Phase 08 a deux définitions incompatibles dans quatre documents

| Document                        | Date       | Phase 08 =                                                |
| ------------------------------- | ---------- | --------------------------------------------------------- |
| `plan-d-execution.md` §597       | 2026-07-21 | **Vérification fonctionnelle** vs l'application source     |
| `feuille-de-route.md`            | 2026-07-31 | **Vérification fonctionnelle** — « ⏳ Non démarrée »       |
| `generation-from-patterns.md`    | 2026-08-01 | **Génération depuis patterns** — « zéro code métier main » |
| `LLM_CONTEXT.md` §5              | 2026-08-01 | **Génération depuis patterns** — « Phase active 08 »       |

Ce ne sont pas deux formulations d'une même chose : **vérifier** une application
livrée et **générer** du code sans intervention humaine sont deux activités
distinctes, avec des critères de sortie disjoints. Et la vérification
fonctionnelle — le seul gate qui garantirait l'équivalence comportementale avec
le legacy — **a disparu de la feuille de route sans ADR de remplacement**.

Aggravant : `feuille-de-route.md` maintient Phase 07 « 🔧 En cours — 18 modules »
alors que `LLM_CONTEXT.md`, `etat-du-socle.md` et `STATUS.md` la déclarent
clôturée au 2026-08-01.

`docs/README.md` pose pourtant la règle : *« Aucun journal historique. Un
document décrit ce qui est vrai aujourd'hui. »* La règle existe ; rien ne la
vérifie.

#### P0-5 · Couverture de tests 2,2 % — et 14 modules sur 18 à zéro

ADR-0008 acte Vitest + Playwright comme décision ferme. État réel :

| Indicateur                          | Valeur                          |
| ----------------------------------- | ------------------------------- |
| Fichiers `.ts` dans `libs/`         | 2 630                           |
| Fichiers `.spec.ts`                 | **58** → **2,2 %**              |
| Modules avec ≥ 1 test               | **4 / 18** (workflow-action)    |
| Modules à **0 test**                | **14 / 18**                     |
| Kernel `shared` (182 fichiers)      | **0 test**                      |
| Libs avec un target `test`          | **12 / 71**                     |
| Fichiers Playwright / e2e           | **0** — ADR-0008 jamais honoré  |

Concentration : 58 tests sur 4 modules (`requests` 17, `finalization` 16,
`processing` 16, `report-states` 9). **Les 14 autres modules — 2 065 fichiers —
n'ont aucune vérification comportementale**, dont le kernel dont tout dépend.

L'audit du 2026-07-27 l'avait déjà écrit : `tsc`, `eslint` et `ngc` vérifient
des **types**, jamais un **comportement**. Neuf mois de discipline de typage ne
disent rien de la justesse d'un mapper.

**Enjeu de niveau 3 (§1.1).** Chaque paire du corpus est estampillée « validée »
par un oracle qui n'exécute rien. Le corpus enseignera des formes correctes et
des comportements non vérifiés.

#### P0-6 · La « source de vérité métier » est un chemin sur un poste de travail

`CLAUDE.md` et `LLM_CONTEXT.md` §4.2 citaient un **chemin absolu machine**
(`…/cmz-backoffice-frontend`), aussi en fallback dans `emit-pairs.mjs` et les
deux `sync-*-pattern.mjs`, et dans ~15 documents.

Conséquences (au 2026-08-02) :

- Le mode `--verify` complet du corpus — le seul qui confronte réellement la
  cible au legacy — **ne peut s'exécuter que sur un poste**. La CI utilise
  `--oracle-only`, qui ignore le legacy : le gate corpus de la CI **ne vérifie
  pas la correspondance au legacy**.
- Aucun autre ingénieur, ni aucun agent, ne peut reproduire une validation.
- Le référentiel n'est ni versionné ni figé : rien ne garantit que le legacy lu
  le 2026-07-23 est celui lu le 2026-08-01. **Le corpus n'est pas reproductible.**

> Pour un projet dont le livrable de niveau 3 est un jeu de données scientifique,
> la non-reproductibilité de la source est le défaut le plus grave de cet audit.

**Remédiation partielle (B-1 / B-2, 2026-08-02) :** fallback machine supprimé ;
`SEOS_LEGACY_ROOT` obligatoire hors `--oracle-only` ; docs purgés vers
`$SEOS_LEGACY_ROOT`. Restent B-3…B-6 (legacy figé, `legacy_ref`, job
`corpus-full`, ADR `--oracle-only`).

---

### P1 — dette réelle, non bloquante

#### P1-7 · 32 dépendances utilisées mais non déclarées — ADR-0004 non instrumenté

ADR-0004 fait du graphe **déclaré** (`workspace:*`) la source de vérité. Audit
des imports réels vs `package.json` : **32 arêtes manquantes sur 22 libs.**

| Lib                          | Manquant                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `communication/ui`           | **`@cmz/administrative-boundary-domain`**, `@cmz/shared-domain`               |
| `requests/ui`                | `@angular/common`, `@angular/forms`, `@angular/router`, `@cmz/requests-domain`, `rxjs` |
| `finalization/ui`            | `@angular/forms`, `@angular/router`, `@cmz/finalization-domain`, `rxjs`       |
| `processing/ui`              | `@angular/forms`, `rxjs`                                                     |
| `report-states/ui`           | `@angular/forms`, `@cmz/shared-application`                                  |
| `interactive-map/ui`         | `@cmz/shared-application`                                                    |
| `{content-management, dashboard, settings-security, team-organization}/ui` | `@cmz/shared-domain`           |
| 12 libs `workflow-action`    | `vitest` (non déclaré alors que 58 specs l'importent)                        |

Le cas le plus notable : **`communication/ui` → `administrative-boundary-domain`**.
C'est le **seul couplage inter-domaines du monorepo**, longuement justifié en
commentaire dans `eslint.config.mjs` (17 lignes, décision datée du 2026-07-28).
Cette exception, si soigneusement documentée côté ESLint, **n'existe pas dans le
graphe déclaré**. Elle est donc invisible à `nx affected`, à `nx graph`, et à
toute analyse d'impact.

Rien ne vérifie la complétude du graphe : `check-catalog-usage.mjs` contrôle la
*dérive de version*, pas la *complétude*.

**Remédiation (D-1…D-3 / D-6, 2026-08-02) :** `tools/check-declared-deps.mjs` +
`bun run check:declared-deps` en guardrails ; 39 arêtes déclarées (dont
`communication/ui` → `@cmz/administrative-boundary-domain` et `vitest` en
devDependencies des libs workflow-action concernées). D-6 : réciproque
« déclaré sans import » — 21 arêtes fantômes retirées (`rxjs` orphelin, etc.).

#### P1-8 · Le seul gate strict est nocturne et non bloquant

`ngc --strictTemplates` est le seul mécanisme qui type-vérifie les libs en mode
strict (via `tsconfig.app.json`, `strict: true`, qui tire les libs par les
`paths`). Il ne tourne que dans `nightly-integration.yml` : `cron 0 3 * * *`,
sans `pull_request`.

Chaîne de conséquences :

1. Une régression stricte introduite dans une lib **passe le gate PR** (§P0-1,
   §P0-3 : `tsc --noEmit` non strict, sur 26,5 % du code).
2. Elle est mergée sur `main`.
3. Elle est détectée **jusqu'à 24 h plus tard**, par un job qui ne bloque rien.
4. À ce stade, `main` est rouge et plusieurs PR sont bâties dessus.

C'est l'inversion exacte du principe *shift-left*. Le gate le plus fort du
projet s'exécute au moment où son échec coûte le plus cher.

#### P1-9 · Chiffres et états contradictoires entre les documents d'entrée

| Fait                    | `README.md`       | `LLM_CONTEXT.md` | `etat-du-socle.md`     | `feuille-de-route.md` | `STATUS.md` | Réel        |
| ----------------------- | ----------------- | ---------------- | ---------------------- | --------------------- | ----------- | ----------- |
| Date de mise à jour     | 2026-07-28        | 2026-08-01       | 2026-08-01             | 2026-07-31            | 2026-08-01  | 2026-08-02  |
| Modules livrés          | « 4+ »            | 18               | 18                     | 18                    | 18          | **18**      |
| Phase active            | 07                | 08               | 08                     | **07**                | —           | —           |
| Bundle initial          | —                 | ~861 kB          | **~221 kB**            | —                     | —           | budget 1 Mo |
| Packages Nx             | —                 | —                | —                      | —                     | 71          | **72**      |

`README.md` — la porte d'entrée du dépôt — annonce « 4+ modules » alors qu'il y
en a 18, et « Phase 07 » alors qu'elle est close. `etat-du-socle.md` annonce un
bundle de 221 kB, soit **4× moins** que la valeur du workflow nightly (856 kB).

C'est la récidive du constat #1 de l'audit précédent, sous une autre forme :
corrigé une fois manuellement, jamais instrumenté, donc revenu.

**Remédiation (E-4 / E-5 / E-8, 2026-08-02) :** `generate-status.mjs` injecte les
blocs chiffrés via marqueurs `BEGIN:GENERATED` ; job `docs-freshness`. Bundle :
source unique [`bundle-metrics.json`](../../apps/backoffice-angular/bundle-metrics.json)
mesurée par `bun run bundle:record` après build production (**861,18 kB** initial
raw) — plus de 221 / 856 / 861 concurrents.

#### P1-10 · « Points ouverts » de `etat-du-socle.md` périmés

| Point ouvert déclaré                          | Réalité mesurée                                             |
| --------------------------------------------- | ----------------------------------------------------------- |
| « Contrôles non rejoués en CI » → Phase 06     | `ci.yml` rejoue les 4 garde-fous depuis le 2026-07-29        |
| « `nx-welcome.ts` à retirer »                  | Supprimé (audit précédent, #6)                              |
| « Nx Cloud non activé »                        | Toujours vrai — aucun `nxCloudId` dans `nx.json`            |
| « `Dockerfile` copiant `tools/` »              | Toujours vrai — **aucun `Dockerfile` dans le dépôt**        |
| « `CODEOWNERS` à peupler »                     | Toujours vrai — un seul propriétaire (§P1-13)               |

Un tableau où 2 lignes sur 5 sont fausses cesse d'être un tableau de suivi.

**Remédiation (E-7, 2026-08-02) :** « Contrôles non rejoués en CI » et
`nx-welcome.ts` retirés de `etat-du-socle.md` ; Nx Cloud / Dockerfile /
CODEOWNERS (et 2 autres encore ouverts) datés **2026-08-02**.

#### P1-11 · Duplication byte-identique entre modules

Fichiers strictement identiques (empreinte MD5) dans `libs/` :

| Fichier                                   | Copies | Modules concernés                                                                                     |
| ----------------------------------------- | -----: | ----------------------------------------------------------------------------------------------------- |
| `ui/src/lib/stores/form-mode.type.ts`     | **6**  | administrative-boundary, administrative-infrastructure, content-management, coverage-areas, settings-security, team-organization |
| `ui/src/lib/adapters/action-item.factory.ts` | **3** | administrative-boundary, administrative-infrastructure, coverage-areas                                 |
| `vite.config.ts`                          | **12** | 12 libs des 4 modules `workflow-action`                                                               |

Les deux premiers sont du code applicatif transverse qui a sa place dans
`@cmz/shared-ui`. C'est **le même motif que le constat #3 de l'audit précédent**
(helper transverse recopié au lieu d'être partagé) : corrigé une fois, réapparu
ailleurs, parce que rien ne le détecte.

`knip` est configuré et branché en CI — mais avec `continue-on-error: true`, et
knip détecte le code *mort*, pas le code *dupliqué*.

#### P1-12 · `tsconfig.base.json` cible ES2015

```json
"target": "es2015", "lib": ["es2020", "dom"], "module": "esnext"
```

L'application relève à `es2022` / `module: preserve` ; les 71 libs restent en
`es2015`, cible de 2015 pour un framework de 2026. Effets : down-leveling inutile
des `async/await`, `Object.entries`/`Array.flat` absents des types, divergence
sémantique entre le régime de compilation des libs et celui de l'application.

`moduleResolution: "bundler"` avec `module: "esnext"` est par ailleurs une
combinaison non alignée (`preserve` est attendu). TypeScript 6.0.3 signale déjà
`baseUrl` comme déprécié — la base tsconfig demandera une revue avant TS 7.

#### P1-13 · Gouvernance : CODEOWNERS mono-propriétaire

`.github/CODEOWNERS` : `*  @ismaelkouda`, sur toutes les zones, y compris le
socle. Le fichier documente lui-même le problème (« ⚠️ À COMPLÉTER »).

Conséquence : **aucune séparation de relecture**. L'auteur des ADR, du kernel, de
l'outillage corpus et des modules est aussi le seul relecteur possible. Sur un
projet dont le livrable est un corpus scientifique, l'absence de second regard est
un risque de validité, pas seulement d'organisation.

Complément absent : aucune protection de branche déclarée, aucun `required
status check` documenté. Rien ne garantit que `ci.yml` doive être vert pour
merger.

#### P1-14 · Dérive entre le script `corpus:ci` et le job CI

| Source                       | Modules vérifiés                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `package.json` → `corpus:ci` | processing, requests, finalization, report-states, monitoring, reporting, **dashboard**, **interactive-map** (8) |
| `.github/workflows/ci.yml`   | processing, requests, finalization, report-states, monitoring, reporting (**6**)                    |

Les deux modules clôturés le 2026-08-01 — `dashboard` et `interactive-map` — sont
dans le script, absents du workflow. **Leurs 53 paires de corpus ne sont vérifiées
par aucune PR.** Le job réplique les commandes à la main au lieu d'appeler
`bun run corpus:ci` : la duplication a divergé en un jour.

**Remédiation (B-7 / B-8, 2026-08-02) :** le job `corpus` appelle
`bun run corpus:ci` — une seule source de vérité ; `dashboard` et
`interactive-map` sont de nouveau dans le périmètre PR.

#### P1-15 · `tools/mock-server.mjs` — 3 939 lignes, 136 ko en un fichier

Le mock-server est l'infrastructure sur laquelle repose tout le développement et
toute la validation manuelle. C'est le plus gros fichier du dépôt, et il concentre
dans un seul module les routes des 18 domaines.

Un dépôt qui impose « un fichier = un symbole exporté » à son code applicatif
(`conventions/nommage.md`) et tolère un monolithe de 3 939 lignes dans son
outillage applique deux standards. `check-file-weight.mjs` contrôle le poids des
fichiers *ajoutés* — celui-ci est déjà là.

#### P1-16 · ADR-0012 absent des deux index

`docs/adr/0012-strategie-cross-framework.md` existe, statut `Accepted`, daté du
2026-07-22. Il n'apparaît **ni** dans `docs/README.md` **ni** dans
`docs/adr/README.md`, qui s'arrêtent tous deux à 0011.

**Remédiation (E-6, 2026-08-02) :** `tools/generate-adr-index.mjs` génère les
deux tables depuis `docs/adr/NNNN-*.md` (marqueurs `BEGIN:GENERATED:adr-index`) ;
branché sur `generate:status` + `docs-freshness`.

C'est une décision structurante (i18next vs Transloco, abandon de PrimeNG du
kernel, pattern Ports & Adapters) invisible depuis les deux points d'entrée. Le
processus ADR est excellent ; son index n'est pas généré, donc il dérive.

#### P1-17 · Configuration runtime inline dans `index.html`

ADR-0007 acte une configuration « injectée à l'exécution ». `APP_CONFIG` lit
`window.__env` via une factory `providedIn: 'root'` — mécanisme correct. Mais
`window.__env` est **écrit en dur dans `src/index.html`**, avec un commentaire
« En prod : injectée par le déploiement » qui décrit une intention sans support :
aucun `Dockerfile`, aucun script d'entrypoint, aucun `env.template.js` dans le
dépôt.

En l'état, l'application est buildée avec une configuration DEV figée. La factory
lève `Error('Configuration runtime "__env" absente.')` si le déploiement oublie
l'injection — un échec au démarrage, sans repli ni diagnostic.

---

### P2 — cosmétique et hygiène

#### P2-18 · `type:browser` est un cul-de-sac dans les `depConstraints`

`shared/browser` porte `type:browser`. La règle `sourceTag: 'type:browser'`
définit ce dont il peut dépendre — mais **aucune autre règle ne liste
`type:browser`** dans ses `onlyDependOnLibsWithTags`. Seul `type:app` (joker
`'*'`) peut donc l'atteindre.

C'est correct par accident (les adaptateurs navigateur ne doivent effectivement
être branchés qu'au composition root) mais non intentionnel : rien ne le dit, et
un futur `type:ui` voulant l'utiliser recevrait une erreur ESLint sans
explication.

**Remédiation (D-5, 2026-08-02) :** `type:app` liste explicitement
`type:browser` (plus de `*`) ; ADR-0003 §5c + `application-scope.md` documentent
la réservation au composition root.

#### P2-19 · `contracts/README.md` sous-déclare son propre contenu

« _Domaine terminé. À compléter au fil des couches data/ui/application (facade,
pipe, constant, bases de mappers)_ » — or `facade.contract.md`, `pipe.contract.md`
et `constant.contract.md` **existent** et sont listés dans le tableau juste
au-dessus. Le paragraphe de synthèse n'a pas suivi le tableau.

**Remédiation (E-9, 2026-08-02) :** synthèse alignée ; `constant` ajouté au
tableau ; reste ouvert = `component` / `route` (H-4).

#### P2-20 · `STATUS.md` : libellés de compteurs imprécis

« Packages Nx (project.json) : 71 » compte les libs seules (72 avec
`backoffice-angular`). « Fichiers TypeScript dans libs/ : 2572 » exclut
silencieusement les 58 `.spec.ts` (2 630 au total). Les nombres sont justes, les
libellés ne le disent pas — et `STATUS.md` est la source citée par les autres
documents.

**Remédiation (E-10, 2026-08-02) :** résumé STATUS = « **71 libs + 1 app** »,
« **2 572 fichiers hors tests** (2 630 au total) » via `generate-status.mjs`.

#### P2-21 · Le rehaussement de budget n'est pas tracé

Le commit `ec93fe8 fix(build): relever budget initial à 2 MB — Tier 2 prod
bloquant` indique un budget porté à 2 Mo pour débloquer la CI. `project.json`
affiche aujourd'hui `maximumWarning: 900kb / maximumError: 1mb`. Le
va-et-vient n'est documenté nulle part, et le commentaire du workflow nightly
(« ~856 kB ») ne correspond à aucune des deux valeurs.

Relever un budget pour faire passer un gate est une décision d'architecture. Ici,
elle vit uniquement dans un message de commit.

**Remédiation (E-8 / E-11 / E-12, 2026-08-02) :** chiffre bundle unique dans
`bundle-metrics.json` (861,18 kB). Politique de plafonds :
[ADR-0016](../adr/0016-politique-budget-bundle.md). Règle documentaire dans
[`docs/README.md`](../README.md) : tout chiffre affirmé = généré ou vérifié en
CI.

---

## 4. Backlog exhaustif — actions à mener

Effort : **S** ≤ 2 h · **M** ≤ 1 j · **L** ≤ 1 sem · **XL** > 1 sem.
Ordre = ordre d'exécution recommandé (les dépendances sont explicitées).

### Chantier A — Refermer l'oracle (P0-1, P0-2, P0-3, P1-8)

> **À faire en premier, et dans cet ordre.** Le coût mesuré aujourd'hui est de
> 39 corrections de fixtures et 3 warnings. Chaque module livré ensuite l'augmente.

| #    | Action                                                                                                                                      | Réf.  | Effort |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----- | :----: |
| A-1  | Retirer `include: ["apps/backoffice-angular/**/*"]` du plugin `@nx/eslint` dans `nx.json` → target `lint` inféré sur les 72 projets           | P0-2  |   S    |
| A-2  | Corriger les 3 warnings `interactive-map` (1 import inutilisé, 2 `non-null assertion`)                                                        | P0-2  |   S    |
| A-3  | Vérifier `bunx nx run-many -t lint` vert sur 72/72, puis passer `--max-warnings=0` **au lint executor** (pas à `nx affected`, qui l'ignore)   | P0-2  |   S    |
| A-4  | Ajouter un target `build` (`tsc --noEmit -p <lib>/tsconfig.json`) aux **39 libs** qui n'en ont pas — générer, ne pas écrire à la main         | P0-1  |   M    |
| A-5  | Écrire `tools/check-project-targets.mjs` : échec si un `project.json` de lib n'a pas `build` **et** `lint`. Brancher en CI `guardrails`       | P0-1  |   S    |
| A-6  | Typer les 39 fixtures `.spec.ts` (`processing/data` 15, `requests/data` 12, `finalization/data` 12) : élargir `'abi'`/`'sms'`, compléter `PaginatedResponseDto<T>` | P0-3 | M |
| A-7  | Basculer `tsconfig.base.json` → `strict: true`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch` — **après A-6**       | P0-3  |   S    |
| A-8  | Aligner `target: es2022`, `module: preserve`, `lib: ["es2022","dom"]` ; retirer `baseUrl` (déprécié TS 6) — vérifier par un `build` complet   | P1-12 |   S    |
| A-9  | Supprimer les surcharges devenues redondantes dans `apps/backoffice-angular/tsconfig.json` (héritées de la base après A-7/A-8)                | P1-12 |   S    |
| A-10 | Déplacer `ngc --strictTemplates` du nightly vers le job `oracle` de `ci.yml` (bloquant en PR)                                                 | P1-8  |   S    |
| A-11 | Conserver en nightly les seuls builds `development` + `production` (coûteux, non bloquants pour le typage)                                    | P1-8  |   S    |
| A-12 | Ajouter un test négatif de non-régression : PR jetable violant une frontière `scope:` → doit être **rouge**                                   | P0-2  |   S    |

**Critère de sortie du chantier A**

```bash
bunx nx run-many -t lint  --all   # 72/72 projets, 0 warning
bunx nx run-many -t build --all   # 72/72 projets, strict:true, 0 erreur
bunx ngc -p apps/backoffice-angular/tsconfig.app.json --noEmit   # en PR
```

### Chantier B — Reproductibilité du corpus (P0-6)

> Bloquant pour l'objectif de niveau 3. Sans ce chantier, le corpus n'est pas un
> jeu de données scientifique.

| #   | Action                                                                                                                              | Réf.  | Effort |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ----- | :----: |
| B-1 | Supprimer le fallback `/Users/macbookair/...` de `emit-pairs.mjs` et des 2 `sync-*-pattern.mjs` → `SEOS_LEGACY_ROOT` **obligatoire**, échec explicite sinon | P0-6 | S |
| B-2 | Purger les 15 documents citant le chemin absolu → remplacer par `$SEOS_LEGACY_ROOT`                                                  | P0-6  |   S    |
| B-3 | Figer le legacy : sous-module Git, ou `legacy.lock.json` portant `{ repo, commit, date }` — **décision à arbitrer**                  | P0-6  |   M    |
| B-4 | Enregistrer le SHA legacy dans chaque paire émise (`pair.schema.json` → champ `legacy_ref`)                                          | P0-6  |   M    |
| B-5 | Ajouter un job CI `corpus-full` (sur `main`, avec checkout du legacy figé) exécutant `--verify` **sans** `--oracle-only`             | P0-6  |   M    |
| B-6 | Documenter dans un ADR : mode `--oracle-only` = vérification **structurelle**, pas de correspondance legacy. Le nommer sans ambiguïté | P0-6  |   S    |
| B-7 | Faire appeler `bun run corpus:ci` par le job `corpus` au lieu de dupliquer 6 commandes → supprime la classe de dérive P1-14          | P1-14 |   S    |
| B-8 | Réintégrer `dashboard` et `interactive-map` dans la vérification corpus en PR (résolu par B-7)                                       | P1-14 |   S    |

### Chantier C — Vérification comportementale (P0-5)

> Le plus lourd, et le seul qui donne un sens au mot « validé ».

| #   | Action                                                                                                                            | Réf.  | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ----- | :----: |
| C-1 | Arbitrer et **écrire un ADR** : seuil de couverture minimal par couche (proposition : mappers 100 %, entités/VO 90 %, facades 80 %, UI hors périmètre unitaire) | P0-5 | S |
| C-2 | Ajouter un target `test` aux **59 libs** qui n'en ont pas (générer, cf. A-4/A-5)                                                    | P0-5  |   M    |
| C-3 | **Tester le kernel `shared/` en priorité absolue** — 182 fichiers, 0 test, consommé par 17 modules                                  | P0-5  |   L    |
| C-4 | Tester les mappers des 14 modules sans test — surface la plus dense en logique et la plus mécanique à couvrir                       | P0-5  |   XL   |
| C-5 | Activer la couverture Vitest (`--coverage`), publier le rapport en artefact CI                                                      | P0-5  |   S    |
| C-6 | Ajouter un gate de non-régression de couverture (la couverture ne peut pas baisser sur une PR)                                     | P0-5  |   M    |
| C-7 | Honorer ADR-0008 pour l'e2e : installer Playwright, 1 parcours critique par famille d'archétype (4 parcours)                        | P0-5  |   L    |
| C-8 | Retirer `continue-on-error: true` du job `dead-code` une fois `knip` stabilisé                                                      | P1-11 |   S    |

### Chantier D — Intégrité du graphe de dépendances (P1-7)

| #   | Action                                                                                                                          | Réf.  | Effort |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ----- | :----: |
| D-1 | Écrire `tools/check-declared-deps.mjs` : tout import externe d'une lib doit figurer dans son `package.json`. Brancher en `guardrails` | P1-7 | M |
| D-2 | Déclarer les 32 arêtes manquantes — **en priorité `communication/ui` → `@cmz/administrative-boundary-domain`**, le seul couplage inter-domaines | P1-7 | S |
| D-3 | Déclarer `vitest` en `devDependencies` des 12 libs `workflow-action`                                                             | P1-7  |   S    |
| D-4 | Vérifier après D-2 que `nx graph` fait apparaître l'arête `communication → administrative-boundary`                              | P1-7  |   S    |
| D-5 | Ajouter une règle `depConstraints` explicite autorisant `type:app` → `type:browser`, et documenter que `shared/browser` est réservé au composition root | P2-18 | S |
| D-6 | Étendre `check-declared-deps.mjs` à la réciproque : dépendance déclarée mais jamais importée (recouvre partiellement `knip`)     | P1-7  |   S    |

### Chantier E — Documentation exécutable (P0-4, P1-9, P1-10, P1-16, P2-19, P2-20)

> Principe directeur : **tout chiffre présent dans un document doit être généré,
> ou vérifié par la CI.** `generate-status.mjs` prouve que l'équipe sait le faire ;
> il faut étendre le mécanisme.

| #   | Action                                                                                                                     | Réf.        | Effort |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ----------- | :----: |
| E-1 | **Trancher la définition de la Phase 08** — génération, vérification fonctionnelle, ou deux phases distinctes (08 + 09)      | P0-4        |   S    |
| E-2 | Écrire un **ADR-0013** actant l'arbitrage E-1, et le sort de la vérification fonctionnelle vs legacy                        | P0-4        |   S    |
| E-3 | Propager E-1 dans `feuille-de-route.md`, `plan-d-execution.md`, `LLM_CONTEXT.md`, `generation-from-patterns.md`             | P0-4        |   S    |
| E-4 | Générer les blocs de chiffres de `README.md`, `LLM_CONTEXT.md` §5 et `etat-du-socle.md` depuis `generate-status.mjs` (marqueurs `<!-- BEGIN:GENERATED -->`) | P1-9 | M |
| E-5 | Ajouter un job CI `docs-freshness` : `generate-status.mjs` puis `git diff --exit-code` → doc périmée = CI rouge             | P1-9        |   S    |
| E-6 | Générer `docs/adr/README.md` et la table ADR de `docs/README.md` depuis `docs/adr/*.md` — supprime la classe P1-16          | P1-16       |   S    |
| E-7 | Purger le tableau « Points ouverts » de `etat-du-socle.md` : retirer les 2 lignes fausses, dater les 3 restantes            | P1-10       |   S    |
| E-8 | Réconcilier le chiffre de bundle (221 kB / 856 kB / 861 kB) sur une valeur unique, générée par le build                     | P1-9, P2-21 |   S    |
| E-9 | Corriger le paragraphe de synthèse de `contracts/README.md` (facade/pipe/constant existent)                                | P2-19       |   S    |
| E-10| Corriger les libellés de `STATUS.md` : « 71 libs + 1 app », « 2 572 fichiers hors tests (2 630 au total) »                  | P2-20       |   S    |
| E-11| Documenter la politique de budget de bundle dans l'ADR de build ; interdire le rehaussement sans justification écrite       | P2-21       |   S    |
| E-12| Ajouter à `docs/README.md` une règle : **tout document affirmant un chiffre doit être généré ou vérifié en CI**             | P1-9        |   S    |

### Chantier F — Factorisation et hygiène (P1-11, P1-15)

| #   | Action                                                                                                            | Réf.  | Effort |
| --- | ------------------------------------------------------------------------------------------------------------------- | ----- | :----: |
| F-1 | Remonter `form-mode.type.ts` (× 6) dans `@cmz/shared-ui`, supprimer les 6 copies                                   | P1-11 |   S    |
| F-2 | Remonter `action-item.factory.ts` (× 3) dans `@cmz/shared-ui`, supprimer les 3 copies                              | P1-11 |   S    |
| F-3 | Factoriser les 12 `vite.config.ts` identiques via `tools/vitest-lib.config.ts` (déjà présent, sous-utilisé)        | P1-11 |   S    |
| F-4 | Ajouter un détecteur de duplication (`jscpd` ou empreinte MD5) en CI, non bloquant d'abord, puis bloquant          | P1-11 |   M    |
| F-5 | Découper `tools/mock-server.mjs` (3 939 l.) en un module par domaine + un routeur                                  | P1-15 |   L    |
| F-6 | Étendre `check-file-weight.mjs` à un plafond de **lignes** par fichier source, `tools/` inclus                     | P1-15 |   S    |
| F-7 | Auditer les 2 quasi-doublons `*-status-style.enum.ts` (admin-infra / coverage-areas) → factoriser ou justifier     | P1-11 |   S    |

### Chantier G — Gouvernance et opérations (P1-13, P1-17, P1-10)

| #   | Action                                                                                                                 | Réf.  | Effort |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ----- | :----: |
| G-1 | Peupler `CODEOWNERS` par zone (socle / kernel / modules / docs / outillage corpus), même avec des équipes de 1           | P1-13 |   S    |
| G-2 | Activer la protection de branche `main` : `ci.yml` en `required status check`, 1 approbation, pas de force-push          | P1-13 |   S    |
| G-3 | Documenter dans `docs/guides/contribuer.md` que `--no-verify` est contourné par la CI, et que la CI fait foi             | P1-13 |   S    |
| G-4 | Créer le `Dockerfile` (copier `tools/` **avant** `bun install`, contrainte connue du `preinstall`)                       | P1-10 |   M    |
| G-5 | Extraire `window.__env` de `index.html` vers `public/env.js` + `env.template.js` substitué à l'entrypoint conteneur      | P1-17 |   M    |
| G-6 | Ajouter une validation de forme de `AppConfig` au démarrage (clés attendues), avec un diagnostic exploitable            | P1-17 |   S    |
| G-7 | Trancher Nx Cloud : `bunx nx connect`, ou retirer la mention des « points ouverts » et acter le refus dans un ADR        | P1-10 |   S    |
| G-8 | Ajouter la concurrence GitHub Actions (`concurrency: cancel-in-progress`) pour ne pas empiler les runs sur une même PR   | —     |   S    |

**Remédiation G-7 (2026-08-02) :** option connect retenue —
`nxCloudId` écrit dans `nx.json` (`bunx nx connect --generateToken`, remote
`ismaelkouda/cmz-platform`) ; point retiré de `etat-du-socle.md` §Points
ouverts. Claim compte Nx Cloud encore à valider dans le navigateur.

**Remédiation G-8 (2026-08-02) :** `concurrency.cancel-in-progress: true` sur
les 3 workflows (`.github/workflows/{ci,nightly-integration,corpus-full}.yml`).

### Chantier H — Durcir la boucle Generate-Verify-Repair (Phase 08)

> À traiter **après A et B** : générer du code sous un oracle troué industrialise
> le défaut.

| #   | Action                                                                                                                            | Réf.       | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------- | :----: |
| H-1 | Ajouter au pipeline G-V-R un niveau d'oracle **comportemental** (les tests du chantier C), pas seulement structurel                 | P0-5       |   M    |
| H-2 | Faire échouer l'émission d'une paire corpus si le module cible n'a pas `build` + `lint` + `test` verts                              | P0-1, P0-5 |   M    |
| H-3 | Ajouter aux `pattern.json` la contrainte « aucun fichier byte-identique à un fichier d'un autre module » (prévention de F-1/F-2)    | P1-11      |   M    |
| H-4 | Écrire un `contracts/component.contract.md` et un `contracts/route.contract.md` — la couche `ui` est la moins contractualisée       | P2-19      |   M    |
| H-5 | Ajouter au `pair.schema.json` un champ `oracle: { build, lint, test, strict_templates }` horodaté — traçabilité de la validation    | P0-6       |   M    |
| H-6 | Rejouer les 781 paires déjà émises sous l'oracle durci (post-A) et **réémettre** celles qui ne passent plus                        | P0-1..3    |   L    |

**Remédiation H-1 (2026-08-02) :**
[`tools/corpus/oracle-levels.mjs`](../../tools/corpus/oracle-levels.mjs) —
`ensureBehavioralLevel` enrichit tout oracle `:build` avec `:test` si le
projet Nx a un target Vitest ; branché dans `mapping.mjs`,
`read-only-view.mjs`, `dashboard.mjs` ; logs `emit-pairs` par niveau.
`processing --verify --structural-only` : structural=4 behavioral=3, vert.

**Remédiation H-2 (2026-08-02) :**
[`tools/corpus/module-gate.mjs`](../../tools/corpus/module-gate.mjs) —
`assertModuleGate` avant écriture / `--verify` ; échec build|lint|test →
exit 1, JSONL non écrit. Modules sans `targets.test` : ⚠ C-2 non bloquant.

**Remédiation H-3 (2026-08-02) :**
`constraints.no_cross_module_byte_identical_files` dans
[`workflow-action.pattern.json`](../patterns/workflow-action.pattern.json) et
[`read-only-view.pattern.json`](../patterns/read-only-view.pattern.json) ;
`check-duplicate-files.mjs` refuse si la contrainte manque ; gate corpus
appelle `--module=<m>` ; CI `duplicates` + `check:all` bloquants (baseline 0).

---

## 5. Séquencement recommandé

```
Semaine 1   A-1 → A-12          Refermer l'oracle          ← 39 fixtures + 3 warnings
            E-1 → E-3           Trancher la Phase 08       ← décision, pas du code
Semaine 2   B-1 → B-8           Reproductibilité corpus
            D-1 → D-6           Intégrité du graphe
Semaine 3   E-4 → E-12          Documentation générée
            F-1 → F-7           Factorisation
            G-1 → G-8           Gouvernance & ops
Semaine 4+  C-1 → C-8           Vérification comportementale   (chantier de fond)
            H-1 → H-6           Durcir G-V-R                   (après A et B)
```

**Justification de l'ordre.** A et E-1 d'abord parce que leur coût est mesuré,
faible, et **strictement croissant** avec chaque module livré. C en dernier
parce que c'est le seul chantier XL — mais il ne doit pas servir d'excuse pour
retarder A, qui le rendra moins coûteux.

---

## 6. Synthèse — verdict d'architecte

**Ce qui est de niveau Meta/Google, sans réserve :**

- Le référentiel de règles (7 mécanismes, §1.2) et sa justification écrite.
- La discipline de nommage et de séparation des couches : **0 violation de
  frontière sur 2 630 fichiers**, alors même que rien ne les vérifie.
- Le code de production **passe déjà `--strict`** sans une seule correction.
- Zéro `any`, zéro `@ts-ignore`, zéro `eslint-disable`, zéro `TODO`.
- La règle documentaire anti-journal, tirée d'un échec analysé.
- L'audit précédent : 7 constats sur 9 clos et vérifiables.

**Ce qui ne l'est pas :**

- **L'écart entre l'oracle déclaré et l'oracle exécuté.** 26,5 % du code sous
  `build`, 0 % des libs sous `lint`, `strict` seulement en nightly non bloquant.
  La commande de vérification écrite dans `CLAUDE.md` **échoue** aujourd'hui,
  et la CI est verte.
- **La source de vérité métier est un chemin sur un poste de travail.** Pour un
  projet dont le livrable est un corpus scientifique, la non-reproductibilité de
  la source est le défaut le plus grave de cet audit.
- **2,2 % de couverture, 14 modules sur 18 à zéro test**, kernel compris. Le mot
  « validé » apposé à 781 paires de corpus ne recouvre aucune vérification de
  comportement.
- **La documentation se désynchronise plus vite qu'elle n'est corrigée** — parce
  qu'elle est corrigée à la main. La Phase 08 a deux définitions actives.

**Le diagnostic en une phrase :**

> Ce projet a écrit un référentiel d'ingénierie de niveau Big Tech, puis a bâti
> 2 630 fichiers qui le respectent réellement — mais il l'a fait **par
> discipline humaine, pas par contrainte machine**. Le chantier n'est donc pas
> de corriger du code : il est de **transformer chaque règle écrite en barrière
> qui casse la CI**. Et la fenêtre pour le faire à coût quasi nul — 39 fixtures
> de test, 3 warnings, 32 lignes de `package.json` — est **ouverte maintenant**,
> précisément parce que la discipline humaine a tenu jusqu'ici.

---

_Audit conduit le 2026-08-02. Tous les chiffres sont issus de commandes
exécutées sur l'arbre de travail à `06030e9`. Complète — sans le remplacer —
[`audit-workspace-2026-07-27.md`](./audit-workspace-2026-07-27.md)._

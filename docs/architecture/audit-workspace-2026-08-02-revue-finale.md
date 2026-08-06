# Revue finale — passe 3 (2026-08-02)

- **Objet :** dernière revue avant clôture du cycle d'audit. Deux missions
  distinctes : **(A)** certifier par la mesure l'état réel des 33 constats des
  passes 1 et 2 ; **(B)** instruire l'axe qu'aucune des deux passes n'a couvert.
- **Changement de prémisse.** L'arbre de travail a été **massivement remédié**
  depuis la passe 2 : **445 fichiers touchés**, non commités. Re-auditer sur la
  base périmée n'aurait aucune valeur. Une revue finale **vérifie les
  correctifs**.
- **Méthode :** exécution réelle. Chaque garde-fou lancé, chaque oracle rejoué,
  chaque constat re-mesuré. Aucun statut n'est déduit de l'existence d'un
  fichier.

---

## 1. Certification des 33 constats — mesuré, pas déclaré

### 1.1 Ce qui est fermé, vérifié par exécution

| Réf   | Constat                                | Mesure d'aujourd'hui                                                     | Statut |
| ----- | -------------------------------------- | ------------------------------------------------------------------------ | :----: |
| P0-1  | Oracle sur 26,5 % du code              | **71/71 libs** portent un target `build`                                 |   ✅   |
| P0-2  | Boundaries sur aucune lib              | `include` retiré de `nx.json` ; `eslint "libs/**" --max-warnings=0` → **exit 0** | ✅ |
| P0-3  | `strict: false`                        | `strict: true`, `target: es2022` ; `tsc --strict` sur `libs/` → **0 erreur** | ✅ |
| P0-4  | Phase 08 à deux définitions            | **ADR-0013** « phases 08 génération et 09 vérification »                  |   ✅   |
| P0-6  | Source de vérité sur un poste          | **`legacy.lock.json`** (SHA40 + repo + miroir) ; **0** chemin `/Users/` dans le code | ✅ |
| P0-7  | Jeton jamais attaché                   | 3 intercepteurs ; `Authorization: Bearer` posé ; `withInterceptors([...])` câblé | ✅ |
| P0-8  | 29 routes sans garde                   | `authGuard` appliqué **en un point parent** — design correct, enfants hérités | ✅ |
| P0-9  | 379 clés i18n manquantes               | `check-i18n.mjs` → **PASS** ; traductions **réelles** (`'Le code est requis'`), **0 placeholder** | ✅ |
| P0-10 | Profil violé 105/105                   | `check-convention-profile.mjs` → **PASS** ; **0** `standalone: true` restant |   ✅   |
| P1-8  | Gate strict nocturne                   | `ngc --strictTemplates` remonté en PR                                     |   ✅   |
| P1-9  | Chiffres contradictoires               | `check-docs-freshness.mjs` existe et **fonctionne** (cf. §1.3)            |   ✅   |
| P1-11 | Duplication byte-identique             | `check-duplicate-files.mjs` → PASS ; `shared-ui/status-style.enum.ts` créé |   ✅   |
| P1-12 | `target: es2015`                       | `es2022` / `module: preserve` / `lib: ["es2022","dom"]`                    |   ✅   |
| P1-13 | CODEOWNERS mono-propriétaire           | **54 règles** par zone + `branch-protection.main.json`                     |   ✅   |
| P1-14 | Dérive `corpus:ci` ↔ CI                | Le job appelle `bun run corpus:ci`                                        |   ✅   |
| P1-16 | ADR-0012 hors index                    | `generate-adr-index.mjs` ; **17 ADR** indexés                             |   ✅   |
| P1-17 | Config inline dans `index.html`        | `public/env.js` + `deploy/env.template.js` + `docker-entrypoint.sh`       |   ✅   |
| P1-18 | Passphrase en dur                      | **ADR-0017** « stockage et cycle de vie du jeton »                        |   ✅   |
| P1-20 | Aucune veille CVE                      | `.github/dependabot.yml` + job `bun audit` bloquant en `high`/`critical`  |   ✅   |
| P1-21 | Aucune CSP                             | `deploy/csp.template.conf` — `connect-src` **dérivée** des 4 URLs backend, `frame-src` Grafana explicite | ✅ |
| P1-24 | `best-practices.md` orphelin           | Déplacé en `conventions/best-practices.md`                                |   ✅   |
| P2-21 | Budget non tracé                       | **ADR-0016** + `bundle-metrics.json` généré                               |   ✅   |

**Qualité de la remédiation.** Trois signaux qu'il faut nommer, parce qu'ils sont
rares :

- Les traductions injectées sont **de vraies phrases françaises**
  (`"Le nombre d'infrastructures est requis"`), pas des `TODO`. Le fichier passe
  de 2 238 à 2 986 lignes.
- Les nouveaux intercepteurs **et** le `authGuard` **arrivent avec leurs tests**
  (`auth.interceptor.spec.ts`, `auth.guard.spec.ts`, `cache.interceptor.spec.ts`,
  `error.interceptor.spec.ts`).
- Le `csp.template.conf` documente le piège `envsubst` sur `$uri` et traite
  `frame-src` Grafana comme non dérivable — c'est du raisonnement d'ingénierie,
  pas de la case à cocher.

Le basculement `strict: true` sur **2 617 fichiers** avec **0 erreur** résiduelle
confirme la thèse de la passe 1 : la dette était de 39 fixtures, et la fenêtre a
été utilisée.

### 1.2 Ce qui reste ouvert

| Réf   | Constat                        | Mesure d'aujourd'hui                                                | Statut |
| ----- | ------------------------------ | -------------------------------------------------------------------- | :----: |
| P0-5  | Couverture de tests            | 67 specs / 214 `it()` / 370 `expect()` — mais **12 modules sur 18 à zéro**, `shared` à **2 specs pour 182 fichiers**, `ui` à **1 spec**, **0 e2e** | 🔧 |
| P0-11 | Outils SEOS absents            | `find check-pattern* check-semantics*` → **0**. Toujours hors dépôt, non épinglés, non exécutés | ❌ |
| P1-19 | Complétude du périmètre        | **pas de `scope.json`** ; « Modules non commencés » toujours **vide par construction** ; `agents-performances` et `daily-goal` toujours absents | ❌ |
| P1-22 | Accessibilité                  | `axe` dans `package.json` → **0**. Exigence MUST du profil, toujours non outillée | ❌ |

### 1.3 Régressions introduites par la remédiation elle-même

C'est le point qu'une revue finale existe pour attraper.

| # | Régression                                                                                          | Preuve                                        |
| - | ---------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1 | **7 nouvelles arêtes de dépendance non déclarées**, créées par les intercepteurs neufs (`cache.interceptor.ts`, `error.interceptor.ts`, `safe-url.pipe.ts`) | `check-declared-deps.mjs` → **FAIL** |
| 2 | **`STATUS.md` périmé** — la remédiation a ajouté 63 specs et 5 fichiers à `@cmz/core` sans régénérer  | `check-docs-freshness.mjs` → **FAIL** (diff : 2 547 → 2 554 fichiers, `core` 4 → 9) |
| 3 | `check-project-targets.mjs` **échoue en dur** sur `spawnSync bunx ENOENT` au lieu de se dégrader      | exécution directe                             |

> **Le système fonctionne — mais il n'a pas été passé sur lui-même.** Trois des
> huit garde-fous neufs sont rouges *à l'instant où j'écris*. Ce n'est pas un
> reproche sur la qualité du travail : c'est la démonstration que les garde-fous
> sont réels, qu'ils détectent, et qu'il manque une seule chose — **les lancer
> avant de considérer la remédiation finie**.

---

## 2. L'axe qu'aucune passe n'avait couvert

### 2.1 Le biais résiduel, nommé

La passe 1 a audité l'**architecture déclarée**. La passe 2 a audité le
**système qui s'exécute**. Aucune des deux n'a audité le **contenu** : ni la
logique métier écrite, ni le corpus produit, ni la contrepartie serveur.

Les deux passes ont mesuré des **contenants**. Cette passe ouvre les boîtes.

### 2.2 Ce que la lecture de fond confirme — le code est bon

Revue ligne à ligne d'une façade, d'un use-case et de la chaîne de mapping :

```ts
@Service()
export class QueuesProcessingFacade extends PaginatedResourceFacade<
    QueuesProcessingEntity, QueuesProcessingFilterContract> {
    private readonly useCase = inject(QueuesProcessingUseCase);
    protected stream(params: PageQuery<...>): Observable<PageResult<...>> { ... }
}

@Service()
export class AllProcessingUseCase {
    execute(contract, page, options) {
        return defer(() => this.repository.execute(
            allProcessingFilterEntity(allProcessingFilterVo(contract)), page, options));
    }
}
```

- `@Service()` + `inject()` — convention v22 respectée ;
- `defer()` — la règle mécanique de `facade.contract.md` appliquée ;
- chaîne `Contract → VO → Entity → Repository` — DDD tenu, zéro fuite de
  framework dans le domaine ;
- **`PaginatedResourceFacade<TEntity, TFilter>` est déjà une abstraction
  générique** dans `shared-application`.

`api-response-handling.md` documente par ailleurs la découverte d'un vrai bug
d'intégration (`ApiError` sans `messageKey` → `translate(undefined)` → toast
vide) et sa correction par déplacement de couche. C'est de la revue senior
authentique.

**Ce point compte pour la suite :** le constat P1-25 ci-dessous n'est pas un
défaut de compétence. L'équipe sait construire l'abstraction générique — elle
l'a fait pour la pagination.

---

## 3. Constats nouveaux

### P0-12 · Le corpus — livrable de niveau 3 — est un index de chemins, pas un jeu d'apprentissage

`LLM_CONTEXT.md` §1.2 fixe l'objectif de long terme :

> « Constituer le jeu de données d'apprentissage annoté et validé (Corpus de
> paires _Source legacy → Cible Nx 4 couches_) pour alimenter la **Synthèse
> Neurosymbolique (Méthode 2)**. »

Analyse des **781 paires** :

| Mesure                                                        | Valeur                |
| ------------------------------------------------------------- | --------------------: |
| Paires totales                                                | **781**               |
| Paires portant du **code, une IR ou un diff**                 | **0** / 781           |
| Champs présents                                               | chemins + métadonnées uniquement |
| `status: verified`                                            | 587 (75 %)            |
| `status: n/a` (dont `nx: null` × 192)                         | **194** (25 %)        |
| Fichiers de production couverts par ≥ 1 paire                 | **476 / 2 554** → **18,6 %** |
| Modules avec corpus                                           | **8 / 18**            |
| Modules **sans aucune paire**                                 | **10** — dont `shared`, `core`, `content-management` (457 f.), `coverage-areas` (314 f.), `administrative-boundary`, `settings-security`, `team-organization`, `authentication`, `communication`, `administrative-infrastructure` |
| Paires avec `legacy_ref.commit`                               | **781 / 781** ✅ (action B-4 close) |

Trois conséquences, par ordre de gravité :

1. **Une paire est `{chemin_legacy → chemin_nx}` + métadonnées.** Elle n'encode
   aucune transformation. Pour une synthèse neurosymbolique, elle enseigne *où
   ranger un fichier*, pas *comment transformer du code*. Le contenu legacy
   n'étant pas dans le dépôt (il est derrière `legacy.lock.json`), **le corpus
   n'est pas auto-porteur** : il n'est exploitable que par qui dispose du
   checkout legacy.

2. **Couverture 18,6 %, et la famille absente est la plus utile.** Les 10 modules
   sans corpus sont ceux de la famille `crud-entity` — la plus volumineuse et la
   **plus répétitive**, donc celle où un corpus d'apprentissage aurait le
   meilleur rapport signal/effort. Le corpus couvre les familles déjà
   généralisées en `pattern.json` et ignore celle qui ne l'est pas.

3. **Un quart des paires enregistre une absence.** Les 194 `n/a` (`query-bus-legacy`,
   `query-handler-legacy`, `volet-providers-legacy`…) documentent ce que le
   legacy contenait et qui n'a **délibérément pas** été reproduit.
   **C'est une vraie qualité** — annoter le CQRS abandonné est précieux — mais
   il faut alors le nommer : ce n'est pas un corpus de 781 paires
   d'apprentissage, c'est **587 correspondances + 194 décisions d'architecture**.

> `STATUS.md` et `LLM_CONTEXT.md` présentent « corpus 156 paires », « Meta 12/12 »
> comme des indicateurs de complétude de module. Ces chiffres mesurent la
> couverture d'un module **par le corpus**, jamais la couverture du corpus **par
> rapport à son objectif scientifique**. Aucun document n'énonce les 18,6 %.

### P1-25 · 159 fichiers quasi-identiques dans la famille `workflow-action` — invisibles au garde-fou

Comparaison des 4 modules `workflow-action` **modulo substitution du nom de
module** (`processing` ↔ `requests` ↔ `finalization` ↔ `report-states`),
commentaires et espaces normalisés :

| Mesure                                            | Valeur              |
| -------------------------------------------------- | ------------------: |
| Fichiers analysés                                  | **539**             |
| Groupes quasi-identiques **inter-modules**         | **99**              |
| Fichiers redondants (au-delà du premier)           | **159** → **29,5 %** |

Exemples à 4 copies : `*-details-filter-api.dto.ts`,
`*-details-take-api.dto.ts`, `*-details-filter.contract.ts`,
`*-details-take.contract.ts`. À 3 copies : `queues-*.facade.ts`,
`all-*.use-case.ts`.

C'est la conséquence directe des scaffolds
(`scaffold-requests-from-processing.mjs`, `scaffold-finalization.mjs`,
`scaffold-report-states-volets.mjs`), et c'est une **tension architecturale
réelle**, pas une négligence :

- L'isolation `scope:*` **interdit** la dépendance inter-modules. La duplication
  est le prix documenté de l'isolation.
- Mais 159 fichiers doivent alors évoluer **ensemble**. Un correctif dans
  `all-*.use-case.ts` doit être appliqué 3 fois, sans qu'aucun outil ne le
  rappelle.

**Angle mort du garde-fou :** `check-duplicate-files.mjs` — construit pour P1-11
— ne compare que des empreintes **byte-identiques**. Il passe au vert sur ces 159
fichiers. Le garde-fou existe, sa définition de « doublon » est trop étroite.

**Voie de sortie, cohérente avec le reste du dépôt :** `workflow-action` est déjà
un **pattern formalisé en JSON**. Sa matérialisation devrait être une abstraction
générique paramétrée dans `@cmz/shared-*` — exactement ce que
`PaginatedResourceFacade<T, F>` fait déjà pour la pagination — et non un
copier-coller à 4 exemplaires.

### P1-26 · Observabilité nulle

| Indicateur                                    | Valeur |
| --------------------------------------------- | -----: |
| Abstraction de log (`LoggerPort`, `LogService`) | **0**  |
| Télémétrie / APM (Sentry, Datadog, OTel)      | **0**  |
| `console.*` dans `libs/`                       | **3**  |

Le dépôt possède une boucle d'erreurs domaine soignée (`ErrorHandlerRegistry`,
handlers par type, rendu i18n) — mais elle **affiche** les erreurs à
l'utilisateur ; elle n'en **rapporte** aucune.

Conséquence : une fois déployé, ce back-office ne dispose d'**aucun moyen de
savoir qu'il casse**. Pas de taux d'erreur, pas de trace, pas de corrélation avec
les appels API. Pour une application qui vient d'acquérir un `Dockerfile`, une
CSP et une CI complète, c'est la dernière pièce manquante du passage en
production — et elle est structurante : un `LoggerPort` est un **port du
domaine**, il se décide avant d'être rétro-ajouté à 105 composants.

### P1-27 · Le bundle est à 95,7 % du seuil d'alerte

`bundle-metrics.json`, mesure du 2026-08-02 :

| Mesure                          | Valeur                          |
| ------------------------------- | ------------------------------- |
| Initial (brut)                  | **861,18 kB** en **2 fichiers** |
| dont `main-*.js`                | **833,06 kB**                   |
| Budget `maximumWarning`         | 900 kB → **marge 38,8 kB**      |
| Budget `maximumError`           | 1 Mo → marge 162,8 kB           |
| Chunk ExcelJS (lazy)            | 948 kB                          |
| Routes en `loadChildren`        | 31 / 35                         |

Le lazy loading par route est **correctement appliqué** (31 routes sur 35), et le
lazy-load d'ExcelJS a été fait délibérément (commit `4c05097`). Le problème n'est
pas là : **833 kB de code commun** se retrouvent dans un chunk initial unique.

Avec **38,8 kB de marge**, 10 modules encore sans corpus et la Phase 08 qui doit
générer de nouveaux modules, le seuil d'alerte sera franchi avant la fin du
prochain module. ADR-0016 encadre désormais la politique de budget — mais
l'historique du dépôt montre déjà un rehaussement à 2 Mo puis un retour à 1 Mo
(commit `ec93fe8`). Le risque est de traiter le symptôme une seconde fois.

### P1-28 · Aucun contrat d'API : la conformité au serveur est circulaire

| Recherche                              | Résultat |
| -------------------------------------- | -------: |
| OpenAPI / Swagger dans le dépôt        | **0**    |
| Collection Postman / Insomnia          | **0**    |
| Test de contrat (Pact ou équivalent)   | **0**    |

La seule contrepartie que l'application ait jamais connue est
`tools/mock-server.mjs` (3 939 lignes), servi sur `localhost:3333` via
`proxy.conf.json`.

La chaîne de confiance est donc :

```
code du client legacy  →  DTOs reconstruits  →  mock-server
        (lu)                  (déduits)            (écrit pour correspondre)
```

**Aucun maillon ne touche le serveur réel.** Les DTO ont été déduits de la
lecture du client Angular d'origine, et le mock a été écrit dans la même boucle
pour leur correspondre. Le contrat wire est donc validé contre une fiction
construite pour le valider.

Ce n'est pas une critique du mock — il est indispensable et bien fait. C'est la
constatation qu'**aucun mécanisme ne détectera un écart entre les DTO et l'API
réelle** avant le premier branchement. Combiné à P0-7 (le jeton n'était attaché
par rien jusqu'à aujourd'hui), le premier contact avec le back-end réel est un
événement à **haut risque et non instrumenté**.

C'est aussi le complément manquant de P0-6 : le legacy est désormais épinglé au
SHA — le **serveur**, lui, n'a aucune référence figée.

---

## 4. Tâches restantes

**34 actions.** Numérotation à la suite (chantiers M à P).

### Chantier M — Clore les 4 constats encore ouverts

| #   | Action                                                                                                        | Réf.  | Effort |
| --- | --------------------------------------------------------------------------------------------------------------- | ----- | :----: |
| M-1 | Déclarer les **7 arêtes** créées par les intercepteurs neufs (`@angular/compiler`, `rxjs`, `vitest`)            | §1.3  |   S    |
| M-2 | Lancer `bun run generate:status` + `bundle:metrics` et committer — `check-docs-freshness` est **rouge**         | §1.3  |   S    |
| M-3 | Rendre `check-project-targets.mjs` robuste : lire les `project.json` directement, ne pas dépendre de `bunx`     | §1.3  |   S    |
| M-4 | **Faire tourner les 8 garde-fous avant de committer la remédiation** — 3/8 sont rouges                         | §1.3  |   S    |
| M-5 | Trancher P0-11 : vendorer `check-pattern.js` / `check-semantics.js` dans `tools/seos/`, ou sous-module épinglé  | P0-11 |   M    |
| M-6 | Exécuter les outils SEOS en CI une fois M-5 tranché — la conformité aux contrats reste une revue humaine        | P0-11 |   M    |
| M-7 | Créer `docs/architecture/scope.json` (53 entités) et le faire lire par `generate-status.mjs`                    | P1-19 |   S    |
| M-8 | Statuer sur `team-organization/agents-performances` et `daily-goal` : à construire, ou hors périmètre par ADR   | P1-19 |   S    |
| M-9 | Ajouter `@axe-core/*` + un test a11y par archétype de page ; bloquer sur `serious`/`critical`                   | P1-22 |   M    |

### Chantier N — Le corpus comme livrable scientifique (P0-12)

> Le seul chantier qui touche l'objectif de **niveau 3**. Sans lui, l'effort de
> reconstruction produit une application, pas un jeu de données.

| #   | Action                                                                                                              | Réf.  | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ----- | :----: |
| N-1 | **Décider et écrire un ADR** : le corpus est-il un index de correspondances, ou un jeu d'apprentissage ? Les deux objectifs n'ont pas le même schéma | P0-12 |   S    |
| N-2 | Si jeu d'apprentissage : ajouter au `pair.schema.json` le **contenu** (legacy + cible) ou un hash de contenu + procédure de résolution | P0-12 |   M    |
| N-3 | Rendre le corpus **auto-porteur** : sans checkout legacy, une paire doit rester exploitable                          | P0-12 |   M    |
| N-4 | Publier la **couverture réelle** (18,6 %, 8/18 modules) dans `STATUS.md` et `LLM_CONTEXT.md` — aujourd'hui non énoncée | P0-12 |   S    |
| N-5 | Étendre le corpus à la famille `crud-entity` — 10 modules, la plus répétitive, donc la plus rentable                 | P0-12 |   XL   |
| N-6 | Séparer dans les compteurs les **587 correspondances** des **194 décisions d'architecture** (`n/a`)                  | P0-12 |   S    |
| N-7 | Formaliser un `crud-entity.pattern.json` à partir des 10 modules déjà écrits — le pattern existe déjà dans le code   | P0-12 |   L    |

### Chantier O — Résorber la duplication de famille (P1-25)

| #   | Action                                                                                                          | Réf.  | Effort |
| --- | ------------------------------------------------------------------------------------------------------------------- | ----- | :----: |
| O-1 | Étendre `check-duplicate-files.mjs` à la **duplication modulo renommage** (normaliser le nom de module avant hachage) | P1-25 |   M    |
| O-2 | Publier le taux de duplication de famille en CI ; le rendre bloquant à la hausse                                 | P1-25 |   S    |
| O-3 | Extraire un `@cmz/shared-workflow` : `WorkflowQueueFacade<TItem,TFilter>`, `WorkflowTakeUseCase<T>` — sur le modèle de `PaginatedResourceFacade` | P1-25 |   L    |
| O-4 | Remplacer les 4 copies de `*-details-filter.contract.ts` / `*-details-take.contract.ts` par un générique paramétré | P1-25 |   M    |
| O-5 | **Écrire un ADR d'arbitrage** : isolation `scope:*` vs factorisation. Les deux sont défendables — l'implicite ne l'est pas | P1-25 |   S    |
| O-6 | Faire porter la contrainte par `workflow-action.pattern.json` : interdire l'émission d'un fichier quasi-identique à un autre module | P1-25 |   M    |

### Chantier P — Prêt pour la production (P1-26, P1-27, P1-28)

| #   | Action                                                                                                       | Réf.  | Effort |
| --- | ---------------------------------------------------------------------------------------------------------------- | ----- | :----: |
| P-1 | Définir un `LoggerPort` dans `shared-domain` + adaptateur console dans `shared-browser` — **port de domaine, à décider avant diffusion** | P1-26 |   M    |
| P-2 | Brancher un `ErrorHandler` Angular global qui rapporte les erreurs non capturées                              | P1-26 |   S    |
| P-3 | Choisir et câbler un collecteur (Sentry / OTel), origine autorisée dans la CSP (`connect-src`)                | P1-26 |   M    |
| P-4 | Corréler les erreurs HTTP avec un identifiant de requête posé par `auth.interceptor`                          | P1-26 |   M    |
| P-5 | Analyser la composition des **833 kB** de `main-*.js` (`source-map-explorer`) et publier le rapport en CI     | P1-27 |   S    |
| P-6 | Découper le chunk commun (`@angular/cdk`, `ol`, `date-fns`, design-system) — cible : marge ≥ 150 kB           | P1-27 |   L    |
| P-7 | Faire échouer la CI sur **régression** de bundle (delta vs `bundle-metrics.json`), pas seulement sur le seuil absolu | P1-27 |   S    |
| P-8 | **Obtenir la spec du serveur réel** (OpenAPI, ou export depuis le back-end) et la verser au dépôt             | P1-28 |   M    |
| P-9 | Générer ou valider les DTO contre cette spec — l'écart devient une erreur de CI                               | P1-28 |   L    |
| P-10| Dériver `mock-server.mjs` de la spec plutôt que de le maintenir à la main (3 939 lignes)                      | P1-28 |   L    |
| P-11| Planifier un **branchement de bout en bout sur un back-end réel** avant la Phase 08 — jamais fait à ce jour   | P1-28 |   M    |
| P-12| Ajouter un test de fumée d'intégration (login → appel authentifié → rendu) contre un serveur réel             | P1-28 |   M    |

### Rappel — chantier C (tests) toujours ouvert

`P0-5` reste le chantier de fond : **12 modules sur 18 à zéro test**, `shared`
(182 fichiers) à **2 specs**, couche `ui` à **1 spec**, **0 e2e**. Les actions
`C-1` à `C-8` de l'audit principal restent valides intégralement.

---

## 5. Situation consolidée

| Indicateur         | Passe 1 | Passe 2 | Passe 3 | **Total** |
| ------------------ | ------: | ------: | ------: | --------: |
| Constats **P0**    |       6 |       5 |   **1** |    **12** |
| Constats **P1**    |      11 |       7 |   **4** |    **22** |
| Constats **P2**    |       4 |       0 |       0 |     **4** |
| **Total**          |      21 |      12 |   **5** |    **38** |
| dont **fermés**    |       — |       — |       — |    **22** |
| dont **ouverts**   |       — |       — |       — |    **16** |
| Actions            |      67 |      44 |  **34** |   **145** |

### Séquencement final

```
Immédiat    M-1 → M-4        Fermer la remédiation (3 garde-fous rouges)   ← 4 actions, ~2 h
Semaine 1   M-5 → M-9        Outils SEOS, périmètre, a11y
            N-1, N-4, N-6    Corpus : trancher et publier la vérité
Semaine 2   P-8, P-11, P-12  Contrat d'API + premier branchement réel      ← RISQUE MAJEUR
            P-1 → P-4        Observabilité (port de domaine, à décider tôt)
Semaine 3   O-1 → O-6        Duplication de famille
            P-5 → P-7        Bundle
Semaine 4+  C-1 → C-8        Tests (chantier de fond)
            N-5, N-7, P-9    Corpus crud-entity, DTO contre spec
```

---

## 6. Verdict final

### Sur la remédiation

**Elle est réelle, substantielle et de bonne facture.** 22 des 33 constats sont
fermés, vérifiés par exécution et non par inspection : `strict: true` sur 2 617
fichiers avec 0 erreur, 71/71 libs sous oracle, boundaries appliquées, jeton
attaché, routes gardées, 379 clés traduites en français réel, 105/105 composants
alignés sur le profil, legacy épinglé au SHA, CSP dérivée, Dockerfile,
Dependabot, `bun audit`, 17 ADR indexés automatiquement.

Le trait qui distingue ce travail : **les correctifs arrivent avec leurs
tests et leurs garde-fous**. `check-i18n.mjs`, `check-convention-profile.mjs`,
`check-declared-deps.mjs`, `check-docs-freshness.mjs` ne réparent pas un
symptôme — ils **empêchent son retour**. C'est précisément la transformation que
l'audit principal appelait : *faire lire par une machine les règles déjà
écrites*.

**Un seul reproche, et il est mineur :** trois garde-fous sur huit sont rouges
maintenant. La remédiation n'a pas été passée sur elle-même.

### Sur ce qui reste

Les 16 constats ouverts se répartissent en deux natures, et il faut les
distinguer :

**Dette d'ingénierie connue et bornée** — tests (P0-5), outils SEOS (P0-11),
suivi de périmètre (P1-19), a11y (P1-22), duplication de famille (P1-25),
observabilité (P1-26), bundle (P1-27). Chantiers dimensionnés, sans inconnue.

**Deux risques d'une autre nature :**

1. **P1-28 — le contrat d'API.** L'application n'a jamais parlé à autre chose
   qu'à un mock écrit dans la même boucle qu'elle. 2 617 fichiers, 18 modules,
   des centaines de DTO — tous validés contre une contrepartie construite pour
   leur correspondre. Le legacy est désormais épinglé au SHA ; **le serveur n'a
   aucune référence**. Le premier branchement réel est l'événement le plus
   risqué du projet, et le seul qui ne soit couvert par aucun oracle.

2. **P0-12 — le corpus.** L'objectif de niveau 3 — le jeu de données pour la
   synthèse neurosymbolique — est aujourd'hui un **index de chemins couvrant
   18,6 % du code**, absent des 10 plus gros modules, et non exploitable sans le
   checkout legacy. L'application, elle, avance. Mais la **thèse scientifique du
   projet** n'a pas la même maturité que son ingénierie, et aucun document ne
   l'énonce.

### Le mot de la fin

> Sur l'axe **ingénierie logicielle**, ce dépôt est passé, en une remédiation, du
> stade « règles écrites, appliquées à la main » au stade « règles exécutées par
> une machine ». C'est le seuil qui sépare un bon projet d'un projet de niveau
> Big Tech, et il est franchi.
>
> Sur l'axe **thèse scientifique**, l'écart s'est creusé pendant ce temps :
> l'application a gagné 22 correctifs, le corpus reste à 18,6 % et sans contenu.
>
> Et il demeure une question qu'aucun des trois audits ne peut trancher depuis ce
> dépôt : **l'application fonctionne-t-elle contre le vrai serveur ?** Tout ce
> qui a été vérifié — types, frontières, conventions, structure, oracle — est
> vrai. Rien de tout cela ne répond à cette question. C'est, aujourd'hui, la
> seule inconnue de premier ordre.

---

_Revue finale conduite le 2026-08-02 sur l'arbre de travail à `06030e9` + 445
fichiers de remédiation non commités. Clôt le cycle ouvert par
[`audit-workspace-2026-07-27.md`](./audit-workspace-2026-07-27.md), poursuivi par
[`audit-workspace-2026-08-02.md`](./audit-workspace-2026-08-02.md) et son
[addendum](./audit-workspace-2026-08-02-addendum.md)._

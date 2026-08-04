# Addendum — méta-audit de couverture (2026-08-02)

- **Objet :** auditer l'audit. Vérifier que
  [`audit-workspace-2026-08-02.md`](./audit-workspace-2026-08-02.md) couvre ce
  qu'il prétend couvrir, et instruire ce qu'il a manqué.
- **Méthode :** deux contrôles distincts.
  1. **Couverture interne** — traçabilité constat → action, vérifiée par script.
  2. **Couverture externe** — inventaire des zones du workspace que la passe 1
     n'a **pas** inspectées, puis mesure directe de chacune.
- **Verdict :** couverture interne **complète**. Couverture externe
  **insuffisante** — la passe 1 a audité le système *déclaré* et jamais le
  système *qui s'exécute*. **12 constats nouveaux, dont 5 P0.**

---

## 1. Contrôle de couverture interne — conforme

Vérification scriptée sur le document d'audit :

| Contrôle                                     | Résultat                                    |
| -------------------------------------------- | ------------------------------------------- |
| Constats déclarés                            | **21** (6 P0 · 11 P1 · 4 P2)                |
| Actions déclarées                            | **67**                                      |
| Constats sans action rattachée               | **0** ✅                                    |
| Actions sans constat rattaché                | **1** — `G-8` (amélioration autonome, assumée) |
| Chantiers avec critère de sortie exécutable  | 1/8 (**A** seul) ⚠️                         |

**Correctif interne (I-0 ci-dessous) :** seul le chantier A porte un critère de
sortie sous forme de commande. Les chantiers B à H déclarent des actions sans
définir *comment on sait qu'elles sont finies*. C'est précisément le défaut que
l'audit reproche au projet — appliqué à l'audit lui-même.

---

## 2. Contrôle de couverture externe — le biais de la passe 1

### 2.1 Diagnostic du biais

La passe 1 a mesuré l'**architecture**, la **documentation** et l'**oracle**.
Elle a produit 21 constats justes. Mais elle a hérité, sans le voir, du même
angle mort que l'oracle qu'elle critiquait :

> Elle a vérifié que le code est **bien structuré et bien typé**. Elle n'a jamais
> vérifié que l'application **fonctionne, est traduite, est sécurisée, est
> accessible, et couvre son périmètre**.

C'est une ironie méthodologique instructive : un audit outillé par `grep`, `tsc`
et l'analyse de configuration reproduit exactement le périmètre de `tsc` +
`eslint` + `ngc`. Il faut sortir de l'analyse statique de structure pour voir le
reste.

### 2.2 Zones inspectées en passe 2

| # | Zone                                          | Inspectée en passe 1 | Résultat passe 2               |
| - | --------------------------------------------- | :------------------: | ------------------------------ |
| 1 | Intégration runtime (interceptors, garde)     |        non           | **2 P0**                       |
| 2 | Sécurité applicative                          |        non           | **1 P1** + 2 P1                |
| 3 | Intégrité i18n                                |        non           | **1 P0** + 1 P1                |
| 4 | Accessibilité (AXE / WCAG AA)                 |        non           | **1 P1**                       |
| 5 | Conformité au profil de convention            |        non           | **1 P0**                       |
| 6 | Existence des outils SEOS de validation       |        non           | **1 P0**                       |
| 7 | Complétude du périmètre (53 entités)          |        non           | **1 P1**                       |
| 8 | Cycles de dépendances entre packages          |        non           | ✅ **0 cycle**                 |
| 9 | Secrets littéraux versionnés                  |        non           | ✅ **0**                       |

---

## 3. Constats nouveaux

### P0-7 · Le jeton d'authentification n'est attaché à aucune requête HTTP

Mesure : `grep -rn "Authorization\|Bearer" libs apps` → **0 occurrence** dans
tout le workspace.

Chaîne de faits :

- `app.config.ts` appelle `provideHttpClient()` **sans `withInterceptors(...)`**.
- `libs/core/src/lib/interceptors/` contient **un seul fichier** :
  `cache-context.token.ts` — un `InjectionToken`, pas un intercepteur.
- Aucun fichier `*.interceptor.ts` n'existe dans `libs/` ni dans `apps/`.

Or `STATUS.md` et `etat-du-socle.md` décrivent `@cmz/core` comme
« Tokens d'injection **+ intercepteurs** ». Le dossier porte le nom ; la
fonction est absente.

**Conséquence.** L'application reconstruite ne peut authentifier **aucun** appel
API. Elle ne le révèle pas aujourd'hui parce que `tools/mock-server.mjs` ne
vérifie aucune autorisation. Le premier branchement sur le back-end réel
échouera sur la totalité des appels.

`authentication` est pourtant marqué ✅ « Compilant — login/forgot/reset » depuis
le 2026-07-27 : le module produit un jeton que personne ne consomme.

### P0-8 · 29 routes sur 34 sans aucun garde, et aucun `authGuard`

| Mesure                                    | Valeur   |
| ----------------------------------------- | -------: |
| Routes déclarées dans `app.routes.ts`     | **34**   |
| Routes portant un `canActivate`           | **5**    |
| Routes sans garde                         | **29**   |
| Gardes d'authentification (`authGuard`)   | **0**    |

Les 5 routes protégées le sont par `permissionGuard(<module>, 'VIEW')` — un
contrôle de **permission**, pas d'**authentification**. Les 29 autres —
`settings-security/users`, `settings-security/access-logs`,
`content-management/*`, `team-organization/*`, `coverage-areas/*`,
`administrative-*`, `communication/*` — sont atteignables sans session.

La protection s'arrête donc à 4 modules `workflow-action` sur 18, et aucun
mécanisme ne redirige un visiteur non authentifié vers `/auth`.

> P0-7 et P0-8 sont la démonstration la plus nette de la thèse P0-5 de la passe 1 :
> `tsc`, `eslint`, `ngc` et l'oracle corpus **ne peuvent pas**, par construction,
> détecter un intercepteur manquant ou une route non gardée. Seul un test
> d'intégration ou e2e le peut. Il n'y en a aucun.

### P0-9 · 379 clés i18n référencées et non définies — toutes les erreurs de formulaire affichent la clé brute

| Mesure                                             | Valeur    |
| -------------------------------------------------- | --------: |
| Clés définies dans `fr.translation.ts` (2 238 l.)   | **1 482** |
| Clés référencées dans `libs/`                      |   **856** |
| **Référencées mais non définies**                  |   **379** |
| Définies mais jamais référencées (traductions mortes) | **1 005** |

Vérification manuelle, sur trois clés tirées de l'échantillon :

```
libs/administrative-boundary/domain/.../region-update.validator.ts:15
  'ADMINISTRATIVE_BOUNDARY.REGION.FORM.ERROR.UPDATE.CODE_REQUIRE'
$ grep -c CODE_REQUIRE apps/.../fr.translation.ts  →  0
$ grep -c INFRASTRUCTURE_COUNT_REQUIRE ...          →  0
$ grep -c POPULATION_SIZE_REQUIRE ...               →  0
```

Ces clés sont les `messageKey` des `DomainError` levées par les **validateurs**.
Toute erreur de validation de formulaire affiche donc à l'utilisateur la chaîne
`ADMINISTRATIVE_BOUNDARY.REGION.FORM.ERROR.UPDATE.CODE_REQUIRE` au lieu d'un
message. Le défaut est **transverse à tous les modules CRUD**.

Réserve de méthode assumée : le comptage repose sur une expression régulière
`'[A-Z_]+(\.[A-Z0-9_]+)+'` qui capture aussi des constantes non-i18n. Le chiffre
de 379 demande un tri. **La conclusion, elle, ne demande rien** : trois clés
prises au hasard sont bien des clés i18n, bien absentes, et l'écart de 1 005 clés
orphelines montre que les deux côtés dérivent librement.

Ce défaut est invisible à l'intégralité de l'oracle actuel : une clé i18n est un
littéral `string`, correctement typé, correctement importé, correctement rendu.

### P0-10 · Le profil de convention est violé par 105 composants sur 105 — et personne ne le lit

`conventions/angular-22.profile.json` est, par ADR-0010, la **source unique
lisible par machine** des conventions de code : « le générateur et l'IA les
*lisent* au moment de la génération ; ils ne les contiennent jamais ».

Conformité mesurée :

| Règle du profil                                          | Attendu | Mesuré  | Statut |
| -------------------------------------------------------- | ------: | ------: | :----: |
| `component.forbidExplicitStandaloneTrue: true`           |       0 | **105** |   ❌   |
| `component.changeDetection` « ne pas déclarer OnPush »    |       0 | **105** |   ❌   |
| `component.hostBindings` « jamais @HostBinding/@HostListener » |   0 |   **2** |   ❌   |
| `typescript.strict: true`                                |    true | **false** (`tsconfig.base.json`) | ❌ |
| `accessibility.axe` « doit passer tous les contrôles AXE » | outillé | **aucun outil** | ❌ |
| `validation.catalogVersionMustMatch: "22.0.x"`           | vérifié en CI | **non vérifié** | ❌ |
| `injection.style: inject()` / `forbid: constructor injection` |  0 |   **0** ✅ | ✅ |
| `templates.forbid: *ngIf/*ngFor/ngClass/ngStyle`         |       0 |   **0** ✅ | ✅ |
| `state.signalUpdate` « jamais `mutate()` »               |       0 |   **0** ✅ | ✅ |
| `service.decorator: @Service`                            | 0 `providedIn:'root'` | **0** ✅ | ✅ |

Répartition des 105 : **la totalité des composants, dans les 17 répertoires de
`libs/`**, `shared` compris. Ce n'est pas une dérive partielle — c'est le
comportement par défaut de la chaîne de génération, sur tous les modules livrés
entre le 2026-07-22 et le 2026-08-01.

Vérification de bonne foi menée pendant l'audit : les 115 occurrences de
`constructor(private …)` détectées initialement ont été contrôlées une à une —
**0 se trouve dans une classe portant `@Component`/`@Injectable`/`@Service`**.
Ce sont des constructeurs d'entités de domaine et de présentateurs, hors du
périmètre de la règle. Faux positif écarté.

> Le profil de convention a été créé **exactement pour éviter ce cas** : un seul
> endroit à modifier quand une convention change. Il est écrit en JSON, donc
> lisible par machine. **Aucun outil du dépôt ne le lit.** Sa valeur est
> aujourd'hui documentaire, et sa règle la plus visible est violée à 100 %.

### P0-11 · Les outils de validation SEOS n'existent pas dans le dépôt

`contracts/README.md` fonde tout le dispositif d'archétypes sur un outil :

> « `check-pattern.js` vérifie **quels** fichiers existent. Un contrat d'archétype
> cadre **le contenu** de chaque fichier. »

`analyse-du-projet-source.md` invoque `node seos/tools/check-pattern.js`, et
`feuille-de-route.md` fait de « passer `check-pattern.js` » le critère de sortie
de la Phase 02.

Mesure : `find . -name "check-pattern*" -o -name "check-semantics*"` → **0
résultat**.

Ces outils — `check-pattern.js` (122 l.), `check-semantics.js` (**727 l.**),
`generate-reference-module.js` (1 984 l.), `extract-pattern.js` (410 l.) — vivent
dans un dépôt SEOS externe. Ce dépôt n'est **ni déclaré comme dépendance, ni
épinglé à une version, ni exécuté en CI, ni mentionné dans les prérequis** de
`docs/guides/contribuer.md`.

C'est la **deuxième dépendance externe non enregistrée**, après le dépôt legacy
(P0-6) — et elle porte cette fois le vérificateur sémantique, c'est-à-dire le
seul composant annoncé capable de contrôler autre chose que la structure.

Conséquence directe : la « conformité aux contrats d'archétype » n'est vérifiée
par **aucune commande reproductible** dans ce dépôt. C'est une revue humaine.

---

### P1-18 · Passphrase de chiffrement en dur dans le bundle client

`libs/shared/browser/src/lib/storage/browser-storage.adapter.ts` :

```ts
private readonly DEFAULT_ENCRYPTION_KEY = 'K0ud@';
private readonly ENCRYPTION_PREFIX = '0715517685:';
```

`saveEncrypted()` dérive une clé AES-GCM par **un unique SHA-256** de cette
passphrase de 5 caractères — sans sel, sans PBKDF2/Argon2, sans itérations.

Deux niveaux de lecture, à ne pas confondre :

1. **Le fond.** Un chiffrement côté client dont la clé est livrée dans le bundle
   ne peut être qu'une **obfuscation**. Ce n'est pas un défaut d'implémentation :
   c'est une propriété inévitable du navigateur. Le vrai problème est que le
   nommage (`saveEncrypted`, `clearEncrypted`) **promet une confidentialité qui
   ne peut pas exister**, et qu'aucun document ne le dit.
2. **La forme.** Passphrase de 5 caractères, dérivation en un tour sans sel,
   préfixe qui ressemble à un numéro de téléphone : même pour de l'obfuscation,
   c'est en dessous de l'état de l'art, et ça donne une fausse assurance à la
   lecture.

Attendu Meta/Google : renommer en `saveObfuscated`, documenter explicitement
l'absence de garantie, et faire porter la vraie protection par un jeton court +
refresh côté serveur (`HttpOnly` si l'architecture le permet).

**Point positif mesuré :** aucun secret littéral (clé d'API, mot de passe,
jeton) n'est versionné ailleurs dans le dépôt.

### P1-19 · Deux entités du périmètre non reconstruites, invisibles au suivi

Confrontation systématique des **53 entités** de l'annexe
`analyse-du-projet-source.md` au code de `libs/` :

| Résultat                         | Valeur |
| -------------------------------- | -----: |
| Entités cibles                   | **53** |
| Avec une trace dans `libs/`      | **50** |
| **Sans aucune trace**            |  **3** |

- `team-organization/agents-performances` (archétype *Workflow*, 41 fichiers source)
- `team-organization/daily-goal` (archétype *Divers*, 26 fichiers source)
- `seos-reference-action/sample-action` — **fixture SEOS, hors périmètre applicatif**

Soit **2 entités métier réellement manquantes**. Or :

| Document                | Ce qu'il affirme                                    |
| ----------------------- | ---------------------------------------------------- |
| `STATUS.md`             | `team-organization` ✅ « Compilant — **2 entités** » |
| `STATUS.md`             | « Modules non commencés (attendus) » → **table vide** |
| `LLM_CONTEXT.md` §5     | « Modules livrés : **18** »                          |
| `feuille-de-route.md`   | Phase 07 = « Reconstruction des **53 entités** »      |

**Le défaut n'est pas les 2 entités manquantes — c'est qu'aucun instrument ne
peut les signaler.** `generate-status.mjs` énumère ce qui *existe* ; il n'a
jamais accès à la liste de ce qui est *attendu*. Il ne peut donc, par
construction, produire un écart. L'unité de mesure du périmètre a glissé de
**53 entités** vers **18 modules** sans qu'aucun document ne réconcilie les deux.

### P1-20 · Aucune veille de vulnérabilités sur les dépendances

- Pas de `.github/dependabot.yml`, pas de `renovate.json`.
- Pas de `bun audit` / `npm audit` dans `ci.yml`.
- Aucun script `audit` dans `package.json`.

Le dépôt embarque `exceljs`, `ol` (OpenLayers), `i18next`, `date-fns`,
`sweetalert2` et toute la chaîne Angular. Aucun mécanisme ne signalera une CVE,
ni une version abandonnée. Le catalog bun garantit l'**unicité** des versions,
jamais leur **innocuité**.

### P1-21 · Aucune politique de sécurité côté navigateur

`apps/backoffice-angular/src/index.html` ne déclare **aucune** `Content-Security-Policy`,
`X-Frame-Options`, ni `Referrer-Policy`. Aucun fichier de configuration de
serveur ou de reverse-proxy n'existe dans le dépôt (cohérent avec l'absence de
`Dockerfile`, cf. P1-10 et P1-17).

Le point mérite attention pour ce back-office précisément : `monitoring`,
`reporting` et `interactive-map` intègrent des **`<iframe>` Grafana**, et
`interactive-map` charge des tuiles cartographiques externes. Une CSP est ici la
différence entre une intégration cadrée et un point d'injection.

### P1-22 · Accessibilité exigée par le profil, jamais outillée ni mesurée

`angular-22.profile.json` §`accessibility` : « doit passer **tous** les contrôles
AXE », « minimums **WCAG AA** (focus, contraste, ARIA) ». `best-practices.md`
reprend la même exigence en **MUST**.

Mesure :

| Indicateur                                 | Valeur |
| ------------------------------------------ | -----: |
| Dépendance `axe-core` / `@axe-core/*`      | **0**  |
| Test d'accessibilité (unitaire ou e2e)     | **0**  |
| Composants `@Component`                    | **105** |
| Attributs `aria-*` dans tout `libs/`       | **32** |

Une exigence formulée en MUST, dans deux documents normatifs, sans un seul
contrôle : c'est un engagement non tenu, pas une dette technique.

### P1-23 · i18n mono-langue, sans contrôle de complétude entre langues

`apps/backoffice-angular/src/app/i18n/` ne contient que `fr.translation.ts`
(2 238 lignes) et `i18n.provider.ts`. ADR-0012 justifie longuement le choix de
**i18next** par son agnosticité cross-framework — un moteur multilingue mobilisé
pour une seule langue.

Ce n'est pas un défaut en soi (le français peut être le seul besoin), mais deux
conséquences sont réelles :

- Le mécanisme le plus coûteux de l'ADR-0012 n'est pas exercé ; sa validité pour
  React reste non démontrée.
- Aucun contrôle de **parité de clés entre langues** n'existe — donc rien ne
  cadrera l'ajout d'une seconde langue. Combiné à P0-9 (379 clés manquantes en
  français), le dispositif i18n n'a aujourd'hui **aucun filet**.

### P1-24 · `best-practices.md` : document normatif à la racine, invisible depuis la documentation

`best-practices.md` est à la racine du dépôt et sert de **source normative** :
ADR-0010 le liste en « instructions système », `plan-d-execution.md` §111
l'injecte dans le prompt, et `conventions/angular-22.profile.json` le cite comme
source (« angular.dev/ai/develop-with-ai (best-practices.md) »).

Il n'apparaît **ni dans `README.md`, ni dans `docs/README.md`**, qui prétend
pourtant cartographier « tout l'écosystème documentaire ». Un document
prescriptif hors de la carte est un document que personne ne relit — et c'est
celui dont P0-10 mesure 212 violations.

---

## 4. Extension du backlog

Suite de la numérotation de l'audit principal. **44 actions nouvelles.**

### Chantier I — Intégration runtime & sécurité (P0-7, P0-8, P1-18, P1-20, P1-21)

> **Nouveau P0 le plus urgent.** Sans I-1 et I-2, l'application ne peut pas être
> branchée sur un back-end réel — quel que soit l'état de l'architecture.

| #    | Action                                                                                                                    | Réf.  | Effort |
| ---- | --------------------------------------------------------------------------------------------------------------------------- | ----- | :----: |
| I-0  | Doter les chantiers B à H d'un **critère de sortie exécutable** (une commande), à l'image du chantier A                    | §1    |   S    |
| I-1  | Écrire `auth.interceptor.ts` dans `@cmz/core` : attacher le jeton, gérer 401 → refresh → redirection `/auth`               | P0-7  |   M    |
| I-2  | Enregistrer les intercepteurs : `provideHttpClient(withInterceptors([...]))` dans `app.config.ts`                          | P0-7  |   S    |
| I-3  | Écrire `error.interceptor.ts` : normaliser les erreurs HTTP vers les `DomainError`/`OperationalError` existantes           | P0-7  |   M    |
| I-4  | Écrire `cache.interceptor.ts` — le token `cache-context.token.ts` existe déjà sans consommateur                            | P0-7  |   M    |
| I-5  | Écrire `authGuard` (session valide) et l'appliquer aux **29 routes non gardées**                                           | P0-8  |   M    |
| I-6  | Ajouter un `canMatch` global de redirection vers `/auth` pour toute route hors `auth/`                                     | P0-8  |   S    |
| I-7  | Auditer la cohérence `permissionGuard` ↔ permissions du legacy pour les 18 modules (5 protégés sur 18)                     | P0-8  |   M    |
| I-8  | Test d'intégration : requête sortante **doit** porter `Authorization` ; route protégée **doit** rediriger sans session      | P0-7/8 |   M   |
| I-9  | Renommer `saveEncrypted`/`getEncrypted`/`clearEncrypted` → `*Obfuscated`, documenter l'absence de garantie de confidentialité | P1-18 |   S   |
| I-10 | Sortir `DEFAULT_ENCRYPTION_KEY` du source (config runtime), retirer le préfixe `'0715517685:'`                             | P1-18 |   S    |
| I-11 | Écrire un ADR « stockage et cycle de vie du jeton » : durée, refresh, portée, ce qui n'est **pas** protégé                 | P1-18 |   M    |
| I-12 | Ajouter Dependabot ou Renovate (`.github/`), groupé par écosystème                                                        | P1-20 |   S    |
| I-13 | Ajouter `bun audit` au job `guardrails` — non bloquant d'abord, bloquant sur `high`/`critical` ensuite                     | P1-20 |   S    |
| I-14 | Définir une CSP (autoriser explicitement les origines Grafana et les tuiles cartographiques) + `Referrer-Policy`, `X-Frame-Options` | P1-21 |   M |
| I-15 | Porter les en-têtes de sécurité dans la configuration de service statique (dépend de G-4, `Dockerfile`)                    | P1-21 |   S    |

**Critère de sortie du chantier I**

```bash
bunx nx run backoffice-angular:test        # I-8 vert
grep -rn "withInterceptors" apps/backoffice-angular/src/app/app.config.ts   # non vide
node tools/check-route-guards.mjs          # 0 route non gardée hors /auth
```

### Chantier J — Rendre le profil de convention exécutable (P0-10, P0-11, P1-24)

| #   | Action                                                                                                                       | Réf.  | Effort |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ----- | :----: |
| J-1 | Écrire `tools/check-convention-profile.mjs` : **lire** `angular-22.profile.json` et vérifier chaque règle sur `libs/` + `apps/` | P0-10 |   M    |
| J-2 | Brancher J-1 en CI `guardrails` — bloquant                                                                                    | P0-10 |   S    |
| J-3 | Retirer `standalone: true` des **105** composants (codemod, pas à la main)                                                     | P0-10 |   S    |
| J-4 | Retirer `changeDetection: ChangeDetectionStrategy.OnPush` des **105** composants (codemod)                                     | P0-10 |   S    |
| J-5 | Convertir les 2 `@HostBinding`/`@HostListener` vers l'objet `host` du décorateur                                               | P0-10 |   S    |
| J-6 | Implémenter `validation.catalogVersionMustMatch` : échec si le profil et `@angular/core` du catalog divergent                  | P0-10 |   S    |
| J-7 | Faire lire le profil par la chaîne de génération (Phase 08) au lieu de le dupliquer dans le prompt — l'intention d'ADR-0010    | P0-10 |   M    |
| J-8 | **Décider** du sort des outils SEOS : vendorer dans `tools/seos/`, sous-module épinglé, ou paquet versionné                    | P0-11 |   M    |
| J-9 | Exécuter `check-pattern.js` + `check-semantics.js` en CI une fois J-8 tranché                                                  | P0-11 |   M    |
| J-10| Déclarer les prérequis SEOS dans `docs/guides/contribuer.md` (aujourd'hui absents)                                             | P0-11 |   S    |
| J-11| Déplacer `best-practices.md` dans `conventions/` et le référencer depuis `docs/README.md`                                      | P1-24 |   S    |
| J-12| Réconcilier `best-practices.md` et `angular-22.profile.json` — deux sources pour les mêmes règles, en garder **une**           | P1-24 |   S    |

**Critère de sortie du chantier J**

```bash
node tools/check-convention-profile.mjs    # 0 violation sur 105 composants
node tools/seos/check-pattern.js <module>  # exécutable depuis le dépôt
```

### Chantier K — Intégrité i18n & accessibilité (P0-9, P1-22, P1-23)

| #   | Action                                                                                                                   | Réf.  | Effort |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----- | :----: |
| K-1 | Écrire `tools/check-i18n.mjs` : clé référencée sans définition = **échec** ; clé définie sans usage = avertissement       | P0-9  |   M    |
| K-2 | Brancher K-1 en CI `guardrails` — bloquant sur les clés manquantes                                                        | P0-9  |   S    |
| K-3 | Trier les **379** clés signalées : distinguer vraies clés i18n et faux positifs de l'expression régulière                 | P0-9  |   M    |
| K-4 | Définir les clés manquantes réelles — **priorité aux `messageKey` des validateurs**, visibles sur tous les formulaires    | P0-9  |   L    |
| K-5 | Purger les **1 005** clés orphelines (après K-3, pour ne pas supprimer une clé utilisée dynamiquement)                    | P0-9  |   M    |
| K-6 | Typer les clés i18n (union littérale générée depuis `fr.translation.ts`) → une clé inexistante devient une **erreur `tsc`** | P0-9 |   L    |
| K-7 | Ajouter `@axe-core/*` et un test a11y par archétype de page (liste, formulaire, détail, tableau de bord)                  | P1-22 |   M    |
| K-8 | Faire échouer la CI sur toute violation AXE `serious`/`critical`                                                          | P1-22 |   S    |
| K-9 | Passer une revue WCAG AA sur le design-system `shared-ui` (focus, contraste, ARIA) — 32 attributs pour 105 composants     | P1-22 |   L    |
| K-10| Ajouter un contrôle de parité de clés entre langues à K-1 (inopérant à 1 langue, indispensable à 2)                       | P1-23 |   S    |
| K-11| Trancher et documenter : mono-langue assumé, ou seconde langue planifiée — ADR-0012 mobilise i18next pour du multilingue  | P1-23 |   S    |

**Critère de sortie du chantier K**

```bash
node tools/check-i18n.mjs                  # 0 clé manquante
bunx nx run-many -t test --all             # tests AXE verts
```

### Chantier L — Complétude du périmètre (P1-19)

| #   | Action                                                                                                                | Réf.  | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ----- | :----: |
| L-1 | Extraire les 53 entités de l'annexe vers `docs/architecture/scope.json` — **le périmètre devient une donnée**          | P1-19 |   S    |
| L-2 | Faire lire `scope.json` par `generate-status.mjs` et produire une colonne **« attendu vs livré »**                     | P1-19 |   M    |
| L-3 | Repeupler la table « Modules non commencés » depuis l'écart calculé — aujourd'hui vide **par construction**            | P1-19 |   S    |
| L-4 | Trancher le sort de `team-organization/agents-performances` et `daily-goal` : à construire, ou hors périmètre par ADR  | P1-19 |   S    |
| L-5 | Réconcilier l'unité de mesure : `feuille-de-route.md` compte en **entités**, `STATUS.md` en **modules** — en choisir une | P1-19 |   S    |

**Critère de sortie du chantier L**

```bash
node tools/generate-status.mjs && git diff --exit-code   # écart au périmètre affiché et à jour
```

---

## 5. Situation consolidée

| Indicateur              | Audit principal | Addendum | **Total** |
| ----------------------- | --------------: | -------: | --------: |
| Constats **P0**         |               6 |    **5** |    **11** |
| Constats **P1**         |              11 |    **7** |    **18** |
| Constats **P2**         |               4 |        0 |     **4** |
| **Total constats**      |          **21** |   **12** |    **33** |
| Actions                 |              67 |   **44** |   **111** |
| Chantiers               |               8 |    **4** |    **12** |
| Chantiers avec critère de sortie | 1      |    **4** | **5 / 12** ⚠️ |

### Séquencement révisé

```
Semaine 1   I-1 → I-8      Intégration runtime          ← BLOQUANT back-end réel
            A-1 → A-12     Refermer l'oracle
            E-1 → E-3      Trancher la Phase 08
Semaine 2   J-1 → J-12     Profil de convention exécutable
            K-1 → K-4      Clés i18n manquantes
            B-1 → B-8      Reproductibilité corpus
Semaine 3   I-9 → I-15     Sécurité (stockage, CVE, CSP)
            D, L           Graphe de dépendances, périmètre
Semaine 4   E-4 → E-12, F, G                          Doc générée, factorisation, gouvernance
Semaine 5+  C, K-6 → K-11, H                          Tests, a11y, durcissement G-V-R
```

**Justification du changement d'ordre.** Le chantier I passe devant A. L'audit
principal recommandait A en premier au motif que son coût croît avec chaque
module livré — c'est toujours vrai. Mais I-1/I-2 conditionnent une propriété
plus fondamentale : **l'application ne peut pas fonctionner contre un back-end
réel**. Un oracle parfait sur une application qui n'authentifie aucune requête
n'est pas un progrès.

---

## 6. Verdict du méta-audit

**Sur la couverture interne :** conforme. 21 constats, 67 actions, zéro constat
orphelin. Un seul défaut, corrigé par I-0 : les critères de sortie manquaient
pour 7 chantiers sur 8.

**Sur la couverture externe :** insuffisante, et pour une raison instructive.

> L'audit principal a mesuré ce qui est **déclaré** — architecture, frontières,
> documentation, oracle. Il n'a jamais exécuté ni interrogé ce qui **tourne**.
> Outillé par `grep`, `tsc` et l'analyse de configuration, il a reproduit
> exactement le périmètre de l'oracle qu'il critiquait — et hérité du même angle
> mort.

Les 5 P0 nouveaux tombent tous dans cette zone, et trois d'entre eux sont des
défauts **visibles par l'utilisateur final** :

- l'application **n'authentifie aucune requête** (P0-7) ;
- **29 routes sur 34** sont ouvertes (P0-8) ;
- **toutes les erreurs de formulaire** affichent une clé technique (P0-9).

Les deux autres achèvent de caractériser le motif central du dépôt :

- le profil de convention, écrit en JSON **pour être lu par une machine**, est
  violé par **105 composants sur 105** — parce qu'aucune machine ne le lit
  (P0-10) ;
- le vérificateur sémantique sur lequel repose tout le dispositif d'archétypes
  **n'existe pas dans le dépôt** (P0-11).

**Le motif, désormais établi sur 33 constats :**

> Ce projet écrit ses règles avec une rigueur remarquable — ADR, contrats,
> profils lisibles par machine, registre d'hypothèses. Puis il les applique **à
> la main**, et vérifie **à la main** qu'il les a appliquées. Chaque règle qu'il
> a instrumentée tient parfaitement (catalog, nommage, frontières, engines).
> Chaque règle qu'il n'a pas instrumentée dérive — et **plus la règle est
> importante, plus elle est difficile à instrumenter, donc plus elle a dérivé**.
>
> Le travail restant n'est pas d'écrire de meilleures règles. Il est de faire
> lire, à une machine, celles qui sont déjà écrites.

---

_Méta-audit conduit le 2026-08-02 sur l'arbre de travail à `06030e9`. Complète —
sans le remplacer — [`audit-workspace-2026-08-02.md`](./audit-workspace-2026-08-02.md)._

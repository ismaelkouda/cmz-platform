# Stratégie cross-stack — revue critique et procédé Big Tech

- **Objet :** instruire la dette actée par
  [ADR-0012](../adr/0012-strategie-cross-framework.md) (« extraire un cœur
  agnostique… **Non résolu ici** ») avant l'arrivée du deuxième client.
- **Méthode :** chaque affirmation de l'analyse soumise est **vérifiée par
  mesure** sur l'arbre de travail avant d'être endossée, corrigée ou nuancée.
- **Verdict d'ensemble :** thèse **juste et importante**, mais **deux constats
  sur six sont plus favorables que décrits**, et l'argument technique le plus
  fort n'est pas celui avancé.

---

## 1. Vérification point par point

### 1.1 « Seuls `shared-domain` et `shared-constants` sont framework-purs » — ✅ **CONFIRMÉ**

| Lib                   | Fichiers | Fichiers avec `@angular/*` | Décorateurs | Pur ? |
| --------------------- | -------: | -------------------------: | ----------: | :---: |
| `shared-domain`       |   **61** |                      **0** |       **0** |  ✅   |
| `shared-constants`    |    **2** |                      **0** |       **0** |  ✅   |
| `shared-application`  |       11 |                          7 |           4 |  ❌   |
| `shared-data`         |       58 |                         25 |          23 |  ❌   |
| `shared-ui`           |       51 |                         20 |          18 |  ❌   |
| `shared-browser`      |        4 |                          3 |           3 |  ❌   |
| `core`                |        9 |                          6 |           2 |  ❌   |

**63 fichiers sur 196 (32 %)** du kernel sont réellement réutilisables hors
Angular. Le chiffre de l'ADR-0012 est exact.

### 1.2 « `TranslationPort` est une `abstract class` Angular (`@Service()`) » — ❌ **FAUX**

Mesure directe sur les 7 ports du kernel :

```ts
// libs/shared/application/src/lib/ports/translation.port.ts
// Aucun import. Aucun décorateur.
export abstract class TranslationPort {
    abstract translate(key: string, params?: Record<string, unknown>): string;
    abstract setLanguage(lang: string): Promise<void>;
    abstract get currentLanguage(): string;
}
```

**Les 7 ports ne portent ni `@Service()`, ni `@Injectable`, ni le moindre import
`@angular/*`.** `shared-domain` compte **0** occurrence de `@angular` sur 61
fichiers. L'affirmation confond la couche (`shared-application` est
majoritairement Angular : 7 fichiers sur 11) avec les **ports eux-mêmes**, qui
sont propres.

**Mais l'argument survit — pour une raison plus forte, et non citée.**

Un `abstract class` **n'est pas neutre pour autant** :

| Construction TS   | Émission JS                | Coût runtime | Idiome DI            |
| ----------------- | -------------------------- | ------------ | -------------------- |
| `interface`       | **rien** (effacé)          | 0 octet      | aucun — neutre       |
| `abstract class`  | **une classe JS réelle**   | code émis    | **jeton DI Angular** |

Le dépôt compte **11 `abstract class`** exportées dans `shared-domain` +
`shared-application`. Elles existent sous cette forme précisément parce
qu'Angular sait injecter *par jeton de classe* — `{ provide: StoragePort,
useExisting: BrowserStorageAdapter }`. C'est un **idiome Angular exprimé en
TypeScript neutre** : la syntaxe est portable, le **design** ne l'est pas.

React n'injecte pas par jeton de classe : il utilise `Context` + hooks. Un
consommateur React de `shared-domain` embarquerait donc **11 classes JS
runtime dont il n'utiliserait jamais le mécanisme**, uniquement pour accéder à
des signatures de types qu'une `interface` aurait fournies à coût nul.

> **Formulation correcte du constat :** les ports ne sont pas *contaminés* par
> Angular ; ils sont *façonnés* pour Angular. C'est plus subtil, moins grave, et
> **corrigeable mécaniquement** — là où une contamination par décorateur aurait
> demandé une réécriture.

### 1.3 « Les contrats d'archétype sont rédigés en Angular » — ⚠️ **PARTIEL, et plutôt bonne nouvelle**

Comptage des références framework (`@Service`, `@Component`, `inject(`,
`signal(`, `Observable`, « Angular ») dans les 20 contrats :

| Contrats                                                                                 | Réf. framework | Statut |
| ---------------------------------------------------------------------------------------- | -------------: | :----: |
| `dto`, `dto-const`, `dto-enum`, `dto-interface`, `enum`, `interface`, `type`, `util`, `function`, `vo`, `constant`, `error`, `domain-error`, `operational-error` | **0** | ✅ neutres |
| `entity`, `validator`                                                                    |          1 mention | ✅ quasi neutres |
| `pipe`, `service`                                                                        |              7 | ❌ Angular |
| `facade`                                                                                 |              9 | ❌ Angular |
| `mapper`                                                                                 |         **11** | ❌ Angular |

**16 contrats sur 20 sont déjà framework-neutres** (14 strictement à 0
référence, 2 à une seule mention incidente). Le noyau sémantique —
entités, VO, DTO, enums, erreurs, validateurs — décrit des **formes de données et
des invariants**, pas des classes Angular. C'est exactement la cible que
l'analyse préconise, et elle est **déjà atteinte pour 75 % du catalogue**.

Les 5 contrats couplés sont ceux des couches d'exécution — et parmi eux, **le cas
`mapper` est le plus discutable** : un mapper est une **transformation pure**
(`DTO → Entity`). Rien dans sa nature n'exige `@Service()` ni `inject()`. Il est
Angular par convention d'injection, pas par nécessité.

### 1.4 « ADR-0012 diffère la décision » — ✅ **CONFIRMÉ textuellement**

> « **Dette actée / à réévaluer** : extraire un cœur agnostique […] séparé du
> décorateur `@Service`, **quand la partie React démarrera**. **Non résolu ici**
> — signalé pour ne pas le découvrir trop tard. »

L'analyse a raison sur le fond **et sur la gravité** : c'est l'inverse de la
discipline plateforme. Le coût de découplage croît linéairement avec le nombre de
consommateurs — 18 modules aujourd'hui, davantage après la Phase 08.

### 1.5 « Les design tokens doivent être des données » — ⚠️ **DÉJÀ FAIT À MOITIÉ**

`apps/backoffice-angular/src/tailwind.css` :

```css
/* Design tokens = source unique de vérité. */
@theme {
    --color-primary: #2563eb;
    --color-text: #0f172a;
    --color-danger: #dc2626;
    /* … 15 tokens */
}
```

**Le bon réflexe est là** : source unique, variables CSS, pas de duplication dans
les composants. Deux réserves cependant :

1. **Localisation** — les tokens vivent dans l'**application**, pas dans un
   package partagé. Un second client (React) ne peut pas les consommer sans
   dépendre de `apps/backoffice-angular`.
2. **Format** — une variable CSS est **web-only**. Elle ne produira jamais un
   `Color` Compose ni un `UIColor` Swift. Le format portable est le **JSON**
   (modèle *Style Dictionary* / *Material Design Tokens*), dont on **génère** le
   CSS, le Kotlin et le Swift.

### 1.6 « Une politique, N mécanismes pour les frontières » — ✅ **CONFIRMÉ**

`@nx/enforce-module-boundaries` est une règle **ESLint**. Elle ne verra jamais un
`build.gradle`, un `Package.swift` ni un `Cargo.toml`. Or les tags
`scope:*`/`type:*` sont déjà, eux, **déclarés dans `project.json`** — c'est-à-dire
dans un format neutre. La politique est donc déjà portable ; **seul son moteur
d'application ne l'est pas**. L'analyse vise juste.

---

## 2. Le procédé Meta/Google face à ce cas

### 2.1 La règle qui gouverne tout : *partager la spécification, jamais l'implémentation*

C'est la constante des trois grands monorepos polyglottes (google3, Meta,
Microsoft) :

| Ce qui traverse les plateformes | Ce qui ne traverse jamais            |
| ------------------------------- | ------------------------------------ |
| Schémas (protobuf/Thrift)       | Conteneur d'injection                |
| Règles métier & invariants      | Gestion d'état                       |
| Contrats d'API                  | Rendu / composants                   |
| Design tokens (données)         | Bibliothèque de composants           |
| Politiques de vérification      | Moteur d'application de la politique |

Le contre-exemple canonique est **Material Design** : Google publie une *spec* et
**N implémentations natives** (Compose, SwiftUI, Web) — jamais un composant
partagé entre Compose et SwiftUI. La tentative inverse produit systématiquement
le plus petit dénominateur commun, mauvais partout.

### 2.2 Les quatre disciplines à importer

**(a) « Design the seam now, build the abstraction later ».**
La règle des *deux implémentations* (Google) dit : n'abstrait pas avant d'avoir
deux consommateurs réels — un seul consommateur produit une abstraction qui
épouse ses accidents. Mais elle ne dit **jamais** d'attendre pour poser la
**couture**. On sépare *interface* (gratuit, immédiat) et *généralisation*
(coûteux, différé). ADR-0012 a différé les deux ; il fallait n'en différer qu'un.

**(b) L'IDL est l'artefact, le code est un produit dérivé.**
Chez Meta, un DTO ne s'écrit pas : il se **génère** depuis Thrift. Ce dépôt écrit
ses DTO à la main, en les déduisant de la lecture d'un client legacy, et les
valide contre un mock écrit dans la même boucle (cf. revue finale, P1-28). Un
schéma d'API versionné supprime d'un coup ce risque **et** rend la génération
multi-plateforme triviale.

**(c) Le code partagé a un propriétaire, pas seulement des règles.**
Chez Google, un changement dans une lib partagée passe par une *readability
review* et une *API review*. Ici, `CODEOWNERS` compte désormais 54 règles — la
structure existe. Il manque la règle explicite : **le kernel `shared-*` est
propriété plateforme, et toute modification de port est une décision d'API.**

**(d) Le changement à grande échelle est automatisé, pas négocié.**
Google ne demande pas aux équipes de migrer : l'équipe plateforme écrit un
codemod, l'applique au monorepo entier, et supprime l'ancienne API. Ce dépôt a
**déjà démontré cette capacité** :
`codemod-strip-redundant-component-flags.mjs` a corrigé 105 composants d'un coup.
La compétence est acquise — il faut la réutiliser pour le découplage DI.

### 2.3 Le test de recevabilité — *the layering test*

Une seule question, binaire, vérifiable par une commande :

> **Peut-on supprimer Angular de `package.json` et compiler encore le cœur ?**

Aujourd'hui la réponse est **oui pour `shared-domain` et `shared-constants`**
(63 fichiers), **non pour le reste**. C'est la bonne métrique de progrès : elle
est mesurable, non négociable, et se dégrade silencieusement sans garde-fou.
Elle doit devenir un test de CI, pas une intention.

### 2.4 Ce qu'il ne faut surtout pas casser

Le mode **package-based** (ADR-0001) et la structure `apps/` + `libs/` avec tags
plutôt que dossiers (ADR-0003) sont **le bon réflexe polyglotte** : chaque
package garde son outillage natif, Nx orchestre sans imposer de modèle. C'est ce
qui permettra à un package Kotlin d'entrer dans le graphe par un `project.json`
déclarant `nx:run-commands`.

**Le problème n'est pas la structure du monorepo. C'est que le kernel `shared-*`
a été conçu « Angular d'abord, agnostique de nom ».** La structure, elle, est
prête.

---

## 3. Backlog — ce qu'un ingénieur plateforme Meta/Google ferait

**27 actions.** Chantiers Q à T, à la suite de la revue finale.

### Chantier Q — Découpler la DI **maintenant** (avant le 2ᵉ client)

> Coût aujourd'hui : mécanique, à outillage constant. Coût après la Phase 08 :
> un ordre de grandeur. C'est le seul chantier dont la fenêtre se referme.

| #    | Action                                                                                                                    | Effort |
| ---- | --------------------------------------------------------------------------------------------------------------------------- | :----: |
| Q-1  | Écrire **ADR-0018 — « Le contrat est une `interface`, le jeton est séparé »** ; supersède la dette différée d'ADR-0012      |   S    |
| Q-2  | Pour les 7 ports : extraire une `interface` pure (contrat) + conserver un jeton d'injection **Angular-side**                |   M    |
| Q-3  | Déplacer les jetons DI hors de `shared-domain` → `shared-application` ou `core` ; le domaine ne connaît que des `interface` |   M    |
| Q-4  | Mesurer le gain : `abstract class` restantes dans `shared-domain` doit tomber à **0** (4 aujourd'hui, hors `DomainError`)   |   S    |
| Q-5  | Traiter `DomainError` à part : hiérarchie d'erreurs runtime **légitimement** une classe — documenter l'exception            |   S    |
| Q-6  | Écrire `tools/check-framework-purity.mjs` : `type:domain` et `type:constants` → **0** import framework, **0** décorateur    |   M    |
| Q-7  | Brancher Q-6 en CI `guardrails` — bloquant. C'est le *layering test* rendu exécutable                                      |   S    |
| Q-8  | Étendre Q-6 au **test destructif** : compiler `shared-domain` avec `@angular/*` retiré des `paths` — échec = régression     |   M    |

### Chantier R — Neutraliser les 5 contrats d'archétype couplés

| #   | Action                                                                                                                  | Effort |
| --- | --------------------------------------------------------------------------------------------------------------------------- | :----: |
| R-1 | Réécrire `mapper.contract.md` en **transformation pure** (`DTO → Entity`), sans `@Service` ni `inject` — le plus injustifié |   M    |
| R-2 | Scinder `facade.contract.md` : *contrat de comportement* (neutre) + *liaison Angular* (profil de convention)              |   M    |
| R-3 | Idem pour `service.contract.md` et `pipe.contract.md` — la partie framework descend dans `angular-22.profile.json`        |   M    |
| R-4 | Poser la règle générale : **un contrat décrit un comportement, un profil décrit une syntaxe** — c'est déjà l'esprit d'ADR-0010 |   S    |
| R-5 | Ajouter à `check-convention-profile.mjs` un contrôle : aucun `*.contract.md` de couche `domain` ne cite un framework      |   S    |
| R-6 | Vérifier que les 15 contrats déjà neutres le restent (test de non-régression)                                             |   S    |

### Chantier S — Faire du contrat l'artefact (IDL-first)

> Résout simultanément **P1-28** (mock autoréférentiel) et la génération
> multi-plateforme. Le meilleur rapport valeur/effort du document.

| #   | Action                                                                                                            | Effort |
| --- | --------------------------------------------------------------------------------------------------------------------- | :----: |
| S-1 | Obtenir ou reconstruire une **spec OpenAPI** du back-end réel ; la verser au dépôt, versionnée                     |   M    |
| S-2 | Générer les DTO depuis la spec au lieu de les écrire — l'écart devient une **erreur de CI**                        |   L    |
| S-3 | Dériver `mock-server.mjs` (3 939 l.) de la spec au lieu de le maintenir à la main                                  |   L    |
| S-4 | Extraire les **design tokens** dans `libs/shared/constants/tokens.json` (données, pas CSS)                         |   S    |
| S-5 | Générer `tailwind.css` `@theme` depuis `tokens.json` — et, plus tard, Compose/Swift depuis la même source          |   M    |
| S-6 | Publier les tokens comme paquet consommable hors de `apps/backoffice-angular`                                     |   S    |
| S-7 | Traiter le corpus SEOS comme un IDL : le `pattern.json` **est** la spec, le code en est dérivé (cf. P0-12, N-1)    |   M    |

### Chantier T — Politique portable, moteurs multiples

| #   | Action                                                                                                                     | Effort |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | :----: |
| T-1 | Extraire les `depConstraints` d'`eslint.config.mjs` vers **`architecture-policy.json`** — la politique devient une donnée   |   M    |
| T-2 | Faire lire ce fichier par la config ESLint (aucun changement de comportement, source unique)                               |   S    |
| T-3 | Écrire `tools/check-cross-stack-boundaries.mjs` : graphe depuis `project.json` (JS), `build.gradle`, `Package.swift`, `Cargo.toml` — **même algorithme** |   L    |
| T-4 | Brancher T-3 en CI, inopérant tant qu'il n'y a qu'une stack, prêt à l'arrivée de la seconde                                |   S    |
| T-5 | Déclarer dans `CODEOWNERS` que `libs/shared/**` et `contracts/**` sont **propriété plateforme** — revue d'API obligatoire   |   S    |
| T-6 | Écrire `docs/guides/modifier-un-port.md` : toute évolution de port = ADR + codemod + suppression de l'ancienne API          |   S    |

---

## 4. Ce qu'un ingénieur Meta/Google **ne** ferait **pas**

Aussi important que la liste précédente :

| Tentation                                                          | Pourquoi elle est écartée                                                                                 |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Créer `@cmz/shared-ui-react` en miroir de `shared-ui`               | Deux bibliothèques de composants à maintenir en parallèle ; elles divergent en trois mois                  |
| Chercher une couche DI universelle (`inversify`, conteneur maison)  | Plus petit dénominateur commun : perd le tree-shaking d'Angular *et* l'ergonomie React                     |
| Démarrer React « pour valider l'agnosticité »                       | Un second client construit pour prouver un point n'est pas un besoin — il fige de mauvaises abstractions   |
| Généraliser `workflow-action` **et** découpler la DI en même temps  | Deux refactorisations de fond concurrentes sur le même code ; on séquence (Q avant O)                      |
| Réécrire les 15 contrats déjà neutres                               | Ils sont **la cible**, pas le problème — le travail porte sur les 5 autres                                 |

---

## 5. Synthèse

**Sur l'analyse soumise.** Thèse juste, gravité correctement évaluée, et le
diagnostic d'ADR-0012 est exact au mot près. Deux corrections factuelles :
les **ports sont déjà propres** (aucun décorateur, aucun import `@angular`), et
**16 contrats sur 20 sont déjà neutres**. La situation de départ est donc
meilleure que décrite — ce qui rend le chantier Q **moins coûteux**, pas moins
urgent.

**L'argument décisif n'est pas celui avancé.** Ce n'est pas la contamination par
`@Service()` — elle n'existe pas. C'est que **`abstract class` émet une classe JS
runtime et encode un idiome d'injection Angular** là où une `interface` aurait un
coût nul et une portabilité totale. Constat plus étroit, mais **vérifiable,
mécanique, et corrigeable par codemod** — donc actionnable aujourd'hui.

**Le procédé, en une phrase :**

> Poser la **couture** maintenant (interface ≠ jeton, politique ≠ moteur, spec ≠
> code), et ne construire la **généralisation** que quand un second client réel
> l'exigera. ADR-0012 a différé les deux ; il ne fallait différer que le second.

**La séquence recommandée :**

```
Q (découpler la DI)   →  fenêtre qui se referme, coût mécanique aujourd'hui
S (IDL-first)         →  résout aussi P1-28, le risque de premier ordre
R (neutraliser 5 contrats) + T (politique portable)
O (généraliser workflow-action)  →  après Q, jamais en parallèle
```

---

_Revue rédigée le 2026-08-02. Instruit la dette d'[ADR-0012](../adr/0012-strategie-cross-framework.md)
et complète la [revue finale](./audit-workspace-2026-08-02-revue-finale.md)._

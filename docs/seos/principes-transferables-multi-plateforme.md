# Principes SEOS transférables — vers une cible mobile native

- **Créé :** 2026-08-11
- **Statut :** exploratoire — Bloc A (formalisation), pas encore de Bloc B
  (outillage réel). Aucun code n'est écrit ici ; ce document prépare une
  future décision d'investissement, il ne la prend pas.
- **Contexte :** suite au POC few-shot (`poc-few-shot-legacy-nx.md`), qui a
  montré que la traduction legacy → Nx encode des décisions humaines non
  déductibles automatiquement. Cette limite est spécifique à la tâche
  *traduction historique* — elle ne s'applique pas à la question distincte
  posée ici : **peut-on réutiliser les principes de `cmz-platform`, pas son
  code, pour produire une app dans un contexte totalement neuf (mobile
  natif) ?**
- **Cible d'exemple retenue pour rendre ce document concret :** app mobile
  native (iOS/Swift ou Android/Kotlin) — cas d'usage volontairement proche
  de celui déjà maîtrisé ici (CRUD, formulaires, listes filtrées, workflows
  à statuts), pour transposer sans avoir à réinventer ce qu'est un
  « archétype ».

## Pourquoi ce document existe

`cmz-platform` a produit deux catégories de choses très différentes :

1. Du **code Angular** — composants, décorateurs `@Service()`, templates
   HTML, `ngc --strictTemplates`. Ceci ne se transpose pas : Swift et
   Kotlin n'ont ni templates Angular ni ce compilateur.
2. Des **principes d'ingénierie** — comment découper un module, comment
   vérifier qu'il est correct, comment décrire une famille récurrente de
   fonctionnalités. Ceci est indépendant du langage : c'est ce que ce
   document extrait.

Confondre les deux ferait croire qu'il n'y a rien à réutiliser hors
Angular. C'est faux — mais ce qui se réutilise est le raisonnement, jamais
le fichier.

## Principe 1 — Isolation en couches vérifiée automatiquement

### Ce que c'est dans `cmz-platform` (LLM_CONTEXT.md §2)

Chaque module se découpe en 4 couches avec des règles de dépendance
strictes et **vérifiées par un outil**, pas seulement par convention :

```
domain/       — 0 dépendance framework/data/ui. Entités, Value Objects, ports de repository.
data/         — dépend de domain, core, shared-data. DTOs, mappers, sources HTTP.
application/  — dépend de domain, shared-application. Use-cases, façades.
ui/           — dépend de application, domain, shared-ui. Composants de page minces.
```

La vérification n'est pas déclarative seulement : `@nx/enforce-module-
boundaries` (ESLint) fait échouer la compilation si un fichier `domain/`
importe quoi que ce soit d'Angular, ou si un module métier importe
directement un autre module métier sans passer par `shared-*`.

### Ce qui est transférable (l'idée, pas l'outil)

L'idée : **une couche métier qui ne connaît rien du framework
d'affichage, et un outil qui interdit mécaniquement toute violation** —
pas une charte que les développeurs sont censés respecter de bonne foi.

### Transposition vers mobile natif

| Concept `cmz-platform` | Équivalent mobile natif (Swift/iOS ou Kotlin/Android) |
| --- | --- |
| `domain/` — entités, VO, ports de repository, aucun import Angular | Un module Swift Package (ou un module Gradle Android) séparé, qui n'importe ni `UIKit`/`SwiftUI` ni `Android SDK` — uniquement `Foundation`/stdlib. |
| `data/` — DTOs, mappers, sources HTTP | Un module séparé qui dépend de `domain` et importe `URLSession`/`Alamofire` (iOS) ou `Retrofit`/`Ktor` (Android) — jamais l'inverse. |
| `application/` — use-cases, façades signal-based | Un module qui orchestre `domain`+`data`, exposant des `@Published`/`Combine` (iOS) ou `StateFlow`/`ViewModel` (Android) — équivalent direct des façades Angular signal-based. |
| `ui/` — composants de page minces | Les vues SwiftUI / Composable Jetpack Compose — dépendent d'`application`, jamais l'inverse. |
| `@nx/enforce-module-boundaries` (ESLint) | Swift Package Manager permet nativement d'interdire un import interdit via la déclaration des dépendances de `Package.swift` (un module qui ne déclare pas dépendre d'`UIKit` ne peut pas l'importer — échec de build, pas juste un lint). Côté Android/Gradle, un module `domain` peut être un module Kotlin pur (`kotlin("jvm")`, pas `kotlin("android")`) — toute tentative d'importer `android.*` y échoue à la compilation, mécaniquement. |

**Verdict :** transposable directement, sans perte. Les deux plateformes
mobiles ont un mécanisme natif de séparation de modules au moins aussi
strict que ESLint+Nx — c'est même plus fort côté Swift Package Manager
(erreur de compilation, pas juste de lint).

## Principe 2 — L'Oracle de vérification stricte

### Ce que c'est dans `cmz-platform`

Rien n'est considéré terminé sans passer, dans l'ordre :

```
tsc --noEmit          (types corrects)
eslint --max-warnings=0  (conventions respectées)
nx test                (comportement vérifié)
ngc --strictTemplates  (templates Angular sans erreur — Tier 2)
```

Le point clé n'est pas la liste des outils (spécifiques à TypeScript/
Angular) — c'est le **principe** : un contrat de vérification à plusieurs
niveaux (types, style, comportement, intégration), appliqué
systématiquement, sans exception silencieuse.

### Transposition vers mobile natif

| Niveau `cmz-platform` | Équivalent iOS/Swift | Équivalent Android/Kotlin |
| --- | --- | --- |
| Types (`tsc --noEmit`) | Le compilateur Swift lui-même (`swift build`) — Swift est statiquement typé, cette étape existe nativement. | Le compilateur Kotlin (`./gradlew compileKotlin`) — même chose. |
| Style/conventions (`eslint`) | `SwiftLint` — équivalent direct, outil mature et largement adopté. | `ktlint` ou `detekt` — équivalent direct. |
| Comportement (`nx test`) | `XCTest` (tests unitaires natifs Xcode). | `JUnit` + `Espresso`/`Compose Testing` pour Android. |
| Intégration (`ngc --strictTemplates`) | Pas d'équivalent template — mais `SwiftUI Previews` compilés + tests d'interface (`XCUITest`) jouent un rôle proche : détecter les erreurs qui n'apparaissent qu'à l'assemblage. | `Compose UI Testing` — même rôle. |

**Verdict :** transposable directement. Chaque niveau de l'Oracle a un
équivalent mûr et standard sur les deux plateformes mobiles — ce n'est pas
un pari, l'écosystème existe déjà et est même plus consolidé que celui
d'Angular sur certains points (SwiftLint est quasi universellement adopté
dans l'écosystème iOS professionnel).

## Principe 3 — Patterns d'archétypes réutilisables

### Ce que c'est dans `cmz-platform`

Un pattern (ex. `workflow-action.pattern.json`, lu en détail pour ce
document) ne liste pas des fichiers — il décrit des **rôles** récurrents
dans une famille de fonctionnalités, indépendamment du module concret :

- une **entité** (représentation métier d'un élément de liste),
- un **contrat de filtre** (les critères de recherche possibles),
- un **port de repository** (l'interface d'accès aux données, sans
  implémentation),
- une **façade applicative** (l'orchestration, exposée à l'UI),
- un **composant de page** (l'affichage, minimal, qui délègue tout à la
  façade).

Le fichier documente aussi des **contraintes machine-vérifiées** (ex. H-3 :
aucun fichier byte-identique entre deux modules — un helper partagé doit
vivre dans `shared-*`, jamais être recopié) et un **Oracle minimum** propre
au pattern.

### Ce qui est transférable

Le rôle de chaque fichier (« ceci est l'entité », « ceci est le port de
repository ») est un concept de Clean Architecture / DDD, pas une
particularité TypeScript. Ce qui change selon la plateforme, c'est
uniquement la syntaxe et l'outil de nommage — pas la structure.

### Transposition d'un archétype concret : `crud-entity` → mobile natif

Prenons le pattern le plus simple (`crud-entity` : liste paginée +
create/update/delete/find-one) et transposons-le en gardant les mêmes
rôles :

| Rôle (indépendant du langage) | `cmz-platform` (Angular/TS) | iOS/Swift | Android/Kotlin |
| --- | --- | --- | --- |
| Entité métier | `class XxxEntity` (getters sur `props`) | `struct XxxEntity` (`Codable`, immuable) | `data class XxxEntity` |
| Contrat de filtre | `interface XxxFilterContract` | `struct XxxFilterCriteria` | `data class XxxFilterCriteria` |
| Port de repository | `interface XxxRepository` (abstrait, dans `domain/`) | `protocol XxxRepository` | `interface XxxRepository` |
| Implémentation du port | `class XxxRepositoryImpl` (dans `data/`, appelle l'API) | `final class XxxRepositoryImpl: XxxRepository` | `class XxxRepositoryImpl : XxxRepository` |
| Façade applicative | `class XxxFacade` (signal-based, `@Service()`) | `final class XxxViewModel: ObservableObject` (`@Published`) | `class XxxViewModel : ViewModel()` (`StateFlow`) |
| Composant de page | `XxxPageComponent` (Angular, template mince) | `struct XxxView: View` (SwiftUI, mince) | `@Composable fun XxxScreen(...)` |

**Verdict :** transposable directement, rôle par rôle. La preuve la plus
forte : les trois colonnes ont exactement le même nombre de lignes, dans
le même ordre — le pattern `crud-entity` n'a rien perdu de sa structure en
changeant de plateforme.

### Ce qui NE se transpose pas sans adaptation

- **`workflow-action`** (files d'attente, prise en charge, statuts) se
  transpose bien conceptuellement (une liste filtrable + des mutations
  d'état), mais le vocabulaire d'interaction mobile diffère : les
  interactions « glisser pour agir » (swipe actions) natives sur mobile
  n'ont pas d'équivalent direct dans le pattern actuel, pensé pour une
  interface de bureau avec boutons/colonnes de tableau. Le rôle
  (« mutation d'état déclenchée par l'utilisateur ») reste transposable ;
  la représentation UI concrète, non.
- **`read-only-view`** (tableaux de bord Grafana embarqué) suppose un
  espace d'affichage large (dashboard analytique) — sur un petit écran
  mobile, la même donnée demanderait une refonte de présentation
  (résumés, graphiques simplifiés), pas seulement une traduction de
  composant à composant.

## Ce que ce document ne tranche pas

- Il ne choisit pas entre iOS et Android — les deux colonnes sont
  présentées à égalité, aucune décision n'est prise ici.
- Il n'écrit aucun outillage réel (pas de générateur, pas de linter
  configuré, pas de premier module créé) — c'est le Bloc B, non entamé,
  à décider séparément une fois ce document validé.
- Il ne garantit pas que la transposition sera aussi propre en pratique
  qu'elle l'est sur le papier ici — seul un vrai POC (un module `crud-
  entity` réellement écrit en Swift ou Kotlin, avec son Oracle) le
  prouverait. C'est la suite naturelle si cette direction est retenue.

## Conclusion

Contrairement à la traduction legacy → Nx (POC précédent, qui a révélé une
limite de fond), la question posée ici — réutiliser les *principes*
plutôt que le *code* — ne rencontre pas d'obstacle comparable. Les trois
principes fondateurs de `cmz-platform` (isolation en couches vérifiée,
Oracle multi-niveaux, patterns d'archétypes par rôles) ont chacun un
équivalent mûr et standard sur iOS et Android. Le travail de réflexion
déjà fait ici — quelle entité, quel port, quelle façade — se retrouve
directement dans la colonne mobile, sans avoir à réinventer la logique de
zéro. Ce qui reste à construire, c'est l'outillage concret (Bloc B) :
générateurs, configuration des linters natifs, premier module de preuve.

## Références

- `LLM_CONTEXT.md`, §2 — invariants d'architecture Nx package-based.
- `docs/architecture/patterns/workflow-action.pattern.json` — structure
  réelle d'un pattern, source de la transposition ci-dessus.
- `docs/architecture/patterns/README.md` — rôle des patterns, boucle
  Generate-Verify-Repair.
- `docs/architecture/poc-few-shot-legacy-nx.md` — limite distincte
  (traduction historique), qui ne s'applique pas à ce document.

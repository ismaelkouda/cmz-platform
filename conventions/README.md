# Profils de convention

Source unique des choix de code qui **changent d'une version majeure à l'autre**
d'une plateforme cible. Le générateur et l'IA les **lisent** au moment de la
génération ; ils ne les contiennent jamais
([ADR-0010](../docs/adr/0010-flux-de-generation-assistee-par-ia.md)).

## Principe — un profil par (plateforme, version majeure)

Quand une convention change — par exemple `@Injectable({providedIn:'root'})` →
`@Service` entre Angular v20 et v22 — on écrit un **nouveau profil**, on ne
touche pas aux générateurs. C'est le catalog de versions
([ADR-0005](../docs/adr/0005-versions-du-socle.md)) appliqué aux conventions de
code : un seul endroit à modifier.

Chaque profil décrit les choix **natifs de sa plateforme**, tirés de la
guidance officielle de cette plateforme (angular.dev, react.dev, Android/Kotlin
+ Compose, Apple HIG/Swift). Le renderer ou le LLM d'une cible ne lit **que son
propre profil**.

### Zéro abstraction cross-platform

Un profil nomme la lib native de sa plateforme, jamais un wrapper maison conçu
pour masquer une différence entre plateformes. Exemple concret : l'i18n est
**Transloco** côté Angular ([ADR-0036](../docs/adr/0036-convergence-transloco-angular.md)) et
**react-i18next** côté React — pas une interface commune `TranslationPort`
(retirée du repo). `tools/check-convention-profile.mjs` échoue si un profil
déclare une `i18n.library`/`i18n.package` dont le nom trahit une abstraction
(`port`, `wrapper`, `abstraction`, `custom`, `shared`, `cross-platform`…).

## Fichiers

`conventions/profile.schema.json` définit la forme d'un profil ; chaque
`conventions/<plateforme>-<version-majeure>.profile.json` est validé contre lui
en CI (`check:convention-profile`).

| Profil                                                 | Plateforme | Vérifié pour |
| ------------------------------------------------------ | ---------- | ------------ |
| [`angular-22.profile.json`](./angular-22.profile.json) | Angular    | v22.0.7      |

À ajouter quand une cible est réellement construite : `react-*.profile.json`,
`kotlin-*.profile.json`, `swift-*.profile.json` — même schéma, même règle de
nommage, guidance officielle de chaque plateforme.

Convention transverse (indépendante de la plateforme) :

| Convention                   | Portée                              |
| ---------------------------- | ----------------------------------- |
| [`nommage.md`](./nommage.md) | Nommage dossiers/fichiers intra-lib |

## Règle de cohérence

La version majeure d'un profil doit correspondre à la version de la plateforme
dans le catalog. `angular-22.profile.json` va avec `@angular/core: 22.x` du
catalog. Le nom de fichier doit refléter `platform` + `platform_version`
majeure. Ces deux écarts sont des bugs — vérifiés en CI par
`tools/check-convention-profile.mjs`.

## Emplacement

Les profils vivent **dans ce monorepo** (pas dans le dépôt tiers des outils
SEOS) : ils sont spécifiques au dépôt — ils disent « ici on cible Angular 22 ».
Les outils SEOS, eux, sont génériques et versionnés séparément
([ADR-0009](../docs/adr/0009-reconstruction-pilotee-par-patterns.md)).

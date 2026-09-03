# ADR-0041 — Angular Material + Tailwind comme défauts d'app Angular

- **Statut :** Accepted
- **Date :** 2026-09-03

## Contexte

ADR-0036 a fait converger tout l'Angular du dépôt sur **Transloco** pour l'i18n,
sur un critère explicite : le schematic officiel du vendeur
(`@jsverse/transloco:ng-add`) rend l'installation automatisable, donc c'est le
défaut de toute app Angular du workspace.

Le profil `conventions/angular-22.profile.json`, préoccupation `styling`, disait
jusqu'ici : classes utilitaires **Tailwind** dans les templates + contrôles
réutilisables délégués au design system maison **`@cmz/shared-ui`**, et
**interdiction de toute librairie de composants tierce (PrimeNG, Angular
Material…)**. Cette interdiction venait de la reconstruction de
`backoffice-angular` : ne pas reproduire le PrimeNG + NgModule massif du SEOS
legacy. `@cmz/shared-ui` compte aujourd'hui 8 composants taillés pour un
back-office (`table`, `filter`, `pagination`, `grafana-embed`,
`action-dropdown`, `dialog`, `field`, `toast`).

Un besoin nouveau apparaît : des applications qui partent de zéro et ne sont pas
des back-offices — la première étant une PWA citoyenne. `@cmz/shared-ui` ne leur
transfère pas. Reconstruire à la main, par app, un jeu complet de primitives
interactives accessibles (boutons, champs, dialogs, menus, listbox, tabs,
snackbars) — focus trap, live-announcer, navigation clavier, positionnement
d'overlay — est un travail non générique, lent, risqué côté a11y, et sans
référence stable pour un LLM d'UI.

L'utilisateur a tranché : **Angular Material (thème M3) + Tailwind ensemble**,
défauts de toute nouvelle app Angular du workspace, en plus de Transloco.

Cette décision en soulève une seconde, générique : comment automatiser
l'installation **et** la configuration de bibliothèques qui bougent vite — la
mécanique Tailwind est passée de `tailwind.config.js` + `@tailwind` (v3) à
`@import` + `@theme` (v4) ; les flags de `ng add @angular/material` (thème,
typographie, densité) changent d'une version à l'autre — sans que la recette
d'installation pourrisse en silence ?

## Options envisagées

### Option A — Statu quo : design system maison par app, zéro librairie de composants

- Avantages : contrôle total du markup ; cohérent avec la non-reproduction du
  PrimeNG legacy ; aucune dépendance de composants tierce.
- Inconvénients : chaque nouvelle app refait à la main (ou via LLM sans
  référence) tous les composants interactifs et leur a11y ; `@cmz/shared-ui`
  (back-office) ne se transfère pas ; le profil exige WCAG AA sans fournir le
  moyen réaliste de le tenir. Non générique — contraire à l'objectif « automatiser
  ce qui sert n'importe quel type d'app ».

### Option B — Material (M3) + Tailwind par défaut, `@cmz/shared-ui` gelé, setup verrouillé par des recettes d'invariants

- Avantages : Material est développé par l'équipe Angular elle-même, suit le
  cycle de versions du framework, est standalone / signals-first en v22, et a un
  schematic `ng add` version-aware — même critère d'automatisation que le choix
  Transloco. `@angular/cdk` résout l'a11y difficile et générique (focus,
  overlay, live-announcer, clavier). Tailwind couvre mise en page / espacement /
  one-offs. Un LLM d'UI compose deux briques documentées au lieu d'inventer du
  markup accessible. Le « comment installer » (volatile) est délégué au
  schematic officiel, à un script `reference-derived` ou à un LLM borné, et sa
  sortie est revérifiée contre des **invariants stables**
  (`conventions/libraries/*.setup.json` + `check:library-setup`).
- Inconvénients : deux systèmes de style à faire coexister (frontière entre le
  preflight Tailwind et les composants Material à documenter et tenir) ;
  `@cmz/shared-ui` et Material coexistent dans le dépôt (deux façons de faire un
  bouton selon l'app) ; `@angular/material` + `@angular/cdk` ajoutés aux
  dépendances (alignés sur `@angular/core`, déjà présent).

### Option C — Rétro-porter `backoffice-angular` sur Material

- Avantages : un seul système de composants dans tout le dépôt, comme ADR-0036
  l'a fait pour l'i18n.
- Inconvénients : `@cmz/shared-ui` fonctionne et n'est gênant pour personne — il
  est seulement spécifique au back-office. Le bénéfice de cohérence est faible
  face au coût et au risque d'une migration UI de grande ampleur sur la seule
  app réelle de type production. Rien ne la motive aujourd'hui, contrairement à
  ADR-0036 où la divergence i18n était activement gênante.

## Décision

**Option B.**

Toute nouvelle app Angular du workspace part avec Transloco (ADR-0036) + Angular
Material (thème M3 via `mat.theme()`) + Tailwind v4. Répartition des
responsabilités de style :

- **Material** — primitives de composant interactif : boutons, champs, dialogs,
  menus, listbox, tabs, snackbars, tables interactives.
- **Tailwind** — mise en page, espacement, échelle typographique, one-offs.
- Styles de composant scopés pour le résiduel ; `NgOptimizedImage` pour les
  images statiques.

`@cmz/shared-ui` reste le design system de **`backoffice-angular` uniquement**,
**gelé** : pas de nouveau composant générique dédié, pas de wrapper
« `@cmz/shared-ui` au-dessus de Material », pas de rétro-port. Une nouvelle app
ne l'importe pas.

Le setup de chaque bibliothèque est décrit par une recette
`conventions/libraries/<lib>.setup.json` qui sépare le **STABLE** (les invariants
qu'un setup correct satisfait forcément + un test d'acceptation) du **VOLATILE**
(la commande exacte de la version N). `check:library-setup` (dans `check:all` +
CI) valide les recettes et, pour toute app qui déclare ses bibliothèques dans
`apps/<app>/.cmz/libraries.json` (`kind: "app-library-manifest"`), revérifie que
chaque invariant tient dans son arbre — à chaque run.

## Justification

**Material plutôt que « rien » (pas A).** L'a11y d'un composant interactif —
focus trap d'un dialog, live-announcer, navigation clavier d'un menu ou d'une
listbox, positionnement d'overlay — est exactement le genre de problème
générique, difficile et déjà résolu par `@angular/cdk`. Le refaire par app est
un mauvais usage du temps et une source de régressions a11y. Le profil impose
WCAG AA (préoccupation `accessibility`) ; s'appuyer sur le CDK est le moyen
réaliste de le tenir.

**Material plutôt que PrimeNG ou une autre librairie.** Le critère est celui
d'ADR-0036 : un mécanisme maintenu par le vendeur, aligné sur le cycle de
versions, installable par un schematic officiel. Material coche tout et reste,
en v22, standalone et signals-first. L'anti-pattern du legacy SEOS n'était pas
« une librairie de composants » en soi mais « NgModule massif + composants
tiers non alignés sur Angular » — les autres librairies (PrimeNG, NG-ZORRO,
Nebular) restent interdites par le profil.

**Geler le back-office plutôt que le migrer (pas C).** ADR-0036 a migré
`backoffice-angular` parce que la coexistence de deux mécanismes i18n était
activement gênante. Ici, `@cmz/shared-ui` ne gêne personne. Geler ≠ migrer : le
coût et le risque d'une migration UI massive sans bénéfice pressant ne se
justifient pas.

**Des recettes d'invariants plutôt qu'un guide en prose pour un LLM.** Un guide
en prose n'est pas exécutable : il pourrit en silence — le passage Tailwind
v3 → v4 l'aurait invalidé sans alarme. Une recette sépare ce qui est stable
(un setup Tailwind correct **a** un `@import 'tailwindcss'`, **a** le plugin
PostCSS actif, **est** injecté dans le build) de ce qui est volatile (la
commande). Le stable devient un test d'acceptation ; le volatile est délégué à
qui le maintient réellement — le vendeur (`ng add`), un script qui dérive d'une
app vivante (`tools/scaffold-tailwind.mjs`), ou un LLM borné — et sa sortie est
revérifiée contre les invariants. Même principe que `check:ci-wiring` : un
fichier qui existe sans être vérifié n'est qu'une intention.

## Conséquences

### Positives

- Une nouvelle app Angular a un socle UI complet (i18n + composants + utilitaires)
  sans écrire de design system.
- Un LLM d'UI compose des briques documentées (Material + Tailwind) plutôt que
  d'inventer du markup et du CSS accessibles.
- Le setup ne peut plus dériver en silence : `check:library-setup` échoue si un
  invariant saute, à chaque run, pour chaque app déclarante.
- La partie volatile (commandes, flags) n'est plus figée comme source de vérité.
  Une montée de version majeure de Tailwind ou Material n'exige de toucher que
  les invariants, et seulement si le contrat lui-même change — jamais un
  générateur.

### Négatives / dette acceptée

- Deux façons de faire un bouton dans le dépôt : `@cmz/shared-ui`
  (`backoffice-angular`) et Material (nouvelles apps). Assumé et borné —
  `backoffice-angular` est la seule app « historique », et chaque app déclare ses
  bibliothèques, ce qui empêche le mélange.
- Coexistence Material ↔ Tailwind : le preflight Tailwind peut réinitialiser des
  styles de composant Material. La frontière doit être documentée dans les
  styles globaux de chaque app — c'est l'invariant `coexistence` de la recette
  `angular-material` avec `tailwind`.
- `@angular/material` + `@angular/cdk` s'ajoutent aux dépendances de toute
  nouvelle app (versions alignées sur `@angular/core`).
- `backoffice-angular` n'a pas encore de `apps/backoffice-angular/.cmz/libraries.json` ;
  tant qu'il n'en a pas, `check:library-setup` ne revérifie pas son setup
  Tailwind / Transloco existant. À ajouter (suivi).

### Points à réévaluer

- Si une deuxième app réelle de type back-office apparaît et que `@cmz/shared-ui`
  lui conviendrait : soit le promouvoir en lib partagée multi-app, soit
  l'abandonner au profit de Material partout (rétro-port de `backoffice-angular`,
  façon ADR-0036).
- Si Material M3 s'avère insuffisant pour un besoin d'UI (composant absent), la
  réponse par défaut est un composant applicatif local qui compose `@angular/cdk`
  + Tailwind — pas une nouvelle librairie tierce, pas un `@cmz/shared-ui`
  ressuscité.
- Si la frontière de coexistence Tailwind ↔ Material génère des régressions
  récurrentes, envisager de désactiver le preflight Tailwind et de n'utiliser
  que ses utilitaires.

## Références

- [ADR-0036](./0036-convergence-transloco-angular.md) — convergence Transloco :
  même critère (schematic officiel du vendeur → défaut du workspace).
- [ADR-0010](./0010-flux-de-generation-assistee-par-ia.md) —
  `conventions/*.profile.json` comme source unique lisible par machine des
  choix de code.
- [ADR-0029](./0029-perimetre-capacites-plateforme-generation.md) — périmètre
  borné de la plateforme ; Angular reste le golden reference frontend.
- [`conventions/libraries/`](../../conventions/libraries/) —
  `library-setup.schema.json` + les recettes `angular-material` / `tailwind` /
  `transloco` ; gate `tools/check-library-setup.mjs`.
- [Angular Material — theming M3](https://material.angular.dev/guide/theming)
- [Angular CDK](https://material.angular.dev/cdk/categories)
- [Tailwind CSS — Angular](https://tailwindcss.com/docs/installation/framework-guides/angular)

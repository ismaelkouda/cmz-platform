# ADR-0085 — Internationalisation Angular native avec `@angular/localize`

- **Statut :** Accepted
- **Date :** 2026-10-04
- **Supersède :** [ADR-0036](./0036-convergence-transloco-angular.md)

## Contexte

Le dépôt cible Angular 22.2 et privilégie les primitives officielles avant une
dépendance tierce. L'application Angular réellement livrée est francophone et ne
propose aucun changement de langue au runtime. Transloco imposait pourtant un
provider, un loader HTTP, des dictionnaires publics, une recette de
bibliothèque, une matrice de compatibilité et des oracles propres.

Le backoffice possède en revanche 1 869 messages historiques adressés par des
clés calculées (`MODULE.VOLET.*`). Une migration qui remplacerait ces clés sans
contrat serait risquée et disproportionnée. Une nouvelle page n'a pas cette
contrainte.

Le « schematic officiel Transloco » cité auparavant est officiel pour le projet
Transloco ; il ne constitue pas la recommandation native d'Angular.

## Décision

Angular utilise exclusivement les primitives documentées par Angular :

- `@angular/localize/init` au bootstrap ;
- `sourceLocale` dans chaque projet Angular ;
- `i18n` et `i18n-*` avec identifiants stables pour le texte de template ;
- `$localize` pour les messages TypeScript ;
- compilation d'une variante par locale si une deuxième langue est décidée.

`@angular/localize` appartient au baseline du shell Angular. Ce n'est pas une
bibliothèque opt-in de `add-library` : aucune recette, aucun adaptateur et
aucune entrée `.cmz/libraries.json` ne lui sont associés.

### Pont borné pour le backoffice historique

Le JSON français sous `apps/backoffice-angular/src/locale/` reste une source
d'édition contrôlée, jamais un asset public. Le générateur
`tools/generate-angular-localize-catalog.mjs` le transforme en tagged templates
`$localize` statiques avec identifiants personnalisés. Le service Angular
`LocalizeTranslationService` ne fait que résoudre les anciennes clés dans ce
catalogue compilé et interpoler leurs paramètres `{{name}}`.

Le catalogue généré est découpé déterministement en packs de 500 messages au
maximum, réunis par un index minuscule. Ce découpage respecte le plafond de 800
lignes sans créer de chargement lazy maison ni changer la sémantique : tous les
packs restent compilés avec l'application et chaque message reste un tagged
template statique extractible par Angular.

Ce pont :

- ne charge aucun dictionnaire par HTTP ;
- ne choisit pas de langue au runtime ;
- n'est pas un port cross-platform ;
- n'est pas autorisé par défaut dans une nouvelle page ;
- doit disparaître progressivement lorsque les surfaces historiques sont
  réécrites avec les primitives de template natives.

Une clé absente reste visible telle quelle : l'échec n'est pas masqué.

### Nouvelles applications et pages

Le renderer Angular émet directement les attributs `i18n`, configure la locale
source et le polyfill. Une page nouvelle n'ajoute ni service de traduction, ni
JSON public, ni chargement réseau. Les textes dynamiques métier restent des
données du contrat ; les messages UI sont des messages Angular identifiables et
extractibles.

### Frontend ReactJS

Cette décision ne s'applique pas à ReactJS. La cible React emploiera son
mécanisme stack-native, qualifié séparément. Les deux stacks peuvent partager
les concepts, identifiants métier et scénarios de conformité, jamais un runtime
de traduction ou une abstraction destinée à cacher leurs différences.

## Alternatives rejetées

### Conserver Transloco

Rejeté : il répond surtout au changement de langue runtime, absent du besoin
actuel, et duplique une capacité officielle au prix d'une surface de maintenance
durable.

### Réintroduire un `TranslationPort` portable

Rejeté : Angular et React n'ont pas les mêmes modèles de compilation et de
rendu. Le port réduirait la lisibilité sans rendre le code UI portable.

### Réécrire immédiatement les 1 869 clés

Rejeté : changement massif, difficile à relire et sans gain utilisateur. Le pont
statique permet une migration progressive et observable.

## Oracles

- le catalogue généré est frais et couvre exactement chaque feuille JSON ;
- chaque pack généré reste sous le plafond de 800 lignes et aucun pack obsolète
  ne subsiste après une régénération ;
- chaque entrée générée est un `$localize` statique avec identifiant stable ;
- aucun import ou provider Transloco actif ne subsiste ;
- aucun dictionnaire Angular n'est servi depuis `public/i18n` ;
- `ngc`, tests, builds et E2E passent ;
- l'E2E du workspace constate zéro requête `/i18n/fr.json` ;
- la CI échoue si la source et le catalogue généré divergent.

## Conséquences

Le chemin nominal devient plus petit, officiel et compréhensible. Le coût
restant est explicite : le backoffice conserve temporairement un adaptateur
local pour ses clés historiques. Une future exigence de langue supplémentaire
déclenchera la création des fichiers XLIFF et des variantes de build, pas la
réintroduction automatique d'un runtime tiers.

La mesure Linux autoritative après migration porte le bundle initial brut de
522,76 à 754,70 kB (+231,94 kB), sous le warning de 900 kB. Cette hausse est
acceptée comme dette bornée du catalogue historique, pas comme nouveau défaut :
le JSON était auparavant téléchargé séparément au runtime. La provenance et
l'arbitrage de budget sont consignés dans la revue du 2026-10-06 d'ADR-0016.
Lorsqu'une surface historique est remaniée, ses messages doivent rejoindre ses
templates/chunks natifs et les clés mortes être retirées. Aucun système de
catalogues lazy maison n'est introduit avant qu'une mesure par route ou le
budget ne le justifie.

## Références

- [Angular — Internationalization](https://angular.dev/guide/i18n)
- [Angular — Prepare component for translation](https://angular.dev/guide/i18n/prepare)
- [Angular — Deploy multiple locales](https://angular.dev/guide/i18n/deploy)

# Internationalisation (i18n) et `tools/generator-platform/` — pourquoi les renderers ne changent pas

> **Pour tout Agent IA / LLM lisant ce document sans contexte préalable de la
> session qui l'a produit** : ce document explique une décision négative — ne
> pas modifier `tools/generator-platform/` pour l'i18n — et où se trouve
> réellement la responsabilité de l'internationalisation dans ce repo. Lis-le
> avant de proposer un changement aux renderers pour "les rendre i18n-ready".

## L'exigence de départ

Toute application générée dans ce repo doit prendre en charge le multilingue,
avec les outils recommandés par la documentation officielle de chaque framework
cible — pas de bibliothèque douteuse ou non maintenue (voir la note sur
`fbt`/Meta ci-dessous). Cette exigence a d'abord été traitée comme si elle
impliquait de faire évoluer `tools/generator-platform/` lui-même pour qu'il
émette du code "i18n-ready" par défaut.

## Ce que l'audit a montré

Un audit direct des renderers des deux moteurs de génération (`action-request`
et `workflow-action` — voir `tools/generator-platform/renderers/*.mjs`) montre
qu'**aucun** d'entre eux n'émet de texte destiné à l'utilisateur final. Ils
produisent exclusivement :

- des modèles TypeScript (`models.ts`) ;
- un client HTTP (`action-request-client.ts`) ;
- un service/hook de commandes (`action-request-commands.ts`,
  `use-action-request-commands.ts`) ;
- un validateur (`validation.ts`).

Aucun de ces fichiers ne contient de titre, de label, de placeholder ou de
message destiné à être lu par un utilisateur — le seul texte qu'ils manipulent
est un identifiant de champ (`email`) ou un code d'erreur HTTP, jamais un
wording. Le vocabulaire visible (titres, labels, messages de succès/échec) est
systématiquement écrit à la main dans le composant consommateur de l'app finale
— exactement ce qui a été fait dans `apps/newsletter-test` (Angular) et
`apps/newsletter` (React).

**Conséquence directe** : "rendre le générateur i18n-ready" n'a pas d'objet sur
le code généré lui-même, puisqu'il n'y a rien à traduire dedans. La
responsabilité de l'i18n revient entièrement à l'app consommatrice, au même
endroit que le reste du câblage UI (voir
[`scaffold-lib-wiring.md`](./scaffold-lib-wiring.md) pour la même logique
appliquée au câblage lib → app).

## Ce que ça change concrètement : le pattern de référence à suivre

Deux POC réels ont validé le pattern à reproduire pour toute future app de ce
repo, dans le respect strict de la recommandation officielle de chaque framework
:

- **Angular** : [Transloco](https://jsverse.gitbook.io/transloco) (schematic
  officiel `nx g @jsverse/transloco:ng-add`), pas `@angular/localize`. Voir la
  note ci-dessous sur pourquoi ce choix diverge délibérément du pattern
  `i18next`/`TranslationPort` déjà en place dans `backoffice-angular`
  (ADR-0024).
- **React** : [react-i18next](https://react.i18next.com/) + `i18next` +
  `i18next-http-backend` — c'est le standard de facto le plus largement adopté
  de l'écosystème React ; react.dev ne recommande officiellement aucune
  bibliothèque i18n, et l'outil historique de Meta (`fbt`) a été archivé en
  novembre 2024 (non maintenu depuis).

Concrètement, sur les deux stacks :

1. Les traductions vivent dans des fichiers JSON statiques servis en dehors du
   bundle JS (`public/i18n/{lang}.json`), chargés via HTTP au runtime — jamais
   embarquées en dur dans le code généré ou écrit à la main.
2. Le composant applicatif consomme les clés via le mécanisme idiomatique du
   framework (`*transloco="let t"` côté Angular, `useTranslation()` côté React)
   — jamais de texte en dur dans le JSX/template.
3. Le changement de langue est possible en runtime, sans rechargement de page,
   sur les deux stacks.

## Piège réel rencontré en testant : Vite copie `public/`, Angular non

Angular exige une entrée explicite dans `project.json`
`targets.build.options.assets` pour qu'un dossier soit servi tel quel —
`apps/newsletter-test` ne déclarait que `public/` (pas `src/assets/`, la
convention historique Angular CLI que suppose le schematic
`@jsverse/transloco:ng-add` par défaut). Vite, à l'inverse, copie `public/` vers
la racine du build nativement, sans configuration. Résultat concret : le
schematic Transloco a généré un `TranslocoHttpLoader` pointant vers un chemin
(`src/assets/i18n/`) qui n'existait pas dans le build final — corrigé en
déplaçant les fichiers vers `public/i18n/` et en adaptant le loader. **Retenir
de cet épisode** : ne jamais supposer qu'un schematic ou générateur officiel
connaît la structure exacte d'une app Nx particulière — vérifier où le build
sert réellement les assets avant de faire confiance au chemin généré par défaut.

## Piège réel rencontré : le schematic Transloco génère `@Injectable`, pas `@Service()`

Le schematic officiel `nx g @jsverse/transloco:ng-add` génère
`transloco-loader.ts` avec `@Injectable({ providedIn: 'root' })` — l'idiome
Angular pré-19, alors que ce repo a déjà tranché (voir le commit `b5d94dd`,
incident OPS-25bis) que `@Service()` est l'idiome à utiliser partout, y compris
pour du code produit par un outil tiers. **Ce n'est pas automatique** : corrigé
manuellement une fois après génération, mais le schematic régénérera
`@Injectable` à l'identique si quelqu'un le relance sur une future app. Vérifie
systématiquement ce fichier après tout `nx g @jsverse/transloco:ng-add` — ce
n'est pas un problème que ce repo peut corriger dans le schematic tiers
lui-même, seulement un point de vigilance documenté ici.

## Pourquoi Transloco plutôt que le pattern `i18next`/`TranslationPort` déjà présent (ADR-0024)

`backoffice-angular` utilise déjà un `TranslationPort` agnostique
(`libs/shared/application/src/lib/ports/translation.port.ts`) avec un adaptateur
i18next (`I18nextTranslationService`,
`libs/shared/ui/src/lib/services/i18next-translation.service.ts`), motivé par
l'ADR-0024 : garder un contrat de traduction portable entre Angular et un futur
consommateur React, sans dépendre d'un mécanisme propre à Angular.

Le choix de Transloco pour les apps de test (`newsletter-test`) diverge
**délibérément** de ce pattern existant, sur la base de deux critères
explicitement posés par l'utilisateur : facilité d'automatisation (Transloco a
un schematic Nx officiel qui pose tout le squelette en une commande —
`nx g @jsverse/transloco:ng-add`, alors que le pattern `TranslationPort` exige
un `AppInitializer` et un wrapper maison écrits à la main) et minimisation de
l'action humaine. Cette divergence est **assumée et documentée ici**, pas une
incohérence oubliée : ce repo contient donc aujourd'hui deux mécanismes i18n
Angular distincts (`i18next`/`TranslationPort` dans `backoffice-angular`,
Transloco dans `newsletter-test`), chacun légitime dans son contexte. Si une
future consolidation devient nécessaire (ex. faire converger les deux), elle
doit être tranchée explicitement — ne pas la déduire silencieusement de ce
document.

## Ce que ce document ne couvre pas

- Il ne documente pas comment câbler Transloco/react-i18next pas à pas (voir
  directement les fichiers de `apps/newsletter-test/src/app/` et
  `apps/newsletter/src/app/` comme référence vivante, dans le même esprit que
  [`scaffold-tailwind-apps.md`](./scaffold-tailwind-apps.md) renvoie aux apps de
  référence plutôt qu'à un template figé).
- Il ne tranche pas la question de la consolidation entre les deux mécanismes
  i18n Angular coexistants (voir section précédente) — c'est une décision future
  distincte, pas actée ici.
- Il n'automatise pas l'installation de Transloco/react-i18next sur une future
  app — contrairement à `tools/scaffold-tailwind.mjs` (Tailwind) et
  `tools/scaffold-lib-wiring.mjs` (câblage lib→app), aucun script équivalent
  n'existe pour l'i18n à la date de ce document. Décision explicite de ne pas
  l'automatiser dans l'immédiat, faute d'un deuxième cas réel après
  `newsletter-test`/`newsletter` pour valider le pattern avant de l'outiller
  (même discipline que celle qui a précédé `scaffold-tailwind.mjs` : 2 cas réels
  avant d'automatiser).

## Historique

Écrit le 2026-08-27, après avoir validé Transloco (Angular) et react-i18next
(React) sur les deux apps de test `newsletter-test`/`newsletter` — d'abord
recommandé par erreur `@angular/localize` côté Angular sans avoir vérifié
l'existant, corrigé après découverte de l'ADR-0024 et du pattern
`TranslationPort`/`i18next` déjà en place dans `backoffice-angular`. Voir aussi
[`scaffold-tailwind-apps.md`](./scaffold-tailwind-apps.md) et
[`scaffold-lib-wiring.md`](./scaffold-lib-wiring.md) pour le même type de
décision (documenter une frontière ou une divergence assumée plutôt que de la
deviner ou de la cacher).

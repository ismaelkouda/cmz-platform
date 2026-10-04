# Internationalisation et générateur multi-stack

> Référence courante pour un humain ou un LLM. La décision normative Angular est
> [ADR-0085](../adr/0085-angular-i18n-native-localize.md). Les décisions
> Transloco de l'ADR-0036 sont historiques et supersédées.

## Frontière de responsabilité

Les moteurs métier `action-request`, `list-query` et leurs compositions
produisent des modèles, clients, commandes et validateurs. Ils n'inventent pas
les titres, labels ou messages d'une interface. L'internationalisation du texte
visible appartient au renderer de la stack et au code de présentation.

Le générateur ne doit donc pas introduire une abstraction i18n neutre. Il doit
émettre le mécanisme idiomatique de sa cible :

- Angular : `@angular/localize`, attributs `i18n` / `i18n-*`, `$localize` ;
- ReactJS : mécanisme React qualifié séparément lorsque le renderer React UI
  sera construit ;
- une future stack mobile : ressources natives de cette stack.

Les stacks peuvent partager les identifiants métier et les scénarios de test,
pas un service de traduction runtime.

## Baseline obligatoire d'une application Angular

Le renderer `angular-pwa-shell-renderer.mjs` doit produire :

1. `project.json.i18n.sourceLocale = "fr"` ;
2. `@angular/localize/init` dans les polyfills de build ;
3. `@angular/localize` dans les types de compilation et de test ;
4. des textes statiques annotés avec `i18n="sens@@identifiant.stable"` ;
5. aucun loader de dictionnaire, aucun `public/i18n/*.json`, aucun provider de
   bibliothèque tierce ;
6. un manifeste `.cmz/libraries.json` qui ne déclare pas l'i18n : celle-ci est
   une capacité native du shell, pas un opt-in.

Pour un attribut visible ou accessible, employer `i18n-placeholder`,
`i18n-title`, `i18n-aria-label`, etc. Un message construit en TypeScript utilise
un tagged template `$localize` et un identifiant stable. Une concaténation de
fragments traduits est interdite : le traducteur doit voir la phrase entière.

## Cas historique du backoffice

Le backoffice adresse encore 1 869 messages français par clés dynamiques. Ces
clés alimentent des erreurs, routes et composants produits avant la décision
native. Elles ne peuvent pas être converties automatiquement en attributs de
template sans modifier leur contrat.

La solution transitoire est volontairement bornée :

```text
messages.fr.source.json
        │ génération déterministe
        ▼
messages.fr.generated.ts           (index agrégateur borné)
messages.fr.pack-NNN.generated.ts  ($localize`:@@KEY:message`)
        │ provider Angular
        ▼
LocalizeTranslationService.translate(key, params)
```

Le JSON :

- vit dans `src/locale`, pas dans `public` ;
- n'est jamais téléchargé par le navigateur ;
- contient uniquement des feuilles `string` ;
- génère une entrée `$localize` statique par clé ;
- est contrôlé par `check:i18n` et un test de bijection source/généré.

Le service retourne la clé absente au lieu de masquer une erreur et préserve un
placeholder `{{name}}` si son paramètre manque. Il n'offre aucun changement de
langue runtime et ne doit pas être copié dans une application nouvelle.

## Ajouter une nouvelle langue Angular

Ne pas ajouter un sélecteur ou un loader HTTP par réflexe. D'abord confirmer le
besoin produit, les locales, le fallback, la traduction des données backend, les
formats date/nombre/devise, les URL et la stratégie de déploiement.

Puis suivre le pipeline Angular officiel :

1. annoter les sources et stabiliser les identifiants ;
2. extraire les messages (`ng extract-i18n`) vers XLIFF ;
3. faire traduire et valider le catalogue ;
4. déclarer les locales et fichiers dans `project.json` ;
5. construire et déployer une variante compilée par locale ;
6. tester navigation, langue du document, pluralisation, formats, a11y et
   absence de texte source inattendu.

Une exigence explicite de changement de langue sans rechargement constituerait
un nouveau problème produit. Elle exige une ADR et une comparaison mesurée ;
elle ne réactive pas automatiquement Transloco.

## ReactJS

React n'hérite ni de `$localize` ni du service Angular. Le moment venu, son
choix doit être évalué sur le besoin réel (compilation ou runtime, SSR,
Suspense, découpage des catalogues, fallback, extraction) et sur la version
installée. La présence historique d'i18next dans le dépôt ne vaut pas décision
automatique pour le futur renderer.

## Gates et commandes

- `bun run i18n:generate:angular` régénère le pont historique ;
- `bun run check:i18n` prouve fraîcheur, bijection, clés et absence de runtime
  Transloco/dictionnaire public ;
- `bunx ngc -p <app>/tsconfig.app.json --noEmit` valide les templates ;
- les builds de production valident la transformation `$localize` ;
- l'E2E vérifie le rendu français et l'absence de requête `/i18n/fr.json`.

## Anti-patterns

- considérer un schematic tiers comme recommandation officielle Angular ;
- charger par HTTP un catalogue mono-langue qui peut être compilé ;
- créer une recette `add-library` pour une capacité native du shell ;
- utiliser le pont de clés historiques comme API par défaut ;
- créer un `TranslationPort` pour donner une fausse portabilité Angular/React ;
- laisser une documentation historique sans marqueur « supersédé » ;
- déclarer la migration terminée sans build ni preuve d'absence de réseau.

## Historique

Le dépôt a d'abord utilisé i18next derrière un port, puis Transloco en 2026-08.
Ces étapes restent décrites dans les ADR historiques pour expliquer les choix et
incidents, mais ne constituent plus des instructions. Le 2026-10-04, le besoin
réel (application Angular française, sans switch runtime) et la politique «
natif d'abord » ont conduit à la migration vers `@angular/localize`.

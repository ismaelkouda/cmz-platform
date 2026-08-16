# Validation runtime de la tranche `action-request`

## Verdict

La tranche générée `action-request` est cohérente localement sur les cibles
Angular et ReactJS pour les comportements explicitement décrits ci-dessous. La
preuve porte sur les modules réellement émis par les renderers, chargés et
exécutés après compilation TypeScript ; elle ne repose pas sur une
réimplémentation manuelle de leur logique dans les tests.

PLAT-5 est satisfait localement sur cette tranche : des mutations de contrainte,
d'effet de session et d'accès sont détectées par le même Oracle sur les deux
cibles. La promotion formelle en M4 reste conditionnée à l'exécution verte du
lot en CI. Ce résultat ne suffit pas seul au claim de « plateforme générique ».
La seconde famille est évaluée séparément dans
[`validation-runtime-workflow-action.md`](./validation-runtime-workflow-action.md).

## Chaîne exercée

```text
fixture d'IR canonique
    -> renderer Angular + renderer ReactJS
    -> compilation stricte des deux arbres
    -> matérialisation isolée en répertoire temporaire
    -> chargement des modules JavaScript produits
    -> exécution avec ports HTTP, Fetch, hooks et session contrôlés
    -> assertions métier communes et assertions propres à chaque cible
```

Le harness est
[`tools/generator-platform/core/runtime-harness.mjs`](../../tools/generator-platform/core/runtime-harness.mjs)
et l'Oracle exécutable est
[`tools/generator-platform/action-request-runtime.test.mjs`](../../tools/generator-platform/action-request-runtime.test.mjs).
La campagne de falsification est
[`tools/generator-platform/action-request-mutations.test.mjs`](../../tools/generator-platform/action-request-mutations.test.mjs).
Les preuves propres aux frameworks vivent dans
[`stack-tests/angular/action-request.spec.ts`](../../tools/generator-platform/stack-tests/angular/action-request.spec.ts)
et
[`stack-tests/reactjs/action-request.spec.ts`](../../tools/generator-platform/stack-tests/reactjs/action-request.spec.ts).
Le gate agrégé `bun run check:generator-platform` exécute successivement le core
Node, Angular natif et ReactJS natif ; il est câblé dans la CI existante.

Angular utilise Vitest, jsdom, l'environnement zoneless et `TestBed` pour
résoudre les injectables générés. ReactJS utilise React/ReactDOM réels et React
Testing Library (`renderHook` + `act`) : le port de hooks n'est donc plus testé
uniquement par une imitation manuelle.

## Cas vérifiés

### Validation des entrées

Chaque ligne exige exactement la même liste ordonnée d'erreurs sur les deux
cibles, pas seulement le même verdict valide/invalide.

| Commande        | Entrée exercée                 | Résultat attendu                           |
| --------------- | ------------------------------ | ------------------------------------------ |
| login           | email et mot de passe valides  | aucune erreur                              |
| login           | email blanc                    | `required`, puis `format:email`            |
| login           | email mal formé                | `format:email`                             |
| login           | mot de passe blanc             | `required`                                 |
| forgot-password | email valide                   | aucune erreur                              |
| forgot-password | email blanc                    | `required`, puis `format:email`            |
| reset-password  | entrée complète valide         | aucune erreur                              |
| reset-password  | confirmation différente        | `equals:password`                          |
| reset-password  | tous les champs textuels vides | erreurs exactes par champ, ordre déterminé |

### Transport et accès public

Les deux sorties exécutent `login`, `forgot-password` et `reset-password` avec
la méthode `POST`, les chemins attendus, la normalisation d'une URL de base se
terminant par `/` et un corps strictement égal à l'entrée.

- Angular : le `HttpContext` porte `PUBLIC_REQUEST=true` pour chaque requête.
- ReactJS : la requête Fetch ne transporte que l'en-tête JSON produit par le
  renderer ; aucun mécanisme d'authentification n'est injecté dans ce profil.

### Effets de session et ordre causal

- `login` persiste exactement le `user` et le `token` de la réponse ;
- le succès n'est observable qu'après résolution de la persistance ;
- `forgot-password` et `reset-password` ne persistent aucune session ;
- le résultat métier reste celui retourné par le transport.

### Échecs

- un échec de transport est propagé et empêche la persistance de session ;
- un échec de persistance est propagé et empêche un faux succès ;
- côté ReactJS, les deux familles d'échec produisent aussi l'état de commande
  `error` ;
- côté Angular, les erreurs restent observables par le canal RxJS.

## Campagne de falsification PLAT-5

Les mutants restent conformes au schéma et aux invariants structurels de l'IR,
puis sont compilés et exécutés comme la référence. Un mutant n'est compté comme
tué que si l'assertion comportementale attendue échoue sur **chaque** cible.

| Mutation intentionnelle                               | Oracle Angular               | Oracle ReactJS                  | Résultat |
| ----------------------------------------------------- | ---------------------------- | ------------------------------- | -------- |
| suppression de `equals:password` sur la confirmation  | validation exacte            | validation exacte               | tué      |
| suppression de l'effet `establish_session` de `login` | ordre/persistance de session | persistance de session          | tué      |
| `public/none` remplacé par `authenticated/bearer`     | `PUBLIC_REQUEST`             | contrat `FetchPort` authentifié | tué      |

La première exécution a volontairement précédé la réparation. Elle a révélé deux
faiblesses :

- la mutation d'accès survivait côté ReactJS, car le mode d'authentification
  n'était pas transmis au `FetchPort` généré ;
- supprimer le dernier effet de session cassait la compilation, car les ports de
  session étaient générés inconditionnellement.

Les renderers transmettent désormais explicitement l'authentification de
transport et n'émettent le contrat de session que lorsqu'un effet le requiert.
Le validateur rejette aussi les contradictions `public` avec transport
authentifié et `authenticated/authorized` avec transport anonyme.

## Seconde fonctionnalité indépendante

La définition déclarative
[`support-request.definition.json`](../../tools/generator-platform/sources/support-request.definition.json)
prouve que le pipeline n'est plus limité aux noms et effets de
l'authentification. Elle décrit une demande de support authentifiée, avec
validation d'email, transport Bearer et aucun effet de session.

La même définition est compilée, générée et exécutée sur Angular et ReactJS. Les
profils développent `{domain}` en packages `support`, les artefacts générés
emploient des noms neutres `ActionRequest*`, et aucun port de session n'est
émis. La commande reproductible et le parcours utilisateur sont documentés dans
[`creer-une-action-request.md`](../guides/creer-une-action-request.md).

## Limites de la preuve

Cette validation ne couvre pas :

- un serveur réel, un contrat OpenAPI ou les variantes de payload du backend ;
- la chaîne réelle d'intercepteurs Angular et une application hôte complète ;
- un navigateur réel : le runtime officiel React/ReactDOM est exécuté sous
  jsdom, pas sous Chromium/WebKit/Firefox ;
- le stockage réel de session, sa sécurité ou son cycle de vie ;
- l'acquisition d'un credential et la construction réelle d'un en-tête Bearer ;
  le mutant d'accès prouve la transmission du mode au port hôte ;
- les timeouts, annulations, retries, concurrence et réponses mal formées ;
- l'accessibilité, l'interface utilisateur, la performance ou la sécurité
  applicative de bout en bout ;
- les comportements de `workflow-action`, couverts par un Oracle distinct ;
- une campagne exhaustive par opérateurs de mutation ; seuls les invariants
  nommés ci-dessus sont prouvés.

## Avis Principal Engineer

La décision correcte est de **garder** cette tranche comme banc vertical réduit
et de **ne pas étendre** encore le catalogue de sources ou de stacks. Le test a
franchi le seuil « le code généré compile » vers « les invariants principaux
s'exécutent de façon équivalente sur deux runtimes ».

Il faut cependant **refuser** deux raccourcis : assimiler des ports simulés à
une intégration produit, ou considérer `action-request` comme représentatif des
workflows avec états, permissions et branches. PLAT-4 confirme désormais qu'un
Behavior Model séparé est nécessaire ; cette séparation doit être conservée.

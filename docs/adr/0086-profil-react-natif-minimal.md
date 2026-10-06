# ADR-0086 — Profil React natif, minimal et qualifié par capacité

- **Statut :** Accepted
- **Date :** 2026-10-06
- **Supersède :** [ADR-0012](./0012-strategie-cross-framework.md)

## Contexte

La plateforme produit déjà des artefacts React pour `list-query`,
`action-request` et certaines compositions. L'application
`workspace-react-proof` prouve également le routage, le maintien de vues et une
partie du cycle de vie React. Ces preuves ne définissent cependant pas encore
le profil complet d'une application métier React.

Le dépôt contient aussi des dépendances héritées de SEOS, des outils Angular et
des bibliothèques utiles à des fonctionnalités précises. Leur présence au
`package.json` racine ne signifie pas qu'elles appartiennent au socle React. Les
copier par symétrie fabriquerait une stack coûteuse, difficile à expliquer et
contraire à la règle « natif avant custom ».

La documentation React recommande généralement un framework pour une nouvelle
application. Notre cas possède toutefois déjà un planner, des contrats de
données, des renderers, une configuration runtime et des Oracles. React Router
documente son mode déclaratif pour les applications qui disposent de leurs
propres abstractions de données. Ajouter un second modèle de loaders, actions,
revalidation et publication créerait deux autorités concurrentes.

## Décision

### Baseline obligatoire

Une nouvelle cible React web est une SPA mono-stack construite avec :

- React, React DOM et TypeScript ;
- Nx pour le graphe, l'orchestration et le cache ;
- Vite et son plugin React pour servir et construire ;
- React Router en **mode déclaratif** pour l'URL et la navigation ;
- les Hooks React, les props et le contexte local comme état nominal ;
- `useSyncExternalStore` seulement pour un store réellement externe à React ;
- le `FetchPort` hôte et les clients générés pour tout échange métier ;
- Tailwind pour les utilitaires et SCSS Modules pour les styles de composant ;
- Vitest, React Testing Library, Playwright et axe-core pour les preuves
  automatisables.

Les versions sont celles du catalogue et du `package.json` racine. Elles ne
sont pas recopiées dans cette ADR.

### Données, état et formulaires

Le renderer ne fait aucun `fetch` direct depuis un composant de présentation.
Il consomme les clients typés produits à partir des contrats et reçoit le
transport via le `FetchPort` du host. Cache, déduplication, invalidation et
annulation restent les responsabilités explicites des contrats existants.

TanStack Query, Redux, Zustand, React Hook Form, Zod ou une bibliothèque
équivalente ne font pas partie du baseline. Une de ces bibliothèques peut être
qualifiée sur un cas réel si les primitives existantes ne satisfont pas un
besoin mesurable. La qualification doit démontrer le gain, la compatibilité, le
coût bundle, l'accessibilité applicable, le cycle de vie, la sécurité et la
stratégie de retrait.

Un formulaire simple utilise les contrôles HTML, l'état React et les règles
issues du contrat. Le renderer ne duplique pas un schéma de validation déjà
autoritaire et n'invente pas une validation métier absente.

### Présentation et accessibilité

Le HTML sémantique et les comportements natifs sont le premier choix. Tailwind
et SCSS Modules partagent les tokens et la présentation, sans runtime CSS-in-JS
ni feuille globale métier. Material 3, Fiori et les références de présentation
du dépôt peuvent guider l'ergonomie ; ils n'imposent pas une bibliothèque de
composants React ni la copie des composants Angular Material.

Un widget complexe — combobox, calendrier, grille interactive, overlay ou
sélection riche — ne doit pas être réinventé. React Aria Components est le
premier candidat à évaluer parce qu'il sépare comportement accessible et style,
mais il n'est installé qu'après une qualification `add-library` sur le premier
cas réel. Aucun package n'est ajouté pour obtenir une symétrie avec Angular.

### Internationalisation

React ne réutilise ni `@angular/localize`, ni le pont historique Angular, ni un
`TranslationPort` cross-framework. Les textes statiques et accessibles
appartiennent au renderer React ; les formats de date, nombre et liste utilisent
d'abord les API `Intl` du navigateur. Les libellés métier dynamiques restent des
données contractuelles.

La première application francophone sans changement de langue runtime ne
justifie pas un runtime i18n tiers. Un besoin réel de changement de langue,
d'extraction, de fallback, de découpage de catalogues ou de SSR déclenche une
comparaison React séparée. La présence historique d'i18next dans le dépôt ne
vaut pas admission.

### Ce qui est partagé entre Angular et React

Les deux cibles partagent :

- evidence, modèles canoniques et Artifact Plan ;
- contrats réseau et sémantique métier ;
- permissions, scénarios observables et critères d'acceptation ;
- tokens de conception quand leur signification est réellement commune.

Elles ne partagent pas :

- composants visuels, runtime UI ou mécanisme de traduction ;
- gestionnaire d'état, lifecycle ou injection propres au framework ;
- loaders de route, formulaires ou abstractions ajoutés pour masquer les
  différences entre stacks.

Chaque sortie reste mono-stack, conformément à l'ADR-0034.

## Alternatives rejetées

### Copier la stack Angular

Rejeté : Angular Material, Angular Aria, `@angular/localize`, DI et Signals sont
des choix idiomatiques Angular. Les transposer conceptuellement ou par wrappers
affaiblirait les deux cibles.

### Utiliser React Router Data ou Framework par défaut

Rejeté à ce stade : loaders, actions et revalidation concurrenceraient les
contrats et clients de la plateforme. Ce choix sera réévalué si un besoin réel
de SSR, SSG, RSC, préchargement de routes ou élimination de waterfalls ne peut
pas être satisfait proprement dans le profil actuel.

### Adopter Next.js, MUI, un store global ou une couche de requêtes par défaut

Rejeté : aucune exigence actuelle ne justifie leur runtime, leur modèle ou leur
surface de maintenance. Leur qualité intrinsèque ne constitue pas une preuve de
besoin dans ce dépôt.

### Mutualiser des adaptateurs UI cross-framework

Rejeté : la plateforme partage la signification et les preuves, pas un plus
petit dénominateur commun de rendu.

## Conséquences et limites

- Le socle React est plus petit, lisible et remplaçable.
- Toute dépendance supplémentaire porte une justification locale et des
  Oracles proportionnés.
- La SPA assume de construire certaines capacités de shell ; ce coût est suivi
  et peut invalider la décision si les besoins changent.
- `workspace-react-proof` reste une preuve de lifecycle, pas une application
  métier de référence complète.
- La parité React n'est pas acquise par cette ADR. Elle exige encore un vertical
  slice métier composite produit et vérifié de bout en bout.

## Critères de réévaluation

Rouvrir la décision si une exigence vérifiée impose au moins l'un des points
suivants : rendu serveur, génération statique, React Server Components,
waterfalls de navigation non résolus, changement de langue runtime, formulaires
dynamiques dont la complexité dépasse le contrat actuel, ou widget accessible
complexe non couvert par le HTML natif.

## Références

- [React — Creating a React App](https://react.dev/learn/installation)
- [React — Build a React app from Scratch](https://react.dev/learn/build-a-react-app-from-scratch)
- [React Router — Picking a Mode](https://reactrouter.com/start/modes)
- [Nx — React](https://nx.dev/docs/technologies/react)
- [Nx — Vite](https://nx.dev/docs/technologies/build-tools/vite/introduction)
- [React — `useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore)
- [React — You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [React Aria](https://react-aria.adobe.com/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [ADR-0034](./0034-plateforme-multi-stack-renderers-separes-sorties-mono-stack.md)
- [ADR-0044](./0044-bibliotheques-ui-opt-in-apres-create-app.md)
- [ADR-0080](./0080-prouver-la-valeur-avant-nouvelle-automatisation.md)

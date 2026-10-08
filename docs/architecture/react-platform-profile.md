# Profil React de la plateforme

> Référence vivante pour un humain ou un LLM. La décision normative est
> [ADR-0086](../adr/0086-profil-react-natif-minimal.md). Ce document décrit
> comment l'appliquer aujourd'hui ; il ne transforme pas les dépendances
> présentes à la racine en dépendances autorisées par défaut.

## 1. Objectif

Le profil permet de produire une application React idiomatique depuis la même
intention métier qu'une application Angular, sans construire un framework UI
universel. La parité recherchée porte sur le comportement observable : données,
permissions, validation, erreurs, invalidation, accessibilité et scénarios. Elle
ne porte ni sur les packages, ni sur la structure des composants.

La règle de décision est :

1. identifier la capacité réellement demandée ;
2. utiliser une primitive officielle ou native si elle la couvre ;
3. réutiliser une capacité déjà qualifiée dans le dépôt ;
4. qualifier une dépendance seulement si le manque est démontré ;
5. écrire du custom seulement lorsque les trois voies précédentes sont
   inadéquates et que ses Oracles sont définis.

## 2. Hiérarchie d'autorité

En cas de divergence, appliquer cet ordre :

1. contrat métier et décision produit approuvée ;
2. ADR acceptée la plus récente ;
3. documentation officielle correspondant aux versions installées ;
4. profil courant et conventions du dépôt ;
5. preuve runtime et tests ;
6. exemple ou image avec autorité explicite ;
7. préférence locale.

Une image de mise en page n'autorise jamais un endpoint, une permission ou une
capacité métier. Une dépendance du monorepo n'autorise jamais son emploi dans
une nouvelle cible.

## 3. Baseline et dépendances conditionnelles

| Besoin            | Baseline React                                     | Admission conditionnelle                               |
| ----------------- | -------------------------------------------------- | ------------------------------------------------------ |
| runtime           | React + React DOM + TypeScript                     | aucune alternative sans ADR                            |
| workspace/build   | Nx + Vite + plugin React                           | changer seulement sur mesure incompatible              |
| navigation        | React Router déclaratif                            | Data/Framework après besoin de navigation mesuré       |
| état local        | props, `useState`, `useReducer`, contexte borné    | store externe après graphe réellement partagé          |
| store externe     | `useSyncExternalStore`                             | Redux/Zustand après qualification                      |
| données métier    | clients générés + `FetchPort` hôte                 | bibliothèque de query après gap mesuré                 |
| formulaires       | HTML natif + état React + validation contractuelle | bibliothèque form/schema après cas complexe réel       |
| styles            | Tailwind + SCSS Modules + tokens                   | aucune CSS-in-JS par défaut                            |
| i18n              | wording React local + `Intl`                       | runtime i18n après besoin multilingue réel             |
| widgets simples   | HTML sémantique                                    | aucune dépendance                                      |
| widgets complexes | évaluation React Aria Components                   | installation après qualification complète              |
| unit/intégration  | Vitest + React Testing Library                     | outil supplémentaire seulement pour une lacune prouvée |
| navigateur/a11y   | Playwright + axe-core + revue humaine AT           | service externe après valeur marginale démontrée       |

`package.json` et le catalogue Bun restent l'autorité de version. Ce tableau
décrit des rôles, pas une liste de versions copiée dans la documentation.

## 4. Architecture d'une cible

```text
intention / evidence / contrats
              │
              ▼
   modèle canonique + Artifact Plan
              │
              ▼
        renderer React dédié
              │
              ├── domaine et types purs
              ├── clients générés
              ├── contrôleurs/hooks React
              └── présentation React
                         │
                         ▼
                adaptateurs du host
          FetchPort · config runtime · session
```

Le composant de présentation ne connaît ni l'URL d'environnement ni le backend
concret. Le host injecte un transport et une configuration validée. Les clients
générés matérialisent les contrats ; les hooks traduisent leur état dans le
lifecycle React ; la vue ne recode pas leur protocole.

## 5. Règles par capacité

### 5.1 Routing

- Employer `BrowserRouter`, `Routes`, `Route`, `Link`, `NavLink`, `useNavigate`
  et `useLocation` selon le besoin.
- Le routeur porte l'URL, l'historique, les paramètres et la navigation ; il ne
  devient pas une seconde couche métier.
- Ne pas placer un loader ou une action React Router en concurrence avec un
  `list-query` ou un `action-request`.
- Une route profonde, un refresh et les boutons précédent/suivant doivent être
  prouvés au navigateur.
- Toute évolution vers Data/Framework Mode exige un contrat de propriété entre
  routeur et plateforme avant le premier code.

### 5.2 État et effets

- Dériver une valeur pendant le rendu plutôt que la recopier par `useEffect`.
- Utiliser un événement utilisateur pour un effet provoqué par cet événement.
- Réserver `useEffect` à la synchronisation avec un système externe et fournir
  un cleanup symétrique.
- Garder l'état aussi local que possible ; ne pas promouvoir un état pour éviter
  quelques props sans analyser sa durée de vie.
- `useSyncExternalStore` exige un snapshot immuable et stable, un abonnement
  stable et un désabonnement réel.
- Les modes React de développement ne doivent provoquer ni double mutation
  distante ni listener résiduel.

### 5.3 Réseau et données

- Aucun `fetch`, Axios ou URL d'environnement dans la présentation.
- Le `FetchPort` est fourni par le host et consommé par le client généré.
- La normalisation des réponses dépend d'un contrat explicite : tableau, page,
  objet unique ou autre forme ne sont jamais devinés à partir d'une propriété
  nommée `data`.
- Retry, pagination, annulation, invalidation et erreurs partielles restent
  observables et testables.
- Une mutation ne rafraîchit que les ressources nommées par son contrat après
  succès distant confirmé.

### 5.4 Formulaires

- Chaque champ possède un label programmatique, une description si utile et une
  erreur associée.
- Les attributs HTML (`required`, type, autocomplete) sont utilisés lorsqu'ils
  expriment correctement la règle.
- La validation client améliore l'expérience ; elle ne remplace pas la réponse
  autoritative du backend.
- Une erreur conserve les valeurs et le focus utile. Un succès suit exactement
  les effets déclarés : fermeture, notification et invalidation nommée.
- Un schéma tiers n'est pas ajouté pour recopier des règles déjà générées.

### 5.5 Styles et adaptation

- Tailwind exprime les utilitaires répétables ; SCSS Modules porte la structure
  locale, les états complexes et les sélecteurs difficiles à lire en classes.
- `create-app --profile react-spa` produit le shell React natif sans imposer de
  bibliothèque visuelle. Tailwind est désormais une capacité opt-in qualifiée :
  `add-library` applique la piste vérifiée React 19 + Vite 8 via le plugin
  officiel `@tailwindcss/vite`, puis exécute build, lint et tests avant une
  publication atomique.
- Le fichier global `tailwind.css` porte uniquement l'import Tailwind, le thème
  partagé et les sources bornées. Les directives Tailwind ne sont pas placées
  dans un fichier SCSS : SCSS Modules reste un pipeline séparé pour les styles
  locaux complexes.
- Une bibliothèque de workspace externe n'est ajoutée aux sources Tailwind que
  lorsqu'elle est réellement consommée par l'app et après requalification de
  l'adaptateur. Le scan global du monorepo est interdit.
- Les tokens, reset et thèmes peuvent être globaux ; les styles métier ne le
  sont pas.
- Ne pas construire de classe Tailwind dynamiquement si le scanner ne peut pas
  la voir.
- Le layout répond à l'espace utile et au contenu, pas à une matrice de pixels
  présentée comme une norme universelle.
- Compact, Medium et Expanded sont des contextes d'usage. Ils ne prescrivent pas
  automatiquement bottom sheet, side sheet ou dialogue centré.

### 5.6 Internationalisation

- Pour une application française sans changement runtime, garder les messages
  statiques près de la présentation et utiliser `Intl` pour les formats.
- Séparer message UI et donnée métier ; ne pas traduire les codes métier par
  heuristique.
- Les identifiants sémantiques et scénarios peuvent être communs avec Angular ;
  les fichiers, runtime et appels ne le sont pas.
- Avant toute bibliothèque, documenter : locales, changement runtime ou build,
  extraction, fallback, pluriels, SSR, lazy loading et contribution traducteur.

### 5.7 Accessibilité

- Commencer par l'élément HTML qui possède déjà la sémantique et le clavier
  attendus.
- Ne pas remplacer un bouton, lien, tableau ou dialogue natif par un `div`
  enrichi d'ARIA.
- Un composant complexe doit couvrir clavier, focus, lecteur d'écran, toucher,
  RTL, zoom, reflow et contraste dans son contexte réel.
- axe-core couvre seulement les règles automatisables. VoiceOver/NVDA, zoom
  navigateur réel et compréhension de la tâche restent des revues humaines.
- Une dépendance accessible ne rend pas automatiquement la composition finale
  accessible.

## 6. Matrice de capacités Angular ↔ React

| Capacité                    | Angular                                       | React                                                                                                                    | État React honnête                 |
| --------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| shell/build                 | Angular CLI/Nx                                | `create-app --profile react-spa` + Nx/Vite                                                                               | prouvé sur shell C5 versionné      |
| routing                     | Angular Router                                | React Router déclaratif                                                                                                  | prouvé                             |
| état de vue                 | Signals/primitives Angular                    | Hooks React                                                                                                              | prouvé par primitives et workspace |
| store externe               | service/signal adapté                         | `useSyncExternalStore`                                                                                                   | prouvé sur workspace               |
| requêtes/actions            | clients générés + host                        | clients générés + `FetchPort`                                                                                            | prouvé dans la page C5             |
| composition N×N             | preuve C5 Angular                             | runtime C5 généré, publié et relié par host ; page réalisée sous work order `react-spa` et quatre oracles confinés verts | prouvé hors navigateur             |
| styles utilitaires          | Tailwind via PostCSS qualifié                 | Tailwind via plugin Vite officiel qualifié ; SCSS Modules séparé                                                         | prouvé techniquement               |
| UI officielle complexe      | Angular Material/CDK/Aria selon qualification | HTML natif ; React Aria candidat non encore qualifié                                                                     | non qualifié                       |
| i18n                        | `@angular/localize`                           | messages locaux + `Intl` pour le besoin actuel                                                                           | décision, preuve d'app à produire  |
| tests unitaires             | Vitest                                        | Vitest + React Testing Library                                                                                           | prouvé                             |
| navigateur/accessibilité    | Playwright + axe + humain                     | Playwright + axe + humain                                                                                                | automatisable partiellement prouvé |
| app métier composite réelle | C5 utilisateurs                               | shell, composition, host et présentation C5 reliés ; preuve navigateur et revue humaine encore dues                      | partiel                            |

Cette table interdit de déclarer une parité à partir de la seule présence d'un
renderer ou d'une documentation.

## 7. Protocole d'admission d'une bibliothèque

Avant d'ajouter une dépendance React :

1. isoler un cas réel et son échec avec le baseline ;
2. vérifier la documentation officielle sur la version candidate ;
3. comparer primitive native, capacité déjà présente et candidat tiers ;
4. vérifier maintenance, licence, sécurité, tree-shaking et compatibilité ;
5. prototyper dans un candidat jetable, jamais directement dans l'app cible ;
6. mesurer bundle, comportement, accessibilité et lifecycle ;
7. définir version, manifeste, Oracles, mise à jour et retrait ;
8. publier seulement après revue du diff et des preuves.

Popularité, familiarité, présence dans SEOS ou équivalence apparente avec une
bibliothèque Angular ne sont pas des critères d'admission.

## 8. Preuve de sortie et prochain seuil

Le vertical slice de gestion des utilisateurs couvre maintenant, sous work
order, la liste, la création, l'invalidation, les erreurs, les permissions et la
structure adaptative. Il utilise le même modèle canonique qu'Angular, une
implémentation React propre et un serveur déterministe local ; compilation,
lint, tests et build production sont verts.

La preuve automatisable du navigateur est maintenant fournie par ADR-0091 :
transport exact, axe, focus, reflow, trois géométries, neuf candidats, budget de
ressources et profil CDP nightly. Elle a corrigé l'accès clavier de la région
tabulaire et la géométrie du dialogue neutralisée par le reset Tailwind.

Le prochain seuil crédible doit désormais :

- fermer les trois écarts Compact consignés par ADR-0091 : chargement
  progressif, filtre modal à deux niveaux et FAB C5 ;
- faire relire les neuf candidats par un humain sans les transformer
  implicitement en baseline ;
- exécuter la revue ciblée VoiceOver/NVDA et le zoom réel multi-OS ;
- rester hermétique en PR ; le backend SEOS live relève de la politique séparée.

Tant que les trois écarts Compact et la preuve humaine ne sont pas fermés, la
surface React reste une preuve technique gouvernée, pas une parité produit M4.

## 9. Non-objectifs

- reproduire toutes les bibliothèques Angular ;
- transformer React en runtime universel ;
- choisir une solution de state/query/form avant un besoin ;
- appeler SEOS depuis la CI ordinaire ;
- déclarer une stack « Big Tech » par accumulation d'outils ;
- masquer un manque de contrat derrière un composant générique.

## 10. Références locales

- [Politique de tests live SEOS](./react-live-integration-policy.md)
- [Internationalisation multi-stack](./i18n-generator-scope.md)
- [Scaffolding Tailwind](./scaffold-tailwind-apps.md)
- [Matrice de capacités](./generation-platform-capability-matrix.md)
- [ADR-0034 — renderers séparés](../adr/0034-plateforme-multi-stack-renderers-separes-sorties-mono-stack.md)
- [ADR-0044 — bibliothèques opt-in](../adr/0044-bibliotheques-ui-opt-in-apres-create-app.md)

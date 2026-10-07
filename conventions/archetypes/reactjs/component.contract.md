---
archetype: component
role: screen
shape:
    Composant React de page fonctionnel, borné au contrat de réalisation et
    branché sur la composition générée via un adaptateur host protégé.
forbid:
    - 'appel conditionnel de Hook'
    - "import direct d'une couche data ou d'un client généré"
    - 'appel HTTP, fetch, Axios ou XMLHttpRequest'
    - 'règle métier dans la présentation'
---

# Contrat d'archétype — `component` React

## Rôle

Un composant de page React rend les états du contrat, collecte les intentions
utilisateur et appelle uniquement les commandes/queries exposées par la
composition de page. Il ne reconstruit ni transport, ni validation wire, ni
permissions, ni invalidation.

## Règles mécaniques

| Invariant | Exigence |
| --- | --- |
| React | Composant fonctionnel ; Hooks au niveau supérieur ; rendu pur ; `useEffect` réservé à la synchronisation avec un système externe. |
| Frontière | Importer l'adaptateur host public de la page, jamais les clients générés ou une couche data. |
| État | Conserver une source de vérité ; dériver pendant le rendu plutôt que synchroniser des états redondants. |
| HTML | Privilégier les éléments natifs sémantiques avant ARIA ; bouton réel pour une action, lien réel pour une navigation. |
| A11y | Nom accessible, label explicite, focus visible, ordre clavier logique, annonces pour les mises à jour asynchrones. |
| Styles | Styles colocalisés via CSS Modules/SCSS et tokens existants ; aucune valeur magique qui duplique le design system. |
| Tests | Tester les comportements observables et les états du contrat avec Testing Library, sans tester les détails internes. |

## Interdictions

- Aucun `fetch`, Axios, endpoint ou secret dans la surface.
- Aucun contournement des permissions ou des invalidations de la composition.
- Aucun Hook conditionnel, gestionnaire défini par effet, ni état dérivable
  dupliqué.
- Aucun `div` cliquable lorsque HTML fournit un contrôle natif approprié.
- Aucun nouveau comportement absent du contrat de page.

## Prompt

> Produis un composant fonctionnel React pour le contrat de page. Utilise
> uniquement l'adaptateur host public et les primitives de composition déjà
> publiées. Respecte les Rules of Hooks, garde le rendu pur, utilise le HTML
> sémantique natif, des noms accessibles et les styles SCSS Modules/tokens du
> dépôt. N'invente ni endpoint, permission, état, action ou invalidation.

**Oracle** : TypeScript `tsc --noEmit`, build Nx/Vite, lint et tests Vitest /
Testing Library dans le candidat confiné.

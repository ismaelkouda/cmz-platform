# Workspace ReactJS — qualification de la primitive et contrat de l'hôte

- **Date initiale :** 2026-10-05
- **Mise à jour :** 2026-10-06
- **Statut :** primitive `Activity` et première tranche d'hôte navigateur
  qualifiées ; parité produit complète non acquise
- **Référence produit :**
  [workspace à vues vivantes](./workspace-vues-vivantes-accessibilite-2026-10-04.md)
- **Versions vérifiées :** React/ReactDOM `19.3.0`, React Router `8.4.0`

## Candidat de construction

`<Activity>` est retenu pour la première tranche exécutable : chaque frontière
est stable et identifiée par le chemin canonique. La vue active utilise
`visible` et les autres `hidden`. Fermer une vue retire sa frontière de l'arbre
React et provoque un vrai démontage, pas seulement un masquage du DOM. Cette
décision reste réversible si les tranches sécurité, dirty, capacité ou mémoire
invalident plus tard ce choix.

Cette primitive est native dans React 19.3. La preuve exécutée dans
`stack-tests/reactjs/workspace-activity.spec.tsx` établit quatre faits sur la
version verrouillée du dépôt :

1. une alternance `visible → hidden → visible` restitue le même élément DOM, le
   texte saisi et le state local ;
2. deux frontières distinctes conservent des états indépendants ;
3. le passage à `hidden` nettoie les Effects, puis le retour à `visible` les
   redémarre — un chargement déclenché au montage est donc répété ;
4. retirer la frontière détruit l'état : une nouvelle ouverture repart d'une
   nouvelle instance.

Le troisième fait est une contrainte de conception. Un Effect qui lance un GET à
chaque montage le relancera lors de l'activation. L'hôte ne peut donc pas
promettre « aucun GET au changement d'onglet » par le seul choix d'`Activity`.
Les pages devront séparer données mises en cache et Effects de présence, avec
une politique de fraîcheur ou une invalidation explicite pour tout rechargement.
Les requêtes en vol, timers, médias et ressources hors React devront être
annulés ou suspendus selon leur contrat de page. React signale notamment que les
effets intrinsèques d'un élément média ou iframe ne sont pas arrêtés par le
simple masquage du DOM.

## Frontière de l'adaptateur

Le contrat produit reste celui de l'ADR-0084. L'hôte React sera responsable des
éléments suivants, avec des tests sur une application exécutable :

| Sujet         | Comportement à prouver                                                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identité      | Une frontière par chemin canonique ; dernière URL exacte conservée, y compris paramètres et fragment.                                                    |
| Navigation    | L'activation et l'historique navigateur passent par `BrowserRouter` réel ; le mode déclaratif suffit à cette preuve et évite loaders/actions non requis. |
| Lifecycle     | Une seule vue `visible` ; les autres `hidden`, avec état local conservé et activités de fond suspendues.                                                 |
| Fermeture     | Retrait de la frontière, démontage observé, confirmation préalable des vues `dirty`, repli vers une vue autorisée.                                       |
| Sécurité      | Autorisation vérifiée avant de rendre une vue visible ; révocation et fin de session détruisent les frontières concernées, même `dirty`.                 |
| Capacité      | Refus explicite à la limite ; budget React mesuré séparément du plafond Angular de huit vues.                                                            |
| Accessibilité | Même résultat observable pour Tabs, clavier LTR/RTL, focus, fermeture et reflow ; implémentation React propre.                                           |

Le modèle de vue, les événements attendus et les scénarios de conformité sont
partageables entre cibles. Aucun handle Angular, cache de composants ou service
de navigation n'est partagé avec React. Le routeur React, le shell, la
présentation des tabs et la politique de données seront choisis à partir d'une
application cible réelle, puis vérifiés avec le même protocole navigateur que le
shell Angular.

## Première tranche d'hôte exécutable

`apps/workspace-react-proof` est une SPA Nx/Vite isolée. Ce n'est ni un nouveau
back-office, ni une bibliothèque générique, ni une promesse de parité. Son
registre de vues est un store externe minimal consommé avec
`useSyncExternalStore`. Il garantit une identité stable sans synchroniser un
état dérivé dans un Effect. La politique de données vit au-dessus des frontières
`Activity` : requête en vol et résultat sont dédupliqués, tandis que l'état
local de la page reste possédé par la vue.

React Router est utilisé en mode déclaratif uniquement pour l'URL et
l'historique. Le dépôt n'active ni mode Data, ni loaders, ni actions, ni SSR :
ces capacités n'apportent rien à l'oracle actuel et pourraient introduire des
rechargements implicites. La version `8.4.0`, encore supportée, remplace la
version `react-router-dom` 6.30.3 produite par le générateur Nx ; React Router 8
publie désormais l'API navigateur depuis `react-router`.

Seize tests Vitest et six parcours Chromium vérifient maintenant :

1. ouverture d'une URL canonique et création d'une seule frontière par vue ;
2. conservation du même nœud, d'un champ non contrôlé et du state local ;
3. zéro GET et zéro POST pendant les switches et les traversées
   précédent/suivant de l'historique ;
4. un seul GET initial malgré le redémarrage des Effects de `Activity` ;
5. retrait DOM, nouvelle identité et état local vierge après fermeture puis
   réouverture ;
6. normalisation d'une URL inconnue vers la vue épinglée ;
7. restauration de la dernière query et du dernier fragment sans changer
   l'identité canonique de la vue ;
8. refus d'une route protégée avant montage et avant GET ;
9. destruction d'une vue active ou suspendue dès le remplacement du snapshot
   d'accès, sans résurrection par l'historique ;
10. annulation du GET en vol et purge du cache lors de la révocation, puis
    nouvelle instance et nouveau GET après restitution explicite du droit ;
11. refus de toute route du workspace avant montage lorsque la session est
    absente ;
12. destruction de toutes les vues, y compris la vue épinglée, lors d'une fin ou
    d'un remplacement de session ;
13. annulation du GET en vol, cache et état local vierges dans la nouvelle
    incarnation de session ;
14. refus fail-closed d'un snapshot de droits encore lié à la session
    précédente, même lorsque le sujet métier est identique.

### Deuxième tranche : contexte d'activation exact

L'identité reste le chemin canonique, conformément à `MODEL-04` : query params
et fragment ne créent jamais une deuxième frontière `Activity`. Le registre
mémorise séparément la dernière URL d'activation observée pour chaque chemin
ouvert. Un clic sur l'onglet restitue cette URL exacte ; fermer la vue détruit
aussi ce contexte, de sorte qu'une réouverture repart du chemin canonique.

Un scénario Vitest et un parcours Chromium démarrent sur un premier contexte, le
remplacent pendant la vie de la même vue par
`/workspace/profile?section=permissions&filter=active%2Fpending&filter=locked+out#security%2Froles`,
modifient l'état local, changent d'onglet puis reviennent. Les paramètres
répétés, l'ordre, `%2F` et `+` empêchent une preuve triviale fondée sur une URL
déjà normalisée. Les oracles exigent simultanément :

- query params et fragment restitués octet pour octet et dans leur ordre ;
- une seule frontière et une seule tab pour le chemin canonique ;
- même instance React et même valeur locale ;
- un seul GET de profil.

Cette tranche ne généralise pas plusieurs instances d'une route dynamique et ne
persiste aucune URL après reload. Elle stabilise seulement la clé nécessaire aux
futures politiques de permissions, dirty et capacité.

### Troisième tranche : permission et révocation

Chaque entrée du catalogue porte désormais son `accessPath`. La vue épinglée,
protégée par la session seulement, conserve `null` ; le profil référence
exactement son chemin contrôlé. `WorkspaceAccessStore` reçoit un snapshot déjà
établi par le host et le publie avec `useSyncExternalStore`. Un snapshot absent
est vide et donc fail-closed pour toute vue protégée. Le proof n'invente ni
endpoint, ni polling, ni WebSocket de découverte des droits.

Le snapshot d'accès filtre les tabs et panneaux pendant le rendu, avant l'Effect
de réconciliation. Une URL directe interdite ne monte donc jamais la vue et ne
déclenche aucun GET. La réconciliation retire ensuite l'identité et son URL du
registre ; si la vue était active, `BrowserRouter` remplace l'entrée interdite
par le tableau de bord. Une navigation d'historique ultérieure est soumise au
même contrôle et ne peut pas recréer la frontière.

La révocation du profil annule également sa requête en vol avec
`AbortController`, oublie sa promesse et purge la donnée dédupliquée, même si la
vue avait déjà été fermée avant le nouveau snapshot. Une restitution explicite
du droit puis une nouvelle ouverture doit produire une nouvelle instance, un
état local vierge et un nouveau GET. Le champ non enregistré détruit par
l'oracle prouve la perte de l'état local ; il ne prétend pas encore implémenter
le futur modèle `dirty` ou sa confirmation de fermeture.

### Quatrième tranche : fin et remplacement de session

`WorkspaceSessionStore` publie un snapshot externe minimal : `sessionKey`
identifie une incarnation de session et `subjectKey` son sujet opaque. Ces clés
ne sont ni un token, ni un cookie, ni une identité affichable. Un snapshot
absent ou composé d'une clé vide est interprété fail-closed. Le proof consomme
ce snapshot déjà établi par le host ; il n'invente aucun login, endpoint de
refresh, stockage ou protocole de déconnexion.

Le snapshot d'accès porte les deux mêmes clés. Des droits appartenant à une
ancienne incarnation sont donc refusés, y compris lorsqu'un même utilisateur
ouvre une nouvelle session. Cette liaison ferme le risque de réutiliser les
permissions A dans la session B parce que deux stores auraient été mis à jour à
des instants différents.

Le sous-arbre `WorkspaceRuntime` reçoit comme `key` le couple exact
`sessionKey:subjectKey`. C'est le mécanisme natif documenté par React pour
réinitialiser tout le state d'un sous-arbre : registre, frontières `Activity`,
Dashboard épinglé, page active, cache et état local sont démontés ensemble. Le
cleanup de l'Effect annule aussi le GET en vol. Aucun Effect ne recopie la
session dans un second state React ; `eslint-plugin-react-hooks` reste actif
sans exemption, sous `StrictMode`.

Lors d'un remplacement d'identité, l'URL courante n'est pas arbitrairement
remplacée par le Dashboard : le contrat produit n'impose pas cette politique. La
même URL est réévaluée depuis un runtime neuf et ne remonte que si le snapshot
d'accès de la nouvelle session l'autorise. Lors d'une fin de session, le runtime
entier disparaît immédiatement, puis React Router remplace l'URL par
`/signed-out`; une entrée d'historique vers le workspace ne peut pas remonter de
vue tant que le snapshot de session reste absent.

La preuve navigateur est câblée conditionnellement dans le job `e2e-smoke`
existant afin de ne créer ni contexte de protection supplémentaire ni coût sur
les changements sans rapport. Le serveur SPA commun utilise une allowlist fermée
des applications servables. Comme Vite transpile sans vérifier les types, le
target `typecheck` inféré est aussi exécuté par `nx affected` dans l'oracle CI.
Le manifeste `.cmz/libraries.json` déclare explicitement la plateforme React et
un catalogue vide. Le contrôleur du dépôt recoupe cette déclaration avec un
véritable import AST du plugin Vite React officiel : un commentaire, un target
Vite générique ou une simple chaîne de caractères ne peut donc pas usurper la
plateforme.

## Niveau de preuve atteint et limites

La qualification `jsdom` de la primitive et cette première application
navigateur prouvent désormais le routeur, la conservation/destruction et
l'absence de trafic GET/POST provoqué par un switch, ainsi que le refus et la
révocation d'une permission de page déjà publiée par le host, ainsi que la fin
et le remplacement local d'un snapshot de session. Elles ne prouvent toujours
pas le transport distant de ce snapshot, garde dirty, plafond et profil mémoire,
accessibilité APG complète/RTL/zoom/lecteur d'écran, suspension des ressources
longues ni parité fonctionnelle avec le back-office Angular. La présence des
renderers React métier ne tient pas lieu de shell et aucune de ces limites ne
doit être reformulée comme acquise.

Preuves locales du 2026-10-05 : `check:generator-platform:reactjs` compile les
sorties générées puis passe `57/57` scénarios React ; la gate complète passe
également `442` tests cœur et `69/69` scénarios Angular. Knip analyse désormais
explicitement les fichiers TSX sous `tools/`, afin que cette preuve ne soit pas
exécutée tout en restant invisible au contrôle de dead-code.

Preuves locales du 2026-10-06 : lint React Hooks, typecheck strict, build Vite,
`16/16` tests Vitest et `6/6` parcours Chromium passent. Trois mutants retirant
respectivement la `key` de session, la liaison droits/session et le cleanup
réseau sont tués. L'oracle navigateur sera la preuve autoritative après son
passage dans la CI GitHub.

## Sources

- [React — Activity](https://react.dev/reference/react/Activity)
- [React 19.2 — introduction d'Activity](https://react.dev/blog/2025/10/01/react-19-2)
- [React — préserver et réinitialiser le state](https://react.dev/learn/preserving-and-resetting-state)
- [React — useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- [React — useEffect et cleanup](https://react.dev/reference/react/useEffect)
- [React — éviter les Effects inutiles](https://react.dev/learn/you-might-not-need-an-effect)
- [React Router — modes](https://reactrouter.com/start/modes)
- [React Router — BrowserRouter](https://reactrouter.com/api/declarative-routers/BrowserRouter)

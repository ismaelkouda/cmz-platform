# ADR-0084 — Workspace à vues vivantes et fermables

- **Statut :** Accepted
- **Date :** 2026-10-04
- **Supersède :** la décision locale du 2026-10-04 qui classait la barre comme
  simple navigation d'interfaces récemment visitées

## Contexte

En espace Medium ou Expanded, un opérateur doit pouvoir ouvrir plusieurs pages,
passer de l'une à l'autre et reprendre exactement son travail : formulaire,
erreurs, filtres, tri, pagination, sélection, panneaux et contexte local. Chaque
vue non épinglée peut être fermée ; `Tableau de bord` reste épinglé.

Conserver seulement les URL puis reconstruire la page à chaque activation ne
respecte pas ce modèle mental. Une croix de fermeture transforme la barre en
véritable workspace à vues ouvertes, et non en historique de raccourcis.

Angular `22.2` fournit les primitives officielles nécessaires :
`RouteReuseStrategy`, `DetachedRouteHandle`, `destroyDetachedRouteHandle`,
`retrieveStoredRouteHandles`, `shouldDestroyInjector` et
`withAutoCleanupInjectors`.

## Options envisagées

### Option A — Reconstruire chaque route à chaque activation

- avantage : faible consommation mémoire ;
- rejet : perte potentielle de l'état de travail, rechargements réseau et
  promesse d'onglet trompeuse.

### Option B — Sérialiser tous les états de page

- avantage : composants détruits entre deux activations ;
- rejet : chaque type de page doit définir une sérialisation complète et
  versionnée ; les composants tiers, focus, overlays et brouillons ne sont pas
  restaurés de façon générale.

### Option C — Conserver sélectivement les arbres de routes ouverts

- avantage : même instance Angular, état local exact, API Router officielle et
  destruction explicite à la fermeture ;
- coût : mémoire bornée, lifecycle suspendu et tests de fuite obligatoires.

## Décision

**Option C.** Le parent applicatif déclaré `workspaceRoot` délimite le
workspace. Pour chaque URL canonique, seul le premier segment porteur d'un
composant **déclaré** (`component` ou `loadComponent`) sous ce parent peut être
détaché. Un composant d'outlet interne matérialisé par Angular pour un conteneur
`loadChildren` est explicitement exclu : son handle rattacherait sinon un ancien
enfant à une nouvelle URL sœur. Le handle retenu possède ainsi tout l'arbre de
la vue sans collision avec d'éventuels composants routés enfants. La
réactivation rattache le même `DetachedRouteHandle`; elle ne reconstruit pas la
page. Fermer l'onglet détruit le handle avec l'API Angular officielle.

La décision porte sur la promesse observable du workspace, pas sur une API
Angular universelle. Angular est la première implémentation qualifiée. La cible
ReactJS devra fournir la même conservation d'instance, la même suspension des
effets et le même démontage explicite au moyen d'un adaptateur React documenté
et testé séparément. Aucun cache de composants ni abstraction de Router n'est
partagé entre frameworks ; seuls le vocabulaire contractuel et les scénarios de
conformité navigateur le sont.

### Modèle du workspace

- `Tableau de bord` est épinglé, premier et non fermable.
- Chaque vue ouverte possède une identité de chemin stable, une URL d'activation
  exacte, un titre traduit, un état `active` ou `suspended`, et un indicateur
  `dirty`.
- Une même identité de vue ne peut apparaître deux fois.
- Les routes paramétrées exigent une politique d'identité explicite. Query
  params et fragments sont exclus de l'identité v1, mais conservés dans l'URL
  d'activation afin de restaurer le contexte exact ; aucun secret n'y est admis.
- L'état vit en mémoire dans le shell. La persistance après rechargement est
  hors périmètre tant qu'un contrat de confidentialité et de sérialisation n'a
  pas été approuvé.

### Cycle de vie

- Changer d'onglet détache la vue active et rattache la cible.
- Une vue suspendue conserve composant, enfants, signaux et formulaire.
- Polling, timers, médias et abonnements coûteux doivent respecter un signal de
  lifecycle `active/suspended` ; être détaché ne signifie pas être détruit.
- Les overlays globaux ne sont pas conservés avec une vue suspendue.
- La simple activation d'un onglet ne déclenche aucun GET/POST. Une revalidation
  distante reste possible seulement si une politique de fraîcheur ou une
  invalidation métier l'exige.

### Fermeture et sécurité

- Chaque vue non épinglée expose une fermeture nommée et accessible.
- Fermer une vue `dirty` demande confirmation ; changer d'onglet ne la demande
  pas puisque le travail reste vivant.
- Fermer la vue active active la dernière vue utilisée encore ouverte, puis
  `Tableau de bord` en dernier recours.
- `Fermer les autres` et `Tout fermer sauf Tableau de bord` sont regroupés dans
  un menu secondaire, jamais dans un bouton destructif principal.
- Une perte d'autorisation, une déconnexion ou un changement d'identité détruit
  immédiatement les handles concernés.
- La fermeture appelle `destroyDetachedRouteHandle` et permet au router de
  nettoyer les injecteurs ; retirer seulement le libellé est interdit.

### Budget de ressources

- Le nombre de vues vivantes est borné par une politique mesurée et testée. Le
  plafond conservateur `8` de la première tranche est un garde-fou provisoire,
  pas une calibration mémoire ; il ne peut être augmenté ni déclaré définitif
  sans le profil multi-pages prévu par le contrat.
- Aucune éviction silencieuse n'est permise.
- Une vue `dirty` n'est jamais détruite pour libérer de la mémoire.
- Lorsque la limite est atteinte, l'ouverture est refusée avec une explication
  et une action permettant de fermer une vue.
- Une stratégie d'hibernation par snapshot exigera une ADR et des preuves
  séparées ; elle n'est pas anticipée dans cette version.

### Présentation et sémantique

- La barre est absente en Compact.
- Medium et Expanded utilisent une seule ligne horizontale sans wrap.
- Toutes les vues utilisent l'espace disponible ; aucun `Plus (n)` permanent ne
  masque une destination.
- En débordement réel seulement, le rail défile horizontalement et expose des
  commandes précédent/suivant nommées. La vue active reste visible.
- Le composant suit le pattern WAI-ARIA Tabs avec activation manuelle. Angular
  Aria est choisi lorsqu'une primitive correspond au modèle réel (par exemple la
  toolbar de défilement). Sa primitive Tabs n'est pas forcée ici : elle modélise
  des panneaux déclarés par onglet, alors que le Router fournit un unique
  `RouterOutlet` vivant auquel les handles sont rattachés, et chaque libellé
  possède une action de fermeture sœur. Cette exception est locale, documentée
  et impose les mêmes oracles clavier/focus/ARIA ; aucun bouton n'est imbriqué
  dans un lien ou un autre bouton.
- `Delete` peut fermer l'onglet focalisé, mais la croix visible et accessible
  reste le mécanisme principal.

## Conséquences

### Positives

- le travail utilisateur survit réellement au changement d'onglet ;
- la fermeture libère explicitement composants et injecteurs ;
- le réseau, la mémoire et les tâches de fond deviennent observables et bornés ;
- le modèle visuel, sémantique et runtime racontent la même chose.

### Négatives

- chaque page éligible doit respecter le lifecycle suspendu ;
- le cache de handles exige une politique de capacité et des tests de fuite ;
- la persistance après rechargement n'est pas fournie implicitement ;
- un vrai composant Tabs fermable est plus complexe qu'une liste de liens.
- la parité ReactJS demande un adaptateur et des tests runtime propres ; elle
  n'est pas déduite de la conformité Angular ni du renderer React existant.

## Références

- [Contrat du workspace](../architecture/workspace-vues-vivantes-accessibilite-2026-10-04.md)
- [Angular — RouteReuseStrategy](https://angular.dev/api/router/RouteReuseStrategy)
- [Angular — Customizing route behavior](https://angular.dev/guide/routing/customizing-route-behavior)
- [Angular — destroyDetachedRouteHandle](https://angular.dev/api/router/destroyDetachedRouteHandle)
- [Angular — withAutoCleanupInjectors](https://angular.dev/api/router/withAutoCleanupInjectors)
- [React — Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)
- [React — Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [WAI-ARIA APG — Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)

# Workspace à vues vivantes — contrat runtime et accessibilité

- **Date de vérification :** 2026-10-04
- **Statut :** décision, exemples et preuve navigateur authentifiée approuvés ;
  promotion complète conditionnée par les oracles spécialisés restants
- **Espaces :** Medium et Expanded uniquement
- **Implémentation de référence actuelle :** Angular `22.2.0`, Angular
  Material/CDK/Aria `22.2.1`
- **Seconde implémentation en qualification :** ReactJS `19.3.0`, sans
  dépendance runtime au mécanisme Angular
- **Décision :**
  [ADR-0084](../adr/0084-workspace-a-vues-vivantes-et-fermables.md)

## 1. Promesse utilisateur

Un onglet ouvert représente une vue de travail vivante. Passer à un autre onglet
puis revenir DOIT restituer la même instance de vue et son état local. Une
reconstruction silencieuse lors d'un simple changement d'onglet est une
non-conformité.

Les termes **DOIT**, **NE DOIT PAS**, **DEVRAIT** et **PEUT** sont normatifs.

### Portée multi-stack

Le contrat produit est indépendant du framework : identité canonique et URL
exacte, vue active/suspendue, travail dirty, fermeture/destruction, capacité,
sécurité, réseau, focus et clavier doivent avoir les mêmes résultats observables
en Angular et en ReactJS.

L'implémentation ne l'est pas. Angular s'appuie sur `RouteReuseStrategy` et les
handles du Router. L'hôte ReactJS qualifié par tranches utilise sa primitive
native `Activity`, un registre externe et React Router. Il NE DOIT PAS émuler
les APIs Angular ni partager un cache de composants entre frameworks.

La parité sera jugée par une suite de conformité navigateur commune portant sur
les comportements de ce document, complétée par des tests unitaires propres à
chaque adaptateur. La présence d'un renderer ReactJS ne suffit jamais à elle
seule ; seules les preuves runtime listées dans ce document autorisent une
revendication.

La [qualification React Activity](./workspace-react-adapter-scope-2026-10-05.md)
établit en `jsdom` la conservation d'état et le redémarrage des Effects, puis
qualifie sur une SPA et Chromium réels identité, URL, réseau, fermeture,
sécurité, session, dirty, capacité et mémoire. Les ressources longues et
l'accessibilité complète restent à prouver avant la parité produit.

## 2. Emplacement et adaptation

```text
En-tête global
Navigation principale
Onglets du workspace          ← ce contrat
Panneau de la vue active
```

**LAY-01.** La barre appartient au shell, jamais à une toolbar de table.

**LAY-02.** Elle est absente en Compact. Un resize vers Compact masque la barre
mais NE DOIT PAS détruire les vues ouvertes.

**LAY-03.** Medium et Expanded utilisent une ligne horizontale sans wrap.

**LAY-04.** Les onglets occupent l'espace disponible. Aucun `Plus (n)` n'est
affiché tant qu'un débordement réel n'est pas mesuré.

**LAY-05.** En débordement, le rail défile horizontalement. Des commandes
précédent/suivant apparaissent seulement lorsqu'elles peuvent agir ; toucher ou
trackpad conservent le défilement natif. L'onglet actif est ramené dans la zone
visible sans animation imposée en mode mouvement réduit.

### Frontière Tailwind / SCSS

**STYLE-01.** Le template utilise directement les utilitaires Tailwind pour les
propriétés stables et lisibles localement : flex/grid, dimensions, espacements,
bordures, couleurs issues de `@theme`, typographie, survol, désactivation et
priorités responsive. Les chemins scannés restent explicitement bornés par
`tailwind.css` avec `source(none)` et `@source` ; aucune découverte implicite du
workspace n'est autorisée.

**STYLE-02.** Le SCSS scopé conserve les responsabilités pour lesquelles il est
plus expressif : pseudo-élément de l'onglet actif, sélecteurs structurels,
masquage de scrollbar multi-moteur, marqueur natif de `summary`, calcul de
position, media query de mouvement réduit et mixin de focus partagé.

**STYLE-03.** Une déclaration ne doit pas avoir deux autorités. Le SCSS ne
répète pas un utilitaire Tailwind « par sécurité », `@apply` ne recompose pas
des composants cachés et les classes BEM restantes servent de contrat de
structure, d'état ou de hook stable — jamais de seconde bibliothèque
d'utilitaires.

**STYLE-04.** Tailwind et SCSS ne portent aucune sémantique, aucun comportement
clavier et aucun état métier. HTML natif, Angular Router et Angular Aria restent
les autorités fonctionnelles conformément à ADR-0077.

## 3. Modèle d'une vue

```ts
type WorkspaceView = {
    id: string;
    url: string;
    title: string;
    pinned: boolean;
    closable: boolean;
    dirty: boolean;
    accessPath: string | null;
    lifecycle: 'active' | 'suspended';
    lastActivatedAt: number;
};
```

**MODEL-01.** `id` est stable et ne contient aucun secret.

**MODEL-02.** `Tableau de bord` est épinglé, premier et non fermable.

**MODEL-03.** Une identité ne peut être ouverte qu'une fois. La revisite active
le handle existant.

**MODEL-04.** En v1, l'URL de chemin canonique est l'identité. Les query params
et fragments sont exclus. Une route paramétrée qui doit regrouper ou distinguer
autrement ses instances exige un contrat d'identité explicite avant activation.
L'URL d'activation conserve néanmoins les paramètres exacts de la dernière
visite : identité canonique et contexte de réactivation sont deux concepts
distincts.

**MODEL-05.** Le registre expose des signaux en lecture seule. Seul le service
du shell peut ouvrir, activer, fermer ou réordonner une vue.

**MODEL-06.** `accessPath` reprend exactement le chemin contrôlé par le guard de
page. Il vaut `null` pour une vue protégée seulement par la session. Une seconde
table de correspondance entre routes Angular et chemins backend est interdite.

## 4. Conservation Angular

**LIFE-01.** Une `WorkspaceRouteReuseStrategy` sélective traite seulement le
premier segment qui **déclare** publiquement `component` ou `loadComponent` sous
un parent marqué `workspaceRoot`. Un composant d'outlet interne qu'Angular peut
associer à un conteneur `loadChildren` ne constitue jamais une page cacheable.
Le segment retenu possède tout le sous-arbre de la vue ; un composant routé
enfant ne peut pas créer un second handle pour la même URL.

**LIFE-02.** `shouldDetach` conserve l'arbre de route lorsqu'un onglet reste
ouvert. `shouldAttach` et `retrieve` rendent exactement le handle associé à son
identité.

**LIFE-03.** La réactivation DOIT produire la même instance du composant et ne
doit pas réinitialiser formulaire, filtres, tri, pagination, sélection ou
panneaux.

**LIFE-04.** Scroll, focus logique et état d'un composant externe qui ne vivent
pas dans l'arbre détaché sont capturés par un adaptateur explicite de la page.
Une sérialisation universelle implicite est interdite.

**LIFE-05.** La stratégie implémente `retrieveStoredRouteHandles` et
`shouldDestroyInjector`; le router est configuré avec
`withAutoCleanupInjectors`.

**LIFE-06.** La fermeture appelle `destroyDetachedRouteHandle`. Un test doit
prouver l'exécution des `DestroyRef` des composants fermés.

## 5. Suspension des activités

Une route détachée existe encore. Elle peut donc continuer à exécuter timers,
polling et effets si aucune règle ne l'arrête.

**SUSPEND-01.** Le shell fournit à chaque vue un signal de lifecycle
`active/suspended`.

**SUSPEND-02.** Polling, médias, timers et calculs coûteux s'arrêtent en
`suspended`, sauf exception métier documentée.

**SUSPEND-03.** Les requêtes déjà engagées suivent leur politique normale :
annulation sûre ou résultat vers le cache partagé. Elles ne mettent jamais à
jour la mauvaise instance.

**SUSPEND-04.** Un changement d'onglet n'émet aucun GET/POST par lui-même. Une
revalidation à l'activation exige une invalidation métier ou une politique de
fraîcheur déclarée.

**SUSPEND-05.** Dialogues, menus et overlays portés par le shell sont fermés
avant détachement et restituent proprement le focus.

## 6. Fermeture et travail non enregistré

**CLOSE-01.** Chaque onglet non épinglé expose un bouton distinct nommé
`Fermer <titre>`. Un contrôle interactif NE DOIT PAS être imbriqué dans un lien
ou un autre bouton.

**CLOSE-02.** Changer d'onglet ne demande pas confirmation : la vue est
suspendue, pas abandonnée.

**CLOSE-03.** Fermer une vue `dirty` ouvre une confirmation modale accessible.
Annuler conserve handle, onglet, état et focus.

**CLOSE-04.** Fermer la vue active active la dernière vue utilisée encore
ouverte. À défaut, `Tableau de bord` devient actif.

**CLOSE-05.** Fermer une vue inactive ne navigue pas. Après destruction, le
focus va au prochain onglet logique, sinon au précédent.

**CLOSE-06.** Un menu secondaire expose `Fermer l'onglet courant`,
`Fermer les autres onglets` et `Tout fermer sauf Tableau de bord`. Chaque
commande respecte les vues `dirty`; aucune confirmation globale ne peut
contourner leur garde.

**CLOSE-07.** Une fermeture groupée prévalide toutes ses cibles puis, si la vue
active en fait partie, navigue une seule fois vers une vue survivante avant de
détruire le moindre handle. Une navigation refusée ou en erreur conserve tout le
groupe ; aucune fermeture partielle silencieuse n'est autorisée.

## 7. Accessibilité du composant Tabs

**A11Y-01.** La barre suit le pattern `tablist`/`tab`/`tabpanel`. Le panneau du
router reste adjacent ou clairement associé.

**A11Y-02.** Une primitive officielle reste le premier choix lorsqu'elle
représente le modèle réel. Angular Aria Toolbar porte les commandes de
défilement. Angular Aria Tabs n'est pas forcé dans cette tranche car ses
panneaux déclaratifs ne correspondent pas au panneau unique du `RouterOutlet` et
aux handles vivants. Le shell implémente donc explicitement le pattern APG et
doit en prouver tous les comportements clavier, focus et lecteur d'écran.

**A11Y-03.** `Tab` entre sur l'onglet actif puis quitte le tablist. Gauche et
Droite déplacent le focus ; `Home` et `End` atteignent les extrémités ; Entrée
ou Espace activent. L'activation reste manuelle.

**A11Y-04.** `Delete` PEUT fermer l'onglet focalisé non épinglé. Il ne remplace
pas le bouton de fermeture visible.

**A11Y-05.** État actif, focus et état dirty ne dépendent jamais uniquement de
la couleur. La croix possède un nom contextualisé et une cible d'au moins
`24 × 24 CSS px`; ce produit vise une zone confortable dans une barre de `48 px`
minimum.

**A11Y-06.** Les commandes de défilement portent un nom, un état désactivé réel
et ne deviennent focalisables que lorsqu'elles sont utiles.

## 8. Budget, sécurité et persistance

**BUDGET-01.** Une politique de capacité est obligatoire avant runtime. Sa
valeur provient d'un profil mémoire sur des pages représentatives ; elle n'est
pas déduite d'un breakpoint.

**BUDGET-02.** À la limite, l'ouverture échoue explicitement et propose de
fermer une vue. Aucune éviction silencieuse n'est autorisée.

**BUDGET-03.** Une vue `dirty` n'est jamais détruite automatiquement.

**SEC-01.** Permissions et session sont réévaluées avant rattachement. Une vue
révoquée est détruite, pas seulement masquée.

**SEC-02.** Déconnexion ou changement d'identité détruisent tous les handles.

**SEC-03.** La persistance après reload est absente en v1. Les brouillons dirty
activent la protection de sortie du navigateur. Restaurer des onglets ou drafts
depuis un stockage exige une décision de confidentialité distincte.

**SEC-04.** Le shell observe le snapshot réactif `StorePathsService.paths`. À
chaque remplacement, et à chaque enregistrement de vue, il détruit toute vue
dont `accessPath` n'est plus accordé. Une révocation ignore `dirty` et
`closable` : un brouillon ne maintient jamais un accès interdit.

**SEC-05.** Une vue active révoquée rejoint d'abord une vue survivante autorisée
afin que le Router détruise son instance. Une vue suspendue est détruite via
`destroyDetachedRouteHandle`. Si la navigation échoue, le workspace entier est
purgé et la session est fermée. Le reload de sécurité se produit même si
l'effacement du stockage local lève une erreur.

**SEC-06.** Ce mécanisme consomme un nouveau snapshot ; il ne découvre pas à lui
seul une modification distante. Aucun polling, WebSocket ou endpoint de refresh
des droits n'est inventé sans contrat backend. Le backend reste l'autorité et un
refus HTTP ferme la session par le chemin d'erreur existant.

## 9. Oracles bloquants

1. même instance avant/après activation d'un autre onglet ;
2. formulaire, erreurs, filtres, tri, pagination et sélection conservés ;
3. scroll horizontal/vertical et focus logique restaurés ;
4. zéro GET/POST causé seulement par le switch ;
5. polling et timers suspendus, puis repris une seule fois ;
6. fermeture propre : `DestroyRef`, handle et injector libérés ;
7. fermeture dirty annulable sans perte ;
8. fermeture active/inactive et retour au dernier onglet exacts ;
9. fermeture globale respectant toutes les gardes et restant intacte si la
   navigation de sortie échoue ;
10. perte de permission et déconnexion détruisant les handles ;
11. limite atteinte sans éviction silencieuse ;
12. 100 cycles ouverture/switch/fermeture sans croissance mémoire monotone ;
13. clavier APG, lecteur d'écran, focus visible, zoom `200 %` et RTL ;
14. overflow horizontal, actif visible et absence de `Plus (n)` permanent ;
15. resize Compact/Medium/Expanded sans destruction ni requête réseau.

### État de preuve de la première tranche

Prouvé localement le 2026-10-04 :

- le Router réel rattache la même instance et conserve son signal local ;
- une fermeture active préparée détruit le composant et retire le handle ;
- 100 cycles Router d'ouverture/fermeture produisent 100 créations, 100
  destructions et aucun handle fermé résiduel ; ce stress déterministe ne
  remplace pas une mesure de heap navigateur ;
- un seul niveau composant est cacheable, même si une vue contient une route
  composant enfant ;
- la capacité refuse explicitement une neuvième vue et n'évince rien ;
- les fermetures active, inactive, dirty, épinglée, MRU et frontière de sécurité
  sont couvertes au niveau service/stratégie ; une autorisation d'abandon dirty
  n'efface pas le marqueur si la navigation échoue, et une fermeture groupée
  invalide est refusée avant toute mutation ;
- deux parcours Chromium authentifiés contre le mock local prouvent sur le vrai
  shell : même instance Dashboard et période conservée, zéro GET supplémentaire
  au switch ou au resize Expanded → Compact → Medium, activation manuelle au
  clavier, fermeture par `Delete`, overflow réel et focus restitué ;
- le formulaire pilote `infrastructure-type` est raccordé par la directive
  générique `[cmzWorkspaceDirty]` : ses champs et son query param `ref=create`
  survivent au switch, Annuler conserve l'instance, Fermer détruit l'onglet sans
  POST et rend le focus à la liste ;
- cette preuve navigateur a verrouillé deux régressions invisibles aux doubles
  unitaires : un conteneur lazy muni d'un composant d'outlet interne ne peut pas
  devenir une frontière de cache, et une écriture dirty identique ne republie
  aucun état ;
- type-check, tests unitaires/intégration, lint, dead-code et builds
  développement/production sont verts sur cette tranche.

Prouvé localement dans la tranche de révocation du 2026-10-04 :

- le chemin d'autorisation d'une vue est dérivé du même `pathsGuard`, sans
  registre parallèle ;
- le retrait d'un chemin détruit automatiquement une vue suspendue et son vrai
  handle Router ;
- une vue active, y compris `dirty`, rejoint une survivante puis exécute son
  cycle de destruction ;
- une vue interdite enregistrée après l'hydratation est également retirée ;
- un snapshot absent est interprété fail-closed ;
- une navigation impossible ou une exception purge tous les handles et ferme la
  session, avec erreur transmise au `ErrorHandler` ;
- le reload de session reste garanti lorsque `storage.clearAll()` échoue.

Prouvé localement dans la tranche accessibilité/RTL du 2026-10-04 :

- un parcours Chromium authentifié vérifie les relations `tablist`/`tab` via
  `aria-owns`, l'onglet sélectionné, le panneau unique et son `aria-labelledby`
  dynamique ;
- `axe-core` contrôle sur le shell réel les relations ARIA, attributs requis,
  valeurs et noms de boutons. Ce contrôle machine ne vaut explicitement pas
  parcours lecteur d'écran ;
- un agrandissement du texte à `200 %` sur un viewport reflué conserve la barre,
  ses commandes, ses noms, son focus visible et toute sa fonctionnalité sans
  troncature des contrôles ;
- la navigation au clavier suit le sens visuel LTR ou RTL et boucle aux
  extrémités conformément au pattern Tabs ;
- sous RTL, le rail conserve un début logique à zéro, `suivant` avance
  réellement, `précédent` revient au début et le menu de commandes reste
  entièrement dans le viewport ;
- espacements, séparateurs et alignements utilisent les propriétés logiques
  Tailwind (`ps`/`pe`, `me`, `border-s`/`border-e`, `text-start`). L'ancrage
  physique `right-0` du menu est volontairement conservé : la preuve géométrique
  montre qu'un remplacement mécanique par `end-0` le fait sortir du viewport en
  RTL.

Prouvé localement dans la tranche mémoire WORKSPACE-TABS-4 du 2026-10-05 :

- le build de production exécute 50 cycles d'échauffement puis 100 cycles réels
  d'ouverture/fermeture du formulaire pilote via le Router ; après GC explicite,
  documents, nœuds DOM et écouteurs restent strictement constants ;
- le heap JS croît de `594 052` octets sur les 100 cycles, sous le budget
  bloquant de `1 MiB`, et de `172 388` octets sur le dernier quart, sous le
  budget de pente de `384 KiB` ;
- huit pages représentatives atteignent `9 738 772` octets depuis une base à
  `5 555 296` octets, soit `4 183 476` octets supplémentaires sous le budget
  bloquant de `8 MiB`; la neuvième vue est refusée avec notification, sans
  éviction ;
- quatre passes complètes `1 → 8 → 1` séparent les coûts uniques de
  lazy-load/JIT d'une fuite répétable : après échauffement, les fermetures
  plafonnent à `244` nœuds et `39` écouteurs ;
- cette investigation a trouvé puis corrigé deux défauts réels : recalcul de
  l'overflow avant rendu, et carte OpenLayers qui n'appelait pas `dispose()` et
  enregistrait son nettoyage après un `await` ;
- le mock de production indexe désormais les actions par route absolue
  `/equipments/types`, comme `PermissionActionsService`, au lieu de dépendre du
  provider permissif réservé au développement ;
- `backoffice-angular:e2e-workspace-memory` conserve les deux profils JSON et le
  nightly les exécute sur le dist production. Le protocole CDP est propre à
  Chromium : il ne revendique pas une mesure heap Firefox/WebKit.

Prouvé localement dans la tranche React WORKSPACE-TABS-11 du 2026-10-06 :

- le catalogue React fermé contient deux vues réelles ; sa capacité vaut donc
  `2`, sans recopier le plafond Angular `8` ni inventer de fausses pages ;
- une capacité invalide échoue avant runtime et la limite refuse toute nouvelle
  vue sans éviction, mutation, URL mémorisée, montage ou GET ;
- une route directe hors capacité rejoint le Dashboard par remplacement et
  annonce explicitement le refus ;
- cinq campagnes du build production, chacune précédée de 50 cycles
  d'échauffement, ont mesuré 100 cycles à `331 760–349 400` octets de croissance
  heap, sous le budget bloquant `768 KiB`, et `101 592–104 188` octets sur le
  dernier quart, sous `256 KiB` ;
- documents, nœuds et écouteurs restent constants à chaque checkpoint fermé
  (`1`, `121`, `174`) ; quatre passes `1 → 2 → 1` confirment ce plateau ;
- le pic observé à deux vues est d'environ `1,35 MiB`, sous le budget `2 MiB` ;
  `workspace-react-proof:e2e-workspace-memory` publie ses JSON dans le nightly ;
- ce plafond ne dimensionne aucune future application : tout catalogue plus
  riche ou page plus lourde exige une nouvelle campagne représentative.

Restent bloquants avant de qualifier l'ensemble « terminé de bout en bout » :

- parcours manuel VoiceOver et NVDA sur les annonces d'onglet, d'état dirty, de
  fermeture et de confirmation ; axe ne peut pas remplacer cette preuve ;
- passage manuel du zoom navigateur à `200 %` sur les navigateurs supportés ; le
  redimensionnement automatisé du texte à `200 %` est désormais prouvé mais ne
  simule pas toutes les combinaisons navigateur/OS ;
- raccordement explicite des futures pages qui introduisent polling, timer,
  média ou calcul continu au signal `active/suspended` ;
- déploiement progressif de `[cmzWorkspaceDirty]` sur les autres formulaires
  métier, après vérification de leur définition réelle de « modifié » ;
- transport applicatif du nouveau snapshot de droits depuis le backend : le
  monitor et ses oracles sont présents, mais aucun endpoint de refresh, polling
  ou push n'existe dans le contrat actuel et ne doit être inventé ;
- qualification ReactJS des ressources longues réelles (polling, timer, média,
  calcul continu) et de l'accessibilité complète ; identité, URL, réseau,
  fermeture, sécurité, session, dirty, capacité et mémoire sont déjà prouvés.

## 10. Hors périmètre

- persistance des instances après rechargement du navigateur ;
- synchronisation des onglets entre plusieurs fenêtres ;
- hibernation automatique par snapshot ;
- réorganisation par glisser-déposer ;
- plusieurs instances d'une route dynamique sans contrat d'identité.

Ces capacités exigent des besoins réels, une décision séparée et leurs propres
oracles.

## Références officielles

- [Angular — RouteReuseStrategy](https://angular.dev/api/router/RouteReuseStrategy)
- [Angular — Customizing route behavior](https://angular.dev/guide/routing/customizing-route-behavior)
- [Angular — RouterOutlet](https://angular.dev/api/router/RouterOutlet)
- [Angular — destroyDetachedRouteHandle](https://angular.dev/api/router/destroyDetachedRouteHandle)
- [Angular — withAutoCleanupInjectors](https://angular.dev/api/router/withAutoCleanupInjectors)
- [Playwright — CDPSession](https://playwright.dev/docs/api/class-cdpsession)
- [Chrome DevTools Protocol — HeapProfiler](https://chromedevtools.github.io/devtools-protocol/tot/HeapProfiler/)
- [Chrome DevTools Protocol — Runtime](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/)
- [Chrome DevTools Protocol — Memory](https://chromedevtools.github.io/devtools-protocol/tot/Memory/)
- [Angular Aria — Tabs](https://angular.dev/guide/aria/tabs)
- [Angular Aria — Toolbar](https://angular.dev/guide/aria/toolbar)
- [Tailwind CSS — detecting classes in source files](https://tailwindcss.com/docs/detecting-classes-in-source-files)
- [Tailwind CSS — responsive design](https://tailwindcss.com/docs/responsive-design)
- [Sass — parent selector and structured nesting](https://sass-lang.com/documentation/style-rules/parent-selector/)
- [React — Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)
- [React — Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [React — Activity](https://react.dev/reference/react/Activity)
- [WAI-ARIA APG — Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- [WCAG 2.2 — Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)
- [WCAG 2.2 — Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- [WCAG 2.2 — Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)
- [WCAG 2.2 — Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)

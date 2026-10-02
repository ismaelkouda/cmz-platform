# C5 ADAPT-11c — autorité d'accessibilité et de mise en page

- **Date de vérification :** 2026-10-02
- **Statut :** autorité de réalisation C5 ; runtime à réaliser
- **Fonctionnalité :** Gestion des utilisateurs
- **Fenêtres :** `compact`, `medium`, `expanded`
- **Socle vérifié :** Angular `22.2.0`, Angular Material/CDK/Aria `22.2.1`
- **Décisions parentes :**
  [ADR-0066](../adr/0066-preuve-presentation-bornee-pour-realisation-llm.md),
  [ADR-0072](../adr/0072-ui-adaptative-guidee-par-m3-et-apis-officielles.md),
  [ADR-0077](../adr/0077-ui-angular-officielle-avant-custom.md) et
  [ADR-0078](../adr/0078-vues-de-donnees-par-capacites-optionnelles.md)

## 1. Finalité et mode d'emploi

Ce document est l'autorité de réalisation de la vue de données C5. Il est écrit
pour qu'un développeur, un reviewer ou un LLM puisse produire l'interface sans
recommencer la recherche d'ergonomie, d'accessibilité et de primitives Angular.

Les termes **DOIT**, **NE DOIT PAS**, **DEVRAIT** et **PEUT** sont normatifs :

- **DOIT / NE DOIT PAS** : condition de conformité ;
- **DEVRAIT** : choix attendu, dérogation documentée et prouvée ;
- **PEUT** : option permise seulement si un contrat produit l'active.

Un agent de réalisation DOIT lire, dans cet ordre :

1. le contrat C5 et son work order recalculé depuis `main` ;
2. les règles numérotées de ce document ;
3. le manifeste de présentation et ses images approuvées ;
4. les ADR parentes uniquement pour résoudre une frontière ;
5. le code existant, sans considérer son état historique comme autorité.

Ce document évite une nouvelle recherche tant que ses conditions de validité
restent vraies. Une nouvelle recherche officielle devient obligatoire si :

- Angular change de version majeure ou retire une API retenue ;
- WCAG ou la cible de conformité change ;
- une nouvelle capacité modifie la sémantique, par exemple sélection multiple,
  édition cellulaire ou grille interactive ;
- un second produit demande une primitive partagée ;
- un test d'assistance technique révèle un écart non couvert ;
- une décision produit contredit explicitement une règle présente.

Une mise à jour esthétique seule ne justifie pas de réouvrir toutes les sources.

## 2. Portée et limites

### 2.1 Ce que ce document décide

- l'anatomie de la vue C5 et sa barre de table ;
- le comportement adaptatif `compact`/`medium`/`expanded` ;
- la sémantique HTML, le clavier, le focus et les annonces ;
- le choix entre HTML, Angular Material, Angular Aria et CDK ;
- la géométrie du panneau de filtres et du rail horizontal ;
- la priorité et la représentation des actions réellement autorisées ;
- les oracles nécessaires avant fusion.

### 2.2 Ce qu'il ne décide pas

- les URL, paramètres, permissions ou payloads réseau ;
- l'existence d'une capacité absente de `list-query` ou `action-request` ;
- un composant universel de table ;
- le layout de toutes les futures fonctionnalités ;
- l'adoption automatique de Material ou Angular Aria par une autre application.

**LLM-01 — Localité.** Le LLM DOIT traiter cette mise en page comme une autorité
locale C5. Il PEUT réutiliser le protocole de décision ailleurs, mais NE DOIT
PAS copier automatiquement sa toolbar, son panneau ou ses colonnes.

**LLM-02 — Échec fermé.** Une action absente des contrats reste absente du DOM.
Le LLM NE DOIT PAS inventer endpoint, permission, navigation, dialogue ou effet
pour reproduire une image.

**LLM-03 — Revue proactive.** Une proposition ou une image fournie par le
produit est une entrée à auditer, pas une composition à seulement confirmer. Le
LLM DOIT confronter de lui-même la hiérarchie, la proximité des commandes, le
clavier, le reflow et les primitives aux sources officielles. Avant de figer ou
d'implémenter un visuel, il présente les écarts significatifs, recommande une
solution et expose ses compromis, même si le produit ne les a pas encore
formulés.

**LLM-04 — Conseil sans ordre implicite.** Cette initiative ne donne pas au LLM
le droit d'appliquer silencieusement sa préférence. Il sépare clairement : faits
observés, recommandation Staff, alternatives acceptables, décision produit et
autorisation d'implémenter. Une recommandation validée devient ensuite une règle
ou un oracle ; une recommandation rejetée n'est pas réintroduite sous un autre
nom.

## 3. Hiérarchie des autorités

En cas de conflit, appliquer l'ordre suivant :

1. contrat métier, sécurité et permissions approuvés ;
2. WCAG 2.2, HTML natif et comportement des assistances techniques ;
3. Angular 22 et composants officiels effectivement adoptés ;
4. Material 3 Adaptive pour la stratégie de fenêtre ;
5. SAP Fiori pour les heuristiques d'interface d'entreprise ;
6. décisions produit et références visuelles C5 approuvées ;
7. implémentation existante et préférences esthétiques locales.

Cette hiérarchie signifie notamment :

- une image ne peut pas accorder une permission ;
- Fiori ne remplace pas le contrat clavier d'un composant Angular ;
- un composant officiel ne doit pas être forcé si sa sémantique est fausse ;
- le code historique ne peut pas annuler une décision produit plus récente.

La version Fiori `1.96` fournie par le produit est une source historique de
composition. Les exigences d'accessibilité proviennent de WCAG 2.2 et des
documentations Angular actuelles ; les pages Fiori plus récentes servent à
confirmer les heuristiques, jamais à migrer silencieusement le visuel.

## 4. Décision de disposition et supersession locale

La barre de la table est organisée ainsi :

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Titre de la table [total]  [espace flexible]  Recherche  Actions…  │
├──────────────────────────────────────────────────────────────────────┤
│ # │ Nom ↕ │ Prénom ↕ │ E-mail ↕ │ Statut ↕ │ … │ Actions          │
│   │ filtre│ filtre    │ filtre   │ filtre   │   │                  │
├──────────────────────────────────────────────────────────────────────┤
│ lignes et rail horizontal bornés par le panneau de filtres ouvert   │
└──────────────────────────────────────────────────────────────────────┘
```

**LAY-01 — Anatomie.** Le titre de la table DOIT être à gauche. La recherche
locale puis les commandes de la table DOIVENT former un groupe à droite.

**LAY-02 — Ordre C5.** En `medium` et `expanded`, l'ordre logique est :
`Recherche`, `Créer`, `Rafraîchir`, `Filtres`. `Exporter` reste absent tant
qu'un contrat réel ne l'active pas.

**LAY-03 — Supersession.** Cette règle remplace uniquement, pour C5, la phrase
historique « recherche à gauche et actions à droite ». Les décisions sur les
capacités autorisées, la géométrie du panneau et l'absence d'export restent
applicables.

**LAY-04 — Association.** Le titre, la recherche, les commandes et la table
DOIVENT appartenir à la même région visuelle et sémantique. La recherche ne doit
pas être perçue comme une recherche globale de l'application.

**LAY-05 — Ordre DOM.** L'ordre DOM DOIT suivre l'ordre de lecture : titre,
recherche, commandes, table. Un réordonnancement CSS qui rend le parcours
clavier incohérent est interdit.

### 4.1 Pourquoi ce choix est retenu

- le titre nomme explicitement la collection manipulée ;
- la recherche et les actions restent proches de leur cible, conformément au
  pattern de table toolbar Fiori ;
- la priorité se lit de gauche à droite dans le groupe de commandes ;
- l'espace supérieur de page n'est pas confondu avec les outils locaux ;
- la table peut évoluer sans déplacer les appels réseau ou l'état métier.

## 5. Matrice adaptative normative

Les classes représentent l'espace disponible, jamais un modèle d'appareil.
Largeur, hauteur, zoom, contenu traduit et clavier virtuel peuvent changer la
classe ou imposer un reflow.

| Région             | `compact`                                           | `medium`                                  | `expanded`                                 |
| ------------------ | --------------------------------------------------- | ----------------------------------------- | ------------------------------------------ |
| collection         | cartes/liste progressive C5                         | table                                     | table                                      |
| titre              | titre de page/collection ; total seulement fiable   | titre de table à gauche                   | titre de table à gauche                    |
| recherche          | ligne propre si nécessaire                          | à droite, avant les actions ; wrap permis | à droite, avant les actions                |
| créer              | FAB `+`, nom accessible                             | bouton texte `Créer`                      | bouton texte `Créer`                       |
| rafraîchir         | contrôle accessible si retenu dans le rendu compact | icône, nom + tooltip                      | icône, nom + tooltip                       |
| filtres            | déclencheur puis bottom sheet modal                 | panneau temporaire droit non modal        | panneau temporaire droit non modal         |
| pagination         | chargement progressif silencieux                    | pagination explicite                      | pagination explicite                       |
| filtres de colonne | non affichés dans la pile compacte                  | seconde ligne d'en-tête                   | seconde ligne d'en-tête                    |
| création           | surface modale adaptée au contenu                   | panneau modal droit, une colonne          | panneau modal droit, deux colonnes au plus |
| densité            | cible tactile confortable                           | cible tactile conservée                   | cible tactile conservée                    |

**RESP-01 — Espace réel.** La décision de classe DOIT provenir de l'espace
disponible. La détection du user-agent ou de la marque d'appareil est interdite.

**RESP-02 — Continuité.** Un changement de classe NE DOIT déclencher aucun GET,
POST ou invalidation, ni perdre recherche, filtres, tri, scroll, formulaire,
erreurs ou état de soumission.

**RESP-03 — Instance unique.** Un contrôle interactif ne doit exister qu'une
fois dans le DOM actif. Le repositionnement ne doit pas créer deux boutons qui
pilotent des états divergents.

**RESP-04 — Container.** Les changements internes de la barre DEVRAIENT dépendre
de la largeur de son conteneur. Les changements de modalité de page restent
pilotés par les classes de fenêtre centralisées.

### 5.1 Algorithme de réduction de la barre

Lorsque la largeur diminue, appliquer cet ordre :

1. réduire la recherche entre ses tokens `max` et `min` validés par le contenu ;
2. conserver `Créer` et `Filtres` identifiables ;
3. conserver `Rafraîchir` sous forme d'icône accessible ;
4. faire passer la recherche ou le groupe complet sur une seconde ligne ;
5. placer seulement les actions secondaires futures dans un menu overflow ;
6. passer au layout compact lorsque la table n'est plus utilisable.

Il est interdit de réduire arbitrairement tous les boutons à des icônes, de
tronquer leur nom accessible, ou de masquer une action primaire pour éviter un
wrap. Les seuils numériques doivent provenir de mesures réelles du contenu en
français et en anglais, pas d'un nom `tablet` ou `desktop`.

## 6. Sémantique de la barre de table

**SEM-01 — Conteneur.** La barre DOIT être une région nommée ou appartenir à la
région nommée de la table. Le titre visible fournit le nom accessible lorsque
possible.

**SEM-02 — Recherche.** La recherche DOIT être un formulaire ou une région de
recherche nommée sans créer plusieurs landmarks `search` indistinguables. Le
label visible ou accessible décrit son périmètre : utilisateurs, pas
application.

**SEM-03 — Actions.** Les commandes peuvent être regroupées avec `role="group"`
et un nom accessible. Le rôle `toolbar` et `ngToolbar` NE DOIVENT PAS être
ajoutés automatiquement : ils imposent une navigation composite aux flèches et
un roving tabindex. Le groupe C5, qui contient une recherche et quelques
boutons, conserve le parcours Tab natif tant qu'un oracle ne justifie pas une
véritable toolbar ARIA.

**SEM-04 — Boutons et liens.** Une action emploie `<button type="button">` ; une
navigation emploie `<a href>`. Un bouton ne simule pas un lien et inversement.

**SEM-05 — Libellé visible.** Le nom accessible DOIT contenir le libellé visible
afin de respecter Label in Name. Un bouton icône n'a pas de libellé visible,
mais DOIT recevoir un `aria-label` contextualisé.

## 7. Catalogue des commandes C5

| Commande      | C5 actuel              | Représentation                                | Contrat accessible                               | Priorité adaptative                 |
| ------------- | ---------------------- | --------------------------------------------- | ------------------------------------------------ | ----------------------------------- |
| `Créer`       | autorisée              | texte en Medium/Expanded ; FAB `+` en Compact | `Créer un utilisateur`                           | ne jamais overflow                  |
| `Rafraîchir`  | autorisée              | icône officielle compréhensible               | `Rafraîchir la liste des utilisateurs` + tooltip | reste visible si possible           |
| `Exporter`    | interdite actuellement | aucune                                        | futur contrat requis                             | future action secondaire            |
| `Filtres (n)` | autorisée              | texte + compteur en Medium/Expanded           | `aria-expanded`, `aria-controls`; nom stable     | ne jamais confondre avec soumission |

**ACT-01 — Ordre.** Les actions métier précèdent les actions de contenu et de
vue. Dans C5 : créer, rafraîchir, filtres. Si l'export devient autorisé, sa
place exacte sera décidée avec son contrat et sa fréquence ; l'image ne suffit
pas.

**ACT-02 — Icônes.** Une icône seule est réservée à une métaphore reconnue dans
le contexte. Elle DOIT garder une cible interactive d'au moins `48 × 48 CSS px`
dans ce produit, un focus visible, un nom accessible et un tooltip contextuel.

**ACT-03 — Tooltip.** Le tooltip complète l'icône, mais ne contient jamais une
information indispensable : il peut être absent sur certains dispositifs
tactiles. Il doit être disponible au clavier et au pointeur et ne doit pas
répéter inutilement un bouton texte.

**ACT-04 — Disclosure.** `Filtres` pilote une surface ; utiliser `aria-expanded`
et `aria-controls`, pas `aria-pressed`. Le compteur indique le nombre de filtres
appliqués, jamais le nombre de champs simplement visités.

**ACT-05 — États.** Désactivé, en cours, réussi et échoué ne reposent pas sur la
couleur seule. Un état changeant doit être annoncé lorsqu'il n'est pas autrement
perceptible.

## 8. Titre et total de la collection

**TITLE-01 — Titre.** Le titre visible de la table est « Utilisateurs » ou un
libellé produit équivalent non redondant avec la hiérarchie de page.

**TITLE-02 — Total.** Un badge/compteur PEUT accompagner le titre seulement si
la valeur est le total autoritatif retourné par le backend. Il NE DOIT PAS faire
passer le nombre chargé en mémoire pour le total métier.

**TITLE-03 — Chargement progressif.** En Compact, où les pages sont accumulées,
le total doit rester explicitement le total backend ou être omis. Le compteur de
cartes déjà chargées ne remplace pas le total.

**TITLE-04 — Mise à jour.** Le total change sans déplacement de focus. Une
annonce live n'est nécessaire que si ce changement est une information attendue
après une action utilisateur ; elle doit être concise et non répétitive.

## 9. Recherche et filtres synchronisés

**SEARCH-01 — Portée.** Le champ recherche uniquement les attributs déclarés par
le contrat C5. Son placeholder ne constitue pas son label.

**SEARCH-02 — Soumission.** Le contrat doit expliciter recherche immédiate avec
debounce ou soumission. La disposition visuelle ne doit pas inventer ce choix.

**SEARCH-03 — Clavier.** Entrée, effacement, composition IME et navigation au
clavier doivent fonctionner sans conflit avec la table ou le panneau.

**FILTER-01 — État unique.** Recherche, panneau et raccourcis sous les colonnes
projettent un seul état de filtre. Une modification appliquée dans une surface
est reflétée dans les autres sans second modèle métier.

**FILTER-02 — En-têtes.** Les contrôles de filtre occupent une seconde ligne
d'en-tête. Ils ne sont pas imbriqués dans le bouton de tri : chaque contrôle
garde sa propre cible, son label et son ordre de tabulation.

**FILTER-03 — Mise en relief.** Un filtre de colonne actif est indiqué par sa
valeur, une bordure/fond tokenisé et, si utile, une icône. La couleur seule ne
suffit pas. Le nom accessible doit permettre de comprendre qu'un filtre est
actif.

**FILTER-04 — Récapitulatif.** C5 n'affiche pas la ligne textuelle rejetée du
type `Nom: Mar · Profil: B · +1`. L'état reste visible par le compteur du bouton
et les champs de colonne actifs. Une autre fonctionnalité pourra choisir une
infobar si son volume et son besoin le justifient.

## 10. Table, tri et cellules

**TABLE-01 — Table avant grid.** La vue Medium/Expanded utilise une table HTML
sémantique ou `MatTable` avec rôle de table. Elle NE DOIT PAS recevoir
`role="grid"` tant que navigation cellulaire, sélection ou édition 2D et modèle
clavier complet ne sont pas réellement implémentés.

**TABLE-02 — Nom.** La table DOIT avoir un nom accessible relié à son titre.
Chaque en-tête et cellule doit conserver une relation déterminable.

**TABLE-03 — Index.** La première colonne visible `#` compte `1, 2, 3…`. Son nom
accessible est « Numéro de ligne » ou « Position ». Si la pagination exige un
index global, le calcul provient de la pagination, pas de l'index DOM seul.

**SORT-01 — Cycle.** Le tri suit `ascendant → descendant → aucun`. Aucune croix
de remise à vide n'est ajoutée : l'état neutre est la troisième étape du même
contrôle.

**SORT-02 — Représentation.** Le libellé d'en-tête et l'indicateur de tri
forment un seul bouton de tri. L'indicateur est placé à droite du libellé et ne
devient pas une seconde cible interactive.

**SORT-03 — Annonce.** `MatSortHeader` ou l'équivalent officiel doit exposer
`aria-sort` et une description d'action. Comme certains lecteurs d'écran
n'annoncent pas la mutation, le nouveau tri est annoncé via `LiveAnnouncer` ou
une région live commune, sans dupliquer chaque message.

**CELL-01 — Capacité explicite.** Lien, radio, checkbox, menu, édition et action
de cellule sont optionnels. Leur présence exige contrat, permission et oracle.
Une donnée simple reste du texte.

**ROW-01 — Ligne non activable par défaut.** Une ligne n'est cliquable,
focusable ou annoncée comme consultable que si une action de ligne explicite
existe. Le survol et le curseur de lien suivent cette capacité, jamais le nombre
de champs.

**ROW-02 — Interactions internes.** Un contrôle de cellule consomme son action
et ne déclenche jamais en plus l'action de ligne. Le clavier doit pouvoir
atteindre chaque contrôle sans rendre toute la ligne ambiguë.

**ROW-03 — Détail.** Si un futur détail de ligne est activé, route, panneau ou
dialogue sont choisis selon la quantité d'information et la continuité de tâche.
Un dialogue centré n'est pas inféré par la simple existence d'une ligne.

## 11. Panneau de filtres

### 11.1 Compact : bottom sheet modal

**PANEL-C01.** Le déclencheur ouvre une surface depuis le bas, jusqu'à `80dvh`
maximum, sans masquer les safe areas ni le clavier virtuel.

**PANEL-C02.** La surface porte `role="dialog"`, `aria-modal="true"`, un nom
accessible, un focus initial pertinent et un focus trap. Le fond est inerte.

**PANEL-C03.** `Escape` ferme si aucune opération non récupérable ne l'interdit,
puis restitue le focus au déclencheur. Le balayage ou clic hors surface ne doit
pas être l'unique sortie.

**PANEL-C04.** La vue racine présente les critères sous forme de lignes
activables. Une ligne ouvre le contrôle spécialisé avec le label comme titre.
Les actions `Réinitialiser` à gauche et `Filtrer` à droite restent disponibles
dans un footer sticky sans masquer le contenu.

### 11.2 Medium/Expanded : panneau temporaire non modal

**PANEL-W01.** Le panneau survole la partie droite de la table. Il commence à la
barre haute/titre de la table et s'arrête au-dessus du rail horizontal.

**PANEL-W02.** Il est une région nommée non modale. Il NE DOIT PAS piéger le
focus, rendre le fond inerte ou annoncer `aria-modal="true"`.

**PANEL-W03.** Le titre et la croix visibles, rejetés par le produit, restent
absents. La région conserve un nom accessible non visuel. Le bouton toggle,
`Escape` et une fermeture cohérente avec le produit offrent les sorties.

**PANEL-W04.** L'état `aria-expanded` du déclencheur et la relation
`aria-controls` sont synchronisés avec la présence effective de la surface.

**PANEL-W05.** Le panneau est dimensionné par ses contenus dans les bornes
approuvées ; une hauteur courte rend son corps scrollable sans faire disparaître
ses actions.

### 11.3 Choix de primitive

`MatDrawer`, CDK Overlay ou un conteneur natif sont évalués par leur sémantique
:

- `MatDrawer` convient à une sous-région mais ses modes `over`/`push` gèrent le
  focus comme une surface temporaire ; vérifier qu'ils ne rendent pas le panneau
  desktop modal par accident ;
- CDK Overlay convient si position, scroll strategy et restitution du focus sont
  configurés et testés ;
- un conteneur natif suffit si la surface reste dans le flux/stacking local et
  qu'aucun comportement composite n'est réécrit.

**PANEL-01 — Officiel avant custom.** Choisir la primitive qui correspond à la
sémantique, pas celle dont le nom ressemble le plus au visuel. Documenter la
raison dans le code ou le work order si le choix n'est pas évident.

## 12. Rail horizontal, panneau et colonne d'actions

**SCROLL-01 — Bornage.** Quand le panneau est ouvert, la zone de données et le
rail horizontal s'arrêtent à son bord gauche. Aucun contenu ni thumb de scroll
ne passe visuellement sous le panneau.

**SCROLL-02 — Colonne sticky.** Si une future colonne `Actions` est autorisée,
elle reste à droite et peut être sticky. Panneau fermé, la dernière donnée
scrollée s'arrête à son bord gauche. Panneau ouvert, le panneau devient la borne
droite utile selon la composition approuvée.

**SCROLL-03 — Focus.** Le scroll horizontal ne doit jamais masquer le contrôle
focusé sous une colonne sticky ou le panneau. `scrollIntoView` automatique ne
doit pas provoquer de saut vertical destructeur.

**SCROLL-04 — Reflow.** L'exception WCAG autorisant un scroll horizontal pour
une table de données ne s'étend pas à toute la page. Titre, recherche,
commandes, pagination et panneaux doivent continuer à reflow à `320 CSS px`/zoom
`400%`.

## 13. États asynchrones et annonces

**STATE-01 — Chargement initial.** La collection expose `aria-busy` sur sa
région et un statut accessible concis. Le focus ne saute pas vers un spinner.

**STATE-02 — Rafraîchissement.** Les données existantes peuvent rester visibles
avec un état stale/busy. La fin annonce le résultat utile sans lire toute la
table. Un clic produit exactement le GET attendu par le contrat.

**STATE-03 — Chargement progressif compact.** Le cas nominal reste visuellement
silencieux, selon ADAPT-9. L'état interne reste accessible ; une erreur conserve
les cartes et expose `Réessayer`.

**STATE-04 — Vide.** L'état vide distingue absence totale et absence après
filtrage. Il propose seulement une action réellement autorisée.

**STATE-05 — Erreur.** Une erreur critique utilise un message annoncé
immédiatement ; une erreur de formulaire reste associée aux champs et au résumé
pertinent. Une région `alert` ne doit pas être réannoncée à chaque détection de
changement.

**STATE-06 — Création.** Après succès : fermer la surface, restaurer un focus
pertinent, invalider la liste nommée une seule fois et annoncer le succès. Après
erreur : conserver les valeurs, rester dans la surface et annoncer le problème.

## 14. Focus, clavier et pointeur

### 14.1 Séquence attendue Medium/Expanded

1. lien d'évitement et navigation applicative ;
2. recherche locale ;
3. `Créer` ;
4. `Rafraîchir` ;
5. `Filtres` ;
6. tris et filtres de colonnes dans l'ordre DOM ;
7. contrôles de cellules explicitement activés ;
8. pagination.

Le titre et les cellules textuelles ne deviennent pas tabulables.

### 14.2 Séquence attendue Compact

1. recherche et commandes visibles ;
2. contrôles réellement interactifs des cartes ;
3. FAB `Créer` selon sa position DOM logique ;
4. contenu de la surface modale lorsqu'elle est ouverte.

**FOCUS-01 — Visible.** Tout contrôle dispose d'un indicateur équivalent au
minimum WCAG Focus Appearance : périmètre perceptible, contraste suffisant et
aucun masquage par sticky, panneau ou viewport.

**FOCUS-02 — Ordre.** Aucun `tabindex` positif. Les flèches sont réservées aux
composites qui les définissent officiellement ; elles ne remplacent pas Tab dans
un groupe de boutons ordinaire.

**FOCUS-03 — Cibles.** Les cibles C5 restent au moins `48 × 48 CSS px`, ce qui
dépasse le minimum WCAG AA de `24 × 24`. Une icône visuelle plus petite peut
être centrée dans cette cible.

**FOCUS-04 — Hover.** Une information révélée au survol doit aussi être
disponible au focus, rester survolable et pouvoir être masquée. Aucune fonction
essentielle ne dépend du seul hover.

## 15. Densité, couleur, mouvement et internationalisation

**VIS-01 — Densité.** La densité est un choix d'environnement d'entrée, distinct
de la largeur. C5 ne mélange pas arbitrairement des lignes compactes et des
contrôles cozy dans une même hiérarchie. Les cibles interactives restent sûres
pour les environnements hybrides tactile/souris.

**VIS-02 — Tokens.** Couleurs, espacements, rayons, elevations, typographie et
états proviennent des tokens du projet/Material adopté. Les valeurs locales
isolées sont réservées à une géométrie non exprimable par un token existant.

**VIS-03 — Couleur.** Actif, erreur, disabled, sélection et focus ne sont jamais
communiqués par la couleur seule. Contraste standard, contraste non textuel et
forced colors doivent être vérifiés.

**VIS-04 — Mouvement.** L'ouverture du panneau peut être animée, mais respecte
`prefers-reduced-motion`. L'animation n'est ni la seule indication d'état ni une
condition de disponibilité du contenu.

**I18N-01 — Libellés.** Vérifier français et anglais, labels longs, zoom texte à
`200%` et espacement de texte. Les contrôles ne reposent pas sur une largeur
calculée pour un seul libellé.

**I18N-02 — Direction.** Le placement logique utilise `start`/`end` lorsque le
sens du contenu peut varier. Un test RTL vérifie tri, panneau, sticky et icônes
directionnelles ; il ne suffit pas d'inverser visuellement les flèches.

## 16. Arbre de décision « natif et officiel avant custom »

| Besoin                             | Premier choix                               | Choix suivant                                 | Refus explicite                      |
| ---------------------------------- | ------------------------------------------- | --------------------------------------------- | ------------------------------------ |
| bouton/lien/champ/table de lecture | HTML natif                                  | composant Material adopté pour le visuel M3   | rôle ARIA recréant un contrôle natif |
| formulaire                         | Angular Forms + HTML/Material               | validators métier séparés                     | état formulaire dans la table        |
| tri de table Material              | `MatSort`/`MatSortHeader`                   | implémentation locale seulement hors Material | icônes de tri indépendantes          |
| annonce async                      | CDK `LiveAnnouncer` ou région live partagée | service applicatif mince                      | multiples régions concurrentes       |
| dialogue modal                     | `MatDialog` ou CDK conforme                 | `<dialog>` prouvé selon cible                 | simple `div role=dialog` sans focus  |
| panneau non modal                  | conteneur/`MatDrawer` selon sémantique      | CDK Overlay borné                             | focus trap desktop implicite         |
| menu d'actions                     | Angular Aria Menu ou Material Menu          | natif seulement si vraie liste de liens       | menu ARIA sans clavier complet       |
| toolbar composite                  | Angular Aria Toolbar                        | groupe natif avec Tab si peu de contrôles     | `role=toolbar` décoratif             |
| grille interactive 2D              | Angular Aria Grid                           | CDK/Material avec modèle complet              | `role=grid` sur table statique       |
| layout/reflow                      | CSS, Grid/Flex, container queries           | CDK Layout si l'état Angular change           | `window.innerWidth` dispersé         |
| styles                             | thème Material/Tailwind/SCSS scopé          | CSS local borné                               | ciblage du DOM interne Material      |

**NATIVE-01.** Un composant officiel n'est pas une obligation si HTML suffit.
Inversement, un motif composite ne doit pas être réécrit localement par
habitude.

**NATIVE-02.** Angular Material et Angular Aria ne possèdent jamais le même
contrôle. Tailwind/SCSS apporte la présentation, jamais le clavier ou l'ARIA.

**NATIVE-03.** Toute dépendance doit avoir un premier usage réel, des tests et
un coût bundle mesuré. Une installation sans usage est une régression Knip.

## 17. Instructions explicites pour un LLM de réalisation

Avant de modifier du code, le LLM DOIT :

1. lire le work order et les contrats C5 publiés ;
2. inventorier les capacités présentes et absentes ;
3. vérifier le manifeste des références approuvées/rejetées ;
4. relever les primitives Angular déjà adoptées par l'application ;
5. réaliser une revue critique proactive du visuel contre WCAG, Angular,
   Material Adaptive et les heuristiques Fiori pertinentes ;
6. proposer les améliorations significatives et attendre leur décision produit
   avant de modifier la composition approuvée ;
7. écrire ou activer les oracles qui échouent sur le runtime historique ;
8. annoncer toute contradiction au lieu de choisir silencieusement.

Pendant la réalisation, il DOIT :

- garder transport et invalidation hors des composants visuels ;
- utiliser les mêmes façades et le même état pour les trois fenêtres ;
- réaliser les règles `LAY-*`, `TABLE-*`, `FILTER-*`, `PANEL-*` et `FOCUS-*` ;
- conserver les sélecteurs de test sémantiques, sans dépendre du texte décoratif
  ;
- ne modifier ni `list-query` ni `action-request` pour encoder un placement ;
- ne pas créer de primitive partagée à partir de C5 seul ;
- documenter toute dérogation avec règle affectée, raison et oracle compensant.

Avant de proposer la fusion, il DOIT produire :

- diff confiné au work order ;
- compilation, lint, tests unitaires et build production verts ;
- tests Playwright fonctionnels et géométriques verts ;
- tests accessibilité automatisés sans violation sérieuse/critique ;
- inspection clavier et focus manuelle ;
- captures Medium/Expanded et Compact aux états pertinents ;
- mesure bundle avant/après ;
- preuve qu'aucune capacité non déclarée n'est apparue ;
- preuve qu'un resize n'émet aucun appel réseau.

Le LLM NE DOIT PAS :

- remplir une lacune de contrat avec une supposition plausible ;
- confondre fidélité visuelle et autorisation fonctionnelle ;
- remplacer une action texte par une icône seulement pour gagner de la place ;
- rendre une ligne cliquable parce qu'un détail semble utile ;
- ajouter `role`, ARIA ou `tabindex` sans implémenter le comportement promis ;
- adopter une baseline visuelle avant validation humaine du rendu ;
- supprimer les images approuvées ou réactiver une référence rejetée.

## 18. Plan d'oracles ADAPT-11c

### 18.1 Fonctionnel

- la barre affiche titre, recherche, créer, rafraîchir, filtres dans l'ordre ;
- `Exporter` et actions de ligne restent absents sans contrat ;
- la recherche et les filtres de colonne/panneau restent synchronisés ;
- rafraîchir conserve la requête appliquée et émet exactement un GET ;
- la création réussie invalide une seule fois la liste nommée ;
- le resize n'émet aucun appel réseau et ne perd aucun état.

### 18.2 Géométrie

- `medium` et `expanded` : titre à gauche, groupe à droite ;
- en largeur contrainte, le wrap respecte l'algorithme de la section 5.1 ;
- le panneau commence au haut de la table et finit avant le rail ;
- le rail s'arrête au bord gauche du panneau ;
- le contenu focusé n'est jamais sous une surface sticky ;
- la hauteur courte garde les actions de panneau atteignables.

### 18.3 Accessibilité

- Tab/Shift+Tab, Entrée, Espace et Échap ;
- focus initial, trap uniquement modal, restitution au déclencheur ;
- `aria-expanded`, `aria-controls`, nom de table et labels de filtres ;
- cycle de tri et annonce du nouvel état ;
- `aria-busy`, succès, erreur et retry ;
- zoom `400%`/viewport `320 CSS px`, texte `200%`, espacement de texte ;
- contraste, forced colors, reduced motion et cibles `48 × 48` ;
- VoiceOver + Safari au minimum sur macOS ; NVDA + Chrome ou Firefox dans une
  capacité d'exécution adaptée avant promotion production ;
- français, anglais, contenu long et RTL.

### 18.4 Seuil de fusion

La tranche est refusée si un test est skippé pour masquer un écart, si une
capacité est décorative, si le focus est seulement inspecté par capture, ou si
la géométrie n'est prouvée que dans une fenêtre idéale.

## 19. Checklist courte de revue

- [ ] Le titre de table est à gauche ; recherche puis actions sont à droite.
- [ ] La barre reflow sans perdre `Créer` ou `Filtres`.
- [ ] Le total affiché est autoritatif ou absent.
- [ ] Les boutons et liens utilisent les éléments natifs corrects.
- [ ] Les icônes seules ont nom, tooltip, focus et cible `48 × 48`.
- [ ] La table n'est pas déclarée `grid` sans interaction 2D complète.
- [ ] Tri et filtre sont deux contrôles distincts dans deux lignes d'en-tête.
- [ ] Les filtres actifs ne reposent pas sur la couleur seule.
- [ ] Le panneau Compact est modal ; Medium/Expanded ne le sont pas.
- [ ] Le panneau et la colonne sticky bornent correctement le rail.
- [ ] Une ligne et une cellule ne deviennent interactives que par capacité.
- [ ] États async et changements de tri sont annoncés sans voler le focus.
- [ ] Resize, zoom, hauteur courte, RTL et libellés longs sont testés.
- [ ] Aucun endpoint, permission, export ou action de ligne n'est inventé.
- [ ] Bundle, Knip, lint, build, tests et confinement sont verts.

## 20. Références officielles indexées par question

### Accessibilité et Web

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) — norme de conformité.
- [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) — zoom,
  `320 CSS px` et exception des tableaux bidimensionnels.
- [Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text) — texte
  à `200%`.
- [Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance)
  — surface et contraste du focus.
- [Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)
  — sticky, panneau et clavier virtuel.
- [Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
  — minimum AA ; C5 applique une politique plus forte à `48 × 48`.
- [Label in Name](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name) —
  cohérence entre texte visible et nom accessible.
- [Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html)
  — tooltips et contenus révélés.
- [Status Messages](https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html)
  — annonces sans déplacement du focus.
- [WAI-ARIA APG — Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) —
  coût clavier d'une vraie toolbar.
- [WAI-ARIA APG — Table](https://www.w3.org/WAI/ARIA/apg/patterns/table/) et
  [Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) — distinction lecture
  et grille interactive.
- [WAI-ARIA APG — Modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
  — focus et modalité Compact.

### Angular officiel

- [Angular — Accessibility](https://angular.dev/best-practices/a11y) — HTML
  natif, Material/CDK et principes Angular.
- [Angular Aria — Overview](https://angular.dev/guide/aria/overview) — motifs
  headless officiels.
- [Angular Aria — Grid](https://angular.dev/guide/aria/grid) — uniquement pour
  une grille 2D réellement interactive.
- [Angular Material — Button](https://material.angular.dev/components/button/overview)
  — boutons natifs, variantes et boutons icônes.
- [Angular Material — Tooltip](https://material.angular.dev/components/tooltip/overview)
  — relation accessible et déclenchement multi-modalité.
- [Angular Material — Sort](https://material.angular.dev/components/sort/overview)
  — cycle, descriptions et annonce du tri.
- [Angular Material — Table](https://material.angular.dev/components/table/overview)
  — responsabilité limitée du composant table.
- [Angular Material — Sidenav/Drawer](https://material.angular.dev/components/sidenav/overview)
  — modes, focus et coût d'`autosize`.
- [Angular CDK — Accessibility](https://material.angular.dev/cdk/a11y/overview)
  — focus trap et LiveAnnouncer.
- [Angular Component Harnesses](https://angular.dev/guide/testing/component-harnesses-overview)
  — tests au niveau de l'API publique.
- [Angular Components — assistance technique supportée](https://github.com/angular/components#browser-and-screen-reader-support)
  — matrice de navigateurs et lecteurs d'écran.

### Adaptation Material

- [Material Design 3](https://m3.material.io/) — design system et composants.
- [Use window size classes](https://developer.android.com/develop/adaptive-apps/guides/use-window-size-classes)
  — espace réel et transitions dynamiques.
- [Canonical layouts](https://developer.android.com/develop/adaptive-apps/guides/canonical-layouts)
  — rôle des régions et panes.

Ces sources Android définissent un raisonnement éprouvé ; leurs API Compose et
leurs valeurs `dp` ne sont pas importées dans Angular.

### SAP Fiori — heuristiques d'interface d'entreprise

- [Fiori 1.96 — UI Elements](https://www.sap.com/design-system/fiori-design-web/v1-96/ui-elements)
  — index historique fourni par le produit.
- [Fiori 1.96 — Table toolbar](https://www.sap.com/design-system/fiori-design-web/v1-96/ui-elements/table-bar/)
  — anatomie titre, recherche et actions.
- [Fiori — Action placement](https://www.sap.com/design-system/fiori-design-web/v1-108/foundations/best-practices/global-patterns/action-placement)
  — proximité, ordre et actions de ligne.
- [Fiori — Table overview](https://www.sap.com/design-system/fiori-design-web/v1-96/foundations/best-practices/ui-elements/tables/table-overview)
  — choix responsive table/grid table et volumes.
- [Fiori — Accessibility](https://www.sap.com/design-system/fiori-design-web/v1-148/discover/sap-design-system/product-standards/accessibility-in-sap-fiori)
  — responsabilité partagée framework/application et priorité aux contrôles
  standards.
- [Fiori — Cozy and compact](https://www.sap.com/design-system/fiori-design-web/v1-84/foundations/visual/cozy-compact)
  — densité selon l'entrée, distincte de la largeur.
- [Fiori — Tooltips](https://www.sap.com/design-system/fiori-design-web/v1-120/foundations/best-practices/ui-elements/using-tooltips)
  — contexte des icônes et limites tactiles.

Fiori est ici une bibliothèque d'heuristiques, pas une dépendance et pas une
autorité supérieure à WCAG, Angular ou aux contrats C5.

## 21. Questions volontairement différées

- contrat d'export, format, permission, volumétrie et feedback ;
- actions modifier/supprimer/activer/désactiver et leur propriété métier ;
- détail de ligne et choix route/panneau/dialogue ;
- sélection, actions collectives et édition ;
- virtualisation ou data-grid pour très grand volume ;
- extraction d'une primitive partagée après un second cas indépendant.

Ces points ne sont ni oubliés ni implicitement autorisés. Ils restent hors du
runtime C5 jusqu'à une définition, un contrat et des oracles dédiés.

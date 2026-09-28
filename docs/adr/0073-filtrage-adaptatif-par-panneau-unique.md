# ADR-0073 — Filtrage adaptatif par panneau unique et état brouillon

- **Statut :** accepté
- **Date :** 2026-09-28

## Contexte

La preuve C5 « Gestion des utilisateurs » possède actuellement quatre filtres,
mais la plateforme doit pouvoir réaliser des pages qui en exposent une
quinzaine sans transformer la liste en formulaire dense. La même capacité doit
rester compréhensible en fenêtre compacte, moyenne ou étendue, préserver les
valeurs pendant un redimensionnement et ne pas multiplier les appels réseau.

Une référence tierce fournie le 2026-09-28 illustre un bottom sheet à deux
niveaux : une liste de critères, puis le contrôle d'un critère dans le même
panneau. Elle sert d'observation comportementale seulement. Aucun actif visuel,
style de marque ou copie d'interface tierce n'entre dans le dépôt.

## Options envisagées

### Option A — Afficher tous les champs au-dessus de la liste

- Avantage : tous les critères sont immédiatement visibles.
- Inconvénients : quinze champs repoussent la donnée principale, produisent un
  reflow fragile et deviennent difficiles à parcourir au clavier ou au zoom.

### Option B — Utiliser la même modale centrée à toutes les tailles

- Avantage : une seule géométrie à implémenter.
- Inconvénients : exploite mal les grands écrans, sépare inutilement les outils
  de leur liste et ignore la doctrine adaptative de l'ADR-0072.

### Option C — Un état de filtres, plusieurs conteneurs adaptatifs

- Avantages : bottom sheet compact, side sheet modal moyen et supporting pane
  persistant étendu ; la liste reste prioritaire et le formulaire n'est pas
  dupliqué.
- Inconvénients : la modalité, le focus et la géométrie doivent changer sans
  recréer l'état ou les opérations métier.

## Décision

**Option C.** Une page utilise un seul modèle de filtres avec deux états
explicites, `applied` et `draft`, puis adapte uniquement son conteneur :

- `compact` : bottom sheet modal, navigation interne critère → contrôle ;
- `medium` : side sheet modal à droite, champs regroupés ;
- `expanded` : supporting pane persistant, repliable et non modal.

Les actions `Réinitialiser` et `Appliquer` restent côte à côte dans un footer
fixe du panneau. Modifier ou réinitialiser le brouillon ne déclenche aucune
requête. `Appliquer` valide le brouillon, produit au plus un GET et ferme le
panneau temporaire. Fermer sans appliquer restaure les filtres appliqués.

## Justification

Cette solution garde la donnée comme contenu principal, exploite l'espace
disponible sans étirer quinze champs et rend la sémantique réseau observable.
Elle applique le layout canonique `supporting pane` sur une fenêtre réellement
assez large, tout en utilisant une tâche modale lorsque le contenu principal ne
peut pas conserver sa largeur minimale.

Le nombre de champs ne décide pas seul de l'interface. Leur fréquence, leur
relation métier et la largeur utile déterminent l'ordre et les groupes. Les
trois à cinq critères les plus fréquents forment la section `Essentiels`; les
autres appartiennent à des groupes métier repliables. Un groupe actif ou
invalide s'ouvre automatiquement.

## Invariants

- un seul formulaire et une seule identité DOM traversent les changements de
  classe quand le framework le permet ;
- aucun GET, reset ou invalidation n'est causé par un resize ;
- la recherche principale reste visible hors du parcours détaillé compact ;
- les chips résument uniquement les filtres appliqués, jamais le brouillon ;
- retirer une chip est une action appliquée explicite et produit au plus un GET ;
- aucun `menu` n'héberge un formulaire de filtres interactifs ;
- le mode modal borne le focus, rend l'arrière-plan inerte, accepte Échap et
  restitue le focus ; le mode persistant ne possède aucun de ces attributs
  modaux ;
- les actions restent visibles sans masquer le contenu, le clavier ou le focus ;
- le moteur de composition ne déduit pas une présentation universelle du seul
  nombre de filtres.

## Conséquences

### Positives

- une page reste utilisable avec quinze critères ou davantage ;
- le comportement réseau est déterministe et testable ;
- compact, medium et expanded partagent le même état et les mêmes contrats ;
- la hiérarchie des filtres peut être fournie par une conception ou un LLM sans
  imposer un nouveau framework UI.

### Négatives / dette acceptée

- C5 doit recevoir une nouvelle preuve de présentation avant toute modification
  de sa page ;
- les groupes, priorités et types de contrôles doivent être décidés ou fournis,
  pas inventés à partir des noms de champs ;
- une primitive partagée ne sera extraite qu'après un second cas réel conforme.

### Points à réévaluer

- recherche interne dans les filtres au-delà d'un volume réellement observé ;
- sauvegarde de vues filtrées après besoin produit explicite ;
- synchronisation dans l'URL seulement si partage, navigation arrière ou deep
  link l'exigent ;
- promotion en composant de plateforme après deux réalisations indépendantes.

## Références

- [ADR-0072 — UI adaptative guidée par M3](./0072-ui-adaptative-guidee-par-m3-et-apis-officielles.md)
- [Décision détaillée C5 ADAPT-6](../architecture/c5-adapt6-filtres-multi-fenetres-2026-09-28.md)
- [Material 3 — side sheets](https://m3.material.io/components/side-sheets/overview)
- [Android — canonical layouts](https://developer.android.com/develop/adaptive-apps/guides/canonical-layouts)
- [Android — supporting pane](https://developer.android.com/develop/adaptive-apps/guides/build-a-supporting-pane-layout)
- [Angular Material — sidenav](https://material.angular.dev/components/sidenav/overview)
- [Angular Material — expansion](https://material.angular.dev/components/expansion/overview)
- [Angular Material — chips](https://material.angular.dev/components/chips/overview)


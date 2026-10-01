# ADR-0078 — Vues de données par capacités optionnelles

- **Statut :** Accepted
- **Date :** 2026-10-01

## Contexte

La preuve C5 « Gestion des utilisateurs » combine déjà lecture paginée,
recherche, filtres synchronisés, chargement compact progressif, création et
invalidation nommée. Les visuels approuvés ajoutent une barre d'actions et des
actions de ligne, tandis qu'une consultation de ligne peut être utile sur
certaines fonctionnalités seulement.

Le composant `table` du dépôt source `cmz-backoffice`, audité sur
`feat/config@f064d1d8e50190cd33e9ace096d51710d2474f2f`, matérialise environ
cinquante usages réels : sélection, actions directes ou regroupées, édition en
ligne, badges, médias, tri, réordonnancement et permissions par ligne. Il prouve
la diversité des besoins, mais son accumulation de responsabilités, ses champs
magiques et sa logique métier montrent aussi le coût d'un composant universel.

Deux risques opposés doivent être évités : sur-spécialiser la plateforme sur C5,
ou reconstruire un « super tableau » qui absorbe transport, métier, interaction,
responsive et rendu.

## Options envisagées

### Option A — Copier ou envelopper le composant source

- avantage : couverture fonctionnelle immédiate de nombreux cas historiques ;
- inconvénients : dépendance au legacy, dette et bibliothèques UI importées,
  contrat non typé, logique métier recopiée, rayon d'impact élevé.

### Option B — Déclarer toutes les fonctions dans un schéma de table universel

- avantage : configuration centralisée ;
- inconvénients : schéma prématuré, mélange exécution/présentation, renderer
  cross-stack artificiel et complexité payée même par les cas simples.

### Option C — Modèle sémantique à capacités optionnelles

- avantage : chaque écran active seulement ce qu'il exige ; `list-query` et
  `action-request` restent propriétaires de l'exécution ; les cibles Angular et
  React gardent leurs primitives de présentation ;
- coût : inventaire, typage et oracles doivent précéder chaque promotion de
  capacité.

## Décision

**Option C.** Une vue de données est une composition de capacités sémantiques
optionnelles, pas un nouveau générateur métier ni un composant universel.

- `list-query` possède lecture, paramètres, pagination et rafraîchissement ;
- `action-request` possède mutation, permission, confirmation, effets et
  invalidation ;
- le plan de page relie leurs nœuds ;
- la présentation choisit table, cartes, liste ou grille et place les
  contrôles ;
- le design system fournit seulement les comportements partagés et prouvés.

Le dépôt source est un **corpus empirique de capacités**. Il ne devient ni une
dépendance runtime, ni une autorité visuelle, ni une source à copier. Son audit
ne modifie pas `legacy.lock.json` et ne change pas la nature du corpus SEOS.

Toute capacité est désactivée par défaut. Aucun nom de champ (`__action`,
`statusLabel`, etc.) ne déclenche implicitement un comportement. Les contrats
utilisent des unions discriminées ou des identifiants de renderer enregistrés,
jamais un `type: string` ouvert.

L'activation d'une ligne est distincte de ses contrôles internes. Une ligne ne
devient focusable, cliquable ou annoncée comme consultable que si une action de
ligne est déclarée. Un contrôle de cellule consomme sa propre interaction et ne
déclenche jamais l'action de ligne.

Le rendu par défaut reste une table HTML sémantique. Une grille interactive 2D
n'est adoptée que si navigation cellulaire, sélection ou édition l'exigent ; en
Angular elle réutilise alors Angular Aria Grid conformément à
[ADR-0077](./0077-ui-angular-officielle-avant-custom.md), avec oracles clavier
et focus.

Une capacité peut être réalisée localement sur un premier cas réel. Sa promotion
en primitive partagée exige un second usage indépendant, un contrat stable et
des oracles communs. Le besoin d'un seul écran ne suffit pas à généraliser son
layout.

## Justification

La séparation conserve la neutralité backend et cross-stack des primitives v2.
Elle permet à un humain ou un LLM de changer la mise en page sans réécrire le
transport ou les mutations. Le legacy devient une mémoire des variations déjà
rencontrées, tandis que les preuves actuelles restent l'autorité sur le produit
à construire.

La décision suit également la responsabilité volontairement limitée des tables
Angular Material/CDK : rendu des lignes d'abord, tri, pagination et filtrage par
composition. Elle évite d'appliquer `role=grid` sans le modèle clavier requis.

## Conséquences

### Positives

- diversité legacy exploitée sans importer sa dette ;
- capacités testables indépendamment et absentes quand inutiles ;
- UI libre de varier par fonctionnalité et classe de fenêtre ;
- permissions et règles métier hors du composant de table ;
- chemin explicite pour liens, radios, cases à cocher, actions et détails ;
- compatibilité avec les renderers multi-stack de la plateforme.

### Négatives / dette acceptée

- le `cmz-table` actuel reste minimal et porte encore des champs spéciaux ; sa
  migration sera progressive, jamais un big bang ;
- le contrat conceptuel n'est pas encore un schéma publié ; l'implémenter avant
  les oracles constituerait une violation de cette décision ;
- les six visuels validés d'actions sont encore des preuves locales ignorées par
  Git ; leur reproduction déterministe et leur publication sont prioritaires ;
- édition en ligne, réordonnancement et grille 2D restent différés faute de cas
  C5 qui les exige.

### Points à réévaluer

- deuxième fonctionnalité indépendante réclamant la même capacité ;
- besoin mesuré de virtualisation ou navigation cellulaire ;
- conflit entre contrat target-neutral et primitive officielle d'une cible ;
- coût bundle, clavier ou lecteur d'écran supérieur au budget accepté.

## Références

- [Audit et plan d'exploitation du corpus](../architecture/data-view-capabilities-cmz-backoffice-2026-10-01.md)
- [ADR-0023 — titularité du legacy](./0023-titularite-des-droits-sur-le-legacy.md)
- [ADR-0030 — IR canonique et profils cibles](./0030-ir-canonique-et-profils-cibles.md)
- [ADR-0058 — plan de page et primitives v2](./0058-page-execution-plan-reference-les-primitives-v2.md)
- [ADR-0077 — UI Angular officielle avant custom](./0077-ui-angular-officielle-avant-custom.md)
- [Angular Aria Grid](https://angular.dev/guide/aria/grid)
- [WAI-ARIA APG — Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- [WAI-ARIA APG — Table](https://www.w3.org/WAI/ARIA/apg/patterns/table/)
- [Angular Material Table](https://material.angular.dev/components/table/overview)

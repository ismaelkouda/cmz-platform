# ADR-0083 — Distinguer preuve de page, exemple de mise en page et archive

- **Statut :** Accepted
- **Date :** 2026-10-03
- **Supersède :**
  [ADR-0082 — Séparer références actives et archives de présentation](./0082-cycle-de-vie-des-references-de-presentation.md)

## Contexte

ADR-0082 séparait une preuve active liée à une page et une archive sans
autorité. Cette séparation ne couvre pas un troisième besoin : conserver des
exemples de mise en page génériques, utiles à un humain ou à un LLM, sans les
présenter comme la réalisation d'une fonctionnalité précise.

Une capture de la page « Gestion des utilisateurs » prouve le rendu de cette
page. Elle ne constitue pas automatiquement un bon exemple pour une autre vue de
données. Réciproquement, une maquette générique peut illustrer une bonne
géométrie sans prouver son implémentation, ses comportements ou l'existence de
ses capacités dans une page donnée.

## Options envisagées

### Option A — Publier les exemples comme preuves de page

- avantage : réutilise le manifeste existant ;
- rejet : associe faussement l'exemple à un contrat métier et autorise le LLM à
  recopier des capacités absentes.

### Option B — Conserver les exemples comme archives

- avantage : aucune confusion avec une preuve active ;
- rejet : `authority: none` empêche leur usage intentionnel comme guide de
  composition.

### Option C — Introduire une autorité de portée limitée

- avantage : les exemples deviennent consommables pour la conception tout en
  interdisant les inférences métier ;
- coût : schéma, manifeste, documentation et garde-fous dédiés.

## Décision

**Option C.** Une ressource de présentation appartient à exactement une des
trois catégories suivantes :

1. **preuve de page** (`presentation-evidence`) : liée à un `page_id`, elle
   prouve une réalisation et des états explicitement approuvés ;
2. **exemple de mise en page** (`presentation-layout-example-set`) : générique,
   il guide seulement les dimensions déclarées dans son `authority_scope` ;
3. **archive** (`historical-presentation-reference-set`) : conservée pour la
   traçabilité avec `authority: none`.

### Autorité d'un exemple de mise en page

Un exemple PEUT faire autorité sur :

- l'ordre et la relation spatiale des régions ;
- la hiérarchie visuelle ;
- les priorités de reflow et de réduction des commandes ;
- la borne d'un panneau, d'un rail fixe ou d'un défilement ;
- la représentation d'états visuels explicitement nommés.

Il NE DOIT PAS autoriser ou inventer :

- un endpoint, un payload ou un backend ;
- une permission ou un rôle ;
- une action, une colonne ou un filtre absent du contrat de page ;
- un composant, une dépendance ou une technique d'implémentation ;
- des libellés, données ou règles métier ;
- une copie pixel-perfect lorsque le contexte ou le design system diffère.

### Applicabilité par capacités

Chaque image déclare les capacités qu'elle **montre** et non celles que la page
**doit** posséder. Une image ne devient applicable que lorsque le contrat de la
page déclare les mêmes capacités. Le noyau de vue, le panneau de filtres, les
actions de ligne et l'export restent indépendants.

### Adaptation par espace disponible

Les classes Compact, Medium et Expanded décrivent une base de test ; elles ne
remplacent pas la mesure de l'espace du conteneur. En particulier, les commandes
avec icône et libellé ne deviennent « icône seule » que si l'espace utile est
contraint. Le nom accessible, l'infobulle, le focus visible et la taille de
cible restent obligatoires dans la réalisation.

### Nature des sources de rendu

Le HTML et le script qui produisent les PNG garantissent une reproduction
déterministe des exemples. Ils ne sont ni un composant Angular, ni une preuve
d'accessibilité, ni une source à copier dans le runtime. Les règles adjacentes
et les oracles de la cible restent l'autorité d'implémentation.

## Conséquences

### Positives

- un LLM peut distinguer une géométrie réutilisable d'une fonctionnalité ;
- les images et leurs limites sont lisibles par machine ;
- une capacité visible ne fuit plus silencieusement vers un contrat ;
- la même disposition peut guider plusieurs stacks et plusieurs métiers.

### Négatives

- un troisième manifeste doit être maintenu ;
- une image seule n'est plus suffisante : son manifeste et sa documentation font
  partie de la référence ;
- la conformité finale exige toujours une preuve runtime et une revue humaine.

## Références

- [ADR-0066 — preuve de présentation bornée](./0066-preuve-presentation-bornee-pour-realisation-llm.md)
- [ADR-0077 — UI Angular officielle avant custom](./0077-ui-angular-officielle-avant-custom.md)
- [ADR-0078 — vues de données par capacités optionnelles](./0078-vues-de-donnees-par-capacites-optionnelles.md)
- [Catalogue des exemples génériques](../../examples/presentation/README.md)
- [Vue de données Medium/Expanded](../../examples/presentation/data-view-layout-examples/README.md)
- [Vue de données Compact](../../examples/presentation/compact-data-view-layout-examples/README.md)

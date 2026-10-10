# ADR-0099 — Supprimer les références de présentation retirées : Git en est la mémoire

- **Statut :** Accepted
- **Date :** 2026-10-10
- **Décideurs :** propriétaire du produit et équipe plateforme CMZ
- **Supersède :**
  [ADR-0083 — Distinguer preuve de page, exemple de mise en page et archive](./0083-preuve-page-exemple-mise-en-page-et-archive.md)

## Contexte

ADR-0083 classait une ressource de présentation dans l'une de trois catégories :
preuve de page, exemple générique de mise en page, archive. La troisième
conservait dans l'arbre, sous des dossiers `historical/`, les références
rejetées ou remplacées, avec un manifeste `authority: none`, un schéma dédié et
des tests de non-republication.

Le 2026-10-10, la préparation du work order v5 de la page « Gestion des
utilisateurs » a montré trois défauts de ce dispositif :

- la preuve de page `presentation_5627f087550dd218`, encore `approved`,
  décrivait une interface que la liaison de mise en page
  `users-management-layout-2026-10-09` et ses oracles contredisent (panneau de
  filtres à titre et croix, création hors de la vue de données) ; l'outil
  acceptait de lier les deux à un même work order ;
- 34 références rejetées ou remplacées restaient hors de toute archive, dans un
  dossier d'allure active ;
- 27 fichiers archivés restaient consultables comme s'ils pouvaient guider une
  réalisation, et l'un d'eux citait encore l'URI de la preuve devenue fausse.

Un lecteur ou un LLM qui ne connaît pas le dépôt ne distingue pas une image
conservée « pour la traçabilité » d'une image qui fait autorité. Le propriétaire
a demandé leur suppression et l'a validée sur inventaire.

## Options envisagées

### Option A — Archiver aussi les 34 références restantes

- avantage : applique une troisième fois le mécanisme d'ADR-0083 ;
- rejet : porte l'arbre à 61 fichiers sans autorité, exige d'étendre le schéma
  d'archive (aucun type de média pour les SVG) et laisse intact le risque de
  confusion qui motive la décision.

### Option B — Dépublier la preuve fausse sans toucher aux fichiers

- avantage : changement minimal ;
- rejet : crée un état « retiré mais ni archivé ni supprimé », déjà à l'origine
  des 34 références orphelines.

### Option C — Supprimer ; l'historique Git conserve tout

- avantage : aucun fichier sans autorité dans l'arbre ; mécanisme natif, sans
  schéma, manifeste ni test à entretenir ;
- coût : la raison d'un retrait n'est plus lisible dans un manifeste ; elle doit
  l'être dans la décision qui le prononce.

## Décision

**Option C.** Une référence visuelle conservée dans l'arbre appartient à
exactement une de **deux** catégories :

1. **preuve de page** (`presentation-evidence`) : liée à un `page_id`, elle
   borne la réalisation de cette page aux sources et aux états explicitement
   approuvés ;
2. **exemple de mise en page** (`presentation-layout-example-set`) : générique,
   il guide seulement les dimensions déclarées dans son `authority_scope`.

La liaison de mise en page (`presentation-layout-binding`, ADR-0098) n'est pas
une référence visuelle : elle sélectionne des exemples pour une page et reste
hors de ce classement.

Une référence visuelle rejetée ou remplacée est **supprimée**, dans le lot même
qui la retire. Aucun dossier `historical/` ne vit sous `examples/`. La catégorie
« archive », son schéma `historical-presentation-reference-set` et ses
manifestes `archive.json` sont retirés.

Le retrait d'une référence se justifie dans une ADR ou dans la note
d'architecture du lot : ce qui est retiré, pourquoi, par quoi c'est remplacé, et
un commit où le contenu reste consultable.

**ADR-0066 reste intégralement en vigueur.** Une source visuelle approuvée,
locale, adressée par son contenu et bornée peut guider une réalisation, quelle
que soit sa nature admise par le schéma `presentation-evidence` : design
structuré, capture, wireframe, interface rendue, design system, mapping,
annotation ou brief. Cette décision ne retire aucune de ces natures ; elle
retire des références précises.

Pour la page « Gestion des utilisateurs », aucune preuve de page n'est
actuellement publiée : son prochain work order porte
`presentation_evidence: null` tant qu'une nouvelle preuve n'est pas
explicitement approuvée. Sa disposition est guidée par la liaison de mise en
page (ADR-0098), sa conformité par les oracles de la cible.

### Règles reprises sans changement d'ADR-0083

Un exemple de mise en page PEUT faire autorité sur :

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

Chaque image déclare les capacités qu'elle **montre**, non celles que la page
**doit** posséder ; elle ne devient applicable que lorsque le contrat de la page
déclare les mêmes capacités. Les classes Compact, Medium et Expanded décrivent
une base de test et ne remplacent pas la mesure de l'espace du conteneur. Le
HTML et le script qui produisent les PNG garantissent leur reproduction ; ils ne
sont ni un composant de la cible, ni une preuve d'accessibilité, ni une source à
copier dans le runtime.

### Références retirées par cette décision

Toutes restent consultables dans le commit
`ea31ecf777c4a13e143a7e29305f44ca7686f5b4` et ses ancêtres.

| Retiré                                                                                                           | Fichiers | Raison                                                                       | Remplacé par                                                                           |
| ---------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `designs/users-management-proof.presentation-evidence.json`                                                      | 1        | preuve `approved` contredite par la liaison de mise en page                  | `designs/users-management-proof.layout-binding.json`                                   |
| `examples/users-management-proof/presentation/progressive-filter-candidates/`                                    | 13       | approuvées le 2026-09-29, remplacées sur le panneau, la barre et la création | exemples génériques `data-view-layout-examples` et `compact-data-view-layout-examples` |
| `…/presentation/adaptive-candidates/`, `…/filter-candidates/`, quatre PNG et `reference-proposal.md` à la racine | 21       | rejetées comme références courantes le 2026-09-30                            | idem                                                                                   |
| `…/presentation/historical/`                                                                                     | 23       | archives des créations adaptatives et des vues de données                    | ADR-0078, ADR-0081, exemples génériques                                                |
| `examples/presentation/workspace-shell-layout-examples/historical/`                                              | 4        | anciens candidats de navigation par routes récentes                          | exemples courants du même dossier, ADR-0084                                            |

Intentions conservées, à reconstruire depuis les contrats et autorités courants
si elles redeviennent utiles : brouillon de filtre distinct de l'état appliqué,
ajout progressif de critères, compteur de filtres appliqués, filtres de colonne
synchronisés avec le panneau, première colonne de rang, total des résultats
associé au titre de la vue.

## Conséquences

### Positives

- aucune image ou document sans autorité ne peut être pris pour une référence ;
- un schéma, trois manifestes d'archive et deux fichiers de test disparaissent ;
- une seule règle à vérifier pour ces références : une image ou un document de
  présentation conservé dans l'arbre est décrit par un manifeste
  `presentation-evidence` ou `presentation-layout-example-set`, et ne fait
  autorité que dans les limites de ce manifeste.

### Négatives / dette acceptée

- consulter une référence retirée demande Git ; les liens des notes
  d'architecture datées deviennent des chemins textuels ;
- le garde refuse la preuve retirée par son `presentation_id` et par ses chemins
  ; il ne réserve aucun identifiant de source ni aucun nom de fichier : une
  intention retirée peut être reconstruite sous un nom déjà employé ;
- l'outil de préparation accepte toujours une liaison et une preuve de page
  contradictoires : aucune des deux ne déclare l'autre. Défaut ouvert, à traiter
  dans un lot dédié.

### Points à réévaluer

- à la première preuve de page de nouveau approuvée : son manifeste doit être
  nommé dans `presentation-reference-lifecycle.test.mjs`, qui affirme
  aujourd'hui qu'aucune n'est publiée ;
- si la reconstruction d'une intention retirée s'avère coûteuse faute d'image,
  préférer un nouvel exemple générique validé à la restauration d'un ancien.

## Références

- [ADR-0066 — Preuve de présentation bornée](./0066-preuve-presentation-bornee-pour-realisation-llm.md)
- [ADR-0082 — Séparer références actives et archives](./0082-cycle-de-vie-des-references-de-presentation.md)
  (supersédée)
- [ADR-0083 — Preuve de page, exemple de mise en page et archive](./0083-preuve-page-exemple-mise-en-page-et-archive.md)
  (supersédée)
- [ADR-0098 — Lier la guidance de layout au work order v5](./0098-lier-guidance-layout-au-work-order-v5-par-commit-git.md)
- `tools/generator-platform/presentation-reference-lifecycle.test.mjs`

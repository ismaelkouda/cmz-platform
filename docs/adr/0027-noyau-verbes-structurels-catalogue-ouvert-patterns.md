# ADR-0027 — Noyau de verbes structurels + catalogue ouvert de patterns (remplace la liste fermée d'archétypes)

- **Statut :** Accepted
- **Date :** 2026-08-13

## Contexte

Le dépôt modélise aujourd'hui la structure d'un module métier via un **catalogue
fermé de 4 patterns d'archétype** Nx-shaped
(`docs/architecture/patterns/*.pattern.json`) : `crud-entity`,
`workflow-action`, `read-only-view`, et `action-request` (ce dernier cité par
les trois autres comme point de comparaison mais jamais formalisé en fichier
Nx-shaped propre — trou identifié pendant ce travail). Chaque pattern liste, à
la main, les chemins de fichiers canoniques attendus par entité/volet
(`core_files_nx`), sous une convention de nommage différente d'un pattern à
l'autre (`core_files_nx` vs `list_volet_core_files_nx` vs
`grafana_multi_section_core_files_nx`/`grafana_single_view_core_files_nx`).
`tools/check-pattern-nx.mjs` ne sait consommer que la première forme — son
propre docstring documente que les deux autres formes sont hors périmètre, «
généralisation délibérément écartée pour cette passe ».

Cette liste n'a jamais été conçue comme exhaustive. ADR-0009 (2026-07-21)
documente que SEOS, à l'origine, ne comptait que 2 patterns legacy
(`crud-entity` v23, `action-request` v6), validés sur seulement 6 entités sur 53
recensées à l'époque — la couverture des patterns était déjà un problème ouvert,
pas une hypothèse validée. `workflow-action` et `read-only-view` ont été ajoutés
plus tard pour couvrir des modules qui n'entraient dans aucun des deux
(`processing`/`requests`, `monitoring`/`reporting`/`interactive-map`). Le
catalogue est donc déjà passé de 2 à 4 par nécessité constatée, pas par choix de
conception — signe qu'un catalogue fermé, quel que soit N, sera tôt ou tard
insuffisant.

ADR-0026 (2026-08-12) a réorienté l'objectif du dépôt vers un système de
génération générique **multi-source et multi-stack**, où SEOS/Angular n'est
qu'un cas d'usage. Sous ce nouveau cadrage, le problème de couverture change de
nature : il ne s'agit plus seulement de couvrir les modules SEOS restants, mais
de modéliser **n'importe quel type d'application**, ce qu'aucune liste fermée,
aussi grande soit-elle, ne peut prétendre faire par construction. Une
proposition de 71 patterns UI/mobile (List, Detail View, Wizard, Kanban, etc.,
organisés en 12 catégories) a été soumise pendant ce travail comme candidat de
remplacement — mais elle reproduit exactement le même défaut de fond que la
liste à 4 : c'est encore une énumération fermée de noms, seulement plus fine et
plus longue. Dans six mois, un nouveau besoin (ex. « Split View Editor », «
Kanban Board ») imposerait à nouveau d'éditer une liste à la main.

Le format `workflow-action.pattern.json` référence déjà un
`$schema: "./workflow-action.pattern.schema.json"` — fichier qui n'existe pas.
C'est le signe qu'un besoin de contrat machine-readable unifié pour les patterns
avait déjà été anticipé, sans jamais être livré (T2-6 du backlog,
`docs/architecture/taches-restantes.md` §1.2).

## Options envisagées

### Option A — Étendre la liste fermée actuelle à N patterns supplémentaires

Formaliser `action-request` en 5ᵉ pattern Nx-shaped, puis ajouter au catalogue
les patterns UI jugés utiles parmi les 71 proposés, chacun sous sa propre forme
`*.pattern.json` avec sa propre convention de champs.

- Avantages : continuité directe avec le travail existant (4 patterns déjà
  validés sur 7+ modules réels) ; aucune migration des fichiers existants.
- Inconvénients : ne résout rien structurellement — la liste reste fermée,
  seulement plus longue ; chaque nouveau pattern remis en question demande une
  nouvelle convention ad hoc (le problème déjà observé entre
  `core_files_nx`/`list_volet_core_files_nx`/`grafana_*_core_files_nx`
  s'aggraverait) ; `check-pattern-nx.mjs` devrait être étendu à chaque nouvelle
  forme, sans jamais converger.

### Option B — Noyau stable de verbes structurels + catalogue ouvert de compositions nommées

Remplacer la question « quel est le pattern ? » (choix dans une liste fermée)
par « de quels verbes structurels ce module est-il composé ? » (assemblage libre
d'un petit nombre de rôles stables). Les patterns existants et futurs (les 71
proposés y compris) deviennent des **compositions nommées et documentées** de
ces verbes, jamais des primitives elles-mêmes. Le schéma JSON Schema porte sur
le noyau de verbes (petit, stable, contrat Nx par couche
domain/data/application/ui), pas sur la liste de noms — ajouter un pattern
n'implique jamais de modifier le schéma.

Précédent équivalent identifié chez trois acteurs qui affrontent le même
problème à grande échelle, convergents sur la même stratégie (recherche web
menée le 2026-08-13, sources en fin de document) :

- **Google API Improvement Proposals / resource-oriented design**
  (`google.aip.dev`) : un tout petit nombre de méthodes standards stables
  (Get/List/Create/Update/Delete, AIP-131 à AIP-135) s'appliquent uniformément à
  un catalogue de ressources totalement ouvert et jamais fermé (n'importe quel
  nom métier). AIP-136 documente une échappatoire contrôlée (« custom methods »)
  pour ce qui ne rentre dans aucune méthode standard, avec la règle explicite :
  préférer les méthodes standards, mais ne jamais les forcer à « faire semblant
  de marcher ».
- **Kubernetes CRD / Operator pattern** : un noyau minuscule et stable
  (`spec`/`status`, boucle de réconciliation) permet un catalogue de types de
  ressources personnalisées totalement ouvert (n'importe qui définit un nouveau
  CRD sans toucher au cœur de Kubernetes) — c'est ce qui a permis l'écosystème
  d'opérateurs (Istio, Prometheus, Argo...) sans jamais voter une liste fermée
  de types supportés.
- **Design tokens (Material Design 3)** : stratification primitive tokens
  (valeurs brutes) → semantic tokens (rôles) → component tokens (overrides
  ponctuels). Notable : la communauté design elle-même a largement abandonné la
  hiérarchie stricte « Atomic Design » (atoms→molecules→organisms) en 2024-2025
  au profit de ce modèle plus souple, précisément parce qu'une taxonomie fermée
  de « types de composants » ne scalait pas.

Le point commun aux trois : le niveau qui reste stable dans le temps n'est
jamais une taxonomie de « types de choses » (patterns, ressources, composants) —
c'est une taxonomie de **verbes/rôles** appliqués à un catalogue de noms qui,
lui, reste délibérément ouvert.

- Avantages : le noyau ne devient jamais obsolète par manque de couverture
  (c'est la couche catalogue, pas le noyau, qui absorbe la nouveauté) ; les 71
  patterns UI proposés trouvent une place sans devoir être arbitrés un par un
  dès aujourd'hui ; l'oracle de vérification (`check-pattern-nx.mjs` généralisé)
  se rattache au noyau, donc reste utilisable pour un pattern qui n'existe pas
  encore ; conforme à ADR-0026 (généricité multi-stack — le noyau de verbes
  n'est pas spécifique à Angular).
- Inconvénients : migration des 4 patterns existants (`core_files_nx`
  hétérogènes → forme commune) ; effort de conception initial plus élevé que
  l'Option A ; risque de sur-ingénierie si le nombre de compositions réellement
  utilisées reste faible (mitigé : le catalogue reste un simple fichier JSON par
  composition, pas un nouveau sous-système).

## Décision

**Option B.** Le dépôt adopte un noyau stable de **cinq verbes structurels**,
chacun avec un contrat Nx par couche (domain/data/application/ui) :

1. **Collection** — lecture paginée/filtrée d'un ensemble d'éléments
   (`List → PageResult`, filtres, tri).
2. **Entity** — cycle de vie complet d'un objet identifiable
   (Get/Create/Update/Delete d'une ressource unique).
3. **Transition** — action qui fait passer un état d'une valeur à une autre,
   avec pré/post-conditions (couvre `workflow-action`, approbation, checkout
   multi-étapes).
4. **Composite Read** — assemblage en lecture de plusieurs sources sans mutation
   (couvre `read-only-view`/Grafana, dashboards).
5. **Custom** — échappatoire documentée (façon AIP-136) pour toute
   fonctionnalité qui ne se modélise pas proprement avec les quatre verbes
   ci-dessus. Son usage doit être justifié par écrit dans la composition qui
   l'invoque — jamais un défaut silencieux.

Les patterns existants deviennent des **compositions nommées** de ces verbes,
déclarées dans un catalogue ouvert (`docs/architecture/patterns/*.pattern.json`,
forme inchangée en surface mais désormais validée contre le schéma du noyau) :

- `crud-entity` = `Entity + Collection + Custom(select)`
- `workflow-action` = `Collection×N(volets) + Transition`
- `read-only-view` = `Composite Read`
- `action-request` (à formaliser, T2-8) = `Custom` pur ou `Transition` sans état
  de collection — à trancher lors de sa formalisation

Les 71 patterns UI/mobile proposés pendant ce travail ne sont **pas rejetés** :
ils deviennent des candidats de catalogue à mapper progressivement sur les cinq
verbes, au fil des besoins réels, jamais figés d'avance dans un schéma. Aucune
liste de patterns (4, 71, ou N) n'est plus jamais un artefact du schéma JSON
lui-même.

Ce travail est repris sous T2-6 (schéma du noyau + généralisation de
`check-pattern-nx.mjs`) et T2-8 (formalisation d'`action-request` comme première
composition migrée) —
[`docs/architecture/taches-restantes.md`](../architecture/taches-restantes.md)
§1.2.

## Justification

L'Option A prolonge un défaut déjà observé deux fois dans l'historique propre de
ce dépôt (2→4 patterns par nécessité constatée, pas par conception) et
l'aggraverait avec 71 nouvelles entrées potentielles. Elle ne répond pas à la
question posée par ADR-0026 : un système visant « n'importe quel type de projet
» ne peut pas reposer sur une énumération, quelle que soit sa taille — c'est une
contradiction dans les termes.

L'Option B est validée par trois précédents indépendants, à des échelles et des
domaines différents (API design, orchestration d'infrastructure, design
systems), qui convergent sur la même stratégie face au même problème structurel
: figer un petit noyau de verbes, laisser le catalogue de noms grand ouvert.
C'est un signe de robustesse du principe, pas d'un choix arbitraire.

## Conséquences

### Positives

- Le noyau (5 verbes) n'a plus besoin d'être révisé à chaque nouveau besoin de
  pattern — c'est la propriété recherchée par ADR-0026.
- `check-pattern-nx.mjs`, une fois généralisé sur le noyau, vérifie n'importe
  quelle composition présente ou future sans modification.
- Les 71 patterns UI proposés ne sont pas perdus — ils ont une place d'accueil
  (catalogue) sans avoir dû être arbitrés un par un dans l'urgence.
- Cohérent avec la doctrine déjà en vigueur dans ce dépôt pour d'autres
  sous-systèmes : petit nombre de scripts `check:*` génériques plutôt qu'un
  script par cas particulier.

### Négatives / dette acceptée

- Migration requise des 3 patterns existants (`crud-entity`, `workflow-action`,
  `read-only-view`) vers la forme commune — travail non trivial sur des fichiers
  déjà volumineux (258 à 303 lignes) et chargés d'historique de validation (7
  modules réels documentés). À faire sans perte d'aucune information déjà
  vérifiée.
- `action-request` doit être formalisé de zéro (jamais eu de fichier Nx-shaped
  propre) — aucune référence à un travail préexistant à préserver pour ce
  pattern précis, contrairement aux 3 autres.
- Le mapping des 71 patterns UI proposés sur les 5 verbes n'est pas fait par cet
  ADR — seul le mécanisme d'accueil est acté. Le mapping réel reste un travail
  futur, au fil des besoins.

### Points à réévaluer

- Si, après usage réel, un besoin structurel ne se laisse composer par aucun des
  5 verbes (même via `Custom`), reconsidérer l'ajout d'un 6ᵉ verbe — à
  documenter avec la même rigueur qu'AIP-136 (justification écrite de
  l'insuffisance des verbes existants, pas une commodité).
- Si le catalogue de compositions grossit au point de devenir lui-même
  difficilement navigable, un index ou une recherche machine-readable devra être
  ajouté — pas un nouveau changement du noyau.

## Références

- [ADR-0009](./0009-reconstruction-pilotee-par-patterns.md) — origine du
  catalogue fermé (2 patterns legacy, couverture 6/53 déjà documentée comme
  incomplète).
- [ADR-0020](./0020-isolation-vs-factorisation-workflow-action.md) — décision
  antérieure sur `workflow-action`, toujours valide comme composition, désormais
  un cas particulier de cet ADR.
- [ADR-0026](./0026-reorientation-objectif-generation-generique.md) —
  réorientation multi-source/multi-stack qui rend ce changement nécessaire.
- [`docs/architecture/taches-restantes.md`](../architecture/taches-restantes.md)
  §1.2 — T2-6 (schéma unifié), T2-8 (action-request).
- [AIP-121 — Resource-oriented design](https://google.aip.dev/121)
- [AIP-136 — Custom methods](https://google.aip.dev/136)
- [Google Cloud API Design Guide](https://docs.cloud.google.com/apis/design)
- [Kubernetes Operator Pattern](https://iximiuz.com/en/posts/kubernetes-operator-pattern/)
- [Material Design 3 — Design tokens](https://m3.material.io/foundations/design-tokens)
- [Atomic Design in 2025 : From Rigid Theory to Flexible Practice](https://medium.com/design-bootcamp/atomic-design-in-2025-from-rigid-theory-to-flexible-practice-91f7113b9274)

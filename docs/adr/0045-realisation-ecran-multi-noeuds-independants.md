# ADR-0045 — Réalisation d'écran multi-nœuds indépendants

- **Statut :** Accepted
- **Date :** 2026-09-07

## Contexte

La chaîne app-builder (`compile:application-design` → `create-app` →
`prepare`/`verify:page-realization`, ADR-0030/0039) n'avait été prouvée que sur
une page à **une seule opération** : `examples/application-conception-proof`, un
`action-request` public sans lecture de données. Aucune page portant un `load`
(nœud requête), un `data_binding`, ni une page combinant lecture et envoi,
n'avait jamais franchi cette chaîne.

Le premier besoin réel qui l'exige est une page d'accueil publique typique :
elle **lit** un bloc éditorial (`GET /home`) **et** **envoie** une inscription
à une infolettre (`POST /infolettre-subscriptions`) — deux nœuds indépendants
sur un même écran.

Investigation menée avant tout code (discipline PLAT-4bis) :

- `schemas/application-design.schema.json` **modélise déjà** une page comme N
  `loads` + N `actions` (`kind: backend|navigate`) + N `data_bindings`, en
  tableaux indépendants.
- `core/application-design.mjs` **valide déjà** chaque `load`, `action` et
  `data_binding` un par un (`validatePage`). Aucune contrainte « une seule
  composition par page » n'existe.
- `renderers/angular-pwa-shell-renderer.mjs` embarque déjà l'objet `page`
  complet (loads/actions/data_bindings inclus) dans le contrat de page.
- `core/page-realization.mjs` `expectedMappings` couvre déjà toutes les
  catégories comme des tableaux.

Le seul manque réel : le nœud de rôle `screen` produit par
`core/role-production.mjs` **omettait `loads` et `data_bindings`** de son
payload — le work order sous-décrivait donc toute page qui lit des données. Et
rien ne garantissait la cohérence entre un `data_binding` et une opération
réellement déclenchée par la page.

Ceci ne touche pas le graphe d'exécution typé d'ADR-0031 (arêtes, préconditions
inter-nœuds, livraison asynchrone, machine à états partagée), toujours non
implémenté.

## Options envisagées

### Option A — Figer la page mono-composition

Refuser à la conception toute page portant plus d'une opération.

- Avantages : aucun changement.
- Inconvénients : contredit le schéma et le validateur déjà multi-nœuds ; rend
  irréalisable presque tout écran métier réel (une landing, un détail avec
  action, un tableau de bord) ; bloque toute landing multi-nœuds dès la page 1.

### Option B — Nœuds indépendants : compléter le nœud de rôle `screen`

Le nœud `screen` liste ses `load_ids` et `data_binding_ids` ; un invariant de
conception garantit que tout `data_binding` est déclenché par un `load` ou une
`action` backend de la page. Aucune arête, aucune précondition entre nœuds.

- Avantages : petit changement (le cœur était déjà quasi prêt) ; débloque le
  besoin réel ; ne préjuge pas du graphe typé ; risque de régression minimal.
- Inconvénients : ne couvre pas les compositions ordonnées / asynchrones — un
  écran dont une action dépend du succès d'une lecture reste hors périmètre.

### Option C — Implémenter le graphe d'exécution typé complet (ADR-0031)

Arêtes `success`/`failure`/`condition`, préconditions, livraison asynchrone,
contraintes d'état partagées.

- Avantages : couvre `workflow-action` comme composition mémorisée à terme.
- Inconvénients : refonte L/XL du modèle de conception, spéculative tant qu'un
  seul cas réel (nœuds indépendants) est observé ; contraire à la discipline «
  preuve avant extension » (ADR-0029, PLAT-4ter).

## Décision

**Option B.** Le nœud de rôle `screen` passe en `schema_version` `1.1.0` : son
payload gagne `load_ids` et `data_binding_ids` (requis).
`core/application-design.mjs` gagne un invariant : tout
`data_binding.operation_ref` doit correspondre à l'opération d'un `load` ou
d'une `action` backend de la même page.

Un écran peut donc porter **plusieurs `list-query` et plusieurs `action-request`
indépendants**. Ce qui reste interdit — une dépendance ordonnée entre nœuds, une
livraison asynchrone à callback — relève du lot « graphe d'exécution typé »
(ADR-0031), non engagé ici.

## Justification

Le besoin est réel et non spéculatif : la quasi-totalité des écrans métier
hébergent plusieurs opérations. Le cas mono-opération de la fixture était
l'exception, pas la règle. Le cœur étant déjà multi-nœuds au niveau du schéma et
du validateur, compléter le seul maillon manquant (le nœud de rôle) coûte
quelques dizaines de lignes et un invariant, sans toucher au graphe typé dont
aucun cas réel ne réclame encore les arêtes.

## Conséquences

### Positives

- Une page portant plusieurs `list-query` et `action-request` indépendants est
  désormais réalisable de bout en bout ; la non-régression est verrouillée par
  `multi-node-screen.test.mjs` (4 tests) et `multi-node-screen-mutations.test.mjs`
  (2 mutants). La preuve à oracle réel (une vraie page multi-nœuds à travers
  `create-app` puis `verify:page-realization`) est attendue avec la première
  application multi-nœuds livrée.
- Le work order décrit désormais toute la forme de la page, y compris ses
  lectures.
- Un `data_binding` orphelin (qui affiche la réponse d'une opération jamais
  appelée par la page) est refusé à la conception, tout de suite.

### Négatives / dette acceptée

- Un `load` reste **comportemental** : il n'apparaît pas dans
  `page-realization-evidence` et n'exige pas de sélecteur `data-cmz-id`. Son
  rendu passe par ses états et ses `data_bindings`, eux couverts.
- Les compositions ordonnées et asynchrones restent hors périmètre — voir les
  conditions de sortie ci-dessous.
- Tant que la première application multi-nœuds n'est pas livrée, la capacité
  n'est prouvée que par ses tests unitaires et de mutation, pas par un oracle
  Angular réel (`ngc`/build/lint/test) ni par une fixture dans
  `check-application-pipeline`. Cette preuve à oracle réel — ou une fixture
  dédiée — reste à ajouter.

### Points à réévaluer

- **Ouvrir le lot « graphe d'exécution typé » (ADR-0031)** dès qu'un cas réel
  exige qu'un nœud dépende du succès d'un autre, ou une livraison asynchrone. «
  Déposer un signalement » (charger les catégories, puis soumettre) est le
  déclencheur probable.
- **`workflow-action` ré-exprimé comme composition mémorisée** puis retrait de
  son moteur dédié : conséquences en aval du lot graphe typé, avec preuve
  d'équivalence (parité oracle + mutants + hashes). ADR distinct.
- Si `load_ids` reste toujours vide sur toute page pendant longtemps,
  reconsidérer l'intérêt de le porter dans le nœud de rôle.

## Références

- [ADR-0030](./0030-ir-canonique-et-profils-cibles.md) — IR canonique et profils
  cibles
- [ADR-0031](./0031-graphe-execution-et-manifests-composition.md) — graphe
  d'exécution typé (non implémenté ; ce lot ne l'engage pas)
- [ADR-0039](./0039-frontiere-contractuelle-conception-realisation-llm.md) —
  frontière conception / réalisation
- `docs/architecture/archetype-role-model.md` — nœud de rôle `screen`
- `docs/architecture/taches-restantes.md` — entrée PLAT-9
- `tools/generator-platform/multi-node-screen.test.mjs`,
  `multi-node-screen-mutations.test.mjs` — preuves de non-régression

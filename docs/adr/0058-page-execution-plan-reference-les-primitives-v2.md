# ADR-0058 — Le plan de page référence les primitives v2 sans les recopier

- **Statut :** Accepted
- **Date :** 2026-09-24

## Contexte

`list-query` v2 et `action-request` v2 possèdent désormais des modèles
d'exécution target-neutral, des oracles Angular/React et une publication
transactionnelle. `application-design` sait décrire plusieurs loads, actions et
bindings, mais son ancien état global et ses références par opération ne
suffisent pas à exécuter plusieurs nœuds indépendants sans ambiguïté.

La composition ne doit devenir ni une troisième primitive métier, ni un
nouveau framework qui recopie les transports, contrôleurs et politiques déjà
portés par les deux modèles v2.

## Décision

Le premier incrément C2 introduit un `page-execution-plan` 1.0 dérivé du
`page-realization-contract` et de modèles v2 content-addressed. Le plan contient
des instances stables de query et de commande. Chaque instance référence le
modèle, sa version, son opération et son SHA-256 exact au lieu de recopier sa
politique complète.

Le planner joint une primitive à un nœud uniquement par l'identité composée du
backend et de l'opération. Il vérifie aussi le hash du backend porté par la page,
l'accès et les permissions, les paramètres, les champs de body et la
compatibilité entre contrôle et type primitif.

Chaque nœud conserve son propre état local. Les anciens états de présentation
restent des projections explicites du nœud ; ils ne deviennent pas une machine
d'état globale combinatoire. Chaque binding de sortie contient désormais un
`producer_node_id` non ambigu et expose le read model ou result model de la
primitive, jamais le modèle wire du backend.

Le plan publie l'union canonique des capacités requises par ses nœuds. Une cible
doit annoncer toutes ces capacités pour être acceptée. Le validateur de replay
revérifie indépendamment le schéma, l'unicité des identités, les producteurs,
les types de primitives, les invalidations et l'union exacte des capacités.

## Refus explicites

- Deux nœuds qui déclenchent la même opération rendent un ancien data binding
  ambigu : le planner refuse au lieu de choisir le premier. Une future version
  de l'intention devra porter `producer_node_id`.
- Une action `caller-declared` est refusée, car `application-design` 1.0 ne sait
  pas encore nommer les queries à invalider.
- Une page moins protégée que l'une de ses primitives est refusée.
- Un modèle absent, dupliqué, dont le hash diffère ou dont l'URI traverse le
  workspace est refusé.
- Une source ou une forme de contrôle non prouvée est refusée.

## Preuve

La fixture de compilation utilise trois modèles réels : deux `list-query` v2
(`site-group-select` et le cas paramétré
`tasks-actions-processing-type`) et un `action-request` v2
(`forgot-password`). Elle prouve dans un même plan :

1. deux GET indépendants, dont un paramétré depuis la route ;
2. un POST alimenté par un contrôle typé ;
3. trois états locaux distincts et content-addressed ;
4. deux bindings résolus vers leur `producer_node_id` exact ;
5. une négociation de capacités qui échoue si une capacité manque ;
6. le rejet d'un producteur ambigu, d'un accès trop faible, d'une primitive
   absente, d'un hash périmé et d'une invalidation inexprimable ;
7. le rejet en replay d'un producteur cassé ou d'une dérive de capacités.

Cette preuve compile le plan ; elle n'affirme pas encore que les trois appels
HTTP s'exécutent ensemble dans un host.

## Revue de simplification obligatoire

L'incrément ajoute **1 141 lignes de production contractuelle** : un planner et
validateur de 749 lignes, plus un schéma fermé de 392 lignes. Le test
d'intégration est exclu de cette mesure.

Le dépassement du seuil de 1 000 lignes est accepté parce que le lot ferme en
une seule frontière les identités, les joins typés, les producteurs, les états
locaux, le content addressing et la négociation fail-closed. Scinder le schéma
de son premier producteur créerait une période où aucun oracle ne prouve que le
contrat peut réellement être produit.

Aucune CLI, commande package, publication, renderer, runtime, cache, journal,
verrou, abstraction générique de commandes ou dépendance n'est ajouté. Le plan
référence les modèles v2 au lieu de dupliquer leurs politiques. Le fichier cœur
reste sous le plafond de 800 lignes.

## Limites et prochain incrément

- Les sources `route`, `session`, `constant` et `device` sont fermées par leur
  enum, mais leurs `source_ref` n'ont pas encore de catalogue typé à résoudre.
- L'invalidation ciblée nécessite une évolution explicite de l'intention ; elle
  n'est pas inventée par le planner.
- Le choix de la primitive reste déterministe parmi les artefacts fournis au
  planner ; son raccord à un registre de publications approuvées appartient au
  pipeline C3.
- Aucun composition root Angular ou React n'est généré dans ce lot.

Le prochain incrément doit produire le composition root Angular minimal depuis
ce plan, brancher les trois instances sur les ports host déjà prouvés et lancer
un oracle externe observant deux GET et un POST. Il doit réutiliser la
publication existante et ne pas introduire un nouveau runtime générique.

## Références

- [Audit Staff de la composition N×N](../architecture/audit-page-composition-2026-09-15.md)
- [Audit de maintenabilité](../architecture/audit-maintenable-automatisation-2026-09-16.md)
- [ADR-0052](./0052-list-query-v2-reutilise-la-publication-transactionnelle.md)
- [ADR-0057](./0057-action-request-v2-reutilise-la-publication-transactionnelle.md)

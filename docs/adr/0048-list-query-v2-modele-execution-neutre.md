# ADR-0048 — `list-query` v2 compile un modèle d'exécution neutre

- **Statut :** Accepted
- **Date :** 2026-09-22

## Contexte

ADR-0047 introduit le contrat auteur `list-query` 2.0 et son migrateur, mais ne
livre aucun modèle directement consommable par un renderer. Laisser chaque cible
Angular ou React résoudre elle-même le `backend-contract`, reconstruire le DTO,
choisir les états ou interpréter les politiques créerait deux sémantiques
concurrentes.

Le premier contrat réel paramétré et imbriqué n'est pas encore disponible. Il
serait donc prématuré de généraliser les bindings path/query ou les modèles
imbriqués à partir d'hypothèses.

## Décision

Une compilation pure transforme la définition v2 et les octets exacts de son
`backend-contract` en un `list-query-execution-model` interne et target-neutral.
Elle calcule elle-même le SHA-256 des octets reçus : un appelant ne peut pas
associer un objet backend à l'empreinte d'un autre document.

Chaque query compilée sépare explicitement :

- le port avec input et résultat list ;
- le transport résolu depuis l'opération backend ;
- le DTO wire complet et son plan de décodage strict ;
- le read model et son mapping champ source → champ cible ;
- la politique d'accès ;
- la politique de requête résolue (`omit` pour le public, schémas exacts du host
  pour les accès protégés) et le cache ;
- le contrôleur, ses états et ses règles de résolution ;
- les échecs d'enveloppe, HTTP, décodage et transport.

Le contrôleur expose uniquement `load` et `reload`. L'annulation automatique
reste décrite par `on_superseded` et `on_destroy`; aucune commande `cancel`
n'est inventée sans décision sur l'état et la valeur après annulation.

Le compilateur refuse les paramètres backend et les champs wire imbriqués. Ces
capacités seront ouvertes par le cas actif `tasks-actions-processing-type`, qui
doit fournir leurs faits et leurs oracles réels.

La commande de migration appelle cette compilation avant toute écriture. Un JSON
v2 structurellement valide mais inexécutable dans le périmètre courant est donc
refusé. La compilation ne crée ni nouvelle commande, ni journal, ni fichier
persistant.

## Revue de simplification obligatoire

La surface de production v2 cumulée atteint **1 233 lignes** : validateur et
migrateur 467, compilateur 379, CLI 177 et schéma auteur 210. Elle dépasse le
seuil de 1 000 lignes défini par SIMPL-7, tout en restant limitée à trois
modules exécutables et un schéma.

La revue conserve ce découpage pour les raisons suivantes :

- fusionner migration et compilation rendrait deux responsabilités moins
  lisibles sans retirer de règles ;
- aucun second schéma, CLI, renderer, framework transactionnel ou état
  persistant n'est ajouté ;
- le modèle compilé reste interne tant que le premier renderer ne justifie pas
  un contrat public persistant ;
- les paramètres, modèles imbriqués, pagination et annulation manuelle sont
  refusés au lieu d'ajouter des abstractions anticipées ;
- le compilateur est exercé par le chemin nominal de migration, pas seulement
  par une suite isolée.

Toute croissance du prochain incrément devra mesurer à nouveau cette surface et
rechercher d'abord la suppression d'une duplication existante.

## Conséquences

### Positives

- Angular et React pourront consommer une même sémantique résolue.
- DTO wire et read model ne peuvent plus être confondus par un renderer.
- États `idle`, `loading`, `success`, `empty`, `error`, `reloading` et règles de
  transition sont explicites.
- Les erreurs de transport restent propagées par le host ; aucun runtime
  propriétaire ne remplace ses intercepteurs.

### Limites

- Aucun code Angular ou React n'est encore généré.
- Le décodage est décrit mais pas encore exécuté contre un payload réel.
- `site-group-select` reste le premier oracle runtime à livrer ; ce lot ne le
  revendique pas comme preuve active.
- `list-query` reste `experimental` et interdit en production.

## Références

- [ADR-0047](./0047-list-query-v2-reference-backend-et-migration-explicite.md)
- [Audit Staff `list-query`](../architecture/audit-list-query-2026-09-15.md)
- [Audit de maintenabilité](../architecture/audit-maintenable-automatisation-2026-09-16.md)

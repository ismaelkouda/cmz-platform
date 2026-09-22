# ADR-0047 — `list-query` v2 référence le backend et migre sans inventer

- **Statut :** Accepted
- **Date :** 2026-09-22

## Contexte

L'audit Staff de `list-query` du 2026-09-15 conclut que la version 1 décrit à la
fois une intention de lecture et des faits HTTP : méthode, chemin,
authentification, enveloppe et forme de l'item. Ces faits existent aussi dans le
`backend-contract`, autorité déjà validée et utilisée par `application-design`.
Les deux documents peuvent donc diverger tout en restant valides séparément.

La v1 ne sait pas non plus exprimer le mapping DTO vers read model, la portée du
cache, le refresh, la concurrence, l'annulation, le retry ni la conservation de
l'ancienne valeur. Déduire ces décisions pendant une migration créerait un
comportement non prouvé.

## Décision

Le schéma `list-query` `2.0.0` :

1. référence un `backend-contract` par URI, identifiant, version et SHA-256 ;
2. référence chaque opération backend par son identifiant et le statut de succès
   attendu ;
3. ne redéclare ni méthode, ni chemin, ni authentification, ni modèle wire ;
4. décrit un read model distinct par un mapping explicite `source_field → name`
   ;
5. exige les décisions applicatives cache, concurrence, annulation, retry et
   conservation des données devenues obsolètes. Le retry nomme les catégories
   d'erreurs admises ; la conservation distingue reload et erreur.

Le validateur sémantique vérifie le hash et l'identité du contrat, exige une
opération `GET`, résout la réponse de succès vers un modèle wire `array` dont
les items sont des objets, puis vérifie chaque champ source du mapping. Les
règles de cache et de concurrence qui se contredisent échouent fermées.

La migration v1 → v2 utilise une seule commande :

```text
bun run migrate:list-query --definition <v1.json> \
  --backend-contract <contract.json> \
  --decisions <decisions.json> \
  --out <v2.json>
```

Le fichier de décisions est obligatoire. Il associe chaque opération v1 à une
opération backend et fournit les politiques non déductibles. Le migrateur ne
copie automatiquement que les faits vérifiables : identité de feature, identité
du read model et mapping par nom lorsque le type, `required` et `nullable`
correspondent exactement. Tout écart de méthode, chemin, accès,
authentification, enveloppe ou forme wire bloque la migration.

La commande écrit un unique fichier nouveau et refuse de l'écraser. Elle n'a ni
journal, ni reprise, ni transaction de workspace : aucune de ces abstractions
n'est justifiée pour une transformation pure d'un JSON vers un autre.

## Conséquences

### Positives

- Le backend redevient l'unique autorité du transport et des DTO.
- Une modification du contrat backend périme mécaniquement la définition v2
  grâce au SHA-256.
- La migration est déterministe et idempotente ; elle ne choisit aucune
  politique métier à la place d'un humain.
- Les fixtures versionnées avant/décisions/backend/après rendent le résultat
  exact relisible en revue, sans dépendre d'un objet construit dans le test.
- Le mapping renommé du cas actif `site-group-select` (`id → value`,
  `name → label`) est représentable sans vocabulaire SEOS dans le moteur.
- Le chemin nominal respecte le budget SIMPL-7 : une commande, une phase de
  validation, une transformation pure et une écriture sans écrasement.

### Limites assumées de ce premier incrément

- Aucun renderer ni runtime v2 n'est encore livré. `list-query` reste
  `experimental` et interdit en production.
- Le mapping v2 initial cible les champs de premier niveau. Le cas imbriqué
  `tasks-actions-processing-type` doit faire évoluer ce contrat à partir de sa
  preuve réelle, sans généralisation spéculative.
- Les politiques exigées sont vérifiées comme contrat mais pas encore exécutées
  par un contrôleur de query.
- La fixture v1 est conservée ; la commande de génération v1 n'est ni promue ni
  modifiée silencieusement.

## Prochain incrément

Compiler la v2 en ports domain/data/application target-neutral : DTO wire décodé
à l'exécution, mapping vers read model, contrôleur avec états locaux, reload et
annulation, puis adaptateur Angular 22 raccordé aux vrais tokens du host. Le
premier oracle est `site-group-select`; le deuxième sera le cas paramétré et
imbriqué `tasks-actions-processing-type`.

## Références

- [Audit Staff `list-query`](../architecture/audit-list-query-2026-09-15.md)
- [Audit Staff de la composition N×N](../architecture/audit-page-composition-2026-09-15.md)
- [Audit de maintenabilité](../architecture/audit-maintenable-automatisation-2026-09-16.md)
- [ADR-0039](./0039-frontiere-contractuelle-conception-realisation-llm.md)
- [ADR-0045](./0045-realisation-ecran-multi-noeuds-independants.md)

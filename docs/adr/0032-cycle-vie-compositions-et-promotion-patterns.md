# ADR-0032 — Cycle de vie des compositions et promotion des patterns

- **Statut :** Accepted
- **Date :** 2026-08-16

## Contexte

ADR-0028 a établi que les patterns nommés sont des compositions mémorisées et
qu'une composition ad hoc reste légitime. ADR-0030 et ADR-0031 ont ensuite
séparé les modèles canoniques, le graphe d'exécution et les manifests.

Il reste une ambiguïté de gouvernance : « mémoriser une composition » peut
signifier conserver une fonctionnalité précise ou publier une abstraction
réutilisable. Confondre ces deux actes conduit soit à perdre les fonctionnalités
non promues, soit à remplir le catalogue de variantes presque identiques et non
maintenues.

La plateforme doit garantir la reproductibilité de toute génération tout en
gardant un catalogue de patterns utile, stable et gouvernable.

## Options envisagées

### Option A — Ne conserver que les patterns réutilisables

- Avantages : catalogue réduit ; faible coût de stockage apparent.
- Inconvénients : perte de provenance ; impossibilité de rejouer ou modifier
  fidèlement une fonctionnalité non promue ; décisions humaines non auditables.

### Option B — Promouvoir toute composition générée en pattern

- Avantages : aucune composition perdue ; réutilisation immédiate possible.
- Inconvénients : explosion du catalogue ; invariants et paramètres non
  distingués ; absence de garantie de compatibilité ; découverte dégradée.

### Option C — Persistance obligatoire, promotion explicite

- Avantages : toute génération reste reproductible ; la standardisation est
  séparée de la mémoire ; les patterns publics portent un contrat et une
  gouvernance proportionnés.
- Inconvénients : registre et catalogue distincts à maintenir ; cycle de vie et
  critères de promotion à implémenter.

## Décision

**Option C.** Toute fonctionnalité générée possède une composition instance
persistée et immutable. Une composition ne devient un pattern promu qu'après
preuve de réutilisabilité, extraction de ses invariants et points de variation,
versionnement, Oracles, ownership et politique de migration.

Les états minimaux sont : composition validée, instance générée, candidat
pattern, pattern promu, déprécié et retiré. Une composition peut rester une
instance générée sans jamais être promue.

Le nom d'un pattern est une aide à la découverte, jamais une condition de
légitimité ni un discriminant du core.

## Justification

La mémoire et la standardisation répondent à deux risques opposés. La mémoire
empêche de réinterpréter ou reconstruire manuellement une fonctionnalité. La
promotion protège les consommateurs contre des abstractions instables. Les
séparer permet d'accumuler la connaissance sans transformer chaque cas métier en
API publique.

Cette décision empêche aussi de réintroduire une liste fermée au niveau du
catalogue : une composition inline reste générable et vérifiable, qu'elle soit
ou non nommée.

## Conséquences

### Positives

- Toute fonctionnalité peut être rejouée, comparée et modifiée.
- Le catalogue public reste fondé sur des preuves de réutilisation.
- Les patterns possèdent une compatibilité et des migrations explicites.
- `action-request`, `workflow-action`, `crud-entity` et `read-only-view` restent
  des recettes, pas des familles du core.

### Négatives / dette acceptée

- Le registre de compositions n'est pas encore implémenté.
- Les seuils exacts de promotion doivent être reliés à des cas réels.
- La rétention, la signature et la distribution des patterns restent à définir.

### Points à réévaluer

- Réviser si le registre devient un coût opérationnel supérieur à sa valeur de
  replay et d'audit.
- Réviser les critères de promotion si des compositions utiles restent
  durablement impossibles à découvrir.
- Déprécier un pattern lorsque ses variations normales nécessitent des
  extensions non typées ou des changements fréquents du core.

## Références

- [ADR-0028](./0028-execution-topology-compositions-memorisees.md)
- [ADR-0030](./0030-ir-canonique-et-profils-cibles.md)
- [ADR-0031](./0031-graphe-execution-et-manifests-composition.md)
- [`conception-compositions-evolutives-patterns-memorises.md`](../architecture/conception-compositions-evolutives-patterns-memorises.md)
- [Contrat directeur exécutable](../../tools/generator-platform/acceptance/evolvable-composition.contract.json)

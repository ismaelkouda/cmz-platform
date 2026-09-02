# Archétypes de la cible Angular / Nx

> **Un jeu d'archétypes par stack — celui-ci décrit la sortie Angular/Nx.**
> Ces fichiers cadrent des **types de fichier de la sortie Angular**
> (`@Service`, façade signal, route lazy, mapper DTO…). Une cible React,
> Kotlin ou Swift aura son propre jeu sous `conventions/archetypes/<stack>/`,
> structurellement parallèle mais rédigé depuis la doc officielle de cette
> plateforme — **jamais fusionné avec celui-ci** (les taxonomies de fichiers
> ne se correspondent pas 1:1 : un mapper Angular ≈ rien d'explicite en React
> ≈ une extension function en Kotlin).

## Ce qui est neutre vit ailleurs

Le « quoi produire » **indépendant de la stack** n'est pas ici :

- **fonctionnalités** : les compositions `action-request`, `list-query`,
  `crud-entity`, `workflow-action` ;
- **conception fine** : l'IR / l'artefact de conception d'application
  ([ADR-0030](../../../docs/adr/0030-ir-canonique-et-profils-cibles.md),
  [ADR-0031](../../../docs/adr/0031-graphe-execution-et-manifests-composition.md)).

Ce dossier ne fait que **projeter** ces représentations neutres sur les fichiers
concrets d'Angular. Cf.
[ADR-0010 §3](../../../docs/adr/0010-flux-de-generation-assistee-par-ia.md).

## Rôle

`check-pattern.js` (`tools/seos/check-pattern.mjs`) vérifie **quels** fichiers
existent. Un archétype cadre **le contenu** de chaque fichier — un type de
fichier récurrent (`dto`, `mapper`, `service`, `error`, `entity`, `facade`…).

Le prompt de génération d'un fichier est **assemblé**, jamais libre :

```
archétype cible          (rôle + règle mécanique + exemplaire)
  + profil de convention  (conventions/angular-22.profile.json)
  + données métier        (issues de l'IR)
  = prompt qui n'ouvre qu'un trou de forme fixe
```

L'IA ne réinvente jamais le squelette ; elle remplit le contenu métier dans une
forme imposée, puis le
[portail de validation](../../../docs/adr/0010-flux-de-generation-assistee-par-ia.md)
contrôle (tsc, ESLint, check-semantics, revue).

## Format d'un contrat

Chaque fichier `<archetype>.contract.md` porte :

| Section             | Contenu                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------- |
| **Rôle**            | Ce que le fichier fait dans l'architecture DDD/CQRS                                          |
| **Couche**          | Lib de couche cible (`domain`, `data`, `application`, `ui`, `feature`)                       |
| **Règle mécanique** | Invariant vérifiable (ex. un mapper est un `@Service`, un use-case enveloppe dans `defer()`) |
| **Convention**      | Ce qui vient du profil (décorateur, injection…) — jamais codé en dur ici                     |
| **Exemplaire**      | Un exemple minimal de référence                                                              |
| **Prompt**          | Le gabarit qui contraint l'IA                                                                |

## Contrats

Un archétype = **une seule forme**. Quand l'observation du source montre que ce
qu'on croyait un archétype recouvre plusieurs formes (cas `dto`), on **scinde**
: une forme mixte dans un contrat rendrait le prompt ambigu.

| Archétype           | Couche      | Fichier                                                            |
| ------------------- | ----------- | ------------------------------------------------------------------ |
| `dto` (famille)     | data        | [`dto.contract.md`](./dto.contract.md)                             |
| `dto-interface`     | data        | [`dto-interface.contract.md`](./dto-interface.contract.md)         |
| `dto-enum`          | data        | [`dto-enum.contract.md`](./dto-enum.contract.md)                   |
| `dto-const`         | data        | [`dto-const.contract.md`](./dto-const.contract.md)                 |
| `mapper`            | data        | [`mapper.contract.md`](./mapper.contract.md)                       |
| `enum`              | domain      | [`enum.contract.md`](./enum.contract.md)                           |
| `interface`         | domain      | [`interface.contract.md`](./interface.contract.md)                 |
| `entity`            | domain      | [`entity.contract.md`](./entity.contract.md)                       |
| `function`          | domain      | [`function.contract.md`](./function.contract.md)                   |
| `error` (famille)   | domain      | [`error.contract.md`](./error.contract.md)                         |
| `domain-error`      | domain      | [`domain-error.contract.md`](./domain-error.contract.md)           |
| `operational-error` | data/domain | [`operational-error.contract.md`](./operational-error.contract.md) |
| `vo`                | domain      | [`vo.contract.md`](./vo.contract.md)                               |
| `validator`         | domain      | [`validator.contract.md`](./validator.contract.md)                 |
| `util`              | domain      | [`util.contract.md`](./util.contract.md)                           |
| `type`              | domain      | [`type.contract.md`](./type.contract.md)                           |
| `service`           | selon deps  | [`service.contract.md`](./service.contract.md)                     |
| `constant`          | constants   | [`constant.contract.md`](./constant.contract.md)                   |
| `pipe`              | ui          | [`pipe.contract.md`](./pipe.contract.md)                           |
| `facade`            | application | [`facade.contract.md`](./facade.contract.md)                       |
| `component`         | ui          | [`component.contract.md`](./component.contract.md)                 |
| `route`             | ui          | [`route.contract.md`](./route.contract.md)                         |

**État :** domain, data, application (`facade`), ui (`component`, `route`,
`pipe`) et `shared-constants` (`constant`) sont couverts — y compris `mapper`
et la famille `dto*`.

## Principe de non-reproduction

Un contrat **corrige** les défauts du source plutôt que de les reproduire :
faute de frappe (`contant` → `constant`), convention périmée
(`@Injectable({providedIn:'root'})` → `@Service()`), dépendance inversée. Le
source fournit les **données** (les valeurs, les règles métier), pas la forme.

# Contrats d'archétype

Entrées de génération spécifiques à ce dépôt
([ADR-0010](../docs/adr/0010-flux-de-generation-assistee-par-ia.md), §3).
Sibling de [`conventions/`](../conventions/README.md) : les conventions disent
_comment_ écrire pour une version de framework, les contrats disent _quoi_
produire pour un type de fichier.

## Rôle

`check-pattern.js` vérifie **quels** fichiers existent. Un contrat d'archétype
cadre **le contenu** de chaque fichier. Un archétype = un type de fichier
récurrent (`dto`, `mapper`, `service`, `error`, `entity`, `facade`…).

Le prompt de génération d'un fichier est **assemblé**, jamais libre :

```
contrat d'archétype  (rôle + règle mécanique + exemplaire)
  + profil de convention courant  (conventions/angular-22.profile.json)
  + données métier  (issues du projet source)
  = prompt qui n'ouvre qu'un trou de forme fixe
```

L'IA ne réinvente jamais le squelette ; elle remplit le contenu métier dans une
forme imposée, puis le
[portail de validation](../docs/adr/0010-flux-de-generation-assistee-par-ia.md)
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

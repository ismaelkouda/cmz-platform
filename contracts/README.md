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

| Archétype | Couche | Fichier                                      |
| --------- | ------ | -------------------------------------------- |
| `dto`     | data   | [`dto.contract.md`](./dto.contract.md)       |
| `mapper`  | data   | [`mapper.contract.md`](./mapper.contract.md) |

_À compléter au fil de la Phase 05a (service, error, entity, enum, facade,
validator, pipe, function, vo, interface, constant), puis réutilisés en
Phase 07._

## Principe de non-reproduction

Un contrat **corrige** les défauts du source plutôt que de les reproduire :
faute de frappe (`contant` → `constant`), convention périmée
(`@Injectable({providedIn:'root'})` → `@Service()`), dépendance inversée. Le
source fournit les **données** (les valeurs, les règles métier), pas la forme.

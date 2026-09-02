# Convention de nommage — dossiers et fichiers intra-lib

Complète l'[ADR-0003](../docs/adr/0003-nommage-et-structure.md) (qui fixe le
nommage repo / scope / `apps` + `libs`) au niveau **intérieur d'une lib**.
Externalisée ici, jamais codée en dur dans un générateur.

## Fichiers

`<nom-métier>.<archétype>.ts`, tout en **kebab-case**.

| Archétype    | Suffixe         | Exemple                                |
| ------------ | --------------- | -------------------------------------- |
| entité       | `.entity.ts`    | `report-location.entity.ts`            |
| props        | `.props.ts`     | `actor.props.ts`                       |
| interface    | `.interface.ts` | (forme de valeur autonome)             |
| enum         | `.enum.ts`      | `location-method.enum.ts`              |
| erreur       | `.error.ts`     | `api.error.ts`                         |
| mapper       | `.mapper.ts`    | `report-source.mapper.ts`              |
| dto          | `.dto.ts`       | `media-publish.dto.ts`                 |
| function     | `.function.ts`  | `normalize-phone-number.function.ts`   |
| util         | `.util.ts`      | `valid-email.util.ts`                  |
| type         | `.type.ts`      | `permission-action.type.ts`            |
| validator    | `.validator.ts` | `assert-valid-date-range.validator.ts` |
| service      | `.service.ts`   | `error-handler-registry.service.ts`    |
| value-object | `.vo.ts`        | `date-period.vo.ts`                    |

Un fichier = un symbole principal exporté, du même nom que le fichier (en
`PascalCase` pour la classe/interface/enum, avec le suffixe d'archétype pour les
DTO/entités : `ReportLocationEntity`, `LocationMethod`, `ReportSourceMapper`).

## Dossiers

Sous `src/lib/`, un dossier **par archétype**, au **pluriel** : `entities/`,
`interfaces/`, `enums/`, `errors/`, `mappers/`, `services/`, `value-objects/`…

### Exception assumée : `dto/`

Le dossier des DTO reste au **singulier** (`dto/`), acronyme figé par l'usage de
l'écosystème TypeScript / NestJS / Angular. Pluraliser en `dtos/` serait _moins_
idiomatique. C'est la seule exception à la règle du pluriel, et elle est
**voulue**, pas accidentelle.

## `props/` vs `interfaces/` — deux rôles, deux dossiers

Une **forme** ne se déclare jamais _inline_ dans un fichier d'entité ou de
service. Selon son rôle, elle vit dans l'un de **deux dossiers séparés** (il est
**interdit** de les mélanger) :

| Dossier       | Rôle                                                                                        | Nom du type  | Fichier              |
| ------------- | ------------------------------------------------------------------------------------------- | ------------ | -------------------- |
| `props/`      | forme **implémentée par une classe** (l'entité `implements` sa forme, ou reçoit un `props`) | `<Nom>Props` | `<nom>.props.ts`     |
| `interfaces/` | forme de valeur **autonome**, non implémentée par une classe                                | `<Nom>`      | `<nom>.interface.ts` |

Règle : dès qu'une `interface` est `implements`ée par une classe (ou sert de
type au `props` d'une entité), c'est une **props** → `props/<nom>.props.ts`,
type `<Nom>Props`. Les `interfaces/` ne contiennent que des formes qu'aucune
classe n'implémente (cf.
[`archetypes/angular/entity.contract.md`](./archetypes/angular/entity.contract.md)).

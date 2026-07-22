# Convention de nommage — dossiers et fichiers intra-lib

Complète l'[ADR-0003](../docs/adr/0003-nommage-et-structure.md) (qui fixe le
nommage repo / scope / `apps` + `libs`) au niveau **intérieur d'une lib**.
Externalisée ici, jamais codée en dur dans un générateur.

## Fichiers

`<nom-métier>.<archétype>.ts`, tout en **kebab-case**.

| Archétype    | Suffixe         | Exemple                     |
| ------------ | --------------- | --------------------------- |
| entité       | `.entity.ts`    | `report-location.entity.ts` |
| interface    | `.interface.ts` | `coordinates.interface.ts`  |
| enum         | `.enum.ts`      | `location-method.enum.ts`   |
| erreur       | `.error.ts`     | `api.error.ts`              |
| mapper       | `.mapper.ts`    | `report-source.mapper.ts`   |
| dto          | `.dto.ts`       | `media-publish.dto.ts`      |
| service      | `.service.ts`   | (à venir)                   |
| value-object | `.vo.ts`        | (à venir)                   |

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

## Conséquence pour les archétypes

Une **forme** (interface) ne se déclare jamais _inline_ dans un fichier d'entité
ou de service : elle vit dans `interfaces/`, exportée, et est `implements`ée.
Cela garde « une forme = un fichier », réutilisable et repérable (cf.
[`contracts/entity.contract.md`](../contracts/entity.contract.md)).

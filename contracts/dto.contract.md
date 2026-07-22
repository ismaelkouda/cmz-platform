# Contrat d'archétype — `dto`

## Rôle

Un **DTO** (Data Transfer Object) décrit la **forme brute d'un échange** avec un
service externe (API). Il reflète le contrat du réseau, pas le modèle métier :
noms de champs tels que l'API les renvoie (souvent `snake_case`), types
primitifs, `null` explicite.

## Couche

`data` → `@cmz/<module>-data` (ou `@cmz/shared-data` pour le kernel).

## Règle mécanique

Un DTO n'a **jamais de comportement** (pas de classe, pas de décorateur, pas de
logique). Sa forme suit ce que **l'observation du source impose** — trois
variantes réelles :

| Variante    | Quand                                     | Forme                                                      |
| ----------- | ----------------------------------------- | ---------------------------------------------------------- |
| `interface` | forme d'objet renvoyée par l'API          | `export interface XDto { … }`                              |
| `enum`      | ensemble fermé de valeurs string de l'API | `export enum XDto { … }`                                   |
| const-map   | drapeau booléen ou table figée            | `export const XDto = { … } as const; export type XDto = …` |

- Les noms de champs suivent **exactement** l'API (souvent `snake_case`) — ne
  pas franciser ni camelCaser.
- `null` explicite dans le type quand l'API peut le renvoyer.
- Génériques autorisés pour les enveloppes de réponse
  (`PaginatedResponseDto<T>`…).
- Un DTO **peut** référencer un type du domaine (enum, interface) quand l'API
  imbrique une valeur métier — l'import vise alors `@cmz/shared-domain`. Le
  reste de la conversion DTO ↔ domaine appartient au mapper.

## Convention

Un DTO est du TypeScript pur — le profil de convention Angular ne s'applique pas
(pas de décorateur). Seule la normalisation TS générale vaut (`as const` pour
les tables figées, pas d'`any`).

## Exemplaire de référence

```ts
export interface ReportMediaDto {
    place_photo: string | null;
    access_place_photo: string | null;
}
```

## Prompt

> Produis un fichier `<entité>.dto.ts` déclarant **une seule `interface`
> exportée** nommée `<Entité>Dto`. Ses champs sont **exactement** ceux de la
> réponse d'API fournie en données, avec leurs noms d'origine et leurs types
> (inclure `| null` là où l'API peut renvoyer `null`). N'ajoute **aucun**
> décorateur, import, méthode ni logique. Ne transforme pas les noms de champs.
> Toute conversion vers le domaine appartient au mapper, pas ici.

**Données attendues** : la forme de la réponse d'API de l'entité (champs +
types), issue du projet source (`shared/data/dto/…` ou le DTO du module).

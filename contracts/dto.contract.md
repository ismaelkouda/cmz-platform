# Contrat d'archétype — `dto`

## Rôle

Un **DTO** (Data Transfer Object) décrit la **forme brute d'un échange** avec un
service externe (API). Il reflète le contrat du réseau, pas le modèle métier :
noms de champs tels que l'API les renvoie (souvent `snake_case`), types
primitifs, `null` explicite.

## Couche

`data` → `@cmz/<module>-data` (ou `@cmz/shared-data` pour le kernel).

## Règle mécanique

- Une **`interface` exportée**, jamais une classe : un DTO n'a pas de
  comportement.
- Aucun décorateur, aucun import Angular, aucune logique.
- Les noms de champs suivent l'API (ne pas franciser ni camelCaser côté DTO).
- `null` est explicite dans le type quand l'API peut le renvoyer.
- Le passage DTO ↔ domaine se fait **dans le mapper**, jamais dans le DTO.

## Convention

Rien de spécifique au framework — un DTO est du TypeScript pur. (Le profil de
convention ne s'applique pas ici.)

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

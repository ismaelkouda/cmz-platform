# Contrat d'archétype — `dto-interface`

## Rôle

Décrit la **forme d'objet brute** d'un échange API : une `interface` reflétant
les champs tels que l'API les renvoie. Pas de comportement.

## Couche

`data` → `@cmz/<module>-data` (ou `@cmz/shared-data`).

## Règle mécanique

- **Une `interface` exportée**, jamais une classe, jamais de décorateur.
- Champs **exactement** ceux de l'API (souvent `snake_case`) — ne pas franciser
  ni camelCaser.
- `null` explicite dans le type quand l'API peut le renvoyer.
- Génériques autorisés pour les enveloppes de réponse
  (`PaginatedResponseDto<T>`, `SimpleResponseDto<T>`…).
- **Peut** référencer un type du domaine (`@cmz/shared-domain`) quand l'API
  imbrique une valeur métier ; toute conversion reste dans le mapper.

## Exemplaire

```ts
export interface ReportMediaDto {
    place_photo: string | null;
    access_place_photo: string | null;
}
```

## Prompt

> Produis une `interface` exportée `<Nom>Dto` dont les champs sont exactement
> ceux de la réponse d'API fournie, avec leurs noms d'origine et `| null` là où
> l'API peut renvoyer `null`. Aucun décorateur, aucune méthode. Réfère un type
> domaine par `@cmz/shared-domain` seulement si l'API l'imbrique.

**Données** : la forme de la réponse d'API (champs + types).

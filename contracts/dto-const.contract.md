# Contrat d'archétype — `dto-const`

## Rôle

Décrit une **table figée** de l'API dont les valeurs ne sont pas des strings
mais des primitives (booléens le plus souvent) — un drapeau que l'API renvoie
sous forme fermée. Un `enum` ne conviendrait pas (les enums TypeScript
n'admettent que `number`/`string`), d'où le motif `const … as const` + type
dérivé.

## Couche

`data` → `@cmz/<module>-data` (ou `@cmz/shared-data`).

## Règle mécanique

- **Objet `const … as const` exporté** + **type dérivé de même nom**.
- `as const` obligatoire (fige les valeurs en littéraux).
- Aucun décorateur, aucun import.

## Exemplaire

```ts
export const MediaPublishDto = {
    ACTIVE: true,
    INACTIVE: false,
} as const;

export type MediaPublishDto =
    (typeof MediaPublishDto)[keyof typeof MediaPublishDto];
```

## Prompt

> Produis un objet `const <Nom>Dto = { … } as const;` reprenant les paires
> clé/valeur fournies, suivi de
> `export type <Nom>Dto = (typeof <Nom>Dto)[keyof typeof <Nom>Dto];`. Aucun
> import, aucun décorateur.

**Données** : les paires clé → valeur primitive de la table.
